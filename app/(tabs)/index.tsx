import React, { useState } from 'react';
import { Alert, FlatList, Text, View } from 'react-native';
import { useApp, Product } from '../../context/AppContext';
import { Banner, Btn, ProductImage, colors, money, s } from '../../components/ui';

export default function Productos() {
  const { products, loadProducts, add, online } = useApp();
  const [refreshing, setRefreshing] = useState(false);

  const refrescar = async () => {
    setRefreshing(true);
    try {
      await loadProducts();
    } catch (e) {
      Alert.alert('Catálogo', e instanceof Error ? e.message : 'Error');
    } finally {
      setRefreshing(false);
    }
  };

  const agregar = (p: Product) => add(p).catch((e) => Alert.alert('Carrito', e instanceof Error ? e.message : 'Error'));

  return (
    <View style={s.screen}>
      {!online && <Banner>Sin conexión · mostrando la copia guardada en el dispositivo</Banner>}
      <FlatList
        data={products}
        keyExtractor={(p) => String(p.id)}
        refreshing={refreshing}
        onRefresh={refrescar}
        contentContainerStyle={{ padding: 12, gap: 10 }}
        ListEmptyComponent={<Text style={s.empty}>No hay productos. Desliza hacia abajo para actualizar.</Text>}
        renderItem={({ item }) => (
          <View style={[s.card, s.row]}>
            <ProductImage imagen={item.imagen} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={s.title}>{item.nombre}</Text>
              <Text style={s.muted} numberOfLines={2}>{item.descripcion}</Text>
              <Text style={s.price}>{money(item.precio)}</Text>
              <Text style={{ fontSize: 12, color: item.stock > 0 ? colors.ok : colors.danger }}>{item.stock > 0 ? `${item.stock} disponibles` : 'Agotado'}</Text>
            </View>
            <Btn title="Agregar" small disabled={item.stock <= 0} onPress={() => agregar(item)} />
          </View>
        )}
      />
    </View>
  );
}
