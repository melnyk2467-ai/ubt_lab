const { Pool } = require('pg');

// Supabase (and most hosted PostgreSQL providers) require SSL.
// When DATABASE_URL points to localhost, SSL is skipped automatically
// because the connection string won't contain "supabase.co".
const isSupabase = (process.env.DATABASE_URL || '').includes('supabase.co');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ...(isSupabase && {
    ssl: {
      // Supabase uses a self-signed cert on the direct connection port (5432).
      // rejectUnauthorized: false accepts it without needing to bundle a CA cert.
      rejectUnauthorized: false,
    },
  }),
});

pool.on('error', (err) => {
  console.error('Unexpected DB error', err);
});

module.exports = { query: (text, params) => pool.query(text, params), pool };
