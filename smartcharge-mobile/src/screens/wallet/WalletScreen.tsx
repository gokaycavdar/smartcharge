import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";

import { getLeaderboard, LeaderboardUser } from "../../features/leaderboard/leaderboardApi";
import { getBadgeProgress, BadgeProgress } from "../../features/badges/badgesApi";
import { getUser } from "../../features/users/usersApi";
import { getStoredUserId } from "../../lib/auth";
import { clearAuth } from "../../lib/auth";
import { SafeAreaView } from "react-native-safe-area-context";

// ---- THEME ----
const C = {
  bg: "#07101F",
  card: "rgba(255,255,255,0.06)",
  cardBorder: "rgba(255,255,255,0.10)",
  text: "#EAF0FF",
  muted: "rgba(234,240,255,0.65)",
  muted2: "rgba(234,240,255,0.45)",
  primary: "#1D4ED8",
  primarySoft: "rgba(29,78,216,0.22)",
  green: "#22C55E",
  greenSoft: "rgba(34,197,94,0.18)",
  yellow: "#F59E0B",
  yellowSoft: "rgba(245,158,11,0.18)",
  purple: "#A855F7",
  purpleSoft: "rgba(168,85,247,0.18)",
  red: "#EF4444",
  redSoft: "rgba(239,68,68,0.18)",
};

type TabKey = "overview" | "badges" | "leaderboard";

function PillTab({
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
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 999,
        backgroundColor: active ? "rgba(29,78,216,0.28)" : "rgba(255,255,255,0.06)",
        borderWidth: 1,
        borderColor: active ? "rgba(29,78,216,0.45)" : "rgba(255,255,255,0.10)",
      }}
    >
      <Text style={{ color: active ? C.text : C.muted, fontWeight: "900" }}>
        {title}
      </Text>
    </Pressable>
  );
}

function StatCard({
  title,
  value,
  sub,
  tone,
}: {
  title: string;
  value: string;
  sub?: string;
  tone: "yellow" | "green" | "blue";
}) {
  const toneMap = {
    yellow: { bg: C.yellowSoft, fg: C.yellow },
    green: { bg: C.greenSoft, fg: C.green },
    blue: { bg: C.primarySoft, fg: "#93C5FD" },
  }[tone];

  return (
    <View
      style={{
        flex: 1,
        padding: 14,
        borderRadius: 18,
        backgroundColor: C.card,
        borderWidth: 1,
        borderColor: C.cardBorder,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          position: "absolute",
          top: -30,
          right: -30,
          width: 120,
          height: 120,
          borderRadius: 120,
          backgroundColor: toneMap.bg,
        }}
      />
      <Text style={{ color: C.muted, fontWeight: "900", fontSize: 12 }}>
        {title}
      </Text>
      <Text style={{ color: C.text, fontWeight: "900", fontSize: 24, marginTop: 8 }}>
        {value}
      </Text>
      {sub ? (
        <Text style={{ color: toneMap.fg, fontWeight: "900", marginTop: 6, fontSize: 12 }}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

export default function WalletScreen() {
  const [tab, setTab] = useState<TabKey>("overview");

  const [leaders, setLeaders] = useState<LeaderboardUser[]>([]);
  const [loadingLeaders, setLoadingLeaders] = useState(false);
  const [leadersErr, setLeadersErr] = useState("");

  const [badges, setBadges] = useState<BadgeProgress[]>([]);
  const [loadingBadges, setLoadingBadges] = useState(false);
  const [badgesErr, setBadgesErr] = useState("");

  const [overview, setOverview] = useState<any>(null);
  const [loadingOverview, setLoadingOverview] = useState(false);

  const navigation = useNavigation<any>();

  const onLogout = async () => {
    await clearAuth();
    navigation.reset({
      index: 0,
      routes: [{ name: "Auth" }],
    });
  };

  useEffect(() => {
    if (tab !== "leaderboard") return;

    const load = async () => {
      setLeadersErr("");
      setLoadingLeaders(true);
      try {
        const data = await getLeaderboard();
        setLeaders(data);
      } catch (e: any) {
        setLeadersErr(e?.message ?? "Leaderboard alınamadı");
      } finally {
        setLoadingLeaders(false);
      }
    };

    load();
  }, [tab]);

  useEffect(() => {
    if (tab !== "badges") return;

    const load = async () => {
      setBadgesErr("");
      setLoadingBadges(true);
      try {
        const data = await getBadgeProgress();
        setBadges(data);
      } catch (e: any) {
        setBadgesErr(e?.message ?? "Rozet ilerlemeleri alınamadı");
      } finally {
        setLoadingBadges(false);
      }
    };

    load();
  }, [tab]);

  useEffect(() => {
    if (tab !== "overview") return;

    const load = async () => {
      setLoadingOverview(true);
      try {
        const uidStr = await getStoredUserId();
        if (!uidStr) return;

        const user = await getUser(Number(uidStr));
        const completed = (user.reservations ?? []).filter((r: any) => r.status === "COMPLETED");

        const totalCoins = completed.reduce((sum: number, r: any) => sum + (r.earnedCoins || 0), 0);
        const greenCount = completed.filter((r: any) => r.isGreen).length;
        const co2Saved = greenCount * 0.8;
        const xp = completed.length * 50;

        setOverview({
          totalCoins,
          xp,
          co2Saved,
          lastActivities: completed.slice(0, 4),
        });
      } catch (e) {
        console.log("Overview error", e);
      } finally {
        setLoadingOverview(false);
      }
    };

    load();
  }, [tab]);

  const headerSubtitle = useMemo(() => {
    if (tab === "overview") return "Coin, XP ve çevresel katkı özetin";
    if (tab === "badges") return "Rozetlerdeki ilerlemeni gör";
    return "Sıralamadaki yerini gör";
  }, [tab]);

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
          top: 90,
          right: -120,
          width: 260,
          height: 260,
          borderRadius: 200,
          backgroundColor: "rgba(168,85,247,0.12)",
        }}
      />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={{ color: C.text, fontSize: 22, fontWeight: "900" }}>
              Sürücü Cüzdanı
            </Text>
            <Text style={{ color: C.muted, marginTop: 4, fontWeight: "700" }}>
              {headerSubtitle}
            </Text>
          </View>

          <Pressable
            onPress={onLogout}
            style={{
              backgroundColor: "rgba(255,255,255,0.06)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.10)",
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderRadius: 14,
            }}
          >
            <Text style={{ color: C.text, fontWeight: "900" }}>Çıkış</Text>
          </Pressable>
        </View>

        <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
          <PillTab title="Genel Bakış" active={tab === "overview"} onPress={() => setTab("overview")} />
          <PillTab title="Rozetlerim" active={tab === "badges"} onPress={() => setTab("badges")} />
          <PillTab title="Liderlik" active={tab === "leaderboard"} onPress={() => setTab("leaderboard")} />
        </View>

        {tab === "overview" ? (
          <View style={{ marginTop: 16, gap: 12 }}>
            {loadingOverview ? (
              <View style={{ padding: 18, alignItems: "center" }}>
                <ActivityIndicator />
                <Text style={{ color: C.muted, marginTop: 10 }}>Yükleniyor...</Text>
              </View>
            ) : !overview ? (
              <View
                style={{
                  padding: 14,
                  borderRadius: 18,
                  backgroundColor: C.card,
                  borderWidth: 1,
                  borderColor: C.cardBorder,
                }}
              >
                <Text style={{ color: C.text, fontWeight: "900" }}>Veri yok</Text>
                <Text style={{ color: C.muted, marginTop: 6 }}>
                  Rezervasyon tamamladıkça burada özet oluşur.
                </Text>
              </View>
            ) : (
              <>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <StatCard
                    title="Toplam Coin"
                    value={`${overview.totalCoins}`}
                    sub="Yeşil slotlardan kazanç"
                    tone="yellow"
                  />
                  <StatCard
                    title="XP Seviyesi"
                    value={`${overview.xp}`}
                    sub="Her işlem +50 XP"
                    tone="blue"
                  />
                </View>

                <StatCard
                  title="CO₂ Tasarrufu"
                  value={`${overview.co2Saved.toFixed(2)} kg`}
                  sub="Yeşil şarj etkisi"
                  tone="green"
                />

                <View
                  style={{
                    padding: 14,
                    borderRadius: 18,
                    backgroundColor: C.card,
                    borderWidth: 1,
                    borderColor: C.cardBorder,
                  }}
                >
                  <Text style={{ color: C.text, fontWeight: "900", fontSize: 14 }}>
                    Son Aktiviteler
                  </Text>
                  <Text style={{ color: C.muted2, marginTop: 3 }}>
                    En son tamamladığın işlemler
                  </Text>

                  <View style={{ marginTop: 10, gap: 10 }}>
                    {overview.lastActivities.map((r: any) => (
                      <View
                        key={r.id}
                        style={{
                          padding: 12,
                          borderRadius: 16,
                          backgroundColor: "rgba(255,255,255,0.06)",
                          borderWidth: 1,
                          borderColor: "rgba(255,255,255,0.08)",
                        }}
                      >
                        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                          <Text style={{ color: C.text, fontWeight: "900", flex: 1 }} numberOfLines={1}>
                            {r.station?.name ?? "İstasyon"}
                          </Text>
                          <View
                            style={{
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                              borderRadius: 999,
                              backgroundColor: r.isGreen ? C.greenSoft : "rgba(255,255,255,0.06)",
                              borderWidth: 1,
                              borderColor: r.isGreen ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.10)",
                            }}
                          >
                            <Text style={{ color: r.isGreen ? C.green : C.muted, fontWeight: "900", fontSize: 12 }}>
                              {r.isGreen ? "Eco" : "Standart"}
                            </Text>
                          </View>
                        </View>

                        <Text style={{ color: C.muted, marginTop: 6 }}>
                          {r.date} • +{r.earnedCoins ?? 0} 🪙
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </>
            )}
          </View>
        ) : tab === "badges" ? (
          <View style={{ marginTop: 16, gap: 10 }}>
            {loadingBadges ? (
              <View style={{ padding: 18, alignItems: "center" }}>
                <ActivityIndicator />
                <Text style={{ color: C.muted, marginTop: 10 }}>Yükleniyor...</Text>
              </View>
            ) : badgesErr ? (
              <View
                style={{
                  padding: 12,
                  borderRadius: 16,
                  backgroundColor: C.redSoft,
                  borderWidth: 1,
                  borderColor: "rgba(239,68,68,0.30)",
                }}
              >
                <Text style={{ color: C.red, fontWeight: "900" }}>{badgesErr}</Text>
              </View>
            ) : badges.length === 0 ? (
              <View
                style={{
                  padding: 14,
                  borderRadius: 18,
                  backgroundColor: C.card,
                  borderWidth: 1,
                  borderColor: C.cardBorder,
                }}
              >
                <Text style={{ color: C.text, fontWeight: "900" }}>Henüz rozet yok</Text>
                <Text style={{ color: C.muted, marginTop: 6 }}>
                  Şarj yaptıkça rozet ilerlemen burada görünecek.
                </Text>
              </View>
            ) : (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                {badges.map((b) => {
                  const progress = Math.min(
                    100,
                    Math.round(((b.currentCount ?? 0) / Math.max(1, b.threshold ?? 1)) * 100)
                  );

                  return (
                    <View
                      key={b.id}
                      style={{
                        width: "48%",
                        padding: 14,
                        borderRadius: 18,
                        backgroundColor: C.card,
                        borderWidth: 1,
                        borderColor: C.cardBorder,
                        overflow: "hidden",
                      }}
                    >
                      <View
                        style={{
                          position: "absolute",
                          top: -30,
                          right: -30,
                          width: 120,
                          height: 120,
                          borderRadius: 120,
                          backgroundColor: C.purpleSoft,
                        }}
                      />
                      <Text style={{ color: C.text, fontWeight: "900", fontSize: 14 }}>
                        🏅 {b.name}
                      </Text>

                      <Text style={{ color: C.muted, marginTop: 8 }} numberOfLines={3}>
                        {b.description}
                      </Text>

                      <Text
                        style={{
                          color: b.earned ? C.green : C.muted2,
                          marginTop: 10,
                          fontWeight: "900",
                        }}
                      >
                        {b.currentCount}/{b.threshold}
                      </Text>

                      <View
                        style={{
                          marginTop: 8,
                          height: 8,
                          borderRadius: 999,
                          backgroundColor: "rgba(255,255,255,0.08)",
                          overflow: "hidden",
                        }}
                      >
                        <View
                          style={{
                            width: `${progress}%`,
                            height: "100%",
                            backgroundColor: b.earned ? C.green : C.primary,
                          }}
                        />
                      </View>

                      <Text
                        style={{
                          color: b.earned ? C.green : C.muted2,
                          marginTop: 8,
                          fontSize: 12,
                        }}
                      >
                        {b.earned ? "Kazanıldı" : `%${progress} tamamlandı`}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        ) : (
          <View style={{ marginTop: 16, gap: 10 }}>
            {loadingLeaders ? (
              <View style={{ padding: 18, alignItems: "center" }}>
                <ActivityIndicator />
                <Text style={{ color: C.muted, marginTop: 10 }}>Yükleniyor...</Text>
              </View>
            ) : leadersErr ? (
              <View
                style={{
                  padding: 12,
                  borderRadius: 16,
                  backgroundColor: C.redSoft,
                  borderWidth: 1,
                  borderColor: "rgba(239,68,68,0.30)",
                }}
              >
                <Text style={{ color: C.red, fontWeight: "900" }}>{leadersErr}</Text>
              </View>
            ) : leaders.length === 0 ? (
              <View
                style={{
                  padding: 14,
                  borderRadius: 18,
                  backgroundColor: C.card,
                  borderWidth: 1,
                  borderColor: C.cardBorder,
                }}
              >
                <Text style={{ color: C.text, fontWeight: "900" }}>Liderlik verisi yok</Text>
                <Text style={{ color: C.muted, marginTop: 6 }}>
                  Birkaç işlemden sonra leaderboard dolacak.
                </Text>
              </View>
            ) : (
              <>
                {leaders.map((u, idx) => {
                  const first = idx === 0;
                  return (
                    <View
                      key={u.id}
                      style={{
                        padding: 14,
                        borderRadius: 18,
                        backgroundColor: first ? "rgba(245,158,11,0.12)" : C.card,
                        borderWidth: 1,
                        borderColor: first ? "rgba(245,158,11,0.28)" : C.cardBorder,
                      }}
                    >
                      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: C.text, fontWeight: "900", fontSize: 15 }} numberOfLines={1}>
                            #{idx + 1} {u.name}
                          </Text>
                          <Text style={{ color: C.muted, marginTop: 6 }}>
                            XP: {u.xp} • Coin: {u.totalCoins}
                          </Text>
                        </View>

                        {first ? (
                          <View
                            style={{
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                              borderRadius: 999,
                              backgroundColor: C.yellowSoft,
                              borderWidth: 1,
                              borderColor: "rgba(245,158,11,0.30)",
                            }}
                          >
                            <Text style={{ color: C.yellow, fontWeight: "900" }}>🏆 1.</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}