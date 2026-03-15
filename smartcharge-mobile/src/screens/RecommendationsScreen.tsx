import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  Pressable,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  getRecommendedStations,
  getStations,
} from "../features/stations/stationsApi";

const C = {
  bg: "#15233C",
  bg2: "#1B2A46",
  card: "#1E2C47",
  white: "#F8FAFC",
  muted: "rgba(248,250,252,0.68)",
  purple: "#A855F7",
  purpleSoft: "rgba(168,85,247,0.14)",
  green: "#22C55E",
  greenSoft: "rgba(34,197,94,0.14)",
  yellow: "#FACC15",
  blue: "#3B82F6",
};

type TabKey = "available" | "personal";

type RecommendationItem = {
  stationId: number;
  score: number;
  explanation: string;
  components: {
    load: number;
    green: number;
    distance: number;
    price: number;
    rl_bonus?: number;
    q_value?: number;
  };
};

export default function RecommendationsScreen({ navigation }: any) {
  const [tab, setTab] = useState<TabKey>("available");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [items, setItems] = useState<RecommendationItem[]>([]);
  const [stations, setStations] = useState<any[]>([]);

  function getStationName(id: number) {
    const s = stations.find((x) => x.id === id);
    return s?.name ?? `İstasyon #${id}`;
  }

  useEffect(() => {
    loadRecommendations();
    loadStations();
  }, []);

  const loadStations = async () => {
    try {
      const data = await getStations();
      setStations(data ?? []);
    } catch (e) {
      console.log("Stations load error", e);
    }
  };

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      setErr("");

      const now = new Date();
      const hour = now.getHours();
      const day = now.getDay();

      const res = await getRecommendedStations({
        hour,
        day,
        limit: 10,
      });

      setItems(res?.results ?? []);
    } catch (e: any) {
      setErr(e?.message ?? "Öneriler alınamadı");
    } finally {
      setLoading(false);
    }
  };

  const availableItems = useMemo(() => {
    return [...items].sort((a, b) => b.score - a.score).slice(0, 3);
  }, [items]);

  const personalItems = useMemo(() => {
    return [...items]
      .sort((a, b) => {
        const aPersonal =
          (a.components?.distance ?? 0) * 0.35 +
          (a.components?.price ?? 0) * 0.2 +
          (a.components?.green ?? 0) * 0.25 +
          (a.components?.load ?? 0) * 0.2;

        const bPersonal =
          (b.components?.distance ?? 0) * 0.35 +
          (b.components?.price ?? 0) * 0.2 +
          (b.components?.green ?? 0) * 0.25 +
          (b.components?.load ?? 0) * 0.2;

        return bPersonal - aPersonal;
      })
      .slice(0, 3);
  }, [items]);

  const currentHourRange = useMemo(() => {
    const now = new Date();
    const h = now.getHours();
    const next = (h + 1) % 24;
    return `${String(h).padStart(2, "0")}:00 - ${String(next).padStart(2, "0")}:00`;
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator />
          <Text style={{ marginTop: 10, color: C.muted }}>Öneriler hazırlanıyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          <View
            style={{
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: 14,
              borderBottomWidth: 1,
              borderBottomColor: "rgba(255,255,255,0.08)",
              backgroundColor: C.bg2,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    backgroundColor: C.purpleSoft,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontSize: 22 }}>✨</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.white, fontSize: 18, fontWeight: "900" }}>
                    Akıllı Şarj Önerileri
                  </Text>
                  <Text style={{ color: C.muted, marginTop: 3, fontSize: 13 }}>
                    {new Date().toLocaleDateString("tr-TR", {
                      weekday: "long",
                    })}{" "}
                    için tahminler
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={() => navigation.goBack()}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 21,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(255,255,255,0.08)",
                }}
              >
                <Text style={{ color: C.white, fontSize: 22 }}>✕</Text>
              </Pressable>
            </View>
          </View>

          <View style={{ flexDirection: "row", backgroundColor: "#14203A" }}>
            <TabButton
              active={tab === "available"}
              title="↘ Şu An En Müsait"
              onPress={() => setTab("available")}
            />
            <TabButton
              active={tab === "personal"}
              title="🎁 Sana Özel"
              onPress={() => setTab("personal")}
            />
          </View>

          {err ? (
            <View
              style={{
                margin: 16,
                padding: 12,
                borderRadius: 14,
                backgroundColor: "rgba(239,68,68,0.12)",
                borderWidth: 1,
                borderColor: "rgba(239,68,68,0.28)",
              }}
            >
              <Text style={{ color: "#FCA5A5", fontWeight: "800" }}>{err}</Text>
            </View>
          ) : null}

          {tab === "available" ? (
            <View style={{ padding: 16 }}>
              <SectionBanner
                icon="↘"
                title="Linear Regression ile tahmin edilen en düşük yoğunluklu istasyonlar"
                tint="green"
              />

              <View style={{ gap: 14, marginTop: 16 }}>
                {availableItems.map((item, index) => (
                  <AvailableCard
                    key={`${item.stationId}-${index}`}
                    index={index}
                    item={item}
                    stationName={getStationName(item.stationId)}
                    hourRange={currentHourRange}
                    onPress={() =>
                      navigation.navigate("StationDetail", { id: item.stationId })
                    }
                  />
                ))}
              </View>
            </View>
          ) : (
            <View style={{ padding: 16 }}>
              <SectionBanner icon="✨" title="Akıllı Puanlama" tint="purple" />

              <View style={{ gap: 14, marginTop: 16 }}>
                {personalItems.map((item, index) => (
                  <PersonalCard
                    key={`${item.stationId}-${index}`}
                    index={index}
                    item={item}
                    stationName={getStationName(item.stationId)}
                    onPress={() =>
                      navigation.navigate("StationDetail", { id: item.stationId })
                    }
                  />
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function TabButton({
  active,
  title,
  onPress,
}: {
  active: boolean;
  title: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        paddingVertical: 16,
        alignItems: "center",
        borderBottomWidth: 2,
        borderBottomColor: active ? "#A855F7" : "transparent",
      }}
    >
      <Text
        style={{
          color: active ? "#F8FAFC" : "rgba(248,250,252,0.62)",
          fontWeight: "900",
          fontSize: 15,
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}

function SectionBanner({
  icon,
  title,
  tint,
}: {
  icon: string;
  title: string;
  tint: "green" | "purple";
}) {
  const bg = tint === "green" ? "rgba(34,197,94,0.12)" : "rgba(168,85,247,0.14)";
  const border = tint === "green" ? "rgba(34,197,94,0.20)" : "rgba(168,85,247,0.24)";
  const color = tint === "green" ? "#86EFAC" : "#D8B4FE";

  return (
    <View
      style={{
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 16,
        backgroundColor: bg,
        borderWidth: 1,
        borderColor: border,
      }}
    >
      <Text style={{ color, fontWeight: "900", fontSize: 15 }}>
        {icon} {title}
      </Text>
    </View>
  );
}

function AvailableCard({
  item,
  index,
  stationName,
  hourRange,
  onPress,
}: {
  item: RecommendationItem;
  index: number;
  stationName: string;
  hourRange: string;
  onPress: () => void;
}) {
  const load = Math.round(item.components?.load ?? 0);
  const price = mapScoreToPrice(item.components?.price ?? 0);
  const coins = mapScoreToCoins(item.components?.green ?? 0);

  return (
    <View
      style={{
        borderRadius: 24,
        padding: 16,
        backgroundColor: "#1E2C47",
        borderWidth: 1,
        borderColor: "rgba(34,197,94,0.32)",
      }}
    >
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
        <RankPill rank={index + 1} />
        <Chip text={`%${load} Tahmin`} color="green" />
        <Chip text="✨ AI Öneri" color="purple" />
      </View>

      <Text style={{ color: C.white, fontSize: 18, fontWeight: "900" }}>
        {stationName}
      </Text>
      <Text style={{ color: C.muted, marginTop: 6, fontSize: 15 }}>
        Şu an için en düşük yoğunluk #{index + 1}
      </Text>

      <View style={{ gap: 10, marginTop: 18 }}>
        <InfoRow icon="🕒" text={hourRange} />
        <InfoRow icon="💰" text={`${price.toFixed(2)} ₺/kWh`} />
      </View>

      <View
        style={{
          marginTop: 16,
          borderRadius: 14,
          backgroundColor: "#16233C",
          paddingVertical: 14,
          paddingHorizontal: 16,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text style={{ color: C.muted, fontWeight: "800" }}>Eco Kazanç</Text>
        <Text style={{ color: C.yellow, fontWeight: "900", fontSize: 16 }}>
          +{coins} Coin
        </Text>
      </View>

      <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            backgroundColor: "#334155",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "white", fontSize: 18 }}>↗</Text>
        </View>

        <Pressable
          onPress={onPress}
          style={{
            flex: 1,
            height: 52,
            borderRadius: 14,
            backgroundColor: "#22C55E",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "white", fontWeight: "900", fontSize: 16 }}>
            Rezerve Et →
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function PersonalCard({
  item,
  index,
  stationName,
  onPress,
}: {
  item: RecommendationItem;
  index: number;
  stationName: string;
  onPress: () => void;
}) {
  const totalScore = Math.round(item.score);

  return (
    <View
      style={{
        borderRadius: 24,
        padding: 16,
        backgroundColor: "#1E2C47",
        borderWidth: 1,
        borderColor: "rgba(168,85,247,0.40)",
      }}
    >
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
        <RankPill rank={index + 1} purple />
        <Chip text={`✨ ${totalScore} Puan`} color="purple" />
      </View>

      <Text style={{ color: C.white, fontSize: 18, fontWeight: "900" }}>
        {stationName}
      </Text>
      <Text style={{ color: C.muted, marginTop: 6, fontSize: 15 }}>
        {item.explanation}
      </Text>

      <View style={{ gap: 12, marginTop: 16 }}>
        <ScoreRow label="📊 Yoğunluk" value={item.components?.load ?? 0} color="green" />
        <ScoreRow label="🌿 Yeşil Enerji" value={item.components?.green ?? 0} color="green" />
        <ScoreRow label="📍 Yakınlık" value={item.components?.distance ?? 0} color="green" />
        <ScoreRow label="💰 Fiyat" value={item.components?.price ?? 0} color="yellow" />
      </View>

      <Pressable
        onPress={onPress}
        style={{
          marginTop: 18,
          height: 56,
          borderRadius: 16,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#A855F7",
        }}
      >
        <Text style={{ color: "white", fontWeight: "900", fontSize: 17 }}>
          İstasyona Git →
        </Text>
      </Pressable>
    </View>
  );
}

function RankPill({ rank, purple }: { rank: number; purple?: boolean }) {
  return (
    <View
      style={{
        alignSelf: "flex-start",
        backgroundColor: purple ? "#A855F7" : "#22C55E",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
      }}
    >
      <Text style={{ color: "white", fontWeight: "900" }}>#{rank}</Text>
    </View>
  );
}

function Chip({
  text,
  color,
}: {
  text: string;
  color: "green" | "purple";
}) {
  return (
    <View
      style={{
        alignSelf: "flex-start",
        backgroundColor: color === "green" ? "rgba(34,197,94,0.14)" : "rgba(168,85,247,0.14)",
        borderWidth: 1,
        borderColor: color === "green" ? "rgba(34,197,94,0.24)" : "rgba(168,85,247,0.24)",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
      }}
    >
      <Text
        style={{
          color: color === "green" ? "#4ADE80" : "#D8B4FE",
          fontWeight: "900",
        }}
      >
        {text}
      </Text>
    </View>
  );
}

function InfoRow({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: 12,
          backgroundColor: "#273854",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text>{icon}</Text>
      </View>
      <Text style={{ color: C.white, fontWeight: "800", fontSize: 16 }}>{text}</Text>
    </View>
  );
}

function ScoreRow({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "green" | "yellow";
}) {
  const width = `${Math.max(12, Math.min(100, Math.round(value)))}%`;

  return (
    <View>
      <Text style={{ color: C.muted, fontWeight: "700", marginBottom: 6 }}>
        {label}
      </Text>

      <View
        style={{
          height: 10,
          borderRadius: 999,
          backgroundColor: "#334155",
          overflow: "hidden",
        }}
      >
        <View
          style={{
            width,
            height: "100%",
            borderRadius: 999,
            backgroundColor: color === "green" ? "#22C55E" : "#EAB308",
          }}
        />
      </View>
    </View>
  );
}

function mapScoreToPrice(score: number) {
  const normalized = Math.max(0, Math.min(100, score));
  return 5 + (100 - normalized) * 0.05;
}

function mapScoreToCoins(score: number) {
  const normalized = Math.max(0, Math.min(100, score));
  return Math.max(10, Math.round(normalized * 0.5));
}