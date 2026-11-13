import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { Btn, Field, colors, s } from '../components/ui';

export default function Login() {
  const { user, ready, login, register } = useApp();
  const [modo, setModo] = useState<'login' | 'registro'>('login');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('demo@tienda.com');
  const [password, setPassword] = useState('123456');
  const [busy, setBusy] = useState(false);

  if (!ready) return <View style={[s.screen, { justifyContent: 'center' }]}><ActivityIndicator color={colors.primary} /></View>;
  if (user) return <Redirect href="/(tabs)" />;

  const enviar = async () => {
    setBusy(true);
    try {
      if (modo === 'login') await login(email.trim(), password);
      else await register(nombre.trim(), email.trim(), password);
    } catch (e) {
      Alert.alert(modo === 'login' ? 'No se pudo iniciar sesión' : 'No se pudo registrar', e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={s.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, gap: 14 }} keyboardShouldPersistTaps="handled">
          <Text style={{ fontSize: 34, fontWeight: '800', color: colors.primary }}>Tienda móvil</Text>
          <Text style={s.muted}>{modo === 'login' ? 'Inicia sesión para continuar' : 'Crea tu cuenta'}</Text>
          {modo === 'registro' && <Field label="Nombre" value={nombre} onChangeText={setNombre} placeholder="Tu nombre" />}
          <Field label="Correo" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="correo@ejemplo.com" />
          <Field label="Contraseña" value={password} onChangeText={setPassword} secureTextEntry placeholder="Mínimo 6 caracteres" />
          <Btn title={modo === 'login' ? 'Ingresar' : 'Crear cuenta'} onPress={enviar} loading={busy} />
          <Pressable onPress={() => setModo(modo === 'login' ? 'registro' : 'login')}>
            <Text style={{ color: colors.primary, textAlign: 'center', fontWeight: '600' }}>
              {modo === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
            </Text>
          </Pressable>
          {modo === 'login' && <Text style={[s.muted, { textAlign: 'center' }]}>Cuenta de prueba: demo@tienda.com / 123456</Text>}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
