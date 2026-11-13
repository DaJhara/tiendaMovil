import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { useApp, Product } from '../../context/AppContext';
import { Banner, Btn, Field, ProductImage, colors, money, s } from '../../components/ui';

const msg = (e: unknown) => (e instanceof Error ? e.message : 'Error desconocido');

function StockRow({ p, onEdit }: { p: Product; onEdit: (p: Product) => void }) {
  const { setStock, removeProduct } = useApp();
  const [valor, setValor] = useState(String(p.stock));
  const [busy, setBusy] = useState(false);

  React.useEffect(() => setValor(String(p.stock)), [p.stock]);

  const guardar = async () => {
    const n = Number(valor);
    if (!Number.isInteger(n) || n < 0) return Alert.alert('Inventario', 'Escribe un número entero mayor o igual a 0');
    setBusy(true);
    try {
      await setStock(p.id, n);
    } catch (e) {
      Alert.alert('Inventario', msg(e));
    } finally {
      setBusy(false);
    }
  };

  const borrar = () =>
    Alert.alert('Eliminar producto', `¿Eliminar "${p.nombre}"? Las compras anteriores conservan su detalle.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => removeProduct(p.id).catch((e) => Alert.alert('Inventario', msg(e))) },
    ]);

  return (
    <View style={[s.card, { gap: 10 }]}>
      <View style={s.row}>
        <ProductImage imagen={p.imagen} size={52} />
        <View style={{ flex: 1 }}>
          <Text style={s.title}>{p.nombre}</Text>
          <Text style={s.muted}>{money(p.precio)} · stock actual: {p.stock}</Text>
        </View>
      </View>
      <View style={s.row}>
        <View style={{ width: 90 }}>
          <Field label="Nuevo stock" value={valor} onChangeText={setValor} keyboardType="number-pad" />
        </View>
        <View style={[s.row, { flex: 1, justifyContent: 'flex-end', alignSelf: 'flex-end' }]}>
          <Btn title="Guardar" small onPress={guardar} loading={busy} />
          <Btn title="Editar" small variant="ghost" onPress={() => onEdit(p)} />
          <Btn title="Borrar" small variant="danger" onPress={borrar} />
        </View>
      </View>
    </View>
  );
}

export default function Inventario() {
  const { products, saveProduct, online } = useApp();
  const [editId, setEditId] = useState<number | undefined>();
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState('');
  const [stock, setStock] = useState('');
  const [imagen, setImagen] = useState('');
  const [busy, setBusy] = useState(false);

  const limpiar = () => {
    setEditId(undefined); setNombre(''); setDescripcion(''); setPrecio(''); setStock(''); setImagen('');
  };

  const editar = (p: Product) => {
    setEditId(p.id); setNombre(p.nombre); setDescripcion(p.descripcion); setPrecio(String(p.precio)); setStock(String(p.stock)); setImagen(p.imagen);
  };

  const guardar = async () => {
    const p = Number(precio.replace(',', '.'));
    const st = stock.trim() === '' ? 0 : Number(stock);
    if (!nombre.trim()) return Alert.alert('Producto', 'El nombre es obligatorio');
    if (!Number.isFinite(p) || p < 0) return Alert.alert('Producto', 'El precio debe ser un número válido');
    if (!Number.isInteger(st) || st < 0) return Alert.alert('Producto', 'El stock debe ser un entero mayor o igual a 0');
    setBusy(true);
    try {
      await saveProduct({ nombre: nombre.trim(), descripcion: descripcion.trim(), precio: p, stock: st, imagen: imagen.trim() }, editId);
      Alert.alert('Producto', editId ? 'Producto actualizado' : 'Producto agregado');
      limpiar();
    } catch (e) {
      Alert.alert('Producto', msg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {!online && <Banner>Sin conexión · el catálogo y el inventario solo se pueden modificar con internet</Banner>}
      <ScrollView contentContainerStyle={{ padding: 12, gap: 12 }} keyboardShouldPersistTaps="handled">
        <View style={[s.card, { gap: 10 }]}>
          <Text style={[s.title, { fontSize: 17 }]}>{editId ? `Editar producto #${editId}` : 'Agregar producto'}</Text>
          <Field label="Nombre" value={nombre} onChangeText={setNombre} placeholder="Ej. Webcam HD" />
          <Field label="Descripción" value={descripcion} onChangeText={setDescripcion} placeholder="Opcional" />
          <View style={s.row}>
            <View style={{ flex: 1 }}><Field label="Precio (COP)" value={precio} onChangeText={setPrecio} keyboardType="decimal-pad" placeholder="49900" /></View>
            <View style={{ flex: 1 }}><Field label="Stock" value={stock} onChangeText={setStock} keyboardType="number-pad" placeholder="0" /></View>
          </View>
          <Field label="Imagen (URL, opcional)" value={imagen} onChangeText={setImagen} autoCapitalize="none" placeholder="https://..." />
          <View style={s.row}>
            <View style={{ flex: 1 }}><Btn title={editId ? 'Guardar cambios' : 'Agregar producto'} onPress={guardar} loading={busy} /></View>
            {editId !== undefined && <Btn title="Cancelar" variant="ghost" onPress={limpiar} />}
          </View>
        </View>

        <Text style={[s.title, { fontSize: 17, color: colors.text }]}>Inventario ({products.length})</Text>
        {products.map((p) => <StockRow key={p.id} p={p} onEdit={editar} />)}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
