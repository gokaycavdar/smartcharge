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
  getStoreItems,
  purchaseStoreItem,
  StoreItem,
} from "../features/store/storeApi";

const C = {
  bg: "#07101F",
  card: "rgba(255,255,255,0.06)",
  cardBorder: "rgba(255,255,255,0.10)",
  text: "#EAF0FF",
  muted: "rgba(234,240,255,0.65)",
  primary: "#0ea5e9",
  yellow: "#FACC15",
};

const balance = 270;

function getIconName(index: number) {
  const icons = ["cafe-outline", "car-outline", "water-outline", "headset-outline"];
  return icons[index % icons.length];
}

export default function StoreScreen() {
  const [items, setItems] = React.useState<StoreItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [buyingId, setBuyingId] = React.useState<number | null>(null);

  const loadItems = async () => {
    try {
      setLoading(true);
      const data = await getStoreItems();
      setItems(data);
    } catch (e: any) {
      Alert.alert("Hata", e?.message ?? "Mağaza ürünleri alınamadı");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadItems();
  }, []);

  const onPurchase = async (itemId: number) => {
    try {
      setBuyingId(itemId);
      await purchaseStoreItem(itemId);
      Alert.alert("Başarılı", "Ürün satın alındı.");
      await loadItems();
    } catch (e: any) {
      Alert.alert("Hata", e?.response?.data?.error ?? "Satın alma başarısız");
    } finally {
      setBuyingId(null);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        <Text style={{ color: C.primary, fontSize: 12, fontWeight: "900", letterSpacing: 5 }}>
          SMARTCHARGE STORE
        </Text>

        <Text style={{ color: C.text, fontSize: 30, fontWeight: "900", marginTop: 8 }}>
          Mağaza
        </Text>

        <Text style={{ color: C.muted, marginTop: 6, fontWeight: "700" }}>
          SmartCoin birikimini ödüllere dönüştür.
        </Text>

        <View
          style={{
            marginTop: 22,
            padding: 20,
            borderRadius: 20,
            backgroundColor: "rgba(245,158,11,0.14)",
            borderWidth: 1,
            borderColor: "rgba(245,158,11,0.35)",
          }}
        >
          <Text style={{ color: C.yellow, fontWeight: "900", letterSpacing: 1 }}>
            ANLIK BAKİYE
          </Text>

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
            <Text style={{ color: C.text, fontSize: 34, fontWeight: "900" }}>
              {balance} <Text style={{ color: C.yellow, fontSize: 20 }}>SC</Text>
            </Text>

            <Ionicons name="cash-outline" size={34} color={C.yellow} />
          </View>
        </View>

        <View style={{ marginTop: 22, gap: 14 }}>
          {loading ? (
            <View style={{ padding: 24, alignItems: "center" }}>
              <ActivityIndicator />
              <Text style={{ color: C.muted, marginTop: 10 }}>Mağaza yükleniyor...</Text>
            </View>
          ) : items.length === 0 ? (
            <View
              style={{
                padding: 16,
                borderRadius: 20,
                backgroundColor: C.card,
                borderWidth: 1,
                borderColor: C.cardBorder,
              }}
            >
              <Text style={{ color: C.text, fontWeight: "900" }}>Ürün bulunamadı</Text>
              <Text style={{ color: C.muted, marginTop: 6 }}>
                Şu an mağazada aktif ürün yok.
              </Text>
            </View>
          ) : (
            items.map((p, index) => {
              const canBuy = balance >= p.priceCoins;
              const isBuying = buyingId === p.id;

              return (
                <View
                  key={p.id}
                  style={{
                    padding: 16,
                    borderRadius: 20,
                    backgroundColor: C.card,
                    borderWidth: 1,
                    borderColor: C.cardBorder,
                  }}
                >
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    <View
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 16,
                        backgroundColor: "rgba(255,255,255,0.08)",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons name={getIconName(index) as any} size={26} color={C.text} />
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                        <Text style={{ color: C.text, fontSize: 17, fontWeight: "900", flex: 1 }}>
                          {p.name}
                        </Text>

                        <View
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                            borderRadius: 999,
                            backgroundColor: "rgba(250,204,21,0.16)",
                          }}
                        >
                          <Text style={{ color: C.yellow, fontWeight: "900" }}>
                            {p.priceCoins} SC
                          </Text>
                        </View>
                      </View>

                      <Text style={{ color: C.text, marginTop: 4, fontWeight: "700" }}>
                        Stok: {p.stock}
                      </Text>
                    </View>
                  </View>

                  <Text style={{ color: C.text, marginTop: 14, lineHeight: 21 }}>
                    {p.description}
                  </Text>

                  <Pressable
                    onPress={() => onPurchase(p.id)}
                    disabled={!canBuy || isBuying}
                    style={{
                      marginTop: 16,
                      paddingVertical: 13,
                      borderRadius: 14,
                      alignItems: "center",
                      backgroundColor: canBuy ? C.primary : "rgba(14,165,233,0.45)",
                    }}
                  >
                    <Text style={{ color: C.text, fontWeight: "900" }}>
                      {isBuying ? "Satın alınıyor..." : "Satın Al"}
                    </Text>
                  </Pressable>

                  {!canBuy ? (
                    <Text style={{ color: C.yellow, marginTop: 8, fontWeight: "800" }}>
                      Yetersiz bakiye
                    </Text>
                  ) : (
                    <Text style={{ color: C.muted, marginTop: 8, fontWeight: "700" }}>
                      Hemen satın al
                    </Text>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}