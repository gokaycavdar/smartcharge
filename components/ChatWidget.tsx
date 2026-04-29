"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, X, Send, Bot, Zap, Calendar, Loader2 } from "lucide-react";
import { authFetch, unwrapResponse } from "@/lib/auth";

type Recommendation = {
  id: number;
  name: string;
  hour: string;
  coins: number;
  reason: string;
  isGreen: boolean;
};

type Message = {
  role: "user" | "bot";
  content: string;
  recommendations?: Recommendation[];
  cards?: ChatCard[];
  quickActions?: Action[];
  action?: Action;
};

type Action = {
  type: string;
  label?: string;
  stationId?: number;
  date?: string;
  hour?: string;
  isGreen?: boolean;
  url?: string;
  style?: string;
  success?: boolean;
  message?: string;
  reservation?: {
    id: number;
    stationId: number;
    date: string;
    hour: string;
    earnedCoins: number;
    status: string;
  };
};

type ChatCard = {
  type: string;
  title: string;
  subtitle?: string;
  description?: string;
  badges?: string[];
  actions?: Action[];
};

type ChatApiResponse = {
  role: string;
  content: string;
  recommendations?: Recommendation[];
  cards?: ChatCard[];
  quickActions?: Action[];
  action?: Action;
};

export default function ChatWidget() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "bot",
      content: "Merhaba! Ben SmartCharge AI asistanı. Sana en uygun şarj istasyonlarını bulmamı ister misin? 'Bana istasyon öner' yazabilirsin.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      console.log("[ChatWidget] Sending message to /api/chat:", userMessage);
      const res = await authFetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({ message: userMessage }),
      });

      console.log("[ChatWidget] Response status:", res.status, res.statusText);

      if (!res.ok) {
        const errText = await res.text();
        console.error("[ChatWidget] API error response:", errText);
        throw new Error(`API error ${res.status}: ${errText}`);
      }

      const data = await unwrapResponse<ChatApiResponse>(res);
      console.log("[ChatWidget] Got response data:", data);
      
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          content: data.content,
          recommendations: data.recommendations,
          cards: data.cards,
          quickActions: data.quickActions,
          action: data.action,
        },
      ]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Bilinmeyen hata";
      console.error("[ChatWidget] Error:", errorMessage);
      setMessages((prev) => [
        ...prev,
        { 
          role: "bot", 
          content: `Üzgünüm, bir hata oluştu: ${errorMessage}. Lütfen tekrar dene.` 
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const executeAction = async (action: Action) => {
    if (action.type.startsWith("open_")) {
      if (action.url) {
        router.push(action.url);
        setIsOpen(false);
        return;
      }
      if (action.stationId) {
        router.push(`/driver?stationId=${action.stationId}`);
        setIsOpen(false);
      }
      return;
    }

    if (action.type !== "create_reservation") return;

    setIsActionLoading(true);
    try {
      const res = await authFetch("/api/chat/actions/execute", {
        method: "POST",
        body: JSON.stringify({
          type: action.type,
          label: action.label,
          stationId: action.stationId,
          date: action.date,
          hour: action.hour,
          isGreen: action.isGreen,
          url: action.url,
          style: action.style,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        alert("Islem basarisiz: " + (errData.error?.message || "Hata"));
        return;
      }

      const data = await unwrapResponse<Action>(res);
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          content: data.message || "Islem tamamlandi.",
          action: data,
          quickActions: [
            { type: "open_appointments", label: "Randevulara Git", url: "/driver/appointments" },
            { type: "open_station", label: "Istasyonu Ac", stationId: data.stationId, url: data.stationId ? `/driver?stationId=${data.stationId}` : undefined },
          ],
        },
      ]);
    } catch {
      alert("Bir hata olustu.");
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-500 hover:scale-105 active:scale-95"
      >
        {isOpen ? <X /> : <MessageCircle />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 left-auto z-50 flex h-[500px] w-[calc(100vw-48px)] sm:w-[350px] md:h-[600px] md:w-[400px] flex-col overflow-hidden rounded-2xl border border-slate-600 bg-slate-800 shadow-2xl shadow-black/50 animate-in slide-in-from-bottom-10 fade-in duration-200 max-h-[calc(100vh-200px)] sm:max-h-[calc(100vh-120px)]">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-slate-700 bg-slate-700/50 p-4 backdrop-blur-md">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20 text-blue-400">
              <Bot size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-white">SmartCharge AI</h3>
              <p className="text-xs text-green-400 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" /> Online
              </p>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-br-none"
                      : "bg-slate-700 text-slate-200 rounded-bl-none border border-slate-600"
                  }`}
                >
                  <p>{msg.content}</p>

                  {msg.quickActions && msg.quickActions.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {msg.quickActions.map((action, i) => (
                        <button
                          key={`${action.type}-${i}`}
                          onClick={() => executeAction(action)}
                          disabled={isActionLoading}
                          className="rounded-lg border border-blue-500/40 bg-blue-500/10 px-2.5 py-1.5 text-xs font-medium text-blue-300 hover:bg-blue-500/20 disabled:opacity-60"
                        >
                          {action.label || "Aksiyon"}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Recommendations Grid */}
                  {msg.recommendations && (
                    <div className="mt-4 space-y-3">
                      {msg.recommendations.map((rec) => (
                        <div
                          key={rec.id}
                          className="rounded-xl border border-slate-600 bg-slate-800/50 p-3 transition hover:border-blue-500/50"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold text-white text-xs">{rec.name}</h4>
                            <span className="flex items-center gap-1 text-[10px] font-bold text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full">
                              <Zap size={10} /> +{rec.coins} Coin
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-3">
                            <span className="bg-slate-700 px-1.5 py-0.5 rounded text-slate-300">{rec.hour}</span>
                            <span>•</span>
                            <span className="text-green-400">{rec.reason}</span>
                          </div>
                          <button
                            onClick={() => executeAction({
                              type: "create_reservation",
                              label: "Hemen Rezerve Et",
                              stationId: rec.id,
                              date: new Date().toISOString().slice(0, 10),
                              hour: rec.hour,
                              isGreen: rec.isGreen,
                            })}
                            className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600/20 py-2 text-xs font-semibold text-blue-400 hover:bg-blue-600 hover:text-white transition-colors"
                          >
                            <Calendar size={12} /> Hemen Rezerve Et
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {msg.cards && msg.cards.length > 0 && (
                    <div className="mt-4 space-y-3">
                      {msg.cards.map((card, cardIndex) => (
                        <div key={`${card.type}-${cardIndex}`} className="rounded-xl border border-slate-600 bg-slate-800/60 p-3">
                          <div className="mb-1 text-xs font-semibold text-white">{card.title}</div>
                          {card.subtitle && <div className="text-[11px] text-slate-400 mb-1">{card.subtitle}</div>}
                          {card.description && <div className="text-[11px] text-slate-300 mb-2">{card.description}</div>}
                          {card.badges && card.badges.length > 0 && (
                            <div className="mb-2 flex flex-wrap gap-1">
                              {card.badges.map((badge, i) => (
                                <span key={`${badge}-${i}`} className="rounded-full bg-slate-700 px-2 py-0.5 text-[10px] text-slate-200">
                                  {badge}
                                </span>
                              ))}
                            </div>
                          )}
                          {card.actions && card.actions.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {card.actions.map((action, i) => (
                                <button
                                  key={`${action.type}-${i}`}
                                  onClick={() => executeAction(action)}
                                  disabled={isActionLoading}
                                  className="rounded-lg bg-blue-600/20 px-2.5 py-1.5 text-[11px] font-semibold text-blue-300 hover:bg-blue-600 hover:text-white disabled:opacity-60"
                                >
                                  {action.label || "Aksiyon"}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-700 rounded-2xl rounded-bl-none px-4 py-3 border border-slate-600">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-slate-700 bg-slate-800">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="relative"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Bir şeyler yaz..."
                className="w-full rounded-xl border border-slate-600 bg-slate-900/50 py-3 pl-4 pr-12 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-blue-500 hover:bg-blue-500/10 disabled:opacity-50 disabled:hover:bg-transparent"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
