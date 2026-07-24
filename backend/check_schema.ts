import { Client } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';

// Load from Unistudy/.env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  await client.connect();
  try {
    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'quiz_questions';
    `);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error('Error querying schema:', err);
  } finally {
    await client.end();
  }
}

run();
