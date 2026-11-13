import React from 'react';
import { Pressable, Text } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { useApp } from '../../context/AppContext';
import { colors } from '../../components/ui';

const icon = (e: string) => () => <Text style={{ fontSize: 18 }}>{e}</Text>;

export default function TabsLayout() {
  const { user, ready, logout, cart, compras } = useApp();
  if (!ready) return null;
  if (!user) return <Redirect href="/login" />;

  const unidades = cart.reduce((n, i) => n + i.cantidad, 0);
  const pendientes = compras.filter((c) => c.estado === 'pendiente').length;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        headerTitleStyle: { fontWeight: '700' },
        headerRight: () => (
          <Pressable onPress={logout} style={{ paddingHorizontal: 16 }}>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>Salir</Text>
          </Pressable>
        ),
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Productos', tabBarIcon: icon('🛍️') }} />
      <Tabs.Screen name="carrito" options={{ title: 'Carrito', tabBarIcon: icon('🛒'), tabBarBadge: unidades || undefined }} />
      <Tabs.Screen name="historial" options={{ title: 'Compras', tabBarIcon: icon('🧾'), tabBarBadge: pendientes || undefined }} />
      <Tabs.Screen name="inventario" options={{ title: 'Inventario', tabBarIcon: icon('📦') }} />
    </Tabs>
  );
}
