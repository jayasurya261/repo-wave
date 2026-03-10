import { betterAuth } from "better-auth";
import pg from "pg";

const { Pool } = pg;

export const auth = betterAuth({
    baseURL: import.meta.env.BETTER_AUTH_URL || "http://localhost:4321",
    database: new Pool({
        connectionString: import.meta.env.DATABASE_URL || "",
    }),
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
        }
    }
});
