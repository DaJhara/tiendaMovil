// Conexión a PostgreSQL en la nube (Railway, Neon, Supabase, Render, RDS...).
const { Pool } = require('pg');

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('Falta la variable DATABASE_URL (ver .env.example)');
  process.exit(1);
}

const isLocal = /@(localhost|127\.0\.0\.1|host\.docker\.internal)[:/]/.test(url);
const useSsl = process.env.DATABASE_SSL ? process.env.DATABASE_SSL !== 'false' : !isLocal;

module.exports = new Pool({
  connectionString: url,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
  max: Number(process.env.DB_POOL_MAX || 10),
});
