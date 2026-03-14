
import { betterAuth } from "better-auth";
import { pool } from "./db";
import { generateUniqueUsername } from "./username-utils";

export const auth = betterAuth({
    baseURL: import.meta.env.BETTER_AUTH_URL || "http://localhost:4321",
    database: pool,
    user: {
        additionalFields: {
            username: {
                type: "string",
                required: false,
            },
        },
    },
    trustedOrigins: [
        "https://www.repowave.space",
        "https://repowave.space",
        "http://localhost:4321",
        "http://localhost:3000",
    ],
    emailAndPassword: {
        enabled: true,
    },
    socialProviders: {
        google: {
            clientId: import.meta.env.GOOGLE_CLIENT_ID || "",
            clientSecret: import.meta.env.GOOGLE_CLIENT_SECRET || "",
        },
        github: {
            clientId: import.meta.env.GITHUB_CLIENT_ID || "",
            clientSecret: import.meta.env.GITHUB_CLIENT_SECRET || "",
        }
    },
    databaseHooks: {
        session: {
            create: {
                after: async (session) => {
                    if (session.userId) {
                        const client = await pool.connect();
                        try {
                            // Check if user has username
                            const userRes = await client.query('SELECT * FROM "user" WHERE id = $1', [session.userId]);
                            const user = userRes.rows[0];
                            
                            if (user && !user.username) {
                                const username = await generateUniqueUsername(user.name, user.email);
                                await client.query('UPDATE "user" SET "username" = $1 WHERE id = $2', [username, user.id]);
                                console.log(`Generated username ${username} for user ${user.id}`);
                            }
                        } catch (e) {
                            console.error("Error generating username in hook:", e);
                        } finally {
                            client.release();
                        }
                    }
                }
            }
        }
    }
});
