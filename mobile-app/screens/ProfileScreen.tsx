import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { THEME, API_URL } from '../constants';
import { User, Wallet, LogOut } from 'lucide-react-native';

export default function ProfileScreen({ navigation }: any) {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/demo-user`)
      .then(res => res.json())
      .then(data => setUser(data))
      .catch(err => console.error(err));
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profil</Text>
      </View>

      <View style={styles.content}>
        {user && (
          <>
            <Card style={styles.profileCard}>
              <View style={styles.avatarContainer}>
                <User size={40} color={THEME.colors.primary} />
              </View>
              <Text style={styles.name}>{user.name}</Text>
              <Text style={styles.email}>{user.email}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>{user.role}</Text>
              </View>
            </Card>

            <Card title="Cüzdan Durumu">
              <View style={styles.walletRow}>
                <View style={styles.walletIcon}>
                  <Wallet size={24} color={THEME.colors.success} />
                </View>
                <View>
                  <Text style={styles.balanceLabel}>Toplam Bakiye</Text>
                  <Text style={styles.balanceValue}>₺1,250.00</Text>
                </View>
              </View>
            </Card>

            <Button 
              title="Çıkış Yap" 
              onPress={() => navigation.replace('Login')}
              variant="danger"
              style={styles.logoutButton}
            />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: THEME.colors.text,
  },
  content: {
    padding: 20,
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.2)',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: THEME.colors.text,
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: THEME.colors.textSecondary,
    marginBottom: 16,
  },
  roleBadge: {
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.2)',
  },
  roleText: {
    color: THEME.colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  walletRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  balanceLabel: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
  },
  balanceValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: THEME.colors.text,
  },
  logoutButton: {
    marginTop: 'auto',
  },
});
