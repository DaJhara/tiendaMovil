import React, { useState } from 'react';
import { Alert, FlatList, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useApp, Compra } from '../../context/AppContext';
import { descargarFactura } from '../../services/factura';
import { Banner, Btn, colors, money, s } from '../../components/ui';

const ESTADO = {
  pendiente: { txt: 'Pendiente de sincronizar', color: colors.warn },
  sincronizada: { txt: 'Registrada en la nube', color: colors.ok },
  rechazada: { txt: 'Rechazada por el servidor', color: colors.danger },
} as const;

export default function Historial() {
  const { compras, sync, loadCompras, discardCompra, online } = useApp();
  const [refreshing, setRefreshing] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  const refrescar = async () => {
    setRefreshing(true);
    await sync();
    await loadCompras();
    setRefreshing(false);
  };
  useFocusEffect(React.useCallback(() => { loadCompras(); }, [loadCompras]));

  const factura = async (c: Compra) => {
    if (c.server_id === null) return;
    setDownloading(c.client_id);
    try {
      await descargarFactura(c.server_id);
    } catch (e) {
      Alert.alert('Factura', e instanceof Error ? e.message : 'Error');
    } finally {
      setDownloading(null);
    }
  };

  const descartar = (c: Compra) =>
    Alert.alert('Descartar compra', '¿Eliminar esta compra del dispositivo? No se enviará a la nube.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Descartar', style: 'destructive', onPress: () => discardCompra(c.client_id) },
    ]);

  const pendientes = compras.filter((c) => c.estado === 'pendiente').length;

  return (
    <View style={s.screen}>
      {!online && <Banner>Sin conexión · historial guardado en el dispositivo</Banner>}
      {pendientes > 0 && <Banner>{pendientes} compra(s) esperando sincronización. Se enviarán automáticamente.</Banner>}
      <FlatList
        data={compras}
        keyExtractor={(c) => c.client_id}
        refreshing={refreshing}
        onRefresh={refrescar}
        contentContainerStyle={{ padding: 12, gap: 10 }}
        ListHeaderComponent={pendientes > 0 ? <Btn title="Sincronizar ahora" variant="ghost" onPress={refrescar} /> : null}
        ListEmptyComponent={<Text style={s.empty}>Aún no tienes compras.</Text>}
        renderItem={({ item }) => {
          const e = ESTADO[item.estado];
          return (
            <View style={[s.card, { gap: 6 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={s.title}>{item.server_id ? `Compra #${item.server_id}` : 'Compra local'}</Text>
                <Text style={s.price}>{money(item.total)}</Text>
              </View>
              <Text style={s.muted}>{new Date(item.fecha).toLocaleString('es-CO')}</Text>
              <Text style={s.muted} numberOfLines={2}>{item.items.map((i) => `${i.cantidad}× ${i.nombre}`).join(', ')}</Text>
              <Text style={{ color: e.color, fontWeight: '600', fontSize: 13 }}>{e.txt}</Text>
              {item.error && <Text style={{ color: colors.danger, fontSize: 13 }}>{item.error}</Text>}
              <View style={[s.row, { marginTop: 4 }]}>
                {item.estado === 'sincronizada' && (
                  <Btn title="Factura PDF" small onPress={() => factura(item)} loading={downloading === item.client_id} />
                )}
                {item.estado !== 'sincronizada' && <Btn title="Descartar" small variant="danger" onPress={() => descartar(item)} />}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}
