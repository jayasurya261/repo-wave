
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  try {
    const client = await pool.connect();
    console.log('Connected to database');

    // Check if bio column exists
    const res = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='user' AND column_name='bio';
    `);

    if (res.rows.length === 0) {
      console.log('Adding bio column...');
      await client.query('ALTER TABLE "user" ADD COLUMN "bio" text;');
      console.log('Bio column added.');
    } else {
      console.log('Bio column already exists.');
    }

    client.release();
  } catch (err) {
    console.error('Error executing migration', err);
  } finally {
    await pool.end();
  }
}

run();
