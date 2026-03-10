import type { APIRoute } from "astro";
import { auth } from "../../../lib/auth";
import { supabase } from "../../../lib/supabase";

export const prerender = false;

// POST /api/favourites
// Body: { repo_id?: string, issue_id?: string }
export const POST: APIRoute = async ({ request }) => {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401, headers: { "Content-Type": "application/json" }
        });
    }

    try {
        const body = await request.json();
        const { repo_id, issue_id } = body;

        const type = issue_id ? 'issue' : 'repo';
        const targetId = issue_id || repo_id;
        const tableName = type === 'issue' ? 'issue_favourites' : 'favourites';
        const idColumn = type === 'issue' ? 'issue_id' : 'repo_id';

        if (!targetId) {
            return new Response(JSON.stringify({ error: "repo_id or issue_id required" }), {
                status: 400, headers: { "Content-Type": "application/json" }
            });
        }

        const userId = session.user.id;

        const { data: existing, error: fetchError } = await supabase
            .from(tableName).select('*').eq('user_id', userId).eq(idColumn, targetId).single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            console.error('[favourites API] fetch error:', fetchError);
            return new Response(JSON.stringify({ error: "Database error", detail: fetchError.message }), {
                status: 500, headers: { "Content-Type": "application/json" }
            });
        }

        if (existing) {
            const { error } = await supabase.from(tableName).delete()
                .eq('user_id', userId).eq(idColumn, targetId);
            if (error) throw error;
            return new Response(JSON.stringify({ message: "Removed from favourites", favourited: false }), {
                status: 200, headers: { "Content-Type": "application/json" }
            });
        } else {
            const { error } = await supabase.from(tableName)
                .insert([{ user_id: userId, [idColumn]: targetId }]);
            if (error) throw error;
            return new Response(JSON.stringify({ message: "Added to favourites", favourited: true }), {
                status: 200, headers: { "Content-Type": "application/json" }
            });
        }
    } catch (e: any) {
        console.error('[favourites API] caught error:', e);
        return new Response(JSON.stringify({ error: e.message || "Server error" }), {
            status: 500, headers: { "Content-Type": "application/json" }
        });
    }
};

// GET /api/favourites?type=repo|issue
export const GET: APIRoute = async ({ request }) => {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401, headers: { "Content-Type": "application/json" }
        });
    }

    try {
        const userId = session.user.id;
        const url = new URL(request.url);
        const type = url.searchParams.get('type') || 'repo';
        const tableName = type === 'issue' ? 'issue_favourites' : 'favourites';
        const idColumn = type === 'issue' ? 'issue_id' : 'repo_id';

        const { data, error } = await supabase
            .from(tableName).select(idColumn).eq('user_id', userId);

        if (error) throw error;

        const ids = data.map(b => (b as any)[idColumn]);
        return new Response(JSON.stringify({ favourites: ids }), {
            status: 200, headers: { "Content-Type": "application/json" }
        });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message || "Server error" }), {
            status: 500, headers: { "Content-Type": "application/json" }
        });
    }
};
