import type { APIRoute } from "astro";
import { auth } from "../../../lib/auth";
import { pool } from "../../../lib/db";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
    // 1. Authenticate user
    const session = await auth.api.getSession({
        headers: request.headers,
    });

    if (!session || !session.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" }
        });
    }

    try {
        const body = await request.json();
        const { pr_url } = body;

        if (!pr_url || !pr_url.includes("github.com")) {
            return new Response(JSON.stringify({ error: "Invalid GitHub PR URL" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Parse PR URL: https://github.com/owner/repo/pull/123
        const urlObj = new URL(pr_url);
        const parts = urlObj.pathname.split('/').filter(Boolean);
        if (parts.length < 4 || parts[2] !== 'pull') {
            return new Response(JSON.stringify({ error: "Invalid PR URL format. Expected: https://github.com/owner/repo/pull/123" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        const owner = parts[0];
        const repo = parts[1];
        const pullNumber = parts[3];

        // 2. Check if user has linked GitHub
        const client = await pool.connect();
        let githubAccountId = null;
        let accessToken = null;

        try {
            const accountRes = await client.query(
                'SELECT "accountId", "accessToken" FROM "account" WHERE "userId" = $1 AND "providerId" = $2',
                [session.user.id, 'github']
            );

            if (accountRes.rows.length === 0) {
                return new Response(JSON.stringify({ error: "GitHub account not linked. Please connect your GitHub account." }), {
                    status: 403,
                    headers: { "Content-Type": "application/json" }
                });
            }

            githubAccountId = accountRes.rows[0].accountId;
            accessToken = accountRes.rows[0].accessToken;
        } finally {
            client.release();
        }

        // 3. Fetch PR from GitHub API
        const headers: Record<string, string> = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "Repo-Wave-App",
        };
        if (accessToken) {
            headers["Authorization"] = `Bearer ${accessToken}`;
        }

        const prRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}`, { headers });
        if (!prRes.ok) {
            if (prRes.status === 404) {
                return new Response(JSON.stringify({ error: "PR not found or is private." }), { status: 404 });
            }
            return new Response(JSON.stringify({ error: "Failed to fetch PR from GitHub." }), { status: 500 });
        }

        const prData = await prRes.json();

        // 4. Validate ownership
        if (prData.user.id.toString() !== githubAccountId) {
            return new Response(JSON.stringify({ error: "You are not the author of this PR." }), {
                status: 403,
                headers: { "Content-Type": "application/json" }
            });
        }

        // 5. Check if merged
        if (!prData.merged_at) {
            return new Response(JSON.stringify({ error: "Only merged PRs can be submitted for scoring." }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Fetch Repo data for stars
        const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
        const repoData = await repoRes.ok ? await repoRes.json() : { stargazers_count: 0 };

        // 6. Calculate Score
        const baseScore = 1;
        
        // Impact: Repo stars (0.5 - 3x)
        const stars = repoData.stargazers_count || 0;
        let impact = 0.5;
        if (stars > 10000) impact = 3.0;
        else if (stars > 1000) impact = 2.0;
        else if (stars > 500) impact = 1.5;
        else if (stars > 100) impact = 1.0;

        // Quality: Reviews + Comments (0.8 - 2x)
        const commentsCount = (prData.comments || 0) + (prData.review_comments || 0);
        let quality = 0.8;
        if (commentsCount > 10) quality = 2.0;
        else if (commentsCount > 5) quality = 1.5;
        else if (commentsCount > 0) quality = 1.0;

        // Difficulty: Lines changed (1 - 2x)
        const linesChanged = (prData.additions || 0) + (prData.deletions || 0);
        let difficulty = 1.0;
        if (linesChanged > 500) difficulty = 2.0;
        else if (linesChanged > 150) difficulty = 1.5;
        else if (linesChanged > 50) difficulty = 1.2;

        // Time Bonus: Days since merge (0.9 - 1.1x)
        const mergedDate = new Date(prData.merged_at);
        const daysSinceMerge = (Date.now() - mergedDate.getTime()) / (1000 * 3600 * 24);
        let timeBonus = 1.0;
        if (daysSinceMerge <= 7) timeBonus = 1.1;
        else if (daysSinceMerge > 30) timeBonus = 0.9;

        const rawScore = baseScore * impact * quality * difficulty * timeBonus;
        // Cap the max score per PR to something reasonable or rely on the formula.
        const score = Math.min(parseFloat(rawScore.toFixed(2)), 10.0); // As per prompt, max daily score is 10 points

        // 7. Save to DB
        const dbClient = await pool.connect();
        try {
            // Check if already submitted
            const existingRes = await dbClient.query('SELECT id FROM public.pr_contributions WHERE pr_url = $1', [prData.html_url]);
            if (existingRes.rows.length > 0) {
                return new Response(JSON.stringify({ error: "PR already submitted." }), { status: 400 });
            }

            const insertRes = await dbClient.query(`
                INSERT INTO public.pr_contributions (
                    user_id, pr_url, repo_name, pr_title, pr_merged_at, repo_stars, 
                    additions, deletions, comments, review_comments, score
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING id
            `, [
                session.user.id,
                prData.html_url,
                prData.base.repo.full_name,
                prData.title,
                prData.merged_at,
                stars,
                prData.additions || 0,
                prData.deletions || 0,
                prData.comments || 0,
                prData.review_comments || 0,
                score
            ]);

            return new Response(JSON.stringify({ 
                success: true, 
                pr_id: insertRes.rows[0].id,
                score,
                stats: { impact, quality, difficulty, timeBonus }
            }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });
        } catch (e: any) {
            console.error("DB Insert Error:", e);
            if (e.code === '42P01') { // table does not exist
                return new Response(JSON.stringify({ error: "Database table 'pr_contributions' not found. Please run the SQL migration." }), { status: 500 });
            }
            return new Response(JSON.stringify({ error: "Database error." }), { status: 500 });
        } finally {
            dbClient.release();
        }

    } catch (e: any) {
        console.error("PR Validate Error:", e);
        return new Response(JSON.stringify({ error: e.message || "Internal Server Error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
};
