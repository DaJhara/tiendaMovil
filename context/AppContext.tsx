import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as SecureStore from '../services/storage';
import * as Network from 'expo-network';
import * as Crypto from 'expo-crypto';
import { API } from '../config/api';
import { getDB } from '../database/local';
import { HttpError, NetworkError, TOKEN_KEY, isRetryable, request, setUnauthorizedHandler } from '../services/api';

// ───────────────────────────── Tipos ─────────────────────────────
export type User = { id: number; nombre: string; email: string };
export type Product = { id: number; nombre: string; descripcion: string; precio: number; imagen: string; stock: number };
export type ProductInput = { nombre: string; descripcion: string; precio: number; stock: number; imagen: string };
export type CartItem = { producto_id: number; nombre: string; precio: number; cantidad: number; imagen: string | null; stock: number | null };
export type CompraItem = { productoId: number; nombre: string; precio: number; cantidad: number };
export type Compra = {
  client_id: string;
  server_id: number | null;
  cliente: string;
  total: number;
  fecha: string;
  items: CompraItem[];
  estado: 'pendiente' | 'sincronizada' | 'rechazada';
  error: string | null;
};
type ServerCompra = { id: number; client_id: string; cliente: string; total: number; created_at: string };

type Ctx = {
  user: User | null;
  ready: boolean;
  online: boolean;
  products: Product[];
  cart: CartItem[];
  compras: Compra[];
  login: (email: string, password: string) => Promise<void>;
  register: (nombre: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadProducts: () => Promise<void>;
  add: (p: Product) => Promise<void>;
  change: (productoId: number, cantidad: number) => Promise<void>;
  checkout: () => Promise<string>;
  sync: () => Promise<void>;
  loadCompras: () => Promise<void>;
  discardCompra: (clientId: string) => Promise<void>;
  saveProduct: (input: ProductInput, id?: number) => Promise<void>;
  setStock: (id: number, stock: number) => Promise<void>;
  removeProduct: (id: number) => Promise<void>;
};

const C = createContext<Ctx>(null as unknown as Ctx);
export const useApp = () => useContext(C);

const isUp = (s: Network.NetworkState) => !!s.isConnected && s.isInternetReachable !== false;
const OFFLINE_ADMIN = 'Para modificar el catálogo o el inventario necesitas conexión a internet.';

// ─────────────────────── Acceso a SQLite (respaldo local) ───────────────────────
async function readCart(uid: number): Promise<CartItem[]> {
  const db = await getDB();
  return db.getAllAsync<CartItem>(
    `SELECT c.producto_id, c.nombre, c.precio, c.cantidad, p.imagen, p.stock
       FROM carrito c LEFT JOIN productos p ON p.id = c.producto_id
      WHERE c.usuario_id = ? ORDER BY c.nombre`,
    [uid]
  );
}

async function readCompras(uid: number): Promise<Compra[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<any>('SELECT * FROM compras_local WHERE usuario_id = ? ORDER BY fecha DESC', [uid]);
  return rows.map((r) => ({ ...r, items: JSON.parse(r.items) as CompraItem[] }));
}

async function upsertCompra(uid: number, c: Compra) {
  const db = await getDB();
  await db.runAsync(
    `INSERT INTO compras_local (client_id, usuario_id, server_id, cliente, total, fecha, items, estado, error)
     VALUES (?,?,?,?,?,?,?,?,?)
     ON CONFLICT(client_id) DO UPDATE SET server_id=excluded.server_id, cliente=excluded.cliente, total=excluded.total,
       fecha=excluded.fecha, items=excluded.items, estado=excluded.estado, error=excluded.error`,
    [c.client_id, uid, c.server_id, c.cliente, c.total, c.fecha, JSON.stringify(c.items), c.estado, c.error]
  );
}

const fromServer = (c: ServerCompra, items: CompraItem[]): Compra => ({
  client_id: c.client_id,
  server_id: Number(c.id),
  cliente: c.cliente,
  total: Number(c.total),
  fecha: c.created_at,
  items,
  estado: 'sincronizada',
  error: null,
});

// ───────────────────────────── Provider ─────────────────────────────
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [online, setOnline] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [compras, setCompras] = useState<Compra[]>([]);
  const syncing = useRef(false);
  const uid = user?.id;
  const uidRef = useRef<number | undefined>(undefined);
  uidRef.current = uid;

  // Restaurar sesión al abrir la app (funciona sin internet)
  useEffect(() => {
    (async () => {
      try {
        const raw = await SecureStore.getItemAsync('user');
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        if (raw && token) setUser(JSON.parse(raw));
        await getDB();
      } finally {
        setReady(true);
      }
    })();
  }, []);

  // ───────── Autenticación ─────────
  const login = async (email: string, password: string) => {
    try {
      const d = await request<{ token: string; user: User }>(API.auth, '/api/auth/login', { method: 'POST', body: { email, password }, auth: false });
      await SecureStore.setItemAsync(TOKEN_KEY, d.token);
      await SecureStore.setItemAsync('user', JSON.stringify(d.user));
      setUser(d.user);
    } catch (e) {
      if (e instanceof NetworkError) throw new Error('No se pudo conectar con el servicio de autenticación. Revisa tu internet y las URLs del archivo .env');
      throw e;
    }
  };

  const register = async (nombre: string, email: string, password: string) => {
    try {
      await request(API.auth, '/api/auth/register', { method: 'POST', body: { nombre, email, password }, auth: false });
    } catch (e) {
      if (e instanceof NetworkError) throw new Error('No se pudo conectar con el servicio de autenticación.');
      throw e;
    }
    await login(email, password);
  };

  const logout = useCallback(async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync('user');
    setUser(null);
    setCart([]);
    setCompras([]);
  }, []);

  // Si el servidor responde 401 (token vencido) se cierra la sesión. Las compras pendientes NO se pierden.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
    });
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  // ───────── Catálogo (nube primero, SQLite como respaldo) ─────────
  const loadProducts = useCallback(async () => {
    const db = await getDB();
    try {
      const data = await request<Product[]>(API.productos, '/api/productos', { auth: false });
      await db.withTransactionAsync(async () => {
        await db.runAsync('DELETE FROM productos');
        for (const p of data) {
          await db.runAsync('INSERT INTO productos (id, nombre, descripcion, precio, imagen, stock) VALUES (?,?,?,?,?,?)', [
            p.id, p.nombre, p.descripcion ?? '', p.precio, p.imagen ?? '', p.stock ?? 0,
          ]);
        }
      });
      setProducts(data);
    } catch {
      const cached = await db.getAllAsync<Product>('SELECT * FROM productos ORDER BY id');
      setProducts(cached);
      if (!cached.length) throw new Error('No hay productos guardados en el dispositivo y no se pudo conectar al servidor.');
    }
    if (uidRef.current) setCart(await readCart(uidRef.current));
  }, []);

  // ───────── Carrito persistente (SQLite) ─────────
  const add = async (p: Product) => {
    if (!uid) return;
    const db = await getDB();
    const row = await db.getFirstAsync<{ cantidad: number }>('SELECT cantidad FROM carrito WHERE usuario_id=? AND producto_id=?', [uid, p.id]);
    const next = (row?.cantidad ?? 0) + 1;
    if (next > p.stock) throw new Error(p.stock > 0 ? `Solo hay ${p.stock} unidades disponibles` : 'Producto agotado');
    await db.runAsync(
      `INSERT INTO carrito (usuario_id, producto_id, nombre, precio, cantidad) VALUES (?,?,?,?,?)
       ON CONFLICT(usuario_id, producto_id) DO UPDATE SET cantidad=excluded.cantidad, nombre=excluded.nombre, precio=excluded.precio`,
      [uid, p.id, p.nombre, p.precio, next]
    );
    setCart(await readCart(uid));
  };

  const change = async (productoId: number, cantidad: number) => {
    if (!uid) return;
    const db = await getDB();
    if (cantidad <= 0) {
      await db.runAsync('DELETE FROM carrito WHERE usuario_id=? AND producto_id=?', [uid, productoId]);
    } else {
      const item = cart.find((i) => i.producto_id === productoId);
      if (item && item.stock !== null && cantidad > item.stock) throw new Error(`Solo hay ${item.stock} unidades disponibles`);
      await db.runAsync('UPDATE carrito SET cantidad=? WHERE usuario_id=? AND producto_id=?', [cantidad, uid, productoId]);
    }
    setCart(await readCart(uid));
  };

  // ───────── Compras: nube primero; si no hay conexión, cola local ─────────
  const refreshLocal = useCallback(async () => {
    const id = uidRef.current;
    if (!id) return;
    setCart(await readCart(id));
    setCompras(await readCompras(id));
  }, []);

  const checkout = async (): Promise<string> => {
    if (!user) throw new Error('Debes iniciar sesión');
    const items = await readCart(user.id);
    if (!items.length) throw new Error('El carrito está vacío');

    const clientId = Crypto.randomUUID(); // identifica la compra en TODOS los reintentos (evita duplicados)
    const detalle: CompraItem[] = items.map((i) => ({ productoId: i.producto_id, nombre: i.nombre, precio: i.precio, cantidad: i.cantidad }));
    const payload = { clientId, cliente: user.nombre, items: detalle.map((d) => ({ productoId: d.productoId, cantidad: d.cantidad })) };
    const db = await getDB();

    try {
      // 1) Primera opción: registrar directamente en la nube
      const d = await request<{ compra: ServerCompra; items: CompraItem[] }>(API.compras, '/api/compras', { method: 'POST', body: payload });
      await upsertCompra(user.id, fromServer(d.compra, d.items));
      await db.runAsync('DELETE FROM carrito WHERE usuario_id=?', [user.id]);
      await refreshLocal();
      loadProducts().catch(() => {}); // refresca el stock
      return `Compra #${d.compra.id} registrada. Ya puedes descargar la factura en la pestaña "Compras".`;
    } catch (e) {
      // 2) Sin conexión (o servidor caído / sesión vencida): se guarda local y se sincroniza después
      const expired = e instanceof HttpError && e.status === 401;
      if (!isRetryable(e) && !expired) throw e; // rechazo real del servidor (p. ej. stock insuficiente): se muestra y el carrito se conserva

      await db.withTransactionAsync(async () => {
        await upsertCompra(user.id, {
          client_id: clientId,
          server_id: null,
          cliente: user.nombre,
          total: detalle.reduce((s, x) => s + x.precio * x.cantidad, 0),
          fecha: new Date().toISOString(),
          items: detalle,
          estado: 'pendiente',
          error: null,
        });
        await db.runAsync('DELETE FROM carrito WHERE usuario_id=?', [user.id]);
        for (const x of detalle) await db.runAsync('UPDATE productos SET stock = MAX(stock - ?, 0) WHERE id=?', [x.cantidad, x.productoId]);
      });
      if (uidRef.current === user.id) {
        await refreshLocal();
        const cached = await db.getAllAsync<Product>('SELECT * FROM productos ORDER BY id');
        setProducts(cached);
      }
      return expired
        ? 'Tu sesión expiró: la compra quedó guardada y se enviará cuando inicies sesión de nuevo.'
        : 'Sin conexión: la compra quedó guardada en el dispositivo y se enviará automáticamente cuando vuelva internet.';
    }
  };

  // Envía a la nube las compras pendientes (idempotente: reintentar nunca duplica)
  const sync = useCallback(async () => {
    const id = uidRef.current;
    if (!id || syncing.current) return;
    syncing.current = true;
    let changed = false;
    try {
      const db = await getDB();
      const pending = await db.getAllAsync<any>("SELECT * FROM compras_local WHERE usuario_id=? AND estado='pendiente' ORDER BY fecha", [id]);
      for (const row of pending) {
        try {
          const items = JSON.parse(row.items) as CompraItem[];
          const d = await request<{ compra: ServerCompra; items: CompraItem[] }>(API.compras, '/api/compras', {
            method: 'POST',
            body: { clientId: row.client_id, cliente: row.cliente, items: items.map((i) => ({ productoId: i.productoId, cantidad: i.cantidad })) },
          });
          await upsertCompra(id, fromServer(d.compra, d.items));
          changed = true;
        } catch (e) {
          const rejected = e instanceof HttpError && e.status >= 400 && e.status < 500 && ![401, 408, 429].includes(e.status);
          if (!rejected) break; // sin red, 5xx o sesión vencida: se reintenta más tarde
          await db.runAsync("UPDATE compras_local SET estado='rechazada', error=? WHERE client_id=?", [e instanceof Error ? e.message : 'Rechazada por el servidor', row.client_id]);
          changed = true;
        }
      }
    } finally {
      syncing.current = false;
    }
    if (changed) {
      await refreshLocal();
      loadProducts().catch(() => {});
    }
  }, [loadProducts, refreshLocal]);

  // Historial: trae el de la nube (respaldo local) y deja pendientes/rechazadas locales
  const loadCompras = useCallback(async () => {
    const id = uidRef.current;
    if (!id) return;
    try {
      const list = await request<(ServerCompra & { items?: CompraItem[] })[]>(API.compras, '/api/compras');
      for (const c of list) await upsertCompra(id, fromServer(c, c.items ?? []));
    } catch {
      /* sin conexión: se muestra lo que hay en SQLite */
    }
    setCompras(await readCompras(id));
  }, []);

  const discardCompra = async (clientId: string) => {
    const db = await getDB();
    await db.runAsync("DELETE FROM compras_local WHERE client_id=? AND estado IN ('rechazada','pendiente')", [clientId]);
    await refreshLocal();
  };

  // Al iniciar sesión: cargar datos locales, catálogo y sincronizar
  useEffect(() => {
    if (!uid) return;
    (async () => {
      await refreshLocal();
      loadProducts().catch(() => {});
      await sync();
      await loadCompras();
    })();
  }, [uid, refreshLocal, loadProducts, sync, loadCompras]);

  // Reintentar cuando vuelve la red, al volver a la app y cada 30 s mientras haya pendientes
  useEffect(() => {
    Network.getNetworkStateAsync().then((s) => setOnline(isUp(s))).catch(() => {});
    const net = Network.addNetworkStateListener((s) => {
      const up = isUp(s);
      setOnline(up);
      if (up && uidRef.current) {
        sync().then(loadCompras);
        loadProducts().catch(() => {});
      }
    });
    const app = AppState.addEventListener('change', (st) => {
      if (st === 'active') sync();
    });
    return () => {
      net.remove();
      app.remove();
    };
  }, [sync, loadCompras, loadProducts]);

  const hayPendientes = compras.some((c) => c.estado === 'pendiente');
  useEffect(() => {
    if (!uid || !hayPendientes) return;
    const t = setInterval(() => sync(), 30000);
    return () => clearInterval(t);
  }, [uid, hayPendientes, sync]);

  // ───────── CRUD de productos e inventario (requiere internet) ─────────
  const admin = async <T,>(fn: () => Promise<T>): Promise<T> => {
    try {
      return await fn();
    } catch (e) {
      if (e instanceof NetworkError) throw new Error(OFFLINE_ADMIN);
      throw e;
    }
  };

  const saveProduct = async (input: ProductInput, id?: number) => {
    await admin(() =>
      id
        ? request(API.productos, `/api/productos/${id}`, { method: 'PUT', body: input })
        : request(API.productos, '/api/productos', { method: 'POST', body: input })
    );
    await loadProducts();
  };

  const setStock = async (id: number, stock: number) => {
    await admin(() => request(API.productos, `/api/productos/${id}/stock`, { method: 'PATCH', body: { stock } }));
    await loadProducts();
  };

  const removeProduct = async (id: number) => {
    await admin(() => request(API.productos, `/api/productos/${id}`, { method: 'DELETE' }));
    const db = await getDB();
    await db.runAsync('DELETE FROM carrito WHERE producto_id=?', [id]); // un producto borrado no puede seguir en carritos
    await loadProducts();
  };

  return (
    <C.Provider
      value={{ user, ready, online, products, cart, compras, login, register, logout, loadProducts, add, change, checkout, sync, loadCompras, discardCompra, saveProduct, setStock, removeProduct }}
    >
      {children}
    </C.Provider>
  );
}
