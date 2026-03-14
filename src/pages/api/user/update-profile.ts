
import type { APIRoute } from "astro";
import { auth } from "../../../lib/auth";
import { pool } from "../../../lib/db";
import { isValidUsername, isUsernameAvailable } from "../../../lib/username-utils";

export const POST: APIRoute = async ({ request }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session || !session.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const { name, username, bio } = await request.json();

    if (!name || !username) {
        return new Response(JSON.stringify({ error: "Name and username are required" }), { status: 400 });
    }

    const newName = name.trim();
    const newUsername = username.trim();
    const newBio = bio ? bio.trim() : null;

    if (newName.length < 1) {
         return new Response(JSON.stringify({ error: "Name cannot be empty" }), { status: 400 });
    }

    const client = await pool.connect();
    
    // Bio validation (optional)
    if (newBio && newBio.length > 255) {
        client.release();
        return new Response(JSON.stringify({ error: "Bio is too long (max 255 characters)" }), { status: 400 });
    }

    // Username validation
    if (newUsername !== session.user.username) {
        if (!isValidUsername(newUsername)) {
            client.release();
            return new Response(JSON.stringify({ error: "Invalid username format. Use only letters, numbers, and hyphens." }), { status: 400 });
        }
        
        // Only check availability if it's different
        const isAvailable = await isUsernameAvailable(newUsername);
        if (!isAvailable) {
            client.release();
            return new Response(JSON.stringify({ error: "Username is already taken. Please try another one." }), { status: 409 });
        }
    }

    try {
        await client.query(
            'UPDATE "user" SET name = $1, username = $2, bio = $3 WHERE id = $4', 
            [newName, newUsername, newBio, session.user.id]
        );
        
        return new Response(JSON.stringify({ 
            success: true, 
            user: { 
                name: newName, 
                username: newUsername, 
                bio: newBio 
            } 
        }), { status: 200 });
    } catch (e) {
        console.error("Error updating profile", e);
        return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
    } finally {
        client.release();
    }
};
