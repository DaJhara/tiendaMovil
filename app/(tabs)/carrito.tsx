import React, { useState } from 'react';
import { Alert, FlatList, Text, View } from 'react-native';
import { useApp } from '../../context/AppContext';
import { Banner, Btn, ProductImage, colors, money, s } from '../../components/ui';

export default function Carrito() {
  const { cart, change, checkout, online } = useApp();
  const [busy, setBusy] = useState(false);
  const total = cart.reduce((sum, i) => sum + i.precio * i.cantidad, 0);

  const cambiar = (id: number, n: number) => change(id, n).catch((e) => Alert.alert('Carrito', e instanceof Error ? e.message : 'Error'));

  const confirmar = async () => {
    setBusy(true);
    try {
      Alert.alert('Compra', await checkout());
    } catch (e) {
      Alert.alert('No se pudo completar la compra', e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={s.screen}>
      {!online && <Banner>Sin conexión · la compra se guardará y se enviará al volver internet</Banner>}
      <FlatList
        data={cart}
        keyExtractor={(i) => String(i.producto_id)}
        contentContainerStyle={{ padding: 12, gap: 10 }}
        ListEmptyComponent={<Text style={s.empty}>Tu carrito está vacío.</Text>}
        renderItem={({ item }) => (
          <View style={[s.card, s.row]}>
            <ProductImage imagen={item.imagen} size={56} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={s.title}>{item.nombre}</Text>
              <Text style={s.muted}>{money(item.precio)} c/u</Text>
              <Text style={s.price}>{money(item.precio * item.cantidad)}</Text>
            </View>
            <View style={s.row}>
              <Btn title="−" small variant="ghost" onPress={() => cambiar(item.producto_id, item.cantidad - 1)} />
              <Text style={{ fontWeight: '700', minWidth: 18, textAlign: 'center' }}>{item.cantidad}</Text>
              <Btn title="+" small variant="ghost" onPress={() => cambiar(item.producto_id, item.cantidad + 1)} />
            </View>
          </View>
        )}
      />
      <View style={{ padding: 16, gap: 10, borderTopWidth: 1, borderColor: colors.border, backgroundColor: '#fff' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 18, fontWeight: '700' }}>Total</Text>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.primary }}>{money(total)}</Text>
        </View>
        <Btn title="Confirmar compra" onPress={confirmar} loading={busy} disabled={!cart.length} />
        <Text style={[s.muted, { textAlign: 'center', fontSize: 12 }]}>Demo sin pasarela de pagos: la compra se registra directamente.</Text>
      </View>
    </View>
  );
}
