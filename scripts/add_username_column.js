
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  try {
    const client = await pool.connect();
    console.log('Connected to database');

    // Check if username column exists
    const res = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='user' AND column_name='username';
    `);

    if (res.rows.length === 0) {
      console.log('Adding username column...');
      await client.query('ALTER TABLE "user" ADD COLUMN "username" text;');
      await client.query('CREATE UNIQUE INDEX user_username_idx ON "user" ("username");');
      console.log('Username column added.');
    } else {
      console.log('Username column already exists.');
    }

    // Check for users with NULL username
    const nullUsers = await client.query('SELECT id, name, email FROM "user" WHERE "username" IS NULL');
    console.log(`Found ${nullUsers.rows.length} users with NULL username.`);

    for (const user of nullUsers.rows) {
      let baseUsername = user.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!baseUsername) baseUsername = user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      
      let username = baseUsername;
      let counter = 1;
      
      while (true) {
        try {
          await client.query('UPDATE "user" SET "username" = $1 WHERE id = $2', [username, user.id]);
          console.log(`Updated user ${user.id} with username ${username}`);
          break;
        } catch (e) {
            // constraint violation
            if (e.code === '23505') { // unique_violation
                username = `${baseUsername}${counter}`;
                counter++;
            } else {
                throw e;
            }
        }
      }
    }

    console.log('Migration complete.');
    client.release();
  } catch (err) {
    console.error('Error executing migration', err);
  } finally {
    await pool.end();
  }
}

run();
