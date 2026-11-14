const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { HttpError, asyncHandler } = require('../middleware/errors');

const router = express.Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const nombre = String(req.body?.nombre ?? '').trim();
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');
    if (email === 'demo@tienda.com') {
      throw new HttpError(403, 'Este correo está reservado');
    }
    if (!nombre || nombre.length > 120 || !EMAIL_RE.test(email) || email.length > 180 || password.length < 6) {
      throw new HttpError(400, 'Nombre, correo válido y contraseña (mínimo 6 caracteres) son obligatorios');
    }
    const hash = await bcrypt.hash(password, 10);
    try {
      const q = await db.query('INSERT INTO usuarios(nombre,email,password_hash) VALUES($1,$2,$3) RETURNING id,nombre,email', [nombre, email, hash]);
      res.status(201).json(q.rows[0]);
    } catch (e) {
      if (e.code === '23505') throw new HttpError(409, 'El correo ya está registrado');
      throw e;
    }
  })
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');
    const q = await db.query(
      'SELECT id,nombre,email,password_hash,rol FROM usuarios WHERE email=$1',
      [email]
    );

    const u = q.rows[0];
    if (!u || !(await bcrypt.compare(password, u.password_hash))) throw new HttpError(401, 'Credenciales incorrectas');
    const user = {
      id: u.id,
      nombre: u.nombre,
      email: u.email,
      rol: u.rol
    };
    const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
    res.json({ token, user });
  })
);

router.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));

module.exports = router;
