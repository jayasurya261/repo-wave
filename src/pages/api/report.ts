import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        const { type, title, description, page_url } = body;

        if (!type || !title?.trim()) {
            return new Response(JSON.stringify({ error: 'type and title are required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        if (!['bug', 'security', 'feature', 'other'].includes(type)) {
            return new Response(JSON.stringify({ error: 'invalid type' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const { error } = await supabase.from('feedback_reports').insert({
            type,
            title: title.trim(),
            description: description?.trim() || null,
            page_url: page_url || null,
        });

        if (error) {
            console.error('[report] Supabase insert error:', error);
            return new Response(JSON.stringify({ error: 'Failed to save report' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (err) {
        console.error('[report] Unexpected error:', err);
        return new Response(JSON.stringify({ error: 'Invalid request' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
