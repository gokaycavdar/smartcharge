"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BatteryCharging,
  DollarSign,
  LineChart,
  Users,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Leaf,
  AlertCircle,
  CheckCircle2,
  Lightbulb,
} from "lucide-react";
import {
  generateDailyRevenue,
  generateMonthlyRevenue,
  generateCO2Savings,
  generateLoadCurve,
  generateMonthlyRevenueTrend,
  generateAIInsights,
} from "@/lib/utils-operator-ai";

type StationSummary = {
  id: number;
  name: string;
  price: number;
  mockLoad: number;
  mockStatus: "GREEN" | "YELLOW" | "RED";
  reservationCount: number;
  greenReservationCount: number;
};

type OperatorResponse = {
  stats: {
    totalRevenue: number;
    totalReservations: number;
    greenShare: number;
    avgLoad: number;
  };
  stations: StationSummary[];
};

export default function OperatorDashboardPage() {
  const [data, setData] = useState<OperatorResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("Operator");

  // Mock Analytics State
  const [dailyRevenue] = useState(generateDailyRevenue());
  const [monthlyRevenue] = useState(generateMonthlyRevenue());
  const [co2Savings] = useState(generateCO2Savings());
  const [loadCurve] = useState(generateLoadCurve());
  const [revenueTrend] = useState(generateMonthlyRevenueTrend());
  const [aiInsights] = useState(generateAIInsights());

  useEffect(() => {
    const ownerId =
      typeof window !== "undefined" ? localStorage.getItem("ecocharge:userId") ?? "1" : "1";

    const controller = new AbortController();

    const loadDashboard = async () => {
      try {
        // Fetch User Info for Company Name
        const userRes = await fetch(`/api/users/${ownerId}`, { signal: controller.signal });
        if (userRes.ok) {
          const userData = await userRes.json();
          // Force Otwatt branding
          setCompanyName("Otwatt");
        }

        const response = await fetch(`/api/company/my-stations?ownerId=${ownerId}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("İstasyon verisi alınamadı");
        const payload = (await response.json()) as OperatorResponse;
        setData(payload);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.error("Operator dashboard load failed", err);
        setError("Veriler yüklenemedi. Lütfen daha sonra tekrar deneyin.");
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboard();
    return () => controller.abort();
  }, []);

  const totalGreenCharges = useMemo(() => {
    if (!data) return 0;
    return data.stations.reduce((sum, station) => sum + station.greenReservationCount, 0);
  }, [data]);

  const uniqueCustomers = useMemo(() => {
    if (!data) return 0;
    return Math.max(Math.round(data.stats.totalReservations * 0.65), data.stats.totalReservations);
  }, [data]);

  const cards = useMemo(() => {
    if (!data)
      return [
        { title: "Toplam Gelir", value: "—", icon: DollarSign, accent: "text-green-400" },
        { title: "Aktif Yük", value: "—", icon: BatteryCharging, accent: "text-blue-400" },
        { title: "Yeşil Şarjlar", value: "—", icon: LineChart, accent: "text-emerald-400" },
        { title: "Müşteri Sayısı", value: "—", icon: Users, accent: "text-purple-400" },
      ];

    return [
      {
        title: "Toplam Gelir",
        value: `₺${data.stats.totalRevenue.toLocaleString("tr-TR", { minimumFractionDigits: 0 })}`,
        icon: DollarSign,
        accent: "text-green-400",
      },
      {
        title: "Aktif Yük",
        value: `%${data.stats.avgLoad}`,
        icon: BatteryCharging,
        accent: "text-blue-300",
      },
      {
        title: "Yeşil Şarjlar",
        value: totalGreenCharges.toString(),
        icon: LineChart,
        accent: "text-emerald-300",
      },
      {
        title: "Müşteri Sayısı",
        value: uniqueCustomers.toString(),
        icon: Users,
        accent: "text-purple-300",
      },
    ];
  }, [data, totalGreenCharges, uniqueCustomers]);

  const topStations = useMemo(() => {
    if (!data) return [];
    return [...data.stations].sort((a, b) => (b.mockLoad || 0) - (a.mockLoad || 0)).slice(0, 5);
  }, [data]);

  const bottomStations = useMemo(() => {
    if (!data) return [];
    return [...data.stations].sort((a, b) => (a.mockLoad || 0) - (b.mockLoad || 0)).slice(0, 5);
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-slate-200">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
        <p>Panonuz yükleniyor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-6 py-12 text-center text-sm text-red-200">
        {error}
      </div>
    );
  }

  return (
    <div className="min-h-full text-slate-900">
      <div className="relative">
        <div className="relative z-10 mx-auto flex max-w-7xl flex-col gap-10 px-6 py-12">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3rem] text-blue-600 font-bold">Yönetim Paneli</p>
              <h1 className="mt-3 text-3xl font-bold sm:text-4xl text-slate-900">{companyName} Dashboard</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-500">
                Gelir akışınızı, yük dengesini ve yeşil slot performansınızı gerçek zamanlı izleyin.
              </p>
            </div>
            <Link
              href="/operator/campaigns"
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500"
            >
              + Kampanya Başlat
            </Link>
          </header>

          <section className="space-y-10">
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {cards.map((card) => (
                <div
                  key={card.title}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>{card.title}</span>
                    <card.icon className={`h-5 w-5 ${card.accent.replace('400', '600').replace('300', '500')}`} />
                  </div>
                  <p className="mt-5 text-3xl font-bold text-slate-900">{card.value}</p>
                  <p className="mt-2 text-xs text-slate-400">Son 24 saatlik performans</p>
                </div>
              ))}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-6 py-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">İstasyon Durumları</h2>
                  <p className="text-xs text-slate-500">Green slot oranı ve yük yoğunluğu simulasyona dayalıdır.</p>
                </div>
                <span className="rounded-full bg-slate-100 px-4 py-1 text-xs font-medium text-slate-600">
                  {data?.stations.length || 0} istasyon yönetiliyor
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-xs uppercase tracking-widest text-slate-500 font-semibold">
                    <tr>
                      <th className="px-6 py-4">İstasyon</th>
                      <th className="px-6 py-4">Yük</th>
                      <th className="px-6 py-4">Fiyat</th>
                      <th className="px-6 py-4">Rezervasyon</th>
                      <th className="px-6 py-4">Durum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data?.stations.map((station) => {
                      const statusColor =
                        station.mockStatus === "GREEN"
                          ? "bg-green-100 text-green-700 border border-green-200"
                          : station.mockStatus === "YELLOW"
                          ? "bg-yellow-100 text-yellow-700 border border-yellow-200"
                          : "bg-red-100 text-red-700 border border-red-200";
                      
                      const statusText = 
                        station.mockStatus === "GREEN" ? "Düşük Yoğunluk" :
                        station.mockStatus === "YELLOW" ? "Orta Yoğunluk" : "Yüksek Yoğunluk";

                      return (
                        <tr key={station.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-900">{station.name}</div>
                            <div className="text-xs text-slate-500">#{station.id.toString().padStart(3, "0")}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-2 w-28 rounded-full bg-slate-200">
                                <div
                                  className={`h-full rounded-full ${
                                    station.mockStatus === "RED"
                                      ? "bg-red-500"
                                      : station.mockStatus === "YELLOW"
                                      ? "bg-yellow-500"
                                      : "bg-green-500"
                                  }`}
                                  style={{ width: `${station.mockLoad}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium text-slate-600">%{station.mockLoad}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-mono font-medium text-slate-900">{station.price.toFixed(2)} ₺</td>
                          <td className="px-6 py-4 text-xs text-slate-500">
                            <span className="font-bold text-green-600">{station.greenReservationCount} yeşil</span> / {station.reservationCount} toplam
                          </td>
                          <td className="px-6 py-4">
                            <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${statusColor}`}>
                              {statusText}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Analytics Section - Mocked Data */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">Analiz ve Öngörüler</h2>
              <p className="mt-2 text-sm text-slate-500">
                Sistem tarafından sağlanan otomatik analizler ve öngörülerdir.
              </p>

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-5 transition hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase text-slate-400">Günlük Gelir</p>
                      <p className="mt-1 text-lg font-bold text-slate-900">
                        ₺{dailyRevenue.total.toLocaleString("tr-TR", { minimumFractionDigits: 0 })}
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-500" />
                  </div>
                  <div className="mt-4 h-1.5 rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-green-500"
                      style={{ width: `${dailyRevenue.percentageChange}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {dailyRevenue.percentageChange > 0 ? (
                      <span className="flex items-center gap-1 text-green-600 font-medium">
                        <ArrowUpRight className="h-4 w-4" />
                        %{dailyRevenue.percentageChange.toFixed(2)}
                      </span>
                    ) : dailyRevenue.percentageChange < 0 ? (
                      <span className="flex items-center gap-1 text-red-600 font-medium">
                        <ArrowDownRight className="h-4 w-4" />
                        %{Math.abs(dailyRevenue.percentageChange).toFixed(2)}
                      </span>
                    ) : (
                      "Değişim yok"
                    )}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-5 transition hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase text-slate-400">Aylık Gelir</p>
                      <p className="mt-1 text-lg font-bold text-slate-900">
                        ₺{monthlyRevenue.total.toLocaleString("tr-TR", { minimumFractionDigits: 0 })}
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-500" />
                  </div>
                  <div className="mt-4 h-1.5 rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-green-500"
                      style={{ width: `${monthlyRevenue.percentageChange}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {monthlyRevenue.percentageChange > 0 ? (
                      <span className="flex items-center gap-1 text-green-600 font-medium">
                        <ArrowUpRight className="h-4 w-4" />
                        %{monthlyRevenue.percentageChange.toFixed(2)}
                      </span>
                    ) : monthlyRevenue.percentageChange < 0 ? (
                      <span className="flex items-center gap-1 text-red-600 font-medium">
                        <ArrowDownRight className="h-4 w-4" />
                        %{Math.abs(monthlyRevenue.percentageChange).toFixed(2)}
                      </span>
                    ) : (
                      "Değişim yok"
                    )}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-5 transition hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase text-slate-400">CO2 Tasarrufu</p>
                      <p className="mt-1 text-lg font-bold text-slate-900">
                        {co2Savings.total.toLocaleString("tr-TR", { minimumFractionDigits: 0 })} kg
                      </p>
                    </div>
                    <Leaf className="h-8 w-8 text-emerald-500" />
                  </div>
                  <div className="mt-4 h-1.5 rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${co2Savings.percentageChange}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {co2Savings.percentageChange > 0 ? (
                      <span className="flex items-center gap-1 text-emerald-600 font-medium">
                        <ArrowUpRight className="h-4 w-4" />
                        %{co2Savings.percentageChange.toFixed(2)}
                      </span>
                    ) : co2Savings.percentageChange < 0 ? (
                      <span className="flex items-center gap-1 text-red-600 font-medium">
                        <ArrowDownRight className="h-4 w-4" />
                        %{Math.abs(co2Savings.percentageChange).toFixed(2)}
                      </span>
                    ) : (
                      "Değişim yok"
                    )}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-5 transition hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase text-slate-400">Yük Eğrisi</p>
                      <p className="mt-1 text-lg font-bold text-slate-900">
                        %{Math.round((loadCurve.reduce((a, b) => a + b.load, 0) / loadCurve.length) || 0)}
                      </p>
                    </div>
                    <Zap className="h-8 w-8 text-yellow-500" />
                  </div>
                  <div className="mt-4 h-1.5 rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-yellow-500"
                      style={{ width: `${Math.abs(loadCurve[loadCurve.length - 1].load)}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {loadCurve[loadCurve.length - 1].load > 50 ? (
                      <span className="flex items-center gap-1 text-yellow-600 font-medium">
                        <ArrowUpRight className="h-4 w-4" />
                        Yüksek Yoğunluk
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-green-600 font-medium">
                        <ArrowDownRight className="h-4 w-4" />
                        Normal Seviye
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-8 rounded-2xl bg-slate-50 border border-slate-100 p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900">AI Destekli İçgörüler</h3>
                  <Lightbulb className="h-8 w-8 text-yellow-500" />
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  Sistem tarafından otomatik olarak oluşturulan içgörülerdir.
                </p>
                <div className="mt-4 space-y-4">
                  {aiInsights.map((insight) => (
                    <div
                      key={insight.id}
                      className="rounded-2xl bg-white p-4 shadow-sm transition hover:shadow-md border border-slate-200"
                    >
                      <div className="flex items-start gap-3">
                        {insight.type === 'warning' && <AlertCircle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />}
                        {insight.type === 'success' && <TrendingUp className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />}
                        {insight.type === 'info' && <Zap className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />}
                        
                        <div className="flex-1">
                          <p className="text-sm text-slate-700 font-medium leading-snug mb-2">{insight.message}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-blue-600">{insight.impact}</span>
                            <button className="text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-blue-600 transition">
                              {insight.action} &rarr;
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-10">
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {topStations.length > 0 && (
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="mb-4 text-lg font-bold text-slate-900">En İyi 5 İstasyon</h2>
                  <div className="flex flex-col gap-4">
                    {topStations.map((station) => (
                      <div
                        key={station.id}
                        className="flex items-center justify-between rounded-lg bg-slate-50 p-4 transition hover:bg-slate-100"
                      >
                        <div>
                          <p className="text-sm font-bold text-slate-900">{station.name}</p>
                          <p className="text-xs text-slate-500">
                            #{station.id.toString().padStart(3, "0")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex h-2.5 w-2.5 rounded-full bg-green-500" />
                          <span className="text-xs font-medium text-slate-600">
                            %{station.mockLoad} (Yeşil: {station.greenReservationCount})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {bottomStations.length > 0 && (
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="mb-4 text-lg font-bold text-slate-900">En Kötü 5 İstasyon</h2>
                  <div className="flex flex-col gap-4">
                    {bottomStations.map((station) => (
                      <div
                        key={station.id}
                        className="flex items-center justify-between rounded-lg bg-slate-50 p-4 transition hover:bg-slate-100"
                      >
                        <div>
                          <p className="text-sm font-bold text-slate-900">{station.name}</p>
                          <p className="text-xs text-slate-500">
                            #{station.id.toString().padStart(3, "0")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex h-2.5 w-2.5 rounded-full bg-red-500" />
                          <span className="text-xs font-medium text-slate-600">
                            %{station.mockLoad} (Yeşil: {station.greenReservationCount})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}