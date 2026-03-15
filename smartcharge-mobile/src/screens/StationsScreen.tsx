import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { getStations, Station } from "../features/stations/stationsApi";
import StationsLeafletMap from "../components/StationsLeafletMap";
import { theme } from "../theme";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function StationsScreen({ navigation }: any) {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const insets = useSafeAreaInsets();

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await getStations();
        setStations(data);
      } catch (e: any) {
        setErr(e?.message ?? "İstasyonlar yüklenemedi");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const subtitle = useMemo(() => {
    if (!stations?.length) return "Yoğunluğu düşük istasyonları keşfet.";
    return `${stations.length} istasyon • Eco slotları yakala`;
  }, [stations]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, justifyContent: "center", alignItems: "center" }}>
        <View
          style={{
            paddingVertical: 18,
            paddingHorizontal: 18,
            borderRadius: 18,
            backgroundColor: "rgba(255,255,255,0.06)",
            borderWidth: 1,
            borderColor: theme.border,
            alignItems: "center",
            gap: 10,
          }}
        >
          <ActivityIndicator />
          <Text style={{ color: theme.muted, fontWeight: "800" }}>Harita hazırlanıyor...</Text>
          <Text style={{ color: theme.muted2, fontSize: 12 }}>İstasyonlar yükleniyor</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={["top"]}>
      {/* Map */}
      <StationsLeafletMap
        stations={stations}
        onSelect={(stationId) => navigation.navigate("StationDetail", { id: stationId })}
      />

      {/* Top overlay header (glass) */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: insets.top + 16,
          left: 12,
          right: 12,
          borderRadius: 18,
          paddingVertical: 12,
          paddingHorizontal: 14,
          backgroundColor: "rgba(17,24,39,0.78)",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.10)",
        }}
      >
        <Text style={{ color: theme.text, fontSize: 16, fontWeight: "900" }}>Akıllı Harita</Text>
        <Text style={{ color: theme.muted, marginTop: 2, fontSize: 12 }}>{subtitle}</Text>

        {/* Error banner */}
        {err ? (
          <View
            style={{
              marginTop: 10,
              padding: 10,
              borderRadius: 14,
              backgroundColor: "rgba(239,68,68,0.12)",
              borderWidth: 1,
              borderColor: "rgba(239,68,68,0.25)",
            }}
          >
            <Text style={{ color: "#fecaca", fontWeight: "800" }}>{err}</Text>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}