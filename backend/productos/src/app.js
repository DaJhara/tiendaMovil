const path = require('path');
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const db = require('./db');
const swaggerSpec = require('./swagger');
const productosRoutes = require('./routes/productos.routes');
const { notFound, errorHandler } = require('./middleware/errors');

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim()) : true }));
app.use(express.json({ limit: '100kb' }));

// Imágenes de los productos
app.use('/images', express.static(path.join(__dirname, '..', 'public', 'images'), { maxAge: '7d' }));

app.get('/', (req, res) => res.redirect('/docs'));
app.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ ok: true, servicio: 'productos' });
  } catch {
    res.status(503).json({ ok: false, servicio: 'productos' });
  }
});
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customSiteTitle: 'Tienda · Productos' }));
app.get('/docs.json', (req, res) => res.json(swaggerSpec));

app.use('/api/productos', productosRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
