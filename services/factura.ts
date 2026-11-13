
import { Platform } from 'react-native';
import { fetch } from 'expo/fetch';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as SecureStore from './storage';
import { API } from '../config/api';
import { HttpError, NetworkError, TOKEN_KEY } from './api';

/**
 * Descarga la factura PDF generada por el microservicio.
 *
 * Web: descarga automáticamente el archivo desde el navegador.
 * Android/iOS: guarda temporalmente el archivo y abre compartir.
 */
export async function descargarFactura(compraId: number): Promise<void> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);

  let res;

  try {
    res = await fetch(
      `${API.compras}/api/compras/${compraId}/factura`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  } catch {
    throw new NetworkError(
      'Necesitas conexión a internet para descargar la factura.'
    );
  }

  if (!res.ok) {
    throw new HttpError(
      res.status,
      res.status === 404
        ? 'No se encontró la factura'
        : `No se pudo generar la factura (${res.status})`
    );
  }

  const bytes = await res.arrayBuffer();
  const nombreArchivo = `factura-${compraId}.pdf`;

  // WEB: descargar directamente desde el navegador.
  if (Platform.OS === 'web') {
    if (typeof document === 'undefined') {
      throw new Error('No se puede acceder al navegador.');
    }

    const blob = new Blob([bytes], {
      type: 'application/pdf',
    });

    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');

    enlace.href = url;
    enlace.download = nombreArchivo;
    enlace.style.display = 'none';

    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);

    // Liberar la memoria utilizada por el PDF.
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    return;
  }

  // ANDROID / IOS: guardar temporalmente y compartir.
  const file = new File(Paths.cache, nombreArchivo);

  if (file.exists) {
    file.delete();
  }

  file.create();
  await file.write(new Uint8Array(bytes));

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error(
      'Este dispositivo no permite compartir archivos.'
    );
  }

  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: `Factura ${compraId}`,
  });
}
