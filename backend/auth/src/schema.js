// Crea las tablas si no existen (idempotente). Usa un advisory lock para que
// los 3 servicios puedan arrancar al mismo tiempo sin pisarse.
const db = require('./db');

const SQL = `
CREATE TABLE IF NOT EXISTS usuarios(id SERIAL PRIMARY KEY,nombre VARCHAR(120) NOT NULL,email VARCHAR(180) UNIQUE NOT NULL,password_hash TEXT NOT NULL,rol VARCHAR(20) NOT NULL DEFAULT 'usuario',created_at TIMESTAMPTZ DEFAULT NOW());
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS rol VARCHAR(20) NOT NULL DEFAULT 'usuario';
CREATE TABLE IF NOT EXISTS productos(id SERIAL PRIMARY KEY,nombre VARCHAR(150) NOT NULL,descripcion TEXT NOT NULL,precio NUMERIC(12,2) NOT NULL CHECK(precio>=0),imagen TEXT DEFAULT '',stock INTEGER NOT NULL DEFAULT 0 CHECK(stock>=0));
ALTER TABLE productos ADD COLUMN IF NOT EXISTS stock INTEGER NOT NULL DEFAULT 0 CHECK(stock>=0);
CREATE TABLE IF NOT EXISTS compras(id BIGSERIAL PRIMARY KEY,usuario_id INTEGER REFERENCES usuarios(id),cliente VARCHAR(120) NOT NULL,total NUMERIC(12,2) NOT NULL,client_id UUID UNIQUE NOT NULL,created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS compra_items(id BIGSERIAL PRIMARY KEY,compra_id BIGINT REFERENCES compras(id) ON DELETE CASCADE,producto_id INTEGER NOT NULL,nombre VARCHAR(150) NOT NULL,precio NUMERIC(12,2) NOT NULL,cantidad INTEGER NOT NULL CHECK(cantidad>0));
CREATE INDEX IF NOT EXISTS idx_compras_usuario ON compras(usuario_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_items_compra ON compra_items(compra_id);
`;

async function ensureSchema() {
  const client = await db.connect();
  try {
    await client.query('SELECT pg_advisory_lock(727274)');
    await client.query(SQL);
  } finally {
    await client.query('SELECT pg_advisory_unlock(727274)').catch(() => {});
    client.release();
  }
}

module.exports = { ensureSchema };

