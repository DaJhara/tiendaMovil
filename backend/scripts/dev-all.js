// Levanta auth (3001), productos (3002) y compras (3003) en una sola terminal.
//   node scripts/dev-all.js          -> modo desarrollo (recarga automática)
//   node scripts/dev-all.js start    -> modo producción
const { spawn } = require('child_process');
const path = require('path');

const mode = process.argv[2] === 'start' ? 'start' : 'dev';
const services = [
  ['auth', '\x1b[36m'],
  ['productos', '\x1b[35m'],
  ['compras', '\x1b[33m'],
];
const children = services.map(([name, color]) => {
  const child = spawn('npm', ['run', mode], { cwd: path.join(__dirname, '..', name), shell: true });
  const tag = `${color}[${name}]\x1b[0m `;
  const pipe = (stream, out) =>
    stream.on('data', (d) =>
      String(d).split(/\r?\n/).filter(Boolean).forEach((l) => out.write(tag + l + '\n'))
    );
  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stderr);
  child.on('exit', (code) => console.log(`${tag}terminó (código ${code})`));
  return child;
});

const stop = () => {
  children.forEach((c) => c.kill());
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
