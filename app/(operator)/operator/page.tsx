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
          setCompanyName("Otowatt");
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
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-text-secondary">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent-primary border-t-transparent" />
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
    <div className="min-h-full text-primary">
      <div className="relative">
        <div className="relative z-10 mx-auto flex max-w-7xl flex-col gap-10 px-6 py-12">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3rem] text-accent-primary font-bold">Yönetim Paneli</p>
              <h1 className="mt-3 text-3xl font-bold sm:text-4xl text-white font-display">{companyName} Dashboard</h1>
              <p className="mt-2 max-w-2xl text-sm text-text-secondary">
                Gelir akışınızı, yük dengesini ve yeşil slot performansınızı gerçek zamanlı izleyin.
              </p>
            </div>
            <Link
              href="/operator/campaigns"
              className="rounded-xl bg-accent-primary px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-accent-primary/20 transition hover:bg-accent-hover"
            >
              + Kampanya Başlat
            </Link>
          </header>

          <section className="space-y-10">
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {cards.map((card) => (
                <div
                  key={card.title}
                  className="glass-card rounded-3xl p-6 transition hover:bg-surface-2"
                >
                  <div className="flex items-center justify-between text-xs text-text-secondary font-medium">
                    <span>{card.title}</span>
                    <card.icon className={`h-5 w-5 ${card.accent}`} />
                  </div>
                  <p className="mt-5 text-3xl font-bold text-white">{card.value}</p>
                  <p className="mt-2 text-xs text-text-tertiary">Son 24 saatlik performans</p>
                </div>
              ))}
            </div>

            <div className="glass-card rounded-3xl">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 px-6 py-6">
                <div>
                  <h2 className="text-xl font-bold text-white">İstasyon Durumları</h2>
                  <p className="text-xs text-text-secondary">Green slot oranı ve yük yoğunluğu simulasyona dayalıdır.</p>
                </div>
                <span className="rounded-full bg-surface-2 px-4 py-1 text-xs font-medium text-text-secondary">
                  {data?.stations.length || 0} istasyon yönetiliyor
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm text-text-secondary">
                  <thead className="bg-surface-2/50 text-xs uppercase tracking-widest text-text-tertiary font-semibold">
                    <tr>
                      <th className="px-6 py-4">İstasyon</th>
                      <th className="px-6 py-4">Yük</th>
                      <th className="px-6 py-4">Fiyat</th>
                      <th className="px-6 py-4">Rezervasyon</th>
                      <th className="px-6 py-4">Durum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data?.stations.map((station) => {
                      const statusColor =
                        station.mockStatus === "GREEN"
                          ? "bg-green-500/10 text-green-400 border border-green-500/20"
                          : station.mockStatus === "YELLOW"
                          ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                          : "bg-red-500/10 text-red-400 border border-red-500/20";
                      
                      const statusText = 
                        station.mockStatus === "GREEN" ? "Düşük Yoğunluk" :
                        station.mockStatus === "YELLOW" ? "Orta Yoğunluk" : "Yüksek Yoğunluk";

                      return (
                        <tr key={station.id} className="hover:bg-surface-2/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-bold text-white">{station.name}</div>
                            <div className="text-xs text-text-tertiary">#{station.id.toString().padStart(3, "0")}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-2 w-28 rounded-full bg-surface-3">
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
                              <span className="text-xs font-medium text-text-secondary">%{station.mockLoad}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-mono font-medium text-white">{station.price.toFixed(2)} ₺</td>
                          <td className="px-6 py-4 text-xs text-text-secondary">
                            <span className="font-bold text-green-400">{station.greenReservationCount} yeşil</span> / {station.reservationCount} toplam
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
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Stats Grid */}
              <div className="lg:col-span-2 grid gap-6 sm:grid-cols-2">
                <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-surface-1 p-6 transition hover:border-green-500/30">
                  <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-green-500/10 blur-2xl transition group-hover:bg-green-500/20" />
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2.5 rounded-xl bg-green-500/10 text-green-400">
                      <TrendingUp className="h-6 w-6" />
                    </div>
                    <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${dailyRevenue.percentageChange >= 0 ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                      {dailyRevenue.percentageChange >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      %{Math.abs(dailyRevenue.percentageChange).toFixed(2)}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-text-tertiary">Günlük Gelir</p>
                  <p className="mt-1 text-3xl font-bold text-white tracking-tight">
                    ₺{dailyRevenue.total.toLocaleString("tr-TR", { minimumFractionDigits: 0 })}
                  </p>
                  <div className="mt-4 h-1.5 w-full rounded-full bg-surface-2 overflow-hidden">
                    <div className="h-full rounded-full bg-green-500" style={{ width: `${Math.min(Math.abs(dailyRevenue.percentageChange) * 5, 100)}%` }} />
                  </div>
                </div>

                <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-surface-1 p-6 transition hover:border-blue-500/30">
                  <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-blue-500/10 blur-2xl transition group-hover:bg-blue-500/20" />
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
                      <DollarSign className="h-6 w-6" />
                    </div>
                    <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${monthlyRevenue.percentageChange >= 0 ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                      {monthlyRevenue.percentageChange >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      %{Math.abs(monthlyRevenue.percentageChange).toFixed(2)}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-text-tertiary">Aylık Gelir</p>
                  <p className="mt-1 text-3xl font-bold text-white tracking-tight">
                    ₺{monthlyRevenue.total.toLocaleString("tr-TR", { minimumFractionDigits: 0 })}
                  </p>
                  <div className="mt-4 h-1.5 w-full rounded-full bg-surface-2 overflow-hidden">
                    <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min(Math.abs(monthlyRevenue.percentageChange) * 5, 100)}%` }} />
                  </div>
                </div>

                <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-surface-1 p-6 transition hover:border-emerald-500/30">
                  <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-emerald-500/10 blur-2xl transition group-hover:bg-emerald-500/20" />
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                      <Leaf className="h-6 w-6" />
                    </div>
                    <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${co2Savings.percentageChange >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                      {co2Savings.percentageChange >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      %{Math.abs(co2Savings.percentageChange).toFixed(2)}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-text-tertiary">CO2 Tasarrufu</p>
                  <p className="mt-1 text-3xl font-bold text-white tracking-tight">
                    {co2Savings.total.toLocaleString("tr-TR", { minimumFractionDigits: 0 })} <span className="text-lg text-text-tertiary font-normal">kg</span>
                  </p>
                  <div className="mt-4 h-1.5 w-full rounded-full bg-surface-2 overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(Math.abs(co2Savings.percentageChange) * 5, 100)}%` }} />
                  </div>
                </div>

                <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-surface-1 p-6 transition hover:border-yellow-500/30">
                  <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-yellow-500/10 blur-2xl transition group-hover:bg-yellow-500/20" />
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2.5 rounded-xl bg-yellow-500/10 text-yellow-400">
                      <Zap className="h-6 w-6" />
                    </div>
                    <span className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full bg-surface-2 text-text-secondary">
                      Ortalama
                    </span>
                  </div>
                  <p className="text-sm font-medium text-text-tertiary">Yük Eğrisi</p>
                  <p className="mt-1 text-3xl font-bold text-white tracking-tight">
                    %{Math.round((loadCurve.reduce((a, b) => a + b.load, 0) / loadCurve.length) || 0)}
                  </p>
                  <div className="mt-4 h-1.5 w-full rounded-full bg-surface-2 overflow-hidden">
                    <div className="h-full rounded-full bg-yellow-500" style={{ width: `${Math.round((loadCurve.reduce((a, b) => a + b.load, 0) / loadCurve.length) || 0)}%` }} />
                  </div>
                </div>
              </div>

              {/* AI Insights Column */}
              <div className="rounded-3xl border border-white/10 bg-surface-1 p-6 flex flex-col h-full">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-yellow-400" />
                    <h3 className="text-lg font-bold text-white">AI İçgörüler</h3>
                  </div>
                  <span className="flex h-2 w-2 rounded-full bg-accent-primary animate-pulse" />
                </div>
                
                <div className="flex-1 space-y-4 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-surface-3 scrollbar-track-transparent max-h-[400px]">
                  {aiInsights.map((insight) => (
                    <div
                      key={insight.id}
                      className="group relative rounded-2xl border border-white/5 bg-surface-2/30 p-4 transition hover:bg-surface-2 hover:border-white/10"
                    >
                      <div className="flex gap-3">
                        <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
                          insight.type === 'warning' ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]' :
                          insight.type === 'success' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' :
                          'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]'
                        }`} />
                        
                        <div className="flex-1">
                          <p className="text-sm text-white font-medium leading-relaxed mb-3">{insight.message}</p>
                          
                          <div className="flex items-center justify-between border-t border-white/5 pt-3">
                            <span className={`text-xs font-bold ${
                              insight.type === 'warning' ? 'text-orange-400' :
                              insight.type === 'success' ? 'text-green-400' :
                              'text-blue-400'
                            }`}>
                              {insight.impact}
                            </span>
                            <button className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-text-tertiary hover:text-white transition group-hover:translate-x-1">
                              {insight.action} <ArrowUpRight className="h-3 w-3" />
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
            <div className="grid gap-6 md:grid-cols-2">
              {topStations.length > 0 && (
                <div className="rounded-3xl border border-white/10 bg-surface-1 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-400" />
                      En İyi 5 İstasyon
                    </h2>
                    <span className="text-xs font-medium text-text-tertiary">Yük Oranına Göre</span>
                  </div>
                  <div className="space-y-4">
                    {topStations.map((station, index) => (
                      <div
                        key={station.id}
                        className="group relative flex items-center gap-4 rounded-2xl border border-white/5 bg-surface-2/30 p-4 transition hover:bg-surface-2 hover:border-white/10"
                      >
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                          index === 0 ? "bg-yellow-500/20 text-yellow-400" :
                          index === 1 ? "bg-slate-500/20 text-slate-300" :
                          index === 2 ? "bg-orange-500/20 text-orange-400" :
                          "bg-surface-3 text-text-tertiary"
                        }`}>
                          {index + 1}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-bold text-white truncate">{station.name}</p>
                            <span className="text-xs font-bold text-green-400">%{station.mockLoad}</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-surface-3 overflow-hidden">
                            <div className="h-full rounded-full bg-green-500" style={{ width: `${station.mockLoad}%` }} />
                          </div>
                          <div className="mt-1.5 flex items-center gap-2 text-[10px] text-text-tertiary">
                            <span className="flex items-center gap-1">
                              <Leaf className="h-3 w-3 text-green-500" /> {station.greenReservationCount} Yeşil Şarj
                            </span>
                            <span>•</span>
                            <span>#{station.id}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {bottomStations.length > 0 && (
                <div className="rounded-3xl border border-white/10 bg-surface-1 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-red-400" />
                      Geliştirilmesi Gerekenler
                    </h2>
                    <span className="text-xs font-medium text-text-tertiary">Düşük Kullanım</span>
                  </div>
                  <div className="space-y-4">
                    {bottomStations.map((station, index) => (
                      <div
                        key={station.id}
                        className="group relative flex items-center gap-4 rounded-2xl border border-white/5 bg-surface-2/30 p-4 transition hover:bg-surface-2 hover:border-white/10"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-3 text-sm font-bold text-text-tertiary">
                          {data!.stations.length - 4 + index}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-bold text-white truncate">{station.name}</p>
                            <span className="text-xs font-bold text-red-400">%{station.mockLoad}</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-surface-3 overflow-hidden">
                            <div className="h-full rounded-full bg-red-500" style={{ width: `${Math.max(station.mockLoad, 5)}%` }} />
                          </div>
                          <div className="mt-1.5 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-[10px] text-text-tertiary">
                              <span className="flex items-center gap-1">
                                <Leaf className="h-3 w-3 text-text-tertiary" /> {station.greenReservationCount} Yeşil Şarj
                              </span>
                            </div>
                            <Link href="/operator/campaigns" className="text-[10px] font-bold text-accent-primary hover:underline">
                              Kampanya Oluştur
                            </Link>
                          </div>
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