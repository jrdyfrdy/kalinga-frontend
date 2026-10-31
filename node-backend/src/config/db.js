import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Supabase requires TLS; a local Postgres usually has it disabled.
// Set DB_SSL=false (or sslmode=disable in DATABASE_URL) for local databases.
const sslDisabled = process.env.DB_SSL === 'false'
  || /sslmode=disable/i.test(process.env.DATABASE_URL || '');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslDisabled ? false : { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Laravel stores `timestamp without time zone` values in APP_TIMEZONE.
// Match it per session so NOW() comparisons (token expiry) and NOW() writes
// line up with rows Laravel wrote, and make node-postgres (which parses such
// values in the process time zone) return correct instants.
const DB_TIMEZONE = process.env.DB_TIMEZONE || 'Asia/Manila';
if (!process.env.TZ) {
  process.env.TZ = DB_TIMEZONE;
}
pool.on('connect', (client) => {
  client.query('SELECT set_config($1, $2, false)', ['TimeZone', DB_TIMEZONE]).catch((err) => {
    console.error('Failed to set DB session time zone', err.message);
  });
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle DB client', err.message);
});

export default pool;
