# TiendaMovil — Expo SDK 58 + Node.js

Tienda móvil minimalista: login JWT, catálogo en PostgreSQL (nube) con respaldo SQLite, carrito persistente,
compras con cola offline + sincronización automática, CRUD de productos/inventario y factura PDF.

```
app/            Expo Router:  index (login) · (tabs)/index (productos) · carrito · historial (compras) · inventario
components/     UI compartida (botones, campos, imagen con caché en disco)
context/        AppContext: sesión, catálogo, carrito, cola offline, sincronización
database/       local.ts → SQLite (productos, carrito, compras_local)
services/       api.ts (fetch + errores + token) · factura.ts (descarga/compartir PDF)
config/api.ts   URLs de los microservicios (desde .env)
backend/
  auth/         :3001  registro, login, /me            (JWT)
  productos/    :3002  CRUD + inventario + /images     (seed de 10 productos con imagen)
  compras/      :3003  compras idempotentes + factura PDF
  database/schema.sql   schema PostgreSQL (el de la guía + columna productos.stock)
```

## Requisitos
- **Node.js 22.13+** (requisito de Expo SDK 58; los microservicios funcionan desde Node 20)
- Una base **PostgreSQL en la nube** (Railway, Neon, Supabase, Render…) → copia su `DATABASE_URL`
- Celular con **Expo Go (versión SDK 58)** o un emulador. Si Expo Go aún no te muestra SDK 58: `npx expo run:android` / `run:ios` (development build)

---

## 1) Backend (3 microservicios)

```bash
cd backend
npm run install:all                                   # instala auth, productos y compras
npm run setup:env -- "postgresql://USER:PASS@HOST:5432/DB?sslmode=require"
npm run dev:all                                       # levanta los 3 en una sola terminal
```
`setup:env` crea los tres `.env` con el **mismo** `DATABASE_URL` y el **mismo** `JWT_SECRET` (generado al azar).
Al arrancar, los servicios crean las tablas, insertan los **10 productos** (con imagen y stock) y el usuario
**demo@tienda.com / 123456**. No hace falta ejecutar SQL a mano (el schema está en `backend/database/schema.sql` por si lo quieres).

Swagger (documentación interactiva):
| Servicio | Swagger | JSON OpenAPI | Salud |
|---|---|---|---|
| Auth | http://localhost:3001/docs | /docs.json | /health |
| Productos | http://localhost:3002/docs | /docs.json | /health |
| Compras / Facturas | http://localhost:3003/docs | /docs.json | /health |

Alternativa manual (una terminal por servicio): `cd backend/auth && npm install && cp .env.example .env && npm run dev` (igual para `productos` y `compras`).

### Rutas
| Servicio | Método y ruta | Auth | Descripción |
|---|---|---|---|
| auth | `POST /api/auth/register` | – | Registrar usuario |
| auth | `POST /api/auth/login` | – | Login → `{ token, user }` |
| auth | `GET /api/auth/me` | JWT | Usuario del token |
| productos | `GET /api/productos` · `GET /api/productos/:id` | – | Listar / consultar |
| productos | `POST /api/productos` | JWT | Crear |
| productos | `PUT /api/productos/:id` | JWT | Actualizar |
| productos | `PATCH /api/productos/:id/stock` | JWT | Inventario: `{ "stock": 50 }` o `{ "delta": -3 }` |
| productos | `DELETE /api/productos/:id` | JWT | Eliminar |
| productos | `GET /images/<archivo>.png` | – | Imágenes de producto |
| compras | `POST /api/compras` | JWT | Registrar compra (idempotente por `clientId`, descuenta stock) |
| compras | `GET /api/compras` · `GET /api/compras/:id` | JWT | Historial / detalle |
| compras | `GET /api/compras/:id/factura` | JWT | **Factura PDF** |

---

## 2) App Expo

```bash
cd TiendaMovil          # raíz del proyecto
npm install
npm run setup           # = expo install <todas las librerías> + expo install --fix  (versiones exactas para SDK 58)
cp .env.example .env    # Windows: copy .env.example .env   → edita las 3 URLs
npm run start:clear
```
Las URLs de `.env` dependen de dónde corre la app:
- **Celular físico** (mismo Wi-Fi que el PC): `http://IP_DE_TU_PC:3001` / `:3002` / `:3003`
- **Android Emulator**: `http://10.0.2.2:3001` … · **iOS Simulator**: `http://localhost:3001` …
- **Producción**: las URLs HTTPS de tus servicios desplegados.

Si cambias `.env`, reinicia con `npm run start:clear`. Para validar el proyecto: `npm run doctor` y `npm run typecheck`.

---

## 3) Cómo funciona offline
| Caso | Comportamiento |
|---|---|
| Catálogo | Se lee de la nube y se copia a SQLite. Sin internet se muestra la última copia (imágenes en caché de disco). |
| Carrito | Siempre en SQLite, por usuario: sobrevive a cerrar/recargar la app. |
| Compra | **1º se envía a la nube.** Si no hay red (o el servidor está caído) se guarda en SQLite con un UUID (`clientId`) y estado *pendiente*. |
| Sincronización | Automática al volver la red, al abrir la app y cada 30 s mientras haya pendientes; también con “Sincronizar ahora”. El UUID hace que reintentar **nunca duplique** compras ni stock. |
| Rechazos | Si al sincronizar el servidor la rechaza (p. ej. stock insuficiente) queda *rechazada* con el motivo y puedes descartarla. |
| Factura | Se genera en el servidor, por eso está disponible cuando la compra ya está sincronizada. |
| Inventario / CRUD | Requiere internet (la pantalla lo avisa). |

**Probarlo:** activa modo avión → agrega productos → *Confirmar compra* (queda “Pendiente”) → desactiva el modo avión → en segundos pasa a “Registrada en la nube” → *Factura PDF*.

---

## 4) Despliegue en la web (Railway, Render, Fly…)
Cada servicio es independiente (tiene `package.json`, `Dockerfile` y `.env.example`):
1. Crea 3 servicios desde el repo con *Root Directory* `backend/auth`, `backend/productos`, `backend/compras` (comando: `npm start`, o usa el `Dockerfile`).
2. Variables en **los tres**: `DATABASE_URL` y `JWT_SECRET` (idéntico). Opcional: `CORS_ORIGIN`. En auth pon `SEED_DEMO_USER=false` si no quieres el usuario demo.
3. El puerto lo toma de `PORT` (lo inyecta la plataforma). Healthcheck: `/health`. Swagger: `https://<tu-servicio>/docs`.
4. Pon las URLs públicas (HTTPS) en `EXPO_PUBLIC_*_URL` de la app.

## Notas
- Cambio sobre el schema de la guía: se añadió `productos.stock` (necesario para el inventario).
- Sin pasarela de pagos: la compra se registra directamente. La factura incluye una leyenda de “sin validez fiscal”.
- Las partes de `backend/_shared/` se copian a cada servicio (`npm run sync:shared` en `backend/`) para que cada uno se despliegue solo.
- Proyecto educativo: para producción añade refresh tokens, rate limiting, migraciones versionadas y monitoreo.
