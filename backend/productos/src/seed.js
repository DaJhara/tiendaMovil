require('dotenv').config();
const db = require('./db');
const { ensureSchema } = require('./schema');

// Las imágenes viven en public/images y se sirven en /images/<archivo>
const PRODUCTOS = [
  ['Audífonos Bluetooth', 'Audífonos inalámbricos con micrófono', 79900, '/images/audifonos.png', 25],
  ['Mouse inalámbrico', 'Mouse óptico con receptor USB', 45900, '/images/mouse.png', 40],
  ['Teclado compacto', 'Teclado de oficina en español', 89900, '/images/teclado.png', 18],
  ['Parlante portátil', 'Sonido compacto Bluetooth', 119900, '/images/parlante.png', 12],
  ['Cargador USB-C', 'Cargador rápido de 20W', 59900, '/images/cargador.png', 35],
  ['Cable USB-C', 'Cable de carga de 1 metro', 19900, '/images/cable.png', 80],
  ['Memoria USB 64GB', 'Almacenamiento portátil USB 3.0', 34900, '/images/memoria.png', 50],
  ['Soporte para portátil', 'Base ajustable de aluminio', 69900, '/images/soporte.png', 15],
  ['Botella térmica', 'Botella reutilizable de 750 ml', 39900, '/images/botella.png', 30],
  ['Mochila urbana', 'Mochila para portátil de 15"', 139900, '/images/mochila.png', 10],
];

async function seed() {
  for (const [nombre, descripcion, precio, imagen, stock] of PRODUCTOS) {
    await db.query(
            'INSERT INTO productos(nombre,descripcion,precio,imagen,stock) SELECT $1::varchar,$2::text,$3::numeric,$4::text,$5::int WHERE NOT EXISTS(SELECT 1 FROM productos WHERE nombre=$1::varchar)',
      [nombre, descripcion, precio, imagen, stock]
    );
    // Si venías del proyecto guía (productos sin imagen), se la agregamos
    await db.query("UPDATE productos SET imagen=$2 WHERE nombre=$1 AND (imagen IS NULL OR imagen='')", [nombre, imagen]);
  }
  console.log('10 productos verificados/cargados (con imagen y stock)');
}

if (require.main === module) {
  ensureSchema()
    .then(seed)
    .then(() => db.end())
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

module.exports = { seed };
