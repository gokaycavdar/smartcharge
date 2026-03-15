import React, { useMemo, useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { createReservation } from "../features/reservations/reservationsApi";

// ----- THEME -----
const C = {
  bg: "#07101F",
  card: "rgba(255,255,255,0.06)",
  card2: "rgba(255,255,255,0.04)",
  border: "rgba(255,255,255,0.10)",
  text: "#EAF0FF",
  muted: "rgba(234,240,255,0.65)",
  muted2: "rgba(234,240,255,0.45)",
  primary: "#1D4ED8",
  primarySoft: "rgba(29,78,216,0.22)",
  green: "#22C55E",
  greenSoft: "rgba(34,197,94,0.18)",
  red: "#EF4444",
  redSoft: "rgba(239,68,68,0.18)",
  yellow: "#F59E0B",
  yellowSoft: "rgba(245,158,11,0.18)",
};

function safeErr(e: any) {
  return (
    e?.response?.data?.error?.message ||
    e?.response?.data?.message ||
    (typeof e?.response?.data === "string" ? e.response.data : "") ||
    e?.message ||
    "Bir hata oluştu."
  );
}

function fmtMoney(n: any) {
  const v = Number(n);
  if (Number.isNaN(v)) return "-";
  return v.toFixed(2);
}

export default function CreateReservationScreen({ route, navigation }: any) {
  const { stationId, slot } = route.params;

  const date = String(slot?.startTime); // ISO
  const hour = String(slot?.label); // "00:00"
  const isGreen = Boolean(slot?.isGreen);

  const price = slot?.price;
  const coins = slot?.coins;
  const load = slot?.load;
  const status = slot?.status;
  const campaign = slot?.campaignApplied;

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [successId, setSuccessId] = useState<number | null>(null);

  const title = useMemo(() => {
    if (isGreen) return "Eco Slot Rezervasyonu";
    return "Rezervasyon";
  }, [isGreen]);

  const pill = (label: string, value: string, tone?: "green" | "blue" | "yellow") => {
    const bg =
      tone === "green"
        ? C.greenSoft
        : tone === "yellow"
        ? C.yellowSoft
        : C.primarySoft;

    const border =
      tone === "green"
        ? "rgba(34,197,94,0.30)"
        : tone === "yellow"
        ? "rgba(245,158,11,0.30)"
        : "rgba(29,78,216,0.30)";

    const fg =
      tone === "green"
        ? C.green
        : tone === "yellow"
        ? C.yellow
        : "#93C5FD";

    return (
      <View
        style={{
          flex: 1,
          paddingVertical: 12,
          paddingHorizontal: 12,
          borderRadius: 16,
          backgroundColor: bg,
          borderWidth: 1,
          borderColor: border,
        }}
      >
        <Text style={{ color: fg, fontWeight: "900", fontSize: 11 }}>{label}</Text>
        <Text style={{ color: C.text, fontWeight: "900", fontSize: 16, marginTop: 6 }}>{value}</Text>
      </View>
    );
  };

  const onCreate = async () => {
    setErr("");
    setLoading(true);
    try {
      const res = await createReservation({ stationId, date, hour });
      setSuccessId(res.id);
    } catch (e: any) {
      setErr(safeErr(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      {/* background glows */}
      <View
        style={{
          position: "absolute",
          top: -120,
          left: -80,
          width: 260,
          height: 260,
          borderRadius: 200,
          backgroundColor: "rgba(29,78,216,0.18)",
        }}
      />
      <View
        style={{
          position: "absolute",
          top: 120,
          right: -120,
          width: 260,
          height: 260,
          borderRadius: 200,
          backgroundColor: "rgba(34,197,94,0.12)",
        }}
      />

      <View style={{ padding: 16, gap: 12 }}>
        {/* Header */}
        <View
          style={{
            padding: 14,
            borderRadius: 18,
            backgroundColor: C.card,
            borderWidth: 1,
            borderColor: C.border,
          }}
        >
          <Text style={{ color: C.text, fontSize: 22, fontWeight: "900" }}>{title}</Text>
          <Text style={{ color: C.muted, marginTop: 6 }}>
            📅 {date}
          </Text>
          <Text style={{ color: C.muted, marginTop: 4 }}>
            ⏰ {hour} • {isGreen ? "🌿 Eco" : "⚡ Standart"}
          </Text>
        </View>

        {/* Campaign banner */}
        {campaign?.title ? (
          <View
            style={{
              padding: 14,
              borderRadius: 18,
              backgroundColor: "rgba(168,85,247,0.12)",
              borderWidth: 1,
              borderColor: "rgba(168,85,247,0.25)",
            }}
          >
            <Text style={{ color: "#E9D5FF", fontWeight: "900" }}>🎁 Kampanya Uygulandı</Text>
            <Text style={{ color: "rgba(233,213,255,0.75)", marginTop: 6 }}>
              {campaign.title} {campaign.discount ? `• ${campaign.discount}` : ""}
            </Text>
          </View>
        ) : null}

        {/* Slot stats */}
        <View style={{ flexDirection: "row", gap: 10 }}>
          {pill("Fiyat", price != null ? `₺${fmtMoney(price)}/kWh` : "-", "blue")}
          {pill("Kazanç", coins != null ? `+${coins} 🪙` : "-", isGreen ? "green" : "yellow")}
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          {pill("Yoğunluk", load != null ? `%${Math.round(Number(load))}` : "-", "yellow")}
          {pill("Durum", status ? String(status) : "-", isGreen ? "green" : "blue")}
        </View>

        {/* Error */}
        {err ? (
          <View
            style={{
              padding: 12,
              borderRadius: 16,
              backgroundColor: C.redSoft,
              borderWidth: 1,
              borderColor: "rgba(239,68,68,0.30)",
            }}
          >
            <Text style={{ color: C.red, fontWeight: "900" }}>Hata</Text>
            <Text style={{ color: "rgba(254,202,202,0.95)", marginTop: 6 }}>{err}</Text>
          </View>
        ) : null}

        {/* Success / Actions */}
        {successId ? (
          <View
            style={{
              padding: 14,
              borderRadius: 18,
              backgroundColor: C.greenSoft,
              borderWidth: 1,
              borderColor: "rgba(34,197,94,0.30)",
              gap: 10,
            }}
          >
            <Text style={{ color: C.green, fontWeight: "900", fontSize: 16 }}>
              ✅ Rezervasyon oluşturuldu
            </Text>
            <Text style={{ color: C.muted }}>Rezervasyon ID: {successId}</Text>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
              <Pressable
                onPress={() => navigation.navigate("Reservations")}
                style={{
                  flex: 1,
                  backgroundColor: C.primary,
                  paddingVertical: 12,
                  borderRadius: 14,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "white", fontWeight: "900" }}>Randevularıma Git</Text>
              </Pressable>

              <Pressable
                onPress={() => navigation.popToTop()}
                style={{
                  flex: 1,
                  backgroundColor: "rgba(255,255,255,0.08)",
                  borderWidth: 1,
                  borderColor: C.border,
                  paddingVertical: 12,
                  borderRadius: 14,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: C.text, fontWeight: "900" }}>Haritaya Dön</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            <Pressable
              onPress={onCreate}
              disabled={loading}
              style={{
                backgroundColor: C.primary,
                paddingVertical: 14,
                borderRadius: 16,
                alignItems: "center",
                opacity: loading ? 0.7 : 1,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.12)",
              }}
            >
              {loading ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <ActivityIndicator color="white" />
                  <Text style={{ color: "white", fontWeight: "900" }}>Oluşturuluyor...</Text>
                </View>
              ) : (
                <Text style={{ color: "white", fontWeight: "900", fontSize: 15 }}>
                  ✅ Rezervasyon Oluştur
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => navigation.goBack()}
              disabled={loading}
              style={{
                backgroundColor: "rgba(255,255,255,0.06)",
                borderWidth: 1,
                borderColor: C.border,
                paddingVertical: 12,
                borderRadius: 16,
                alignItems: "center",
                opacity: loading ? 0.7 : 1,
              }}
            >
              <Text style={{ color: C.text, fontWeight: "900" }}>Geri</Text>
            </Pressable>

            <Text style={{ color: C.muted2, fontSize: 12, textAlign: "center" }}>
              Onayladığında seçili saat için rezervasyon oluşturulacak.
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}