require('dotenv').config();

if (!process.env.JWT_SECRET) {
  console.error('Falta JWT_SECRET (ver .env.example)');
  process.exit(1);
}

const db = require('./db');
const { ensureSchema } = require('./schema');
const { seed } = require('./seed');
const app = require('./app');

async function main() {
  await ensureSchema();
  if (process.env.SEED_ON_START !== 'false') await seed();
  const port = process.env.PORT || 3002;
  const server = app.listen(port, () => console.log(`Productos listo en :${port}  ·  Swagger: /docs`));
  const stop = () => server.close(() => db.end().finally(() => process.exit(0)));
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
}

main().catch((e) => {
  console.error('No se pudo iniciar productos:', e.message);
  process.exit(1);
});
