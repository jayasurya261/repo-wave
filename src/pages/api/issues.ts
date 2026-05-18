import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

export const prerender = false;

const PAGE_SIZE = 20;

export const GET: APIRoute = async ({ url }) => {
    const params = url.searchParams;
    const page = Math.max(1, parseInt(params.get('page') ?? '1', 10));
    const lang = params.get('lang') ?? 'all';
    const difficulty = params.get('difficulty') ?? 'all';
    const q = (params.get('q') ?? '').toLowerCase().trim();
    const sort = params.get('sort') ?? 'recent';

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    // Start building query
    let query = supabase
        .from('issues')
        .select('*, repos(language)', { count: 'exact' });

    // Apply sort
    if (sort === 'easy') {
        query = query.order('difficulty_score', { ascending: true });
    } else if (sort === 'trending') {
        // Trending: issues created in the last 7 days
        query = query.gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
            .order('created_at', { ascending: false });
    } else {
        // Default: recent
        query = query.order('created_at', { ascending: false });
    }

    // Language filter â€” join repos table
    if (lang !== 'all') {
        query = query.eq('repos.language', lang);
    }

    // Difficulty filter via difficulty_score ranges
    if (difficulty === 'easy') {
        query = query.lte('difficulty_score', 25);
    } else if (difficulty === 'medium') {
        query = query.gt('difficulty_score', 25).lte('difficulty_score', 50);
    } else if (difficulty === 'hard') {
        query = query.gt('difficulty_score', 50).lte('difficulty_score', 75);
    } else if (difficulty === 'very-hard') {
        query = query.gt('difficulty_score', 75);
    }

    // Search filter
    if (q) {
        query = query.or(`title.ilike.%${q}%,repo_id.ilike.%${q}%`);
    }

    // Apply pagination
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const items = (data ?? []).map((issue: any) => ({
        ...issue,
        language: issue.repos?.language ?? '',
    }));

    return new Response(JSON.stringify({ items, total: count ?? 0, page, pageSize: PAGE_SIZE }), {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
        },
    });
};
