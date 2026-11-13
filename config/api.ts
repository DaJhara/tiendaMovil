
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Detectar automáticamente la IP del computador en desarrollo.
const hostUri = Constants.expoConfig?.hostUri;
const lanHost = hostUri?.split(':')[0];

const host =
  Platform.OS === 'web'
    ? 'localhost'
    : lanHost ||
      (Platform.OS === 'android' ? '10.0.2.2' : 'localhost');

const clean = (url: string) => url.replace(/\/+$/, '');

// En producción utiliza Railway.
// En desarrollo conserva los microservicios locales.
const usarRailway = true;

export const API = {
  auth: clean(
    usarRailway
      ? 'https://authtiendamovil-production.up.railway.app'
      : `http://${host}:3001`
  ),

  productos: clean(
    usarRailway
      ? 'https://productostiendamovil-production.up.railway.app'
      : `http://${host}:3002`
  ),

  compras: clean(
    usarRailway
      ? 'https://comprastiendamovil-production.up.railway.app'
      : `http://${host}:3003`
  ),
};

// Convierte las rutas relativas de imágenes en URL completas.
export function imageUrl(imagen?: string | null): string | null {
  if (!imagen) return null;
  if (/^https?:\/\//i.test(imagen)) return imagen;

  return API.productos + (imagen.startsWith('/') ? imagen : `/${imagen}`);
}
