import { Platform } from 'react-native';

// Las URLs se definen en .env (EXPO_PUBLIC_*). Sin .env se usa localhost (emulador).
const host = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
const clean = (u: string) => u.replace(/\/+$/, '');

export const API = {
  auth: clean(process.env.EXPO_PUBLIC_AUTH_URL ?? `http://${host}:3001`),
  productos: clean(process.env.EXPO_PUBLIC_PRODUCTOS_URL ?? `http://${host}:3002`),
  compras: clean(process.env.EXPO_PUBLIC_COMPRAS_URL ?? `http://${host}:3003`),
};

// La BD guarda rutas relativas (/images/x.png). Aquí se convierten en URL completa.
export function imageUrl(imagen?: string | null): string | null {
  if (!imagen) return null;
  if (/^https?:\/\//i.test(imagen)) return imagen;
  return API.productos + (imagen.startsWith('/') ? imagen : `/${imagen}`);
}
