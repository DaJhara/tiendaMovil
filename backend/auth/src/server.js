require('dotenv').config();
const bcrypt = require('bcryptjs');

if (!process.env.JWT_SECRET) {
  console.error('Falta JWT_SECRET (ver .env.example)');
  process.exit(1);
}

const db = require('./db');
const { ensureSchema } = require('./schema');
const app = require('./app');

async function seedDemoUser() {
  if (process.env.SEED_DEMO_USER === 'false') return;
  const hash = await bcrypt.hash('123456', 10);
  await db.query(
    "INSERT INTO usuarios(nombre,email,password_hash) VALUES('Usuario Demo','demo@tienda.com',$1) ON CONFLICT(email) DO NOTHING",
    [hash]
  );
  console.log('Usuario demo disponible: demo@tienda.com / 123456');
}

async function main() {
  await ensureSchema();
  await seedDemoUser();
  const port = process.env.PORT || 3001;
  const server = app.listen(port, () => console.log(`Auth listo en :${port}  ·  Swagger: /docs`));
  const stop = () => server.close(() => db.end().finally(() => process.exit(0)));
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
}

main().catch((e) => {
  console.error('No se pudo iniciar auth:', e.message);
  process.exit(1);
});
