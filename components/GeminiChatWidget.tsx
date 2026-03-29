"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, Zap, Calendar, Loader2, MapPin, Clock, AlertCircle } from "lucide-react";
import { Card } from "./ui/Card";
import { authFetch, unwrapResponse, getStoredUserId, getToken } from "@/lib/auth";

type StationSearchResult = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  price: number;
  load: number;
  status: "GREEN" | "YELLOW" | "RED";
  distance?: number;
  description: string;
};

type ChatMessage = {
  role: "user" | "bot";
  content: string;
  stations?: StationSearchResult[];
  action?: {
    type: "book_appointment" | "search_stations" | "none";
    success?: boolean;
    message?: string;
    reservation?: {
      id: number;
      stationId: number;
      date: string;
      hour: string;
      status: string;
    };
  };
};

export default function GeminiChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "bot",
      content: "👋 Merhaba! Ben SmartCharge AI asistanı. Sana en uygun şarj istasyonlarını bulmamı ister misin? 🔌\n\nÖrnekler:\n• 'Bana en yakın istasyonu öner'\n• 'Yarın saat 14:00'de randevu oluştur'\n• 'Ucuz istasyonları listele'",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [userId, setUserId] = useState<number | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  useEffect(() => {
    const initUser = async () => {
      const token = getToken();
      const storedId = getStoredUserId();
      if (token && storedId) {
        setUserId(Number.parseInt(storedId, 10));
        return;
      }

      try {
        const res = await fetch("/api/demo-user");
        if (res.ok) {
          const data = await unwrapResponse<{ id: number }>(res);
          setUserId(data.id);
        }
      } catch (e) {
        console.error("Failed to sync demo user", e);
      }
    };

    initUser();
  }, []);

  const handleSend = async () => {
    if (!input.trim()) return;
    if (!userId) {
      setMessages(prev => [...prev, { role: "bot", content: "⏳ Kullanıcı bilgisi yükleniyor, lütfen bekleyin..." }]);
      return;
    }

    const userMessage = input;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const res = await authFetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({ message: userMessage }),
      });

      if (!res.ok) throw new Error("Failed to fetch");

      const data = await unwrapResponse<ChatMessage>(res);
      setMessages((prev) => [...prev, data]);

      // Scroll after adding new message
      setTimeout(() => scrollToBottom(), 100);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        { role: "bot", content: "❌ Üzgünüm, şu an bağlantı kuramıyorum. Lütfen tekrar dene." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBookAppointment = async (stationId: number, date: string, hour: string) => {
    if (!userId) return;

    try {
      const res = await authFetch("/api/reservations", {
        method: "POST",
        body: JSON.stringify({
          stationId,
          date,
          hour,
          isGreen: false,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        alert("❌ Rezervasyon oluşturulamadı: " + (errData.error?.message || "Hata"));
        return;
      }

      const data = await unwrapResponse<{ id: number }>(res);
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          content: `✅ Harika! İstasyon #${stationId}'de ${date} tarihinde ${hour}'de randevun oluşturuldu!`,
        },
      ]);
    } catch (error) {
      console.error("Booking error:", error);
      alert("❌ Bir hata oluştu.");
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "GREEN":
        return "bg-green-100 text-green-800 border-green-300";
      case "YELLOW":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "RED":
        return "bg-red-100 text-red-800 border-red-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getStatusEmoji = (status: string): string => {
    switch (status) {
      case "GREEN":
        return "✅";
      case "YELLOW":
        return "⚠️";
      case "RED":
        return "🔴";
      default:
        return "❓";
    }
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-600/40 transition hover:from-blue-500 hover:to-blue-600 hover:scale-110 active:scale-95"
        title="AI Chatbot"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-24 right-6 z-50 w-96 max-h-[600px] flex flex-col bg-white shadow-2xl rounded-lg border border-gray-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 rounded-t-lg text-white">
            <h3 className="flex items-center gap-2 font-bold">
              <Bot size={20} />
              SmartCharge AI Asistanı
            </h3>
            <p className="text-xs mt-1 text-blue-100">Powered by Gemini 🤖</p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "bot" && (
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 text-sm">
                    🤖
                  </div>
                )}

                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-br-none"
                      : "bg-white text-gray-900 border border-gray-300 rounded-bl-none"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>

                  {/* Show stations if returned */}
                  {msg.stations && msg.stations.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {msg.stations.slice(0, 5).map((station) => (
                        <div
                          key={station.id}
                          className="bg-gray-100 p-3 rounded border border-gray-300 text-left"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="font-semibold text-sm text-gray-900">
                                {getStatusEmoji(station.status)} {station.name}
                              </p>
                              <p className="text-xs text-gray-600 mt-1">{station.description}</p>
                              <div className="flex gap-2 mt-2 text-xs text-gray-700">
                                <span>💰 {station.price.toFixed(2)} TL/kWh</span>
                                {station.distance && (
                                  <span>📍 {station.distance.toFixed(1)} km</span>
                                )}
                              </div>
                            </div>
                            <div
                              className={`text-xs px-2 py-1 rounded border ${getStatusColor(
                                station.status
                              )}`}
                            >
                              {station.load}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Show action result if available */}
                  {msg.action && msg.action.success && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-300 rounded text-green-900 text-xs">
                      <p className="font-semibold flex items-center gap-2">
                        ✅ Başarılı
                      </p>
                      <p className="mt-1">{msg.action.message}</p>
                      {msg.action.reservation && (
                        <p className="mt-2 text-green-800">
                          Randevu ID: {msg.action.reservation.id}
                        </p>
                      )}
                    </div>
                  )}

                  {msg.action && msg.action.success === false && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-300 rounded text-red-900 text-xs flex gap-2">
                      <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">Hata</p>
                        <p className="mt-1">{msg.action.message}</p>
                      </div>
                    </div>
                  )}
                </div>

                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-gray-300 text-gray-700 flex items-center justify-center flex-shrink-0 text-sm">
                    👤
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
                  🤖
                </div>
                <div className="flex gap-1 items-center p-3 bg-white rounded-lg border border-gray-300">
                  <Loader2 size={16} className="animate-spin text-blue-600" />
                  <span className="text-sm text-gray-600">Düşünüyorum...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 p-4 bg-white rounded-b-lg">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSend()}
                placeholder="Mesajını yaz... (örn: 'istasyon öner')"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition flex items-center gap-1"
              >
                <Send size={16} />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              💡 Agentic AI: İstasyonları bul, randevu oluştur ve daha fazlası!
            </p>
          </div>
        </Card>
      )}
    </>
  );
}
