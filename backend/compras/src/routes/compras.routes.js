const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { HttpError, asyncHandler } = require('../middleware/errors');
const { generarFactura } = require('../services/factura');

const router = express.Router();
router.use(requireAuth);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const fmtCompra = (c) => ({ id: Number(c.id), client_id: c.client_id, cliente: c.cliente, total: Number(c.total), created_at: c.created_at });
const fmtItem = (i) => ({ productoId: i.producto_id, nombre: i.nombre, precio: Number(i.precio), cantidad: i.cantidad });

async function buscarPorClientId(clientId, usuarioId) {
  const c = await db.query('SELECT id,client_id,cliente,total,created_at FROM compras WHERE client_id=$1 AND usuario_id=$2', [clientId, usuarioId]);
  if (!c.rowCount) return null;
  const items = await db.query('SELECT producto_id,nombre,precio,cantidad FROM compra_items WHERE compra_id=$1 ORDER BY id', [c.rows[0].id]);
  return { compra: fmtCompra(c.rows[0]), items: items.rows.map(fmtItem), repetida: true };
}

// ---- Registrar compra (idempotente por clientId) ---------------------------
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { clientId, items } = req.body || {};
    if (!UUID_RE.test(String(clientId ?? ''))) throw new HttpError(400, 'clientId (UUID) es obligatorio para evitar compras duplicadas');
    if (!Array.isArray(items) || !items.length || items.length > 100) throw new HttpError(400, 'La compra requiere entre 1 y 100 productos');

    // Unifica líneas repetidas y valida
    const merged = new Map();
    for (const it of items) {
      const pid = Number(it?.productoId);
      const qty = Number(it?.cantidad);
      if (!Number.isInteger(pid) || pid < 1 || !Number.isInteger(qty) || qty < 1 || qty > 99) throw new HttpError(400, 'Producto o cantidad inválidos (1-99 por producto)');
      merged.set(pid, (merged.get(pid) || 0) + qty);
    }
    const lines = [...merged.entries()].sort((a, b) => a[0] - b[0]); // orden fijo => sin deadlocks
    const cliente = String(req.body.cliente || req.user.nombre).slice(0, 120);

    // ¿Ya se registró (reintento de sincronización)? -> mismo resultado, sin duplicar
    const previa = await buscarPorClientId(clientId, req.user.id);
    if (previa) return res.json(previa);

    const client = await db.connect();
    try {
      await client.query('BEGIN');
      let total = 0;
      const detalle = [];
      for (const [pid, qty] of lines) {
        // Descuenta inventario de forma atómica: si no alcanza, no actualiza ninguna fila
        const r = await client.query('UPDATE productos SET stock=stock-$1 WHERE id=$2 AND stock>=$1 RETURNING id,nombre,precio', [qty, pid]);
        if (!r.rowCount) {
          const ex = await client.query('SELECT nombre,stock FROM productos WHERE id=$1', [pid]);
          if (!ex.rowCount) throw new HttpError(404, `El producto ${pid} ya no existe`);
          throw new HttpError(409, `Stock insuficiente para "${ex.rows[0].nombre}" (disponible: ${ex.rows[0].stock})`);
        }
        const precio = Number(r.rows[0].precio); // el precio SIEMPRE lo define el servidor
        total += precio * qty;
        detalle.push({ productoId: r.rows[0].id, nombre: r.rows[0].nombre, precio, cantidad: qty });
      }
      total = Math.round(total * 100) / 100;
      const ins = await client.query(
        'INSERT INTO compras(usuario_id,cliente,total,client_id) VALUES($1,$2,$3,$4) RETURNING id,client_id,cliente,total,created_at',
        [req.user.id, cliente, total, clientId]
      );
      for (const d of detalle) {
        await client.query('INSERT INTO compra_items(compra_id,producto_id,nombre,precio,cantidad) VALUES($1,$2,$3,$4,$5)', [ins.rows[0].id, d.productoId, d.nombre, d.precio, d.cantidad]);
      }
      await client.query('COMMIT');
      res.status(201).json({ compra: fmtCompra(ins.rows[0]), items: detalle });
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      if (e.code === '23505') {
        // Dos peticiones simultáneas con el mismo clientId: devolvemos la ganadora
        const dup = await buscarPorClientId(clientId, req.user.id);
        if (dup) return res.json(dup);
        throw new HttpError(409, 'clientId ya utilizado');
      }
      throw e;
    } finally {
      client.release();
    }
  })
);

// ---- Historial del usuario (con detalle) -----------------------------------
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = await db.query(
      `SELECT c.id, c.client_id, c.cliente, c.total, c.created_at,
              COALESCE(json_agg(json_build_object('productoId',i.producto_id,'nombre',i.nombre,'precio',i.precio,'cantidad',i.cantidad) ORDER BY i.id)
                       FILTER (WHERE i.id IS NOT NULL), '[]') AS items
         FROM compras c LEFT JOIN compra_items i ON i.compra_id = c.id
        WHERE c.usuario_id = $1
        GROUP BY c.id
        ORDER BY c.created_at DESC
        LIMIT 200`,
      [req.user.id]
    );
    res.json(q.rows.map((r) => ({ ...fmtCompra(r), items: r.items })));
  })
);

function parseId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) throw new HttpError(400, 'ID inválido');
  return id;
}

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const c = await db.query('SELECT id,client_id,cliente,total,created_at FROM compras WHERE id=$1 AND usuario_id=$2', [id, req.user.id]);
    if (!c.rowCount) throw new HttpError(404, 'Compra no encontrada');
    const items = await db.query('SELECT producto_id,nombre,precio,cantidad FROM compra_items WHERE compra_id=$1 ORDER BY id', [id]);
    res.json({ compra: fmtCompra(c.rows[0]), items: items.rows.map(fmtItem) });
  })
);

// ---- Factura PDF -----------------------------------------------------------
router.get(
  '/:id/factura',
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const c = await db.query('SELECT id,client_id,cliente,total,created_at FROM compras WHERE id=$1 AND usuario_id=$2', [id, req.user.id]);
    if (!c.rowCount) throw new HttpError(404, 'Compra no encontrada');
    const items = await db.query('SELECT producto_id,nombre,precio,cantidad FROM compra_items WHERE compra_id=$1 ORDER BY id', [id]);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="factura-${id}.pdf"`);
    generarFactura(c.rows[0], items.rows, res);
  })
);

module.exports = router;
