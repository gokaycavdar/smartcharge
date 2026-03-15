import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Modal,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getUser, Reservation } from "../features/users/usersApi";
import { getStoredUserId } from "../lib/auth";
import {
  confirmReservation,
  startReservation,
  completeReservation,
  cancelReservation,
} from "../features/reservations/reservationsApi";
import { createReview } from "../features/reviews/reviewsApi";

const C = {
  bg: "#07101F",
  glass: "rgba(17,24,39,0.72)",
  card: "rgba(255,255,255,0.06)",
  cardBorder: "rgba(255,255,255,0.10)",
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
  sky: "#38BDF8",
  skySoft: "rgba(56,189,248,0.18)",
};

function statusBadge(status: string) {
  const s = (status || "").toUpperCase();

  if (s === "COMPLETED") {
    return {
      label: "Tamamlandı",
      icon: "✅",
      bg: C.greenSoft,
      fg: C.green,
      border: "rgba(34,197,94,0.35)",
    };
  }

  if (s === "CANCELLED") {
    return {
      label: "İptal",
      icon: "⛔",
      bg: C.redSoft,
      fg: C.red,
      border: "rgba(239,68,68,0.35)",
    };
  }

  if (s === "FAILED") {
    return {
      label: "Başarısız",
      icon: "⚠️",
      bg: C.redSoft,
      fg: "#fca5a5",
      border: "rgba(239,68,68,0.35)",
    };
  }

  if (s === "CHARGING") {
    return {
      label: "Şarjda",
      icon: "⚡",
      bg: C.skySoft,
      fg: C.sky,
      border: "rgba(56,189,248,0.35)",
    };
  }

  if (s === "CONFIRMED") {
    return {
      label: "Onaylandı",
      icon: "🟦",
      bg: C.primarySoft,
      fg: "#93C5FD",
      border: "rgba(29,78,216,0.35)",
    };
  }

  return {
    label: "Bekliyor",
    icon: "⏳",
    bg: C.yellowSoft,
    fg: C.yellow,
    border: "rgba(245,158,11,0.35)",
  };
}

function formatCoins(n: any) {
  const v = Number(n ?? 0);
  return isNaN(v) ? 0 : Math.round(v);
}

function fmtDateHour(item: any) {
  return `${item.date} • ${item.hour}`;
}

function getPrimaryAction(status: string) {
  const s = (status || "").toUpperCase();

  if (s === "PENDING") {
    return { label: "Onayla", action: "confirm" as const };
  }
  if (s === "CONFIRMED") {
    return { label: "Şarjı Başlat", action: "start" as const };
  }
  if (s === "CHARGING") {
    return { label: "Tamamla", action: "complete" as const };
  }

  return null;
}

function canCancel(status: string) {
  const s = (status || "").toUpperCase();
  return s === "PENDING" || s === "CONFIRMED" || s === "CHARGING";
}

export default function ReservationsScreen() {
  const [data, setData] = useState<Reservation[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<any>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewBusy, setReviewBusy] = useState(false);

  const load = async () => {
    setErr("");
    setLoading(true);
    try {
      const uidStr = await getStoredUserId();
      const uid = uidStr ? Number(uidStr) : null;
      if (!uid) throw new Error("UserId bulunamadı (login?)");

      const res = await getUser(uid);
      setUserProfile(res);
      setData(res.reservations ?? []);
    } catch (e: any) {
      setErr(e?.message ?? "Randevular alınamadı");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const reviewedIds = userProfile?.reviewedReservationIds ?? [];

  const canReviewReservation = (item: any) => {
    return item.status === "COMPLETED" && !reviewedIds.includes(item.id);
  };

  const submitReview = async () => {
    if (!reviewTarget) return;
    if (rating < 1 || rating > 5) return;

    setReviewBusy(true);
    try {
      await createReview({
        stationId: reviewTarget.station.id,
        reservationId: reviewTarget.id,
        rating,
        comment: comment.trim(),
      });

      setReviewOpen(false);
      setReviewTarget(null);
      setComment("");
      setRating(5);
      await load();
    } catch (e: any) {
      setErr(e?.message ?? "Yorum gönderilemedi");
    } finally {
      setReviewBusy(false);
    }
  };

  const summary = useMemo(() => {
    const total = data.length;
    const pending = data.filter((r: any) => r.status === "PENDING").length;
    const confirmed = data.filter((r: any) => r.status === "CONFIRMED").length;
    const charging = data.filter((r: any) => r.status === "CHARGING").length;
    const completed = data.filter((r: any) => r.status === "COMPLETED").length;
    const coins = data
      .filter((r: any) => r.status === "COMPLETED")
      .reduce((sum: number, r: any) => sum + formatCoins(r.earnedCoins), 0);

    return { total, pending, confirmed, charging, completed, coins };
  }, [data]);

  const handlePrimaryAction = async (item: any) => {
    const primary = getPrimaryAction(item.status);
    if (!primary) return;

    setErr("");
    setBusyId(item.id);

    try {
      if (primary.action === "confirm") {
        await confirmReservation(item.id);
      } else if (primary.action === "start") {
        await startReservation(item.id);
      } else if (primary.action === "complete") {
        await completeReservation(item.id);
      }
      await load();
    } catch (e: any) {
      setErr(e?.message ?? "İşlem başarısız");
    } finally {
      setBusyId(null);
    }
  };

  const handleCancel = async (item: any) => {
    setErr("");
    setBusyId(item.id);

    try {
      await cancelReservation(item.id);
      await load();
    } catch (e: any) {
      setErr(e?.message ?? "İptal başarısız");
    } finally {
      setBusyId(null);
    }
  };

  const StickyHeader = () => (
    <View
      style={{
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 12,
        backgroundColor: C.glass,
        borderBottomWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
        <View>
          <Text style={{ color: C.text, fontSize: 22, fontWeight: "900" }}>Randevularım</Text>
          <Text style={{ color: C.muted, marginTop: 3, fontSize: 12 }}>
            Rezervasyonlarını yönet, coin kazan.
          </Text>
        </View>

        <Pressable
          onPress={load}
          style={{
            backgroundColor: "rgba(255,255,255,0.08)",
            borderWidth: 1,
            borderColor: C.cardBorder,
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 14,
          }}
        >
          <Text style={{ color: C.text, fontWeight: "900" }}>↻</Text>
        </Pressable>
      </View>

      {err ? (
        <View
          style={{
            marginTop: 10,
            backgroundColor: "rgba(239,68,68,0.12)",
            borderWidth: 1,
            borderColor: "rgba(239,68,68,0.30)",
            padding: 12,
            borderRadius: 14,
          }}
        >
          <Text style={{ color: C.red, fontWeight: "900" }}>{err}</Text>
        </View>
      ) : null}

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
        <Chip title="Toplam" value={summary.total} />
        <Chip title="Bekleyen" value={summary.pending} tint="yellow" />
        <Chip title="Onaylı" value={summary.confirmed} tint="blue" />
        <Chip title="Şarjda" value={summary.charging} tint="sky" />
        <Chip title="Tamamlanan" value={summary.completed} tint="green" />
        <Chip title="Kazanç" value={`${summary.coins} 🪙`} tint="blue" />
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: any }) => {
    const badge = statusBadge(item.status);
    const primary = getPrimaryAction(item.status);
    const isBusy = busyId === item.id;

    return (
      <View
        style={{
          marginHorizontal: 16,
          marginBottom: 12,
          padding: 14,
          borderRadius: 18,
          backgroundColor: C.card,
          borderWidth: 1,
          borderColor: C.cardBorder,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.text, fontSize: 15, fontWeight: "900" }} numberOfLines={2}>
              {item.station?.name ?? "İstasyon"}
            </Text>

            <Text style={{ color: C.muted, marginTop: 6, fontSize: 12 }}>
              📅 {fmtDateHour(item)}
            </Text>
          </View>

          <View
            style={{
              alignSelf: "flex-start",
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 999,
              backgroundColor: badge.bg,
              borderWidth: 1,
              borderColor: badge.border,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Text style={{ fontSize: 12 }}>{badge.icon}</Text>
            <Text style={{ color: badge.fg, fontWeight: "900", fontSize: 12 }}>{badge.label}</Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
          <MetaPill
            title="Kazanç"
            value={`+${formatCoins(item.earnedCoins)} 🪙`}
            subtitle={item.status === "COMPLETED" ? "alındı" : "tamamlanınca"}
          />

          <View
            style={{
              flex: 1,
              paddingHorizontal: 10,
              paddingVertical: 10,
              borderRadius: 14,
              backgroundColor: item.isGreen ? C.greenSoft : "rgba(255,255,255,0.06)",
              borderWidth: 1,
              borderColor: item.isGreen ? "rgba(34,197,94,0.30)" : "rgba(255,255,255,0.10)",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: item.isGreen ? C.green : C.muted, fontWeight: "900" }}>
              {item.isGreen ? "🌿 Eco Slot" : "⚡ Standart"}
            </Text>
            <Text style={{ color: C.muted2, fontSize: 10, marginTop: 3 }}>
              {item.isGreen ? "Yeşil enerji etkisi" : "Normal saat"}
            </Text>
          </View>
        </View>

        {(item.confirmedAt || item.startedAt || item.completedAt) ? (
          <View
            style={{
              marginTop: 12,
              padding: 10,
              borderRadius: 14,
              backgroundColor: C.card,
              borderWidth: 1,
              borderColor: C.cardBorder,
              gap: 4,
            }}
          >
            {item.confirmedAt ? (
              <Text style={{ color: C.muted, fontSize: 12 }}>🟦 Onaylandı: {item.confirmedAt}</Text>
            ) : null}
            {item.startedAt ? (
              <Text style={{ color: C.muted, fontSize: 12 }}>⚡ Başladı: {item.startedAt}</Text>
            ) : null}
            {item.completedAt ? (
              <Text style={{ color: C.muted, fontSize: 12 }}>✅ Tamamlandı: {item.completedAt}</Text>
            ) : null}
          </View>
        ) : null}

        {(primary || canCancel(item.status)) ? (
          <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
            {primary ? (
              <Pressable
                disabled={isBusy}
                onPress={() => handlePrimaryAction(item)}
                style={{
                  flex: 1,
                  backgroundColor: C.primary,
                  paddingVertical: 12,
                  borderRadius: 14,
                  alignItems: "center",
                  opacity: isBusy ? 0.6 : 1,
                }}
              >
                <Text style={{ color: "white", fontWeight: "900" }}>
                  {isBusy ? "..." : primary.label}
                </Text>
              </Pressable>
            ) : null}

            {canCancel(item.status) ? (
              <Pressable
                disabled={isBusy}
                onPress={() => handleCancel(item)}
                style={{
                  flex: primary ? 1 : 2,
                  backgroundColor: "rgba(239,68,68,0.20)",
                  borderWidth: 1,
                  borderColor: "rgba(239,68,68,0.35)",
                  paddingVertical: 12,
                  borderRadius: 14,
                  alignItems: "center",
                  opacity: isBusy ? 0.6 : 1,
                }}
              >
                <Text style={{ color: C.red, fontWeight: "900" }}>
                  {isBusy ? "..." : "İptal"}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {canReviewReservation(item) ? (
          <Pressable
            onPress={() => {
              setReviewTarget(item);
              setRating(5);
              setComment("");
              setReviewOpen(true);
            }}
            style={{
              marginTop: 10,
              backgroundColor: "rgba(245,158,11,0.16)",
              borderWidth: 1,
              borderColor: "rgba(245,158,11,0.30)",
              paddingVertical: 12,
              borderRadius: 14,
              alignItems: "center",
            }}
          >
            <Text style={{ color: C.yellow, fontWeight: "900" }}>⭐ Yorum Yap</Text>
          </Pressable>
        ) : null}

        {item.status === "COMPLETED" && reviewedIds.includes(item.id) ? (
          <View
            style={{
              marginTop: 10,
              backgroundColor: "rgba(34,197,94,0.12)",
              borderWidth: 1,
              borderColor: "rgba(34,197,94,0.25)",
              paddingVertical: 12,
              borderRadius: 14,
              alignItems: "center",
            }}
          >
            <Text style={{ color: C.green, fontWeight: "900" }}>✅ Yorum yapıldı</Text>
          </View>
        ) : null}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" }}>
        <View
          style={{
            paddingVertical: 18,
            paddingHorizontal: 18,
            borderRadius: 18,
            backgroundColor: C.card,
            borderWidth: 1,
            borderColor: C.cardBorder,
            alignItems: "center",
            gap: 10,
          }}
        >
          <ActivityIndicator />
          <Text style={{ color: C.muted, fontWeight: "900" }}>Yükleniyor...</Text>
          <Text style={{ color: C.muted2, fontSize: 12 }}>Randevular hazırlanıyor</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
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

      <FlatList
        data={data}
        keyExtractor={(x) => String(x.id)}
        renderItem={renderItem}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 24 }}
        ListHeaderComponent={StickyHeader}
        stickyHeaderIndices={[0]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="white"
            colors={Platform.OS === "android" ? ["#ffffff"] : undefined}
          />
        }
        ListEmptyComponent={
          <View style={{ paddingHorizontal: 16, marginTop: 14 }}>
            <View
              style={{
                padding: 14,
                borderRadius: 18,
                backgroundColor: C.card,
                borderWidth: 1,
                borderColor: C.cardBorder,
              }}
            >
              <Text style={{ color: C.text, fontWeight: "900", fontSize: 14 }}>Henüz randevu yok</Text>
              <Text style={{ color: C.muted, marginTop: 6 }}>
                Haritadan bir istasyon seçip saat rezerve edebilirsin.
              </Text>
            </View>
          </View>
        }
      />

      <Modal visible={reviewOpen} transparent animationType="fade">
        <Pressable
          onPress={() => setReviewOpen(false)}
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
            <Text style={{ color: C.text, fontSize: 16, fontWeight: "900" }}>
              İstasyonu Değerlendir
            </Text>
            <Text style={{ color: C.muted, marginTop: 6 }}>
              {reviewTarget?.station?.name}
            </Text>

            <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable
                  key={n}
                  onPress={() => setRating(n)}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    borderRadius: 12,
                    backgroundColor: rating === n ? "rgba(245,158,11,0.18)" : "rgba(255,255,255,0.06)",
                    borderWidth: 1,
                    borderColor: rating === n ? "rgba(245,158,11,0.30)" : "rgba(255,255,255,0.10)",
                  }}
                >
                  <Text style={{ color: rating === n ? C.yellow : C.text, fontWeight: "900" }}>
                    {n}⭐
                  </Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="Yorum yaz..."
              placeholderTextColor="rgba(234,240,255,0.35)"
              multiline
              style={{
                marginTop: 14,
                minHeight: 100,
                borderRadius: 14,
                padding: 12,
                color: C.text,
                backgroundColor: "rgba(255,255,255,0.06)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.10)",
                textAlignVertical: "top",
              }}
            />

            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <Pressable
                onPress={() => setReviewOpen(false)}
                style={{
                  flex: 1,
                  backgroundColor: "rgba(255,255,255,0.06)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.10)",
                  paddingVertical: 12,
                  borderRadius: 14,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: C.text, fontWeight: "900" }}>Vazgeç</Text>
              </Pressable>

              <Pressable
                onPress={submitReview}
                disabled={reviewBusy}
                style={{
                  flex: 1,
                  backgroundColor: C.primary,
                  paddingVertical: 12,
                  borderRadius: 14,
                  alignItems: "center",
                  opacity: reviewBusy ? 0.7 : 1,
                }}
              >
                <Text style={{ color: "white", fontWeight: "900" }}>
                  {reviewBusy ? "Gönderiliyor..." : "Gönder"}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function Chip({
  title,
  value,
  tint,
}: {
  title: string;
  value: any;
  tint?: "yellow" | "green" | "blue" | "sky";
}) {
  const bg =
    tint === "yellow"
      ? "rgba(245,158,11,0.14)"
      : tint === "green"
      ? "rgba(34,197,94,0.14)"
      : tint === "sky"
      ? "rgba(56,189,248,0.14)"
      : tint === "blue"
      ? "rgba(29,78,216,0.14)"
      : "rgba(255,255,255,0.07)";

  const border =
    tint === "yellow"
      ? "rgba(245,158,11,0.25)"
      : tint === "green"
      ? "rgba(34,197,94,0.25)"
      : tint === "sky"
      ? "rgba(56,189,248,0.25)"
      : tint === "blue"
      ? "rgba(29,78,216,0.25)"
      : "rgba(255,255,255,0.10)";

  const labelColor =
    tint === "yellow"
      ? C.yellow
      : tint === "green"
      ? C.green
      : tint === "sky"
      ? C.sky
      : tint === "blue"
      ? "#93C5FD"
      : C.muted;

  return (
    <View
      style={{
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 16,
        backgroundColor: bg,
        borderWidth: 1,
        borderColor: border,
        minWidth: 110,
      }}
    >
      <Text style={{ color: labelColor, fontSize: 11, fontWeight: "900" }}>{title}</Text>
      <Text style={{ color: C.text, fontSize: 16, fontWeight: "900", marginTop: 4 }}>{value}</Text>
    </View>
  );
}

function MetaPill({ title, value, subtitle }: { title: string; value: string; subtitle?: string }) {
  return (
    <View
      style={{
        flex: 1,
        paddingHorizontal: 10,
        paddingVertical: 10,
        borderRadius: 14,
        backgroundColor: "rgba(255,255,255,0.06)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.10)",
      }}
    >
      <Text style={{ color: C.muted2, fontSize: 10, fontWeight: "900" }}>{title}</Text>
      <Text style={{ color: C.text, fontWeight: "900", marginTop: 4 }}>{value}</Text>
      {subtitle ? (
        <Text style={{ color: C.muted2, fontSize: 10, marginTop: 3 }}>{subtitle}</Text>
      ) : null}
    </View>
  );
}