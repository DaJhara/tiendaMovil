import * as SQLite from 'expo-sqlite';

/**
 * Respaldo local (SQLite). Contiene:
 *  - productos:     copia del catálogo de la nube (para ver el catálogo sin internet)
 *  - carrito:       carrito persistente, por usuario
 *  - compras_local: historial local + cola de compras pendientes de sincronizar
 *                   estado: 'pendiente' | 'sincronizada' | 'rechazada'
 */
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDB(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('tienda.db');
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS productos (
          id INTEGER PRIMARY KEY, nombre TEXT NOT NULL, descripcion TEXT, precio REAL NOT NULL, imagen TEXT, stock INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS carrito (
          usuario_id INTEGER NOT NULL, producto_id INTEGER NOT NULL, nombre TEXT NOT NULL, precio REAL NOT NULL, cantidad INTEGER NOT NULL,
          PRIMARY KEY (usuario_id, producto_id)
        );
        CREATE TABLE IF NOT EXISTS compras_local (
          client_id TEXT PRIMARY KEY, usuario_id INTEGER NOT NULL, server_id INTEGER, cliente TEXT NOT NULL, total REAL NOT NULL,
          fecha TEXT NOT NULL, items TEXT NOT NULL, estado TEXT NOT NULL, error TEXT
        );
      `);
      return db;
    })();
  }
  return dbPromise;
}
