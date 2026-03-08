import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

export const prerender = false;

const PAGE_SIZE = 20;

// Difficulty score boundaries (same as RepoCard / IssueCard logic)
// health_score >= 75 → easy, >=50 → medium, >=25 → hard, else → very-hard
function difficultyFilter(query: any, difficulty: string) {
    if (difficulty === 'easy') return query.gte('health_score', 75);
    if (difficulty === 'medium') return query.gte('health_score', 50).lt('health_score', 75);
    if (difficulty === 'hard') return query.gte('health_score', 25).lt('health_score', 50);
    if (difficulty === 'very-hard') return query.lt('health_score', 25);
    return query;
}

export const GET: APIRoute = async ({ url }) => {
    const params = url.searchParams;
    const page = Math.max(1, parseInt(params.get('page') ?? '1', 10));
    const lang = params.get('lang') ?? 'all';
    const difficulty = params.get('difficulty') ?? 'all';
    const q = (params.get('q') ?? '').toLowerCase().trim();

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
        .from('repos')
        .select('*', { count: 'exact' })
        .order('stars', { ascending: false });

    if (lang !== 'all') {
        query = query.eq('language', lang);
    }

    if (difficulty !== 'all') {
        query = difficultyFilter(query, difficulty);
    }

    if (q) {
        query = query.ilike('name', `%${q}%`);
    }

    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify({ items: data ?? [], total: count ?? 0, page, pageSize: PAGE_SIZE }), {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
        },
    });
};
