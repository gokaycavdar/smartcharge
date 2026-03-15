import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { navNavigate } from "../navigation/navigationRef";
import {
  getBestNow,
  getPersonalCampaigns,
  BestNowRecommendation,
  Campaign,
} from "../features/suggestions/suggestionsApi";

type Tab = "now" | "personal";

export default function SmartSuggestionsFab() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("now");

  const [loading, setLoading] = useState(false);
  const [nowRecs, setNowRecs] = useState<BestNowRecommendation[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [err, setErr] = useState<string>("");

  const subtitle = useMemo(() => {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, "0");
    return `Bugün ${hh}:00 için tahminler`;
  }, []);

  useEffect(() => {
    if (!open) return;
    // modal açılınca default tabı yükle
    void loadTab(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const loadTab = async (t: Tab) => {
    setTab(t);
    setErr("");
    setLoading(true);
    try {
      if (t === "now") {
        const data = await getBestNow();
        setNowRecs(data);
      } else {
        const data = await getPersonalCampaigns();
        setCampaigns(data);
      }
    } catch (e: any) {
      setErr(e?.message ?? "Veri alınamadı.");
    } finally {
      setLoading(false);
    }
  };

  const onReserve = (stationId: number, hour: number) => {
    setOpen(false);
    navNavigate("StationDetail", { id: stationId, preselectHour: hour });
  };

  return (
    <>
      {/* FAB (ChatFab'in solunda) */}
      <Pressable
        onPress={() => setOpen(true)}
        style={{
          position: "absolute",
          right: 16 + 56 + 12, // chat butonundan sola kaydır
          bottom: 16,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: "#1f2937",
          alignItems: "center",
          justifyContent: "center",
          elevation: 6,
        }}
      >
        <Text style={{ color: "white", fontSize: 20, fontWeight: "900" }}>⚡</Text>
      </Pressable>

      <Modal visible={open} animationType="fade" transparent>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)", padding: 14 }}>
          <View
            style={{
              marginTop: 40,
              backgroundColor: "#0b1220",
              borderRadius: 18,
              padding: 12,
              borderWidth: 1,
              borderColor: "#1f2937",
              flex: 1,
            }}
          >
            {/* Header */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View>
                <Text style={{ color: "white", fontSize: 16, fontWeight: "900" }}>
                  Akıllı Şarj Önerileri
                </Text>
                <Text style={{ color: "#94a3b8", marginTop: 2, fontSize: 12 }}>
                  {subtitle}
                </Text>
              </View>
              <Pressable onPress={() => setOpen(false)} style={{ padding: 8 }}>
                <Text style={{ color: "#cbd5e1", fontSize: 18, fontWeight: "900" }}>✕</Text>
              </Pressable>
            </View>

            {/* Tabs */}
            <View style={{ flexDirection: "row", marginTop: 12, gap: 10 }}>
              <TabBtn
                active={tab === "now"}
                title="Şu an en müsait"
                onPress={() => loadTab("now")}
              />
              <TabBtn
                active={tab === "personal"}
                title="Sana özel"
                badge={campaigns.length > 0 ? String(campaigns.length) : undefined}
                onPress={() => loadTab("personal")}
              />
            </View>

            {/* Content */}
            <View style={{ flex: 1, marginTop: 12 }}>
              {loading ? (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 10 }}>
                  <ActivityIndicator />
                  <Text style={{ color: "#94a3b8" }}>Yükleniyor...</Text>
                </View>
              ) : err ? (
                <Text style={{ color: "#fca5a5" }}>{err}</Text>
              ) : tab === "now" ? (
                <>
                  <View
                    style={{
                      padding: 10,
                      borderRadius: 12,
                      backgroundColor: "#0f2a2a",
                      borderWidth: 1,
                      borderColor: "#134e4a",
                      marginBottom: 10,
                    }}
                  >
                    <Text style={{ color: "#86efac", fontWeight: "800" }}>
                      Linear Regression ile tahmin edilen en düşük yoğunluklu istasyonlar
                    </Text>
                  </View>

                  <FlatList
                    data={nowRecs}
                    keyExtractor={(x) => `${x.stationId}-${x.hour}`}
                    renderItem={({ item, index }) => (
                      <NowCard item={item} index={index} onReserve={onReserve} />
                    )}
                  />
                </>
              ) : (
                <FlatList
                  data={campaigns}
                  keyExtractor={(x) => String(x.id)}
                  renderItem={({ item }) => <CampaignCard item={item} />}
                />
              )}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function TabBtn({ active, title, badge, onPress }: any) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: active ? "#a855f7" : "#1f2937",
        backgroundColor: active ? "#111827" : "#0b1220",
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "center",
        gap: 8,
      }}
    >
      <Text style={{ color: "white", fontWeight: "900" }}>{title}</Text>
      {badge ? (
        <View style={{ backgroundColor: "#a855f7", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
          <Text style={{ color: "white", fontWeight: "900", fontSize: 12 }}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function NowCard({
  item,
  index,
  onReserve,
}: {
  item: BestNowRecommendation;
  index: number;
  onReserve: (stationId: number, hour: number) => void;
}) {
  return (
    <View
      style={{
        borderRadius: 16,
        padding: 12,
        backgroundColor: "#111827",
        borderWidth: 1,
        borderColor: "#1f2937",
        marginBottom: 10,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ color: "white", fontWeight: "900", flex: 1 }}>
          {item.name}
        </Text>
        <Text style={{ color: "#facc15", fontWeight: "900" }}>+{item.coins} Coin</Text>
      </View>

      <Text style={{ color: "#94a3b8", marginTop: 6 }}>
        #{index + 1} • %{item.load} Tahmin • {item.label} • {item.price} ₺/kWh
      </Text>

      <Text style={{ color: item.isGreen ? "#86efac" : "#cbd5e1", marginTop: 6 }}>
        {item.reason}
      </Text>

      <Pressable
        onPress={() => onReserve(item.stationId, item.hour)}
        style={{
          marginTop: 10,
          backgroundColor: "#22c55e",
          paddingVertical: 12,
          borderRadius: 12,
          alignItems: "center",
        }}
      >
        <Text style={{ fontWeight: "900", color: "#052e16" }}>Rezerve Et →</Text>
      </Pressable>
    </View>
  );
}

function CampaignCard({ item }: { item: Campaign }) {
  return (
    <View
      style={{
        borderRadius: 16,
        padding: 14,
        backgroundColor: "#111827",
        borderWidth: 1,
        borderColor: "#1f2937",
        marginBottom: 10,
      }}
    >
      <Text style={{ color: "white", fontWeight: "900", fontSize: 15 }}>{item.title}</Text>
      <Text style={{ color: "#94a3b8", marginTop: 6 }}>{item.description}</Text>

      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10 }}>
        <Text style={{ color: "#cbd5e1" }}>
          Ekstra Kazanç
        </Text>
        <Text style={{ color: "#facc15", fontWeight: "900" }}>
          +{item.coinReward ?? 0} Coin {item.discount ? `• ${item.discount}` : ""}
        </Text>
      </View>

      <Text style={{ color: "#64748b", marginTop: 8, fontSize: 12 }}>
        {item.stationId ? "Seçili istasyonda geçerli" : "Tüm istasyonlarda geçerli"}
      </Text>
    </View>
  );
}