import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { login } from "../features/auth/authApi"; // sende login nerede ise yolu düzelt
import { setToken, setStoredUserId } from "../lib/auth";

export default function LoginScreen({ navigation }: any) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login"); // register varsa sonra bağlarız
  const [email, setEmail] = useState("driver@test.com");
  const [password, setPassword] = useState("demo123");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const bg = useMemo(() => ["#0b1220", "#0b1220"], []);

  const onSubmit = async () => {
    setErr("");
    setLoading(true);
    try {
      const res = await login(email.trim().toLowerCase(), password);
      await setToken(res.token);
      await setStoredUserId(String(res.user.id));

      // RootStack'te App ekranın adı neyse onu yaz
      navigation.reset({
        index: 0,
        routes: [{ name: "App" }],
      });
    } catch (e: any) {
      setErr(e?.message ?? "Giriş başarısız");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: bg[0] }}>
      {/* Glow background */}
      <View style={{ position: "absolute", inset: 0 }}>
        <View
          style={{
            position: "absolute",
            top: -120,
            left: -120,
            width: 320,
            height: 320,
            borderRadius: 999,
            backgroundColor: "rgba(37,99,235,0.18)",
          }}
        />
        <View
          style={{
            position: "absolute",
            bottom: -140,
            right: -140,
            width: 360,
            height: 360,
            borderRadius: 999,
            backgroundColor: "rgba(14,165,233,0.12)",
          }}
        />
      </View>

      {/* Landing content */}
      <View style={{ flex: 1, paddingHorizontal: 18, paddingTop: 70, alignItems: "center" }}>
        <Text style={{ color: "white", fontSize: 44, fontWeight: "900", textAlign: "center" }}>
          SmartCharge
        </Text>
        <Text style={{ color: "#60a5fa", fontSize: 34, fontWeight: "900", textAlign: "center", marginTop: 6 }}>
          Akıllı Şarjın Geleceği
        </Text>

        <Text
          style={{
            color: "rgba(255,255,255,0.75)",
            textAlign: "center",
            marginTop: 14,
            lineHeight: 20,
            maxWidth: 320,
          }}
        >
          Yapay zeka destekli önerilerle en verimli saatlerde şarj et, oyunlaştırma ile kazan.
          Elektrikli araç deneyimini SmartCharge ile dönüştür.
        </Text>

        {/* Feature cards */}
        <View style={{ marginTop: 30, width: "100%", gap: 12 }}>
          <FeatureCard title="Yapay Zeka Destekli" desc="En uygun ve ekonomik şarj saatlerini belirler." icon="⚡" />
          <FeatureCard title="Akıllı Harita" desc="Gerçek zamanlı istasyon doluluk takibi." icon="🗺️" />
          <FeatureCard title="Oyunlaştırma" desc="Coin, XP ve rozetlerle ödül sistemi." icon="🏆" />
          <FeatureCard title="İşletme Paneli" desc="Operatörler için detaylı yönetim." icon="🏢" />
        </View>

        {/* CTA */}
        <Pressable
          onPress={() => setOpen(true)}
          style={{
            marginTop: 28,
            backgroundColor: "#0ea5e9",
            paddingVertical: 14,
            paddingHorizontal: 26,
            borderRadius: 999,
            alignItems: "center",
            flexDirection: "row",
            gap: 10,
          }}
        >
          <Text style={{ color: "white", fontWeight: "900", fontSize: 16 }}>Hemen Başla</Text>
          <Text style={{ color: "white", fontWeight: "900", fontSize: 16 }}>→</Text>
        </Pressable>

        <Text style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginTop: 18 }}>
          © 2025 SmartCharge. All rights reserved.
        </Text>
      </View>

      {/* Login Modal */}
      <Modal visible={open} animationType="fade" transparent>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", padding: 16, justifyContent: "center" }}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View
              style={{
                backgroundColor: "#111827",
                borderRadius: 18,
                padding: 16,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.10)",
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: "white", fontWeight: "900", fontSize: 18 }}>
                  {mode === "login" ? "Giriş Yap" : "Kayıt Ol"}
                </Text>
                <Pressable onPress={() => setOpen(false)} style={{ padding: 8 }}>
                  <Text style={{ color: "rgba(255,255,255,0.7)", fontWeight: "900", fontSize: 18 }}>✕</Text>
                </Pressable>
              </View>

              <Text style={{ color: "rgba(255,255,255,0.6)", marginTop: 6, fontSize: 12 }}>
                {mode === "login" ? "Hesabınıza giriş yapın" : "Yeni hesap oluşturun"}
              </Text>

              <View style={{ marginTop: 14, gap: 10 }}>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="E-posta"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={{
                    backgroundColor: "#0b1220",
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.10)",
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    color: "white",
                  }}
                />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Şifre"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  secureTextEntry
                  style={{
                    backgroundColor: "#0b1220",
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.10)",
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    color: "white",
                  }}
                />

                {err ? <Text style={{ color: "#fca5a5" }}>{err}</Text> : null}

                <Pressable
                  onPress={onSubmit}
                  disabled={loading}
                  style={{
                    backgroundColor: "#0ea5e9",
                    paddingVertical: 12,
                    borderRadius: 12,
                    alignItems: "center",
                    opacity: loading ? 0.7 : 1,
                    marginTop: 4,
                  }}
                >
                  <Text style={{ color: "white", fontWeight: "900" }}>
                    {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setMode(mode === "login" ? "register" : "login")}
                  style={{ paddingVertical: 8, alignItems: "center" }}
                >
                  <Text style={{ color: "rgba(255,255,255,0.7)", fontWeight: "700", fontSize: 12 }}>
                    {mode === "login" ? "Hesabın yok mu? Kayıt ol" : "Zaten hesabın var mı? Giriş yap"}
                  </Text>
                </Pressable>

                {/* Demo hint */}
                {mode === "login" ? (
                  <View
                    style={{
                      marginTop: 6,
                      backgroundColor: "rgba(255,255,255,0.06)",
                      borderRadius: 12,
                      padding: 10,
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.08)",
                    }}
                  >
                    <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 11 }}>
                      Demo: driver@test.com / demo123
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

function FeatureCard({ title, desc, icon }: { title: string; desc: string; icon: string }) {
  return (
    <View
      style={{
        backgroundColor: "rgba(255,255,255,0.06)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
        borderRadius: 16,
        padding: 14,
        flexDirection: "row",
        gap: 12,
        alignItems: "center",
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: "rgba(14,165,233,0.16)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 18 }}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: "white", fontWeight: "900" }}>{title}</Text>
        <Text style={{ color: "rgba(255,255,255,0.65)", marginTop: 2, fontSize: 12 }}>
          {desc}
        </Text>
      </View>
    </View>
  );
}