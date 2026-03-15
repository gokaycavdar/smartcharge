import React, { useState } from "react";
import { View, Text, TextInput, Pressable, FlatList } from "react-native";
import { sendMessage } from "../features/chat/chatApi";

type Recommendation = {
  id: number;
  name: string;
  hour: string;
  coins: number;
  reason: string;
  isGreen: boolean;
};

type Msg = {
  id: string;
  role: "user" | "bot";
  text: string;
  recommendations?: Recommendation[];
};

export default function ChatScreen() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: "welcome",
      role: "bot",
      text: "Merhaba! Akıllı şarj önerisi veya istasyon/slot hakkında sorabilirsin.",
    },
  ]);
  const [loading, setLoading] = useState(false);

  // ✅ DEBUG: console yerine ekranda göstereceğiz
  const [debug, setDebug] = useState<string>("(debug boş)");

  const onSend = async () => {
    const text = input.trim();

    // debug: butona basıldı mı?
    setDebug(`CLICK -> text="${text}" loading=${loading}`);

    if (!text || loading) return;

    const userMsg: Msg = {
      id: Date.now().toString(),
      role: "user",
      text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      setDebug(`API CALL -> sendMessage("${text}")`);

      const res: any = await sendMessage(text);

      // debug: raw response
      setDebug(`API RES -> ${safeJson(res)}`);

      const botMsg: Msg = {
        id: (Date.now() + 1).toString(),
        role: "bot",
        text: res?.content ?? "Cevap alınamadı.",
        recommendations: res?.recommendations ?? [],
      };

      setMessages((prev) => [...prev, botMsg]);

      setDebug(
        `BOT MSG OK -> contentLen=${(botMsg.text ?? "").length} recCount=${
          botMsg.recommendations?.length ?? 0
        }`
      );
    } catch (e: any) {
      setDebug(`API ERR -> ${safeJson(e)} | msg=${e?.message ?? "-"}`);

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

  return (
    <View style={{ flex: 1, padding: 16 }}>
      {/* ✅ DEBUG PANEL */}
      <View
        style={{
          padding: 10,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: "#e5e7eb",
          backgroundColor: "#f9fafb",
          marginBottom: 10,
        }}
      >
        <Text style={{ fontWeight: "900", marginBottom: 4 }}>DEBUG</Text>
        <Text style={{ fontSize: 12 }}>{debug}</Text>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 12 }}
        renderItem={({ item }) => (
          <View style={{ marginBottom: 10 }}>
            {/* Message bubble */}
            <View
              style={{
                alignSelf: item.role === "user" ? "flex-end" : "flex-start",
                backgroundColor: item.role === "user" ? "black" : "#e5e7eb",
                padding: 10,
                borderRadius: 12,
                maxWidth: "80%",
              }}
            >
              <Text style={{ color: item.role === "user" ? "white" : "black" }}>
                {item.text}
              </Text>
            </View>

            {/* Recommendations */}
            {item.role === "bot" && item.recommendations && item.recommendations.length > 0 ? (
              <View style={{ marginTop: 10, width: "100%", gap: 10 }}>
                {item.recommendations.map((r) => (
                  <View
                    key={r.id}
                    style={{
                      borderWidth: 1,
                      borderColor: "#e5e7eb",
                      backgroundColor: "#111827",
                      padding: 12,
                      borderRadius: 14,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        marginBottom: 6,
                      }}
                    >
                      <Text style={{ fontWeight: "900", color: "white", flex: 1 }}>
                        {r.name}
                      </Text>
                      <Text style={{ fontWeight: "900", color: "#facc15" }}>
                        +{r.coins} Coin
                      </Text>
                    </View>

                    <Text style={{ color: "#cbd5e1", marginBottom: 8 }}>
                      ⏰ {r.hour} • {r.reason}
                    </Text>

                    <View
                      style={{
                        alignSelf: "flex-start",
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 999,
                        backgroundColor: r.isGreen ? "#14532d" : "#334155",
                      }}
                    >
                      <Text style={{ color: "white", fontWeight: "800", fontSize: 12 }}>
                        {r.isGreen ? "Eco Slot" : "Standart"}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        )}
      />

      {/* Input row */}
      <View style={{ flexDirection: "row", marginTop: 10 }}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Mesaj yaz..."
          style={{
            flex: 1,
            borderWidth: 1,
            borderRadius: 12,
            padding: 10,
          }}
        />

        <Pressable
          onPress={onSend}
          disabled={loading || !input.trim()}
          style={{
            marginLeft: 8,
            backgroundColor: "black",
            paddingHorizontal: 16,
            justifyContent: "center",
            borderRadius: 12,
            opacity: loading || !input.trim() ? 0.6 : 1,
          }}
        >
          <Text style={{ color: "white", fontWeight: "800" }}>
            {loading ? "..." : "Gönder"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ✅ JSON güvenli stringify (circular vs olmasın diye)
function safeJson(x: any) {
  try {
    return JSON.stringify(x);
  } catch {
    try {
      return String(x);
    } catch {
      return "[unstringifiable]";
    }
  }
}