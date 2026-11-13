class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Permite usar async/await en los routers sin try/catch repetidos.
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const notFound = (req, res) => res.status(404).json({ error: 'Ruta no encontrada' });

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON inválido' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Cuerpo demasiado grande' });
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
};

module.exports = { HttpError, asyncHandler, notFound, errorHandler };
