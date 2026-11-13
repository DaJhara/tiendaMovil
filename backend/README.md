# Microservicios

| Carpeta | Puerto | Responsabilidad |
|---|---|---|
| `auth/` | 3001 | Registro, login, validación de JWT |
| `productos/` | 3002 | CRUD de productos, inventario, imágenes estáticas, seed |
| `compras/` | 3003 | Compras idempotentes (descuenta stock en transacción) y factura PDF |

Estructura de cada servicio: `src/server.js` (arranque) · `src/app.js` (Express) · `src/routes/*` (routers) · `src/swagger.js` (OpenAPI 3, servido en `/docs`) · `src/db.js` · `src/schema.js` · `src/middleware/*` · `Dockerfile` · `.env.example`.

Comandos (desde esta carpeta): `npm run install:all` · `npm run setup:env -- "<DATABASE_URL>"` · `npm run dev:all` · `npm run start:all` · `npm run seed` · `npm run sync:shared`.

Docker (ejemplo): `docker build -t tienda-auth backend/auth && docker run --env-file backend/auth/.env -p 3001:3001 tienda-auth`
