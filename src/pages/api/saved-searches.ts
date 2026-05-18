import type { APIRoute } from 'astro';
import { auth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session || !session.user) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Cache-Control': 'private, no-store' } });
	}

	const userId = session.user.id;

	try {
		const { data, error } = await supabase
			.from('saved_searches')
			.select('*')
			.eq('user_id', userId)
			.order('created_at', { ascending: false });

		if (error) {
			return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Cache-Control': 'private, no-store' } });
		}

		return new Response(JSON.stringify({ searches: data ?? [] }), {
			status: 200,
			headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' },
		});
	} catch (err) {
		console.error('Error fetching saved searches:', err);
		return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { 'Cache-Control': 'private, no-store' } });
	}
};

export const POST: APIRoute = async ({ request }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session || !session.user) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Cache-Control': 'private, no-store' } });
	}

	const userId = session.user.id;

	try {
		const body = await request.json();
		const { name, filters } = body;

		if (!name || !filters) {
			return new Response(JSON.stringify({ error: 'Missing name or filters' }), { status: 400, headers: { 'Cache-Control': 'private, no-store' } });
		}

		if (name.length > 100) {
			return new Response(JSON.stringify({ error: 'Name too long (max 100 chars)' }), { status: 400, headers: { 'Cache-Control': 'private, no-store' } });
		}

		const { data, error } = await supabase
			.from('saved_searches')
			.insert([
				{
					user_id: userId,
					name,
					filters,
				},
			])
			.select('*');

		if (error) {
			return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Cache-Control': 'private, no-store' } });
		}

		return new Response(JSON.stringify({ search: data?.[0] }), {
			status: 201,
			headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' },
		});
	} catch (err) {
		console.error('Error creating saved search:', err);
		return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { 'Cache-Control': 'private, no-store' } });
	}
};

export const DELETE: APIRoute = async ({ request, url }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session || !session.user) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Cache-Control': 'private, no-store' } });
	}

	const userId = session.user.id;
	const searchId = url.searchParams.get('id');

	if (!searchId) {
		return new Response(JSON.stringify({ error: 'Missing search id' }), { status: 400, headers: { 'Cache-Control': 'private, no-store' } });
	}

	try {
		// Verify ownership before deleting
		const { data: search, error: fetchError } = await supabase
			.from('saved_searches')
			.select('user_id')
			.eq('id', searchId)
			.single();

		if (fetchError || !search || search.user_id !== userId) {
			return new Response(JSON.stringify({ error: 'Search not found or unauthorized' }), { status: 404, headers: { 'Cache-Control': 'private, no-store' } });
		}

		const { error } = await supabase
			.from('saved_searches')
			.delete()
			.eq('id', searchId)
			.eq('user_id', userId);

		if (error) {
			return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Cache-Control': 'private, no-store' } });
		}

		return new Response(JSON.stringify({ success: true }), {
			status: 200,
			headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' },
		});
	} catch (err) {
		console.error('Error deleting saved search:', err);
		return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { 'Cache-Control': 'private, no-store' } });
	}
};
