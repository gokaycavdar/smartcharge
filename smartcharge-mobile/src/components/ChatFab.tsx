import React, { useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { navNavigate } from "../navigation/navigationRef";
import { sendMessage } from "../features/chat/chatApi";
import { theme } from "../theme";
import { useNavigation } from "@react-navigation/native";


type Recommendation = {
  id: number;
  name: string;
  hour: string;      // "20:00"
  coins: number;     // 50
  reason: string;    // "Düşük şebeke yükü..."
  isGreen: boolean;  // true/false
};

type Msg = {
  id: string;
  role: "user" | "bot";
  text: string;
  recommendations?: Recommendation[];
};

export default function ChatFab() {

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: "welcome",
      role: "bot",
      text: "Merhaba! Akıllı şarj önerisi veya istasyon/slot hakkında sorabilirsin.",
    },
  ]);
  const [loading, setLoading] = useState(false);

  const canSend = useMemo(
    () => input.trim().length > 0 && !loading,
    [input, loading]
  );

  const onSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Msg = { id: Date.now().toString(), role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res: any = await sendMessage(text);

      const botMsg: Msg = {
        id: (Date.now() + 1).toString(),
        role: "bot",
        text: res?.content ?? "Cevap alınamadı.",
        recommendations: res?.recommendations ?? [],
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 2).toString(),
          role: "bot",
          text: e?.message ?? "Bir hata oluştu.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const goToStation = (stationId: number) => {
    setOpen(false);
    navNavigate("StationDetail", { id: stationId }); // veya { stationId }
};


  const renderRecommendationCard = (r: Recommendation) => {
    return (
      <View
        key={`${r.id}-${r.hour}`}
        style={{
          borderRadius: 14,
          padding: 12,
          backgroundColor: "#111827",
          borderWidth: 1,
          borderColor: "#1f2937",
          marginTop: 10,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ color: "white", fontWeight: "900", flex: 1 }}>
            {r.name}
          </Text>
          <View
            style={{
              backgroundColor: "#0f172a",
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 999,
            }}
          >
            <Text style={{ color: "#facc15", fontWeight: "900" }}>
              +{r.coins} Coin
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 }}>
          <Text style={{ color: "#cbd5e1", fontWeight: "800" }}>{r.hour}</Text>

          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: r.isGreen ? "#22c55e" : "#94a3b8",
            }}
          />

          <Text style={{ color: r.isGreen ? "#86efac" : "#cbd5e1", flex: 1 }}>
            {r.reason}
          </Text>
        </View>

        <Pressable
          onPress={() => goToStation(r.id)}
          style={{
            marginTop: 10,
            backgroundColor: "#1d4ed8",
            paddingVertical: 10,
            borderRadius: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "white", fontWeight: "900" }}>
            Hemen Rezerve Et
          </Text>
        </Pressable>
      </View>
    );
  };

  const renderItem = ({ item }: { item: Msg }) => {
    const isUser = item.role === "user";
    const recs = item.recommendations ?? [];

    return (
      <View style={{ marginBottom: 10 }}>
        {/* Message bubble */}
        <View
          style={{
            alignSelf: isUser ? "flex-end" : "flex-start",
            backgroundColor: isUser ? "black" : "#e5e7eb",
            padding: 10,
            borderRadius: 12,
            maxWidth: "85%",
          }}
        >
          <Text style={{ color: isUser ? "white" : "black" }}>{item.text}</Text>
        </View>

        {/* Recommendations (only for bot) */}
        {!isUser && recs.length > 0 ? (
          <View style={{ width: "100%", paddingRight: 14 }}>
            {recs.map(renderRecommendationCard)}
          </View>
        ) : null}
      </View>
    );
  };

  return (

    <>
      {/* Floating Button */}
      <Pressable
        onPress={() => setOpen(true)}
        style={{
          position: "absolute",
          right: 18,
          bottom: 12 + 62 + 14, // ✅ tabbar’ın üstüne
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: theme.primary,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.12)",
          shadowColor: "#000",
          shadowOpacity: 0.35,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 6 },
          elevation: 12,
        }}
      >
        <Text style={{ color: "white", fontSize: 22, fontWeight: "900" }}>💬</Text>
      </Pressable>
      {/* Recommendations FAB */}
      <Pressable
        onPress={() => navNavigate("Recommendations")}
        style={{
          position: "absolute",
          right: 86, // chat butonunun solu
          bottom: 12 + 62 + 14,
          minWidth: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: "rgba(29,78,216,0.95)",
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.12)",
          shadowColor: "#000",
          shadowOpacity: 0.35,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 6 },
          elevation: 12,
          paddingHorizontal: 16,
        }}
      >
        <Text style={{ color: "white", fontSize: 20, fontWeight: "900" }}>⚡</Text>
      </Pressable>

      {/* Modal */}
      <Modal visible={open} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1, justifyContent: "flex-end" }}
          >
            <View
              style={{
                height: "75%",
                backgroundColor: "white",
                borderTopLeftRadius: 18,
                borderTopRightRadius: 18,
                padding: 12,
              }}
            >
              {/* Header */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingBottom: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: "#e5e7eb",
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: "900" }}>
                  Akıllı Şarj Asistanı
                </Text>
                <Pressable onPress={() => setOpen(false)} style={{ padding: 8 }}>
                  <Text style={{ fontSize: 18, fontWeight: "900" }}>✕</Text>
                </Pressable>
              </View>

              {/* Messages */}
              <FlatList
                style={{ flex: 1, marginTop: 10 }}
                data={messages}
                keyExtractor={(m) => m.id}
                renderItem={renderItem}
              />

              {/* Input */}
              <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                <TextInput
                  value={input}
                  onChangeText={setInput}
                  placeholder="Mesaj yaz..."
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: "#e5e7eb",
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                  }}
                />
                <Pressable
                  disabled={!canSend}
                  onPress={onSend}
                  style={{
                    backgroundColor: "black",
                    paddingHorizontal: 14,
                    borderRadius: 12,
                    justifyContent: "center",
                    opacity: canSend ? 1 : 0.5,
                  }}
                >
                  <Text style={{ color: "white", fontWeight: "800" }}>
                    {loading ? "..." : "Gönder"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
}