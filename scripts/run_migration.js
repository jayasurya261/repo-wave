import pkg from 'pg';
import fs from 'fs';
import path from 'path';

const { Pool } = pkg;

const pool = new Pool({
  connectionString: 'postgresql://postgres.hvwpwegnllcvjqidxlzr:faCGzVPia9rCE1iQ@aws-1-ap-south-1.pooler.supabase.com:5432/postgres',
});

async function runMigration() {
  try {
    const sqlPath = path.resolve('scripts/pr_contributions.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Running migration...');
    await pool.query(sql);
    console.log('Migration successful!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

runMigration();
