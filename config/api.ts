
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Expo Go proporciona automáticamente la dirección del computador
// que ejecuta el servidor de desarrollo.
const hostUri = Constants.expoConfig?.hostUri;
const lanHost = hostUri?.split(':')[0];

// Web utiliza localhost.
// Android físico utiliza automáticamente la IP detectada por Expo Go.
// El emulador Android tiene 10.0.2.2 como alternativa.
const host =
  Platform.OS === 'web'
    ? 'localhost'
    : lanHost ||
      (Platform.OS === 'android' ? '10.0.2.2' : 'localhost');

const clean = (url: string) => url.replace(/\/+$/, '');

export const API = {
  auth: clean(`http://${host}:3001`),
  productos: clean(`http://${host}:3002`),
  compras: clean(`http://${host}:3003`),
};

// Convierte las rutas relativas de imágenes en URL completas.
export function imageUrl(imagen?: string | null): string | null {
  if (!imagen) return null;
  if (/^https?:\/\//i.test(imagen)) return imagen;

  return API.productos + (imagen.startsWith('/') ? imagen : `/${imagen}`);
}
