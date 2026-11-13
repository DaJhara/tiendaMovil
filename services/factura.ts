import { fetch } from 'expo/fetch';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as SecureStore from './storage';
import { API } from '../config/api';
import { HttpError, NetworkError, TOKEN_KEY } from './api';

/** Descarga la factura PDF generada por el microservicio y abre el menú de compartir/guardar. */
export async function descargarFactura(compraId: number): Promise<void> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  let res;
  try {
    res = await fetch(`${API.compras}/api/compras/${compraId}/factura`, { headers: { Authorization: `Bearer ${token}` } });
  } catch {
    throw new NetworkError('Necesitas conexión a internet para descargar la factura.');
  }
  if (!res.ok) throw new HttpError(res.status, res.status === 404 ? 'No se encontró la factura' : `No se pudo generar la factura (${res.status})`);

  const bytes = new Uint8Array(await res.arrayBuffer());
  const file = new File(Paths.cache, `factura-${compraId}.pdf`);
  if (file.exists) file.delete();
  file.create();
  await file.write(bytes);

  if (!(await Sharing.isAvailableAsync())) throw new Error('Este dispositivo no permite compartir archivos.');
  await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: `Factura ${compraId}` });
}
