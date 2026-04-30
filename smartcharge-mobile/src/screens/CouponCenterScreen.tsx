import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import {
  getCoupons,
  redeemCoupon,
  Coupon,
} from "../features/coupons/couponsApi";

const C = {
  bg: "#07101F",
  cardBorder: "rgba(255,255,255,0.10)",
  text: "#EAF0FF",
  muted: "rgba(234,240,255,0.65)",
  orange: "#F97316",
  purple: "#6366F1",
};

const balance = 270;

function getIconName(index: number) {
  const icons = ["ticket-outline", "card-outline", "sparkles-outline", "flash-outline"];
  return icons[index % icons.length];
}

export default function CouponCenterScreen() {
  const [coupons, setCoupons] = React.useState<Coupon[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [redeemingId, setRedeemingId] = React.useState<number | null>(null);

  const loadCoupons = async () => {
    try {
      setLoading(true);
      const data = await getCoupons();
      setCoupons(data);
    } catch (e: any) {
      Alert.alert("Hata", e?.message ?? "Kuponlar alınamadı");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadCoupons();
  }, []);

  const onRedeem = async (couponId: number) => {
    try {
      setRedeemingId(couponId);
      await redeemCoupon(couponId);
      Alert.alert("Başarılı", "Kupon dönüştürüldü.");
      await loadCoupons();
    } catch (e: any) {
      Alert.alert("Hata", e?.response?.data?.error ?? "Kupon dönüştürülemedi");
    } finally {
      setRedeemingId(null);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        <Text style={{ color: C.text, fontSize: 30, fontWeight: "900" }}>
          Kupon Merkezi
        </Text>

        <Text style={{ color: C.muted, marginTop: 6, fontWeight: "700" }}>
          Biriktirdiğin SmartCoin'leri şarj indirim kuponlarına dönüştür.
        </Text>

        <View
          style={{
            marginTop: 22,
            padding: 22,
            borderRadius: 20,
            backgroundColor: C.orange,
          }}
        >
          <Text style={{ color: "white", fontWeight: "900" }}>
            SmartCoin Bakiyesi
          </Text>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 10,
            }}
          >
            <Text style={{ color: "white", fontSize: 36, fontWeight: "900" }}>
              {balance} <Text style={{ fontSize: 18 }}>SC</Text>
            </Text>

            <Ionicons name="cash-outline" size={38} color="white" />
          </View>

          <Text style={{ color: "rgba(255,255,255,0.85)", marginTop: 10 }}>
            Kupon dönüştürme için mevcut bakiye
          </Text>
        </View>

        <Text style={{ color: C.text, fontSize: 24, fontWeight: "900", marginTop: 28 }}>
          Dönüştürülebilir Kuponlar
        </Text>

        <View style={{ marginTop: 16, gap: 14 }}>
          {loading ? (
            <View style={{ padding: 24, alignItems: "center" }}>
              <ActivityIndicator />
              <Text style={{ color: C.muted, marginTop: 10 }}>
                Kuponlar yükleniyor...
              </Text>
            </View>
          ) : coupons.length === 0 ? (
            <View
              style={{
                padding: 16,
                borderRadius: 20,
                backgroundColor: "rgba(255,255,255,0.06)",
                borderWidth: 1,
                borderColor: C.cardBorder,
              }}
            >
              <Text style={{ color: C.text, fontWeight: "900" }}>
                Kupon bulunamadı
              </Text>
              <Text style={{ color: C.muted, marginTop: 6 }}>
                Şu an aktif kupon yok.
              </Text>
            </View>
          ) : (
            coupons.map((c, index) => {
              const canConvert = balance >= c.costCoins;
              const isRedeeming = redeemingId === c.id;

              return (
                <View
                  key={c.id}
                  style={{
                    borderRadius: 20,
                    backgroundColor: "white",
                    overflow: "hidden",
                    borderWidth: 1,
                    borderColor: C.cardBorder,
                  }}
                >
                  <View
                    style={{
                      padding: 22,
                      alignItems: "center",
                      backgroundColor: "#EEF2FF",
                    }}
                  >
                    <Ionicons name={getIconName(index) as any} size={34} color={C.purple} />

                    <Text
                      style={{
                        color: C.purple,
                        fontSize: 25,
                        fontWeight: "900",
                        marginTop: 10,
                      }}
                    >
                      {c.title}
                    </Text>
                  </View>

                  <View style={{ padding: 16 }}>
                    <Text style={{ color: "#111827", fontSize: 18, fontWeight: "900" }}>
                      {c.title}
                    </Text>

                    <Text style={{ color: "#374151", marginTop: 6, fontSize: 15 }}>
                      {c.description}
                    </Text>

                    <View
                      style={{
                        marginTop: 16,
                        padding: 14,
                        borderRadius: 12,
                        backgroundColor: "#FFF7E6",
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ color: "#B45309", fontWeight: "700" }}>
                        Maliyeti
                      </Text>

                      <Text
                        style={{
                          color: "#D97706",
                          fontSize: 21,
                          fontWeight: "900",
                          marginTop: 4,
                        }}
                      >
                        {c.costCoins} SC
                      </Text>
                    </View>

                    <Pressable
                      onPress={() => onRedeem(c.id)}
                      disabled={!canConvert || isRedeeming}
                      style={{
                        marginTop: 14,
                        paddingVertical: 13,
                        borderRadius: 12,
                        alignItems: "center",
                        backgroundColor: canConvert ? C.orange : "#F3F4F6",
                      }}
                    >
                      <Text
                        style={{
                          color: canConvert ? "white" : "#9CA3AF",
                          fontWeight: "900",
                        }}
                      >
                        {isRedeeming
                          ? "Dönüştürülüyor..."
                          : canConvert
                          ? "Dönüştür"
                          : "Yetersiz Bakiye"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}