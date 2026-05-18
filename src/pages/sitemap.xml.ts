// src/pages/sitemap.xml.ts
import { supabase } from '../lib/supabase';

export async function GET({ site }: { site: URL }) {
  const baseUrl = site ? site.toString().replace(/\/$/, '') : 'https://www.repowave.space';
  
  // Configuration limits to keep sitemap fast, under 50MB, and under Google's 50k URL limit
  const MAX_ISSUES = 20000;
  const MAX_REPOS = 5000;
  const PAGE_SIZE = 1000;

  // 1. Fetch Issues
  const { count: issueCount, error: issueCountError } = await supabase
    .from('issues')
    .select('*', { count: 'exact', head: true });

  if (issueCountError) {
    console.error('Error fetching issue count for sitemap:', issueCountError);
  }

  const totalIssuesToFetch = Math.min(issueCount || 0, MAX_ISSUES);
  const issuePages = Math.ceil(totalIssuesToFetch / PAGE_SIZE);

  // Array of Promises to fetch all issue chunks concurrently
  const issuePromises = Array.from({ length: issuePages }).map((_, i) => {
    const from = i * PAGE_SIZE;
    const to = Math.min((i + 1) * PAGE_SIZE - 1, totalIssuesToFetch - 1);
    return supabase
      .from('issues')
      .select('url, repo_id, created_at')
      .order('created_at', { ascending: false }) // Prioritize recent issues
      .range(from, to);
  });

  const issueResults = await Promise.all(issuePromises);
  const allIssues = issueResults.flatMap((res) => res.data || []);

  // 2. Fetch Repos
  const { count: repoCount, error: repoCountError } = await supabase
    .from('repos')
    .select('*', { count: 'exact', head: true });

  if (repoCountError) {
    console.error('Error fetching repo count for sitemap:', repoCountError);
  }

  const totalReposToFetch = Math.min(repoCount || 0, MAX_REPOS);
  const repoPages = Math.ceil(totalReposToFetch / PAGE_SIZE);

  // Array of Promises to fetch all repo chunks concurrently
  const repoPromises = Array.from({ length: repoPages }).map((_, i) => {
    const from = i * PAGE_SIZE;
    const to = Math.min((i + 1) * PAGE_SIZE - 1, totalReposToFetch - 1);
    return supabase
      .from('repos')
      .select('full_name, last_active')
      .order('last_active', { ascending: false }) // Prioritize active repos
      .range(from, to);
  });

  const repoResults = await Promise.all(repoPromises);
  const allRepos = repoResults.flatMap((res) => res.data || []);

  // 3. Language landing pages
  const { data: langRows } = await supabase
    .from('repos')
    .select('language')
    .not('language', 'is', null);

  const SPECIAL_SLUGS: Record<string, string> = {
    'C++': 'cpp', 'C#': 'csharp', 'F#': 'fsharp', 'Objective-C': 'objective-c',
  };
  function langToSlug(lang: string): string {
    return SPECIAL_SLUGS[lang] ?? lang.toLowerCase()
      .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
  }

  const uniqueLangs = [...new Set(langRows?.map((r: any) => r.language).filter(Boolean) ?? [])];
  const langUrls = uniqueLangs.flatMap((lang: string) => {
    const slug = langToSlug(lang);
    return [
      `<url><loc>${escapeXml(`${baseUrl}/repositories/${slug}`)}</loc><changefreq>daily</changefreq><priority>0.8</priority></url>`,
      `<url><loc>${escapeXml(`${baseUrl}/issues/${slug}`)}</loc><changefreq>daily</changefreq><priority>0.8</priority></url>`,
    ];
  }).join('');

  // 4. Static pages
  const staticPages = [
    '',
    '/issues',
    '/repositories',
    '/about',
    '/contact',
    '/login',
    '/signup',
    '/guide',
    '/guide/open-source-beginner-roadmap',
    '/guide/finding-good-first-issues',
    '/guide/best-repos-for-beginners',
    '/guide/github-contribution-guide',
    '/guide/how-maintainers-review-prs',
    '/guide/common-git-mistakes',
    '/blog',
    '/blog/tips-for-open-source',
  ];

  // Helper to escape XML special characters
  const escapeXml = (unsafe: string) => {
    return unsafe.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  };

  const staticUrls = staticPages.map(path => 
    `<url><loc>${escapeXml(baseUrl + path)}</loc><changefreq>daily</changefreq><priority>${path === '' ? '1.0' : '0.8'}</priority></url>`
  ).join('');

  const issueUrls = Array.from(new Set(allIssues.filter(i => i && i.url && i.repo_id).map(issue => {
    // Reconstruct slug from repo_id and url number
    const parts = issue.url.split('/');
    const number = parts[parts.length - 1];
    const slug = `${issue.repo_id}/${number}`;
    const lastMod = issue.created_at ? new Date(issue.created_at).toISOString() : new Date().toISOString();

    return `<url><loc>${escapeXml(`${baseUrl}/issue/${slug}`)}</loc><lastmod>${lastMod}</lastmod><changefreq>daily</changefreq><priority>0.6</priority></url>`;
  }))).join('');

  const repoUrls = Array.from(new Set(allRepos.filter(r => r && r.full_name).map(repo => {
    const lastMod = repo.last_active ? new Date(repo.last_active).toISOString() : new Date().toISOString();
    return `<url><loc>${escapeXml(`${baseUrl}/repo/${repo.full_name}`)}</loc><lastmod>${lastMod}</lastmod><changefreq>daily</changefreq><priority>0.7</priority></url>`;
  }))).join('');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticUrls}
${langUrls}
${issueUrls}
${repoUrls}
</urlset>`.trim();

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      // Cache for 12 hours (43200 seconds) to balance freshness and load
      'Cache-Control': 'public, max-age=43200, s-maxage=43200'
    }
  });
}
