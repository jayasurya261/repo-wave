import type { APIRoute } from "astro";
import { auth } from "../../../lib/auth";
import { supabase } from "../../../lib/supabase";

export const prerender = false;

// POST /api/bookmarks
// Body: { repo_id?: string, issue_id?: string }
export const POST: APIRoute = async ({ request }) => {
    // 1. Authenticate user via Better Auth
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
        const { repo_id, issue_id } = body;

        const type = issue_id ? 'issue' : 'repo';
        const targetId = issue_id || repo_id;
        const tableName = type === 'issue' ? 'issue_bookmarks' : 'bookmarks';
        const idColumn = type === 'issue' ? 'issue_id' : 'repo_id';

        if (!targetId) {
            return new Response(JSON.stringify({ error: "Repo ID or Issue ID is required" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        const userId = session.user.id;

        // 2. Check if the bookmark already exists
        const { data: existingBookmark, error: fetchError } = await supabase
            .from(tableName)
            .select('*')
            .eq('user_id', userId)
            .eq(idColumn, targetId)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = strictly one row expected but not found (meaning it doesn't exist)
            console.error("Error fetching bookmark:", fetchError);
            return new Response(JSON.stringify({ error: "Database error checking bookmark" }), {
                status: 500,
                headers: { "Content-Type": "application/json" }
            });
        }

        // 3. Toggle Bookmark
        if (existingBookmark) {
            // It exists -> Remove Bookmark
            const { error: deleteError } = await supabase
                .from(tableName)
                .delete()
                .eq('user_id', userId)
                .eq(idColumn, targetId);

            if (deleteError) throw deleteError;

            return new Response(JSON.stringify({ message: "Bookmark removed", bookmarked: false }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });

        } else {
            // It doesn't exist -> Add Bookmark
            const { error: insertError } = await supabase
                .from(tableName)
                .insert([{ user_id: userId, [idColumn]: targetId }]);

            if (insertError) throw insertError;

            return new Response(JSON.stringify({ message: "Bookmark added", bookmarked: true }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });
        }
    } catch (e: any) {
        console.error("Bookmark toggle error:", e);
        return new Response(JSON.stringify({ error: e.message || "Internal server error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
};

// GET /api/bookmarks?type=repo|issue
// Fetch all bookmarked repo_ids or issue_ids for the current user
export const GET: APIRoute = async ({ request }) => {
    // 1. Authenticate user via Better Auth
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
        const userId = session.user.id;
        const url = new URL(request.url);
        const type = url.searchParams.get('type') || 'repo';
        const tableName = type === 'issue' ? 'issue_bookmarks' : 'bookmarks';
        const idColumn = type === 'issue' ? 'issue_id' : 'repo_id';

        const { data: bookmarks, error: fetchError } = await supabase
            .from(tableName)
            .select(idColumn)
            .eq('user_id', userId);

        if (fetchError) throw fetchError;

        const ids = bookmarks.map(b => (b as any)[idColumn]);

        return new Response(JSON.stringify({ bookmarks: ids }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (e: any) {
        console.error("Bookmark fetch error:", e);
        return new Response(JSON.stringify({ error: e.message || "Internal server error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
};
