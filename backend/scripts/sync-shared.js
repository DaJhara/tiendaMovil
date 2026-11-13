// Copia backend/_shared/* dentro de cada servicio (auth, productos, compras).
// Así cada servicio queda 100% independiente (se despliega solo con su carpeta).
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const shared = path.join(root, '_shared');
const targets = ['auth', 'productos', 'compras'];
const map = {
  'db.js': 'src/db.js',
  'schema.js': 'src/schema.js',
  'middleware/auth.js': 'src/middleware/auth.js',
  'middleware/errors.js': 'src/middleware/errors.js',
};
for (const t of targets) {
  for (const [from, to] of Object.entries(map)) {
    const dest = path.join(root, t, to);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(shared, from), dest);
  }
}
console.log('Archivos compartidos copiados a:', targets.join(', '));
