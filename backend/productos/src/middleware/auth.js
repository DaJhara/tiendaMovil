const jwt = require('jsonwebtoken');

// Valida el JWT emitido por el servicio auth (mismo JWT_SECRET en todos los servicios).
function requireAuth(req, res, next) {
  try {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const p = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: p.id, nombre: p.nombre, email: p.email };
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o ausente' });
  }
}

module.exports = { requireAuth };
