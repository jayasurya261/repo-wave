
import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
    connectionString: import.meta.env.DATABASE_URL || "",
});
