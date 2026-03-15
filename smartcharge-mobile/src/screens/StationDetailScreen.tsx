import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  Modal,
} from "react-native";
import {
  getStationDetail,
  getStationReviews,
  StationDetail,
} from "../features/stations/stationsApi";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "../theme";

function statusMeta(status: string) {
  const s = (status ?? "").toUpperCase();
  if (s === "GREEN") {
    return {
      pillBg: "rgba(34,197,94,0.14)",
      pillBorder: "rgba(34,197,94,0.28)",
      pillText: "#86efac",
      label: "Yeşil Saat",
      cardBorder: "rgba(34,197,94,0.22)",
    };
  }
  if (s === "YELLOW") {
    return {
      pillBg: "rgba(234,179,8,0.14)",
      pillBorder: "rgba(234,179,8,0.28)",
      pillText: "#fde68a",
      label: "Orta Yoğun",
      cardBorder: "rgba(234,179,8,0.22)",
    };
  }
  return {
    pillBg: "rgba(239,68,68,0.14)",
    pillBorder: "rgba(239,68,68,0.28)",
    pillText: "#fecaca",
    label: "Yoğun Saat",
    cardBorder: "rgba(239,68,68,0.22)",
  };
}

function formatCoins(n: number) {
  return `+${Math.round(n)} Coin`;
}

function formatDateTR(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("tr-TR");
}

export default function StationDetailScreen({ route, navigation }: any) {
  const id = route.params.id as number;

  const [data, setData] = useState<StationDetail | null>(null);
  const [reviewsData, setReviewsData] = useState<any>(null);
  const [err, setErr] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<any>(null);

  useEffect(() => {
    setErr("");
    setData(null);
    setReviewsData(null);

    Promise.all([getStationDetail(id), getStationReviews(id, 5, 0)])
      .then(([detail, reviews]) => {
        setData(detail);
        setReviewsData(reviews);
      })
      .catch((e) => setErr(e?.message ?? "Detay alınamadı"));
  }, [id]);

  const aiPick = useMemo(() => {
    if (!data?.slots?.length) return null;

    const sorted = [...data.slots].sort((a: any, b: any) => {
      const aGreen = a.status === "GREEN" ? 1 : 0;
      const bGreen = b.status === "GREEN" ? 1 : 0;
      if (aGreen !== bGreen) return bGreen - aGreen;
      if (a.coins !== b.coins) return b.coins - a.coins;
      return (a.load ?? 999) - (b.load ?? 999);
    });

    return sorted[0];
  }, [data]);

  const headerSubtitle = useMemo(() => {
    if (!data) return "";
    const greenCount = data.slots?.filter((s: any) => s.status === "GREEN").length ?? 0;
    return `${greenCount} yeşil saat • ${data.price?.toFixed?.(2) ?? data.price} ₺/kWh`;
  }, [data]);

  if (err) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
        <View style={{ padding: 16 }}>
          <View
            style={{
              padding: 14,
              borderRadius: 16,
              backgroundColor: "rgba(239,68,68,0.12)",
              borderWidth: 1,
              borderColor: "rgba(239,68,68,0.25)",
            }}
          >
            <Text style={{ color: "#fecaca", fontWeight: "900", fontSize: 16 }}>
              Hata
            </Text>
            <Text style={{ color: "#fecaca", opacity: 0.9, marginTop: 6 }}>
              {err}
            </Text>
          </View>

          <Pressable
            onPress={() => navigation.goBack()}
            style={{
              marginTop: 14,
              paddingVertical: 12,
              borderRadius: 14,
              alignItems: "center",
              backgroundColor: "rgba(255,255,255,0.06)",
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <Text style={{ color: theme.text, fontWeight: "900" }}>Geri Dön</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
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
            <Text style={{ color: theme.muted, fontWeight: "800" }}>Yükleniyor...</Text>
            <Text style={{ color: theme.muted2, fontSize: 12 }}>İstasyon detayları hazırlanıyor</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <FlatList
        data={data.slots}
        keyExtractor={(x: any) => String(x.hour)}
        contentContainerStyle={{ paddingBottom: 24 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListHeaderComponent={
          <>
            {/* Top Header */}
            <View
              style={{
                paddingHorizontal: 16,
                paddingTop: 8,
                paddingBottom: 14,
                borderBottomWidth: 1,
                borderColor: theme.border,
              }}
            >
              <Text style={{ color: theme.text, fontSize: 20, fontWeight: "900" }}>
                {data.name}
              </Text>
              <Text style={{ color: theme.muted, marginTop: 4, fontSize: 12 }}>
                {headerSubtitle}
              </Text>

              {/* Rating */}
              <View
                style={{
                  marginTop: 10,
                  alignSelf: "flex-start",
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 999,
                  backgroundColor: "rgba(245,158,11,0.12)",
                  borderWidth: 1,
                  borderColor: "rgba(245,158,11,0.22)",
                }}
              >
                <Text style={{ color: "#fde68a", fontWeight: "900" }}>
                  ⭐ {(data.averageRating ?? reviewsData?.summary?.averageRating ?? 0).toFixed(1)} •{" "}
                  {data.reviewCount ?? reviewsData?.summary?.reviewCount ?? 0} değerlendirme
                </Text>
              </View>

              <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                <View
                  style={{
                    flex: 1,
                    borderRadius: 16,
                    padding: 12,
                    backgroundColor: "rgba(255,255,255,0.05)",
                    borderWidth: 1,
                    borderColor: theme.border,
                  }}
                >
                  <Text style={{ color: theme.muted2, fontSize: 11 }}>Konum</Text>
                  <Text style={{ color: theme.text, fontWeight: "900", marginTop: 4 }}>
                    {Number(data.lat).toFixed(3)}, {Number(data.lng).toFixed(3)}
                  </Text>
                </View>

                <View
                  style={{
                    flex: 1,
                    borderRadius: 16,
                    padding: 12,
                    backgroundColor: "rgba(255,255,255,0.05)",
                    borderWidth: 1,
                    borderColor: theme.border,
                  }}
                >
                  <Text style={{ color: theme.muted2, fontSize: 11 }}>Uygun Saatler</Text>
                  <Text style={{ color: theme.text, fontWeight: "900", marginTop: 4 }}>
                    24 Saat
                  </Text>
                </View>
              </View>

              {/* AI Pick Card */}
              {aiPick ? (
                <View
                  style={{
                    marginTop: 12,
                    borderRadius: 18,
                    padding: 14,
                    backgroundColor: "rgba(168,85,247,0.10)",
                    borderWidth: 1,
                    borderColor: "rgba(168,85,247,0.22)",
                  }}
                >
                  <Text style={{ color: "#e9d5ff", fontWeight: "900" }}>
                    ✨ AI SMART PICK
                  </Text>
                  <Text style={{ color: "#e9d5ff", opacity: 0.9, marginTop: 6 }}>
                    {aiPick.label} saatinde{" "}
                    <Text style={{ fontWeight: "900" }}>{formatCoins(aiPick.coins)}</Text>{" "}
                    kazanırsın.
                  </Text>

                  <Pressable
                    onPress={() =>
                      navigation.navigate("CreateReservation", {
                        stationId: data.id,
                        slot: aiPick,
                      })
                    }
                    style={{
                      marginTop: 10,
                      backgroundColor: theme.primary,
                      paddingVertical: 12,
                      borderRadius: 14,
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: "white", fontWeight: "900" }}>
                      Bu Saati Rezerve Et
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              {/* Reviews Section */}
              <View style={{ marginTop: 16 }}>
                <Text style={{ color: theme.text, fontSize: 16, fontWeight: "900" }}>
                  Kullanıcı Yorumları
                </Text>
                <Text style={{ color: theme.muted, marginTop: 4, fontSize: 12 }}>
                  İstasyona yapılan son değerlendirmeler
                </Text>

                {reviewsData?.reviews?.length ? (
                  <View style={{ gap: 10, marginTop: 12 }}>
                    {reviewsData.reviews.map((review: any) => (
                      <View
                        key={review.id}
                        style={{
                          borderRadius: 16,
                          padding: 12,
                          backgroundColor: "rgba(255,255,255,0.05)",
                          borderWidth: 1,
                          borderColor: theme.border,
                        }}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          <Text style={{ color: theme.text, fontWeight: "900", flex: 1 }}>
                            {review.userName}
                          </Text>
                          <Text style={{ color: "#fde68a", fontWeight: "900" }}>
                            {"⭐".repeat(Math.max(1, Number(review.rating || 0)))}
                          </Text>
                        </View>

                        {review.comment ? (
                          <Text style={{ color: theme.muted, marginTop: 8, lineHeight: 20 }}>
                            {review.comment}
                          </Text>
                        ) : null}

                        <Text style={{ color: theme.muted2, marginTop: 8, fontSize: 11 }}>
                          {formatDateTR(review.createdAt)}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View
                    style={{
                      marginTop: 12,
                      borderRadius: 16,
                      padding: 12,
                      backgroundColor: "rgba(255,255,255,0.04)",
                      borderWidth: 1,
                      borderColor: theme.border,
                    }}
                  >
                    <Text style={{ color: theme.muted }}>
                      Henüz değerlendirme yapılmamış.
                    </Text>
                  </View>
                )}
              </View>

              <Text
                style={{
                  color: theme.text,
                  fontSize: 16,
                  fontWeight: "900",
                  marginTop: 18,
                  marginBottom: 12,
                }}
              >
                Uygun Saatler
              </Text>
            </View>
          </>
        }
        renderItem={({ item }: any) => {
          const meta = statusMeta(item.status);

          return (
            <Pressable
              onPress={() => setSelectedSlot(item)}
              style={{
                marginHorizontal: 16,
                borderRadius: 18,
                padding: 14,
                backgroundColor: "rgba(255,255,255,0.04)",
                borderWidth: 1,
                borderColor: meta.cardBorder,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                <Text style={{ color: theme.text, fontWeight: "900", fontSize: 16 }}>
                  {item.label}
                </Text>

                <View
                  style={{
                    paddingVertical: 6,
                    paddingHorizontal: 10,
                    borderRadius: 999,
                    backgroundColor: meta.pillBg,
                    borderWidth: 1,
                    borderColor: meta.pillBorder,
                  }}
                >
                  <Text style={{ color: meta.pillText, fontWeight: "900", fontSize: 11 }}>
                    {meta.label}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                <View
                  style={{
                    flex: 1,
                    borderRadius: 14,
                    padding: 10,
                    backgroundColor: "rgba(255,255,255,0.05)",
                    borderWidth: 1,
                    borderColor: theme.border,
                  }}
                >
                  <Text style={{ color: theme.muted2, fontSize: 11 }}>Fiyat</Text>
                  <Text style={{ color: theme.text, fontWeight: "900", marginTop: 4 }}>
                    ₺{Number(item.price).toFixed(2)}
                  </Text>
                </View>

                <View
                  style={{
                    flex: 1,
                    borderRadius: 14,
                    padding: 10,
                    backgroundColor: "rgba(255,255,255,0.05)",
                    borderWidth: 1,
                    borderColor: theme.border,
                  }}
                >
                  <Text style={{ color: theme.muted2, fontSize: 11 }}>Kazanç</Text>
                  <Text style={{ color: theme.text, fontWeight: "900", marginTop: 4 }}>
                    {formatCoins(item.coins)}
                  </Text>
                </View>

                <View
                  style={{
                    flex: 1,
                    borderRadius: 14,
                    padding: 10,
                    backgroundColor: "rgba(255,255,255,0.05)",
                    borderWidth: 1,
                    borderColor: theme.border,
                  }}
                >
                  <Text style={{ color: theme.muted2, fontSize: 11 }}>Yük</Text>
                  <Text style={{ color: theme.text, fontWeight: "900", marginTop: 4 }}>
                    %{Math.round(item.load ?? 0)}
                  </Text>
                </View>
              </View>

              {item.campaignApplied ? (
                <View
                  style={{
                    marginTop: 10,
                    padding: 10,
                    borderRadius: 14,
                    backgroundColor: "rgba(59,130,246,0.10)",
                    borderWidth: 1,
                    borderColor: "rgba(59,130,246,0.22)",
                  }}
                >
                  <Text style={{ color: "#bfdbfe", fontWeight: "900" }}>
                    🎁 Kampanya: {item.campaignApplied.title}
                  </Text>
                  <Text style={{ color: "#bfdbfe", opacity: 0.9, marginTop: 4 }}>
                    İndirim: {item.campaignApplied.discount}
                  </Text>
                </View>
              ) : null}

              <View style={{ marginTop: 12, flexDirection: "row", justifyContent: "flex-end" }}>
                <Text style={{ color: theme.muted, fontWeight: "800" }}>
                  Rezerve etmek için dokun →
                </Text>
              </View>
            </Pressable>
          );
        }}
      />

      {/* Slot Detail Modal */}
      <Modal visible={!!selectedSlot} transparent animationType="fade">
        <Pressable
          onPress={() => setSelectedSlot(null)}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.45)",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <Pressable
            onPress={() => {}}
            style={{
              backgroundColor: "rgba(17,24,39,0.96)",
              borderRadius: 18,
              padding: 14,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.12)",
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: theme.text, fontSize: 16, fontWeight: "900" }}>
                {selectedSlot?.label}
              </Text>
              <Pressable onPress={() => setSelectedSlot(null)} style={{ padding: 8 }}>
                <Text style={{ color: theme.text, fontWeight: "900", fontSize: 16 }}>✕</Text>
              </Pressable>
            </View>

            <Text style={{ color: theme.muted, marginTop: 6 }}>
              ₺{Number(selectedSlot?.price ?? 0).toFixed(2)} • {formatCoins(selectedSlot?.coins ?? 0)} • Yük %{Math.round(selectedSlot?.load ?? 0)}
            </Text>

            {selectedSlot?.campaignApplied ? (
              <View
                style={{
                  marginTop: 10,
                  padding: 10,
                  borderRadius: 14,
                  backgroundColor: "rgba(59,130,246,0.10)",
                  borderWidth: 1,
                  borderColor: "rgba(59,130,246,0.22)",
                }}
              >
                <Text style={{ color: "#bfdbfe", fontWeight: "900" }}>
                  🎁 {selectedSlot.campaignApplied.title}
                </Text>
                <Text style={{ color: "#bfdbfe", opacity: 0.9, marginTop: 4 }}>
                  İndirim: {selectedSlot.campaignApplied.discount}
                </Text>
              </View>
            ) : null}

            <Pressable
              onPress={() => {
                const slot = selectedSlot;
                setSelectedSlot(null);
                navigation.navigate("CreateReservation", { stationId: data.id, slot });
              }}
              style={{
                marginTop: 12,
                backgroundColor: theme.primary,
                paddingVertical: 12,
                borderRadius: 14,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "white", fontWeight: "900" }}>Rezerve Et</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}