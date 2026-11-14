
const jwt = require('jsonwebtoken');

// Valida el JWT emitido por Auth.
function requireAuth(req, res, next) {
  try {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const p = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      id: p.id,
      nombre: p.nombre,
      email: p.email,
      rol: p.rol
    };

    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o ausente' });
  }
}

// Permite continuar únicamente a administradores.
function requireAdmin(req, res, next) {
  if (req.user?.rol !== 'admin') {
    return res.status(403).json({
      error: 'No tienes permisos para administrar productos'
    });
  }

  next();
}

module.exports = { requireAuth, requireAdmin };
