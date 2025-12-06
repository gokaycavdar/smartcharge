import React, { useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { THEME, API_URL } from '../constants';
import { Zap } from 'lucide-react-native';

export default function LoginScreen({ navigation }: any) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      // Demo login for driver
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'driver@test.com' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Giriş başarısız');
      }

      // Navigate to Main App
      navigation.replace('Main');
    } catch (err) {
      console.error(err);
      setError('Bağlantı hatası. Backend çalışıyor mu?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Zap size={40} color={THEME.colors.primary} fill={THEME.colors.primary} />
          </View>
          <Text style={styles.title}>SmartCharge AI</Text>
          <Text style={styles.subtitle}>Sürücü Mobil Uygulaması</Text>
        </View>

        <View style={styles.form}>
          <Button 
            title="Sürücü Olarak Giriş Yap (Demo)" 
            onPress={handleLogin} 
            loading={loading}
          />
          {error && <Text style={styles.error}>{error}</Text>}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.2)',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: THEME.colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: THEME.colors.textSecondary,
  },
  form: {
    gap: 16,
  },
  error: {
    color: THEME.colors.danger,
    textAlign: 'center',
    marginTop: 16,
  },
});
