import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../components/Card';
import { THEME, API_URL } from '../constants';
import { MapPin, Battery, Zap } from 'lucide-react-native';

export default function HomeScreen() {
  const [stations, setStations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStations = async () => {
    try {
      const response = await fetch(`${API_URL}/api/stations`);
      const data = await response.json();
      setStations(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStations();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>İstasyonlar</Text>
        <Text style={styles.headerSubtitle}>Yakınındaki şarj noktaları</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchStations} tintColor={THEME.colors.primary} />
        }
      >
        {stations.map((station) => (
          <Card key={station.id} style={styles.stationCard}>
            <View style={styles.stationHeader}>
              <View style={styles.stationIcon}>
                <Zap size={20} color={THEME.colors.primary} />
              </View>
              <View style={styles.stationInfo}>
                <Text style={styles.stationName}>{station.name}</Text>
                <View style={styles.locationRow}>
                  <MapPin size={14} color={THEME.colors.textSecondary} />
                  <Text style={styles.stationLocation}>
                    {station.latitude.toFixed(4)}, {station.longitude.toFixed(4)}
                  </Text>
                </View>
              </View>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>Aktif</Text>
              </View>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Tip</Text>
                <Text style={styles.statValue}>{station.type}</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Fiyat</Text>
                <Text style={styles.statValue}>₺{station.price}/kWh</Text>
              </View>
            </View>
          </Card>
        ))}
      </ScrollView>
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
  headerSubtitle: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    marginTop: 4,
  },
  scrollContent: {
    padding: 20,
  },
  stationCard: {
    marginBottom: 16,
  },
  stationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stationInfo: {
    flex: 1,
  },
  stationName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: THEME.colors.text,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stationLocation: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
  },
  statusBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  statusText: {
    color: THEME.colors.success,
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: THEME.colors.cardBorder,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stat: {
    gap: 4,
  },
  statLabel: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.text,
  },
});
