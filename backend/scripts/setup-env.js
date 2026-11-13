// Crea auth/.env, productos/.env y compras/.env con el mismo DATABASE_URL y el mismo JWT_SECRET.
// Uso:  npm run setup:env -- "postgresql://USER:PASS@HOST:5432/DB?sslmode=require"
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.join(__dirname, '..');
const dbUrl = process.argv[2] || process.env.DATABASE_URL || 'postgresql://USER:PASSWORD@HOST:5432/DB?sslmode=require';
const secret = crypto.randomBytes(32).toString('hex');
const force = process.argv.includes('--force');

for (const svc of ['auth', 'productos', 'compras']) {
  const example = fs.readFileSync(path.join(root, svc, '.env.example'), 'utf8');
  const out = example
    .replace(/^DATABASE_URL=.*$/m, `DATABASE_URL=${dbUrl}`)
    .replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${secret}`);
  const file = path.join(root, svc, '.env');
  if (fs.existsSync(file) && !force) {
    console.log(`= ${svc}/.env ya existe (usa --force para reemplazarlo)`);
    continue;
  }
  fs.writeFileSync(file, out);
  console.log(`+ ${svc}/.env creado`);
}
if (dbUrl.includes('USER:PASSWORD')) console.log('\nIMPORTANTE: edita DATABASE_URL en los 3 archivos .env con la URL real de tu PostgreSQL.');
