import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { Image } from 'expo-image';
import { imageUrl } from '../config/api';

export const colors = {
  bg: '#f8fafc', card: '#ffffff', border: '#e2e8f0', text: '#0f172a', muted: '#64748b',
  primary: '#4f46e5', danger: '#dc2626', ok: '#16a34a', warn: '#d97706',
};

export const money = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`;

export function Btn({ title, onPress, variant = 'primary', disabled, loading, small }: {
  title: string; onPress: () => void; variant?: 'primary' | 'ghost' | 'danger'; disabled?: boolean; loading?: boolean; small?: boolean;
}) {
  const off = disabled || loading;
  const bg = variant === 'primary' ? colors.primary : variant === 'danger' ? colors.danger : 'transparent';
  const fg = variant === 'ghost' ? colors.primary : '#fff';
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [s.btn, small && s.btnSmall, { backgroundColor: bg, opacity: off ? 0.5 : pressed ? 0.8 : 1 }, variant === 'ghost' && { borderWidth: 1, borderColor: colors.primary }]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <Text style={[s.btnText, { color: fg }, small && { fontSize: 13 }]}>{title}</Text>}
    </Pressable>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput placeholderTextColor="#94a3b8" {...props} style={[s.input, props.style]} />
    </View>
  );
}

export function Banner({ children, tone = 'warn' }: { children: React.ReactNode; tone?: 'warn' | 'ok' }) {
  return (
    <View style={[s.banner, { backgroundColor: tone === 'warn' ? '#fef3c7' : '#dcfce7' }]}>
      <Text style={{ color: tone === 'warn' ? '#92400e' : '#166534', fontSize: 13 }}>{children}</Text>
    </View>
  );
}

export function ProductImage({ imagen, size = 72 }: { imagen?: string | null; size?: number }) {
  const uri = imageUrl(imagen);
  const box = { width: size, height: size, borderRadius: 12 };
  if (!uri) return <View style={[box, { backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' }]}><Text style={{ fontSize: size / 2.5 }}>📦</Text></View>;
  // cachePolicy "disk": la imagen queda guardada en el celular y se ve sin internet
  return <Image source={{ uri }} style={box} contentFit="cover" cachePolicy="disk" transition={150} />;
}

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontSize: 15, fontWeight: '700', color: colors.text },
  muted: { fontSize: 13, color: colors.muted },
  price: { fontSize: 15, fontWeight: '700', color: colors.primary },
  label: { fontSize: 12, fontWeight: '600', color: colors.muted },
  input: { borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: colors.text },
  btn: { borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  btnSmall: { paddingVertical: 8, paddingHorizontal: 12 },
  btnText: { fontWeight: '700', fontSize: 15 },
  banner: { paddingVertical: 8, paddingHorizontal: 14 },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 40 },
});
