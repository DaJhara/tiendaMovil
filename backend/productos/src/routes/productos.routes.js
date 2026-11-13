const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { HttpError, asyncHandler } = require('../middleware/errors');

const router = express.Router();
const COLS = 'id,nombre,descripcion,precio,imagen,stock';
const fmt = (r) => ({ ...r, precio: Number(r.precio) });

function parseId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) throw new HttpError(400, 'ID inválido');
  return id;
}

function validar(body = {}) {
  const nombre = String(body.nombre ?? '').trim();
  if (!nombre || nombre.length > 150) throw new HttpError(400, 'El nombre es obligatorio (máx. 150 caracteres)');

  const precio = Number(body.precio);
  if (!Number.isFinite(precio) || precio < 0 || precio > 9999999999) throw new HttpError(400, 'El precio debe ser un número mayor o igual a 0');

  let stock;
  if (body.stock !== undefined && body.stock !== null && body.stock !== '') {
    stock = Number(body.stock);
    if (!Number.isInteger(stock) || stock < 0) throw new HttpError(400, 'El stock debe ser un entero mayor o igual a 0');
  }

  const imagen = String(body.imagen ?? '').trim();
  if (imagen && !/^(https?:\/\/|\/images\/)/i.test(imagen)) throw new HttpError(400, 'La imagen debe ser una URL http(s) o una ruta /images/...');

  return { nombre, descripcion: String(body.descripcion ?? '').trim(), precio, imagen, stock };
}

// ---- Lectura pública -------------------------------------------------------
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = String(req.query.q ?? '').trim();
    const r = q
      ? await db.query(`SELECT ${COLS} FROM productos WHERE nombre ILIKE $1 ORDER BY id`, [`%${q}%`])
      : await db.query(`SELECT ${COLS} FROM productos ORDER BY id`);
    res.json(r.rows.map(fmt));
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const r = await db.query(`SELECT ${COLS} FROM productos WHERE id=$1`, [parseId(req.params.id)]);
    if (!r.rowCount) throw new HttpError(404, 'Producto no encontrado');
    res.json(fmt(r.rows[0]));
  })
);

// ---- Escritura (requiere JWT) ---------------------------------------------
router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const p = validar(req.body);
    const r = await db.query(
      `INSERT INTO productos(nombre,descripcion,precio,imagen,stock) VALUES($1,$2,$3,$4,$5) RETURNING ${COLS}`,
      [p.nombre, p.descripcion, p.precio, p.imagen, p.stock ?? 0]
    );
    res.status(201).json(fmt(r.rows[0]));
  })
);

router.put(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const p = validar(req.body);
    const r = await db.query(
      `UPDATE productos SET nombre=$1,descripcion=$2,precio=$3,imagen=$4,stock=COALESCE($5,stock) WHERE id=$6 RETURNING ${COLS}`,
      [p.nombre, p.descripcion, p.precio, p.imagen, p.stock ?? null, id]
    );
    if (!r.rowCount) throw new HttpError(404, 'Producto no encontrado');
    res.json(fmt(r.rows[0]));
  })
);

// Actualizar inventario: valor absoluto { stock } o ajuste relativo { delta }
router.patch(
  '/:id/stock',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const { stock, delta } = req.body || {};
    let r;
    if (stock !== undefined) {
      const n = Number(stock);
      if (!Number.isInteger(n) || n < 0) throw new HttpError(400, 'stock debe ser un entero mayor o igual a 0');
      r = await db.query(`UPDATE productos SET stock=$1 WHERE id=$2 RETURNING ${COLS}`, [n, id]);
    } else if (delta !== undefined) {
      const d = Number(delta);
      if (!Number.isInteger(d)) throw new HttpError(400, 'delta debe ser un entero');
      r = await db.query(`UPDATE productos SET stock=stock+$1 WHERE id=$2 AND stock+$1>=0 RETURNING ${COLS}`, [d, id]);
      if (!r.rowCount) {
        const ex = await db.query('SELECT stock FROM productos WHERE id=$1', [id]);
        if (!ex.rowCount) throw new HttpError(404, 'Producto no encontrado');
        throw new HttpError(409, `El inventario no puede quedar negativo (stock actual: ${ex.rows[0].stock})`);
      }
    } else {
      throw new HttpError(400, 'Envía { "stock": n } o { "delta": n }');
    }
    if (!r.rowCount) throw new HttpError(404, 'Producto no encontrado');
    res.json(fmt(r.rows[0]));
  })
);

router.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const r = await db.query('DELETE FROM productos WHERE id=$1', [parseId(req.params.id)]);
    if (!r.rowCount) throw new HttpError(404, 'Producto no encontrado');
    res.status(204).end();
  })
);

module.exports = router;
