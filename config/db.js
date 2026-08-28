const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

// Managed Postgres providers (Neon, Supabase, Railway, RDS, etc.) require TLS.
// Enable it automatically for any connection string that asks for it or when
// PGSSL is explicitly set; local/dev connections stay unencrypted by default.
const wantsSsl =
  process.env.PGSSL === 'true' ||
  (!!connectionString && /sslmode=require/.test(connectionString)) ||
  (!!connectionString && process.env.PGSSL !== 'false' && process.env.NODE_ENV === 'production');

const pool = new Pool(
  connectionString
    ? { connectionString, ssl: wantsSsl ? { rejectUnauthorized: false } : false }
    : {
        host: process.env.PGHOST || 'localhost',
        port: process.env.PGPORT || 5432,
        database: process.env.PGDATABASE || 'mgs_exam_system',
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || '',
      }
);

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
  pool,
};
