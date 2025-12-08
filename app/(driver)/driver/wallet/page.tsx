"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Award, Coins, Leaf, Loader2, Sparkles, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { MOCK_LEADERBOARD } from "@/lib/utils-ai";

type Badge = {
	id: number;
	name: string;
	description: string;
	icon: string;
};

type Reservation = {
	id: number;
	date: string;
	hour: string;
	isGreen: boolean;
	earnedCoins: number;
	status: string;
	station: {
		id: number;
		name: string;
		price: number;
	};
};

type UserPayload = {
	id: number;
	name: string;
	email: string;
	coins: number;
	co2Saved: number;
	xp: number;
	badges: Badge[];
	reservations: Reservation[];
};

export default function DriverWalletPage() {
	const [user, setUser] = useState<UserPayload | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState<"overview" | "badges" | "leaderboard">("overview");

	useEffect(() => {
		const userId = typeof window !== "undefined" ? localStorage.getItem("ecocharge:userId") : null;
		if (!userId) {
			setError("Önce giriş yapmalısınız.");
			setIsLoading(false);
			return;
		}

		const controller = new AbortController();
		const loadUser = async () => {
			try {
				const response = await fetch(`/api/users/${userId}`, { signal: controller.signal });
				if (!response.ok) throw new Error("Kullanıcı bilgisi alınamadı");
				const data = (await response.json()) as UserPayload;
				setUser(data);
			} catch (err) {
				if (err instanceof DOMException && err.name === "AbortError") return;
				console.error("Wallet fetch failed", err);
				setError("Kullanıcı bilgisi alınamadı. Lütfen daha sonra tekrar deneyin.");
			} finally {
				setIsLoading(false);
			}
		};

		loadUser();
		return () => controller.abort();
	}, []);

	const totalGreenSessions = useMemo(() => {
		if (!user) return 0;
		return user.reservations.filter((reservation) => reservation.isGreen).length;
	}, [user]);

	const latestReservations = useMemo(() => {
		if (!user) return [];
		return user.reservations.slice(0, 4);
	}, [user]);

	return (
		<main className="min-h-screen bg-primary-bg text-primary font-sans">
			<div className="relative">
				<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent-primary/10 via-primary-bg to-primary-bg" />
				<div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12">
					
					{/* Header */}
					<header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-8">
						<div>
							<div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-accent-primary">
								<Sparkles className="h-4 w-4" />
								<span>Gamification Hub</span>
							</div>
							<h1 className="mt-2 text-4xl font-bold text-white tracking-tight font-display">Sürücü Cüzdanı</h1>
							<p className="mt-2 max-w-2xl text-text-secondary">
								Yeşil şarj ile kazandığın coinler, rozetler ve liderlik durumu.
							</p>
						</div>
						<Link
							href="/driver"
							className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-surface-1 px-5 py-2.5 text-sm font-semibold text-text-secondary transition hover:border-accent-primary/50 hover:bg-accent-primary/10 hover:text-accent-primary"
						>
							<ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-1" /> Haritaya Dön
						</Link>
					</header>

					{/* Tabs */}
					<div className="flex gap-8 border-b border-white/10 px-2">
						<button 
							onClick={() => setActiveTab("overview")} 
							className={`relative pb-4 text-sm font-medium transition-colors ${activeTab === "overview" ? "text-accent-primary" : "text-text-tertiary hover:text-white"}`}
						>
							Genel Bakış
							{activeTab === "overview" && <span className="absolute bottom-0 left-0 h-0.5 w-full bg-accent-primary shadow-[0_0_10px_rgba(59,130,246,0.5)]" />}
						</button>
						<button 
							onClick={() => setActiveTab("badges")} 
							className={`relative pb-4 text-sm font-medium transition-colors ${activeTab === "badges" ? "text-accent-primary" : "text-text-tertiary hover:text-white"}`}
						>
							Rozetlerim
							{activeTab === "badges" && <span className="absolute bottom-0 left-0 h-0.5 w-full bg-accent-primary shadow-[0_0_10px_rgba(59,130,246,0.5)]" />}
						</button>
						<button 
							onClick={() => setActiveTab("leaderboard")} 
							className={`relative pb-4 text-sm font-medium transition-colors ${activeTab === "leaderboard" ? "text-accent-primary" : "text-text-tertiary hover:text-white"}`}
						>
							Liderlik Tablosu
							{activeTab === "leaderboard" && <span className="absolute bottom-0 left-0 h-0.5 w-full bg-accent-primary shadow-[0_0_10px_rgba(59,130,246,0.5)]" />}
						</button>
					</div>

					{isLoading ? (
						<div className="flex flex-col items-center justify-center gap-3 py-24 text-text-tertiary">
							<Loader2 className="h-8 w-8 animate-spin text-accent-primary" />
							<p>Cüzdan verileri senkronize ediliyor...</p>
						</div>
					) : error ? (
						<div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-6 py-10 text-center text-sm text-red-200">
							{error}
						</div>
					) : user ? (
						<div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
							
							{/* OVERVIEW TAB */}
							{activeTab === "overview" && (
								<div className="space-y-8">
									{/* Stats Cards */}
									<div className="grid gap-6 md:grid-cols-3">
										<div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-surface-1 p-8 transition hover:border-yellow-500/30">
											<div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-yellow-500/10 blur-2xl transition group-hover:bg-yellow-500/20" />
											<div className="flex items-center justify-between text-sm font-medium text-text-tertiary">
												<span>Toplam Coin</span>
												<Coins className="h-5 w-5 text-yellow-500" />
											</div>
											<p className="mt-4 text-5xl font-bold text-white tracking-tight">{user.coins.toLocaleString()}</p>
											<p className="mt-2 text-xs text-text-secondary">Yeşil slotlardan kazanılan toplam değer.</p>
										</div>

										<div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-surface-1 p-8 transition hover:border-green-500/30">
											<div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-green-500/10 blur-2xl transition group-hover:bg-green-500/20" />
											<div className="flex items-center justify-between text-sm font-medium text-text-tertiary">
												<span>CO₂ Tasarrufu</span>
												<Leaf className="h-5 w-5 text-green-500" />
											</div>
											<p className="mt-4 text-5xl font-bold text-white tracking-tight">{user.co2Saved.toFixed(1)} <span className="text-2xl text-text-tertiary">kg</span></p>
											<p className="mt-2 text-xs text-text-secondary flex items-center gap-1">
												<Sparkles className="h-3 w-3 text-green-400" /> {totalGreenSessions} yeşil şarj işlemi
											</p>
											<div className="mt-4 pt-4 border-t border-white/5">
												<p className="text-xs text-text-tertiary flex items-center gap-2">
													<span className="text-green-500">≈</span>
													yıllık {(user.co2Saved / 20).toFixed(2)} ağaç emisyon temizliği
												</p>
											</div>
										</div>

										<div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-surface-1 p-8 transition hover:border-accent-primary/30">
											<div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-accent-primary/10 blur-2xl transition group-hover:bg-accent-primary/20" />
											<div className="flex items-center justify-between text-sm font-medium text-text-tertiary">
												<span>XP Seviyesi</span>
												<Award className="h-5 w-5 text-accent-primary" />
											</div>
											<p className="mt-4 text-5xl font-bold text-white tracking-tight">{user.xp.toLocaleString()}</p>
											<p className="mt-2 text-xs text-text-secondary">Sonraki seviyeye 450 XP kaldı.</p>
										</div>
									</div>

									{/* Recent Activity */}
									<div className="rounded-3xl border border-white/10 bg-surface-1/50 p-8">
										<h2 className="mb-6 text-xl font-bold text-white">Son Aktiviteler</h2>
										{latestReservations.length === 0 ? (
											<div className="flex flex-col items-center justify-center py-12 text-text-tertiary">
												<Leaf className="h-12 w-12 opacity-20 mb-4" />
												<p>Henüz bir aktivite bulunmuyor.</p>
											</div>
										) : (
											<div className="space-y-3">
												{latestReservations.map((reservation) => (
													<div
														key={reservation.id}
														className="group flex items-center justify-between rounded-2xl border border-white/5 bg-surface-1 px-6 py-4 transition hover:border-white/10 hover:bg-surface-2"
													>
														<div className="flex items-center gap-4">
															<div className={`flex h-10 w-10 items-center justify-center rounded-full ${reservation.isGreen ? "bg-green-500/20 text-green-400" : "bg-surface-2 text-text-tertiary"}`}>
																{reservation.isGreen ? <Leaf className="h-5 w-5" /> : <Award className="h-5 w-5" />}
															</div>
															<div>
																<p className="font-semibold text-white">{reservation.station.name}</p>
																<p className="text-xs text-text-tertiary">
																	{new Date(reservation.date).toLocaleDateString("tr-TR", { day: "numeric", month: "long" })} • {reservation.hour}
																</p>
															</div>
														</div>
														<div className="text-right">
															<p className={`font-bold ${reservation.isGreen ? "text-yellow-400" : "text-text-secondary"}`}>
																+{reservation.earnedCoins} Coin
															</p>
															{reservation.isGreen && (
																<span className="inline-flex items-center rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-400">
																	Eco Slot
																</span>
															)}
														</div>
													</div>
												))}
											</div>
										)}
									</div>
								</div>
							)}

							{/* BADGES TAB */}
							{activeTab === "badges" && (
								<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
									{user.badges.length === 0 ? (
										<div className="col-span-full flex flex-col items-center justify-center py-24 text-text-tertiary">
											<Award className="h-16 w-16 opacity-20 mb-4" />
											<p>Henüz rozet kazanmadın. Görevleri tamamla!</p>
										</div>
									) : (
										user.badges.map((badge) => (
											<div
												key={badge.id}
												className="group relative flex flex-col items-center gap-4 rounded-3xl border border-white/10 bg-surface-1 p-8 text-center transition hover:border-accent-primary/30 hover:bg-surface-2"
											>
												<div className="absolute inset-0 bg-gradient-to-br from-accent-primary/5 to-purple-500/5 opacity-0 transition group-hover:opacity-100 rounded-3xl" />
												<span className="text-6xl drop-shadow-2xl filter transition group-hover:scale-110 duration-300">{badge.icon}</span>
												<div className="relative">
													<h3 className="text-lg font-bold text-white">{badge.name}</h3>
													<p className="mt-2 text-sm text-text-secondary leading-relaxed">{badge.description}</p>
												</div>
											</div>
										))
									)}
									{/* Locked Badge Example */}
									<div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-white/10 bg-surface-1/30 p-8 text-center opacity-60 grayscale">
										<span className="text-6xl">⚡</span>
										<div>
											<h3 className="text-lg font-bold text-text-secondary">Hızlı Şarj Ustası</h3>
											<p className="mt-2 text-sm text-text-tertiary">5 kez hızlı şarj istasyonu kullan.</p>
											<div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
												<div className="h-full w-1/3 bg-surface-3" />
											</div>
											<p className="mt-1 text-[10px] text-text-tertiary">1/5 Tamamlandı</p>
										</div>
									</div>
								</div>
							)}

							{/* LEADERBOARD TAB */}
							{activeTab === "leaderboard" && (
								<div className="mx-auto max-w-3xl">
									<div className="rounded-[2rem] border border-white/10 bg-surface-1 p-8 shadow-2xl">
										<div className="mb-8 flex items-center justify-between">
											<h2 className="flex items-center gap-3 text-2xl font-bold text-white">
												<Trophy className="h-8 w-8 text-yellow-500" />
												Haftanın Liderleri
											</h2>
											<span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-medium text-text-secondary">
												Sıfırlanmaya 2 gün kaldı
											</span>
										</div>
										
										<div className="space-y-4">
											{MOCK_LEADERBOARD.map((u, i) => (
												<div 
													key={u.id} 
													className={`relative flex items-center justify-between rounded-2xl border p-4 transition-all hover:scale-[1.01] ${
														i === 0 ? "border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 to-transparent" :
														i === 1 ? "border-text-tertiary/30 bg-surface-2" :
														i === 2 ? "border-orange-500/30 bg-orange-500/5" :
														"border-white/5 bg-surface-1/50"
													}`}
												>
													<div className="flex items-center gap-6">
														<div className={`flex h-10 w-10 items-center justify-center rounded-full font-bold shadow-lg ${
															i === 0 ? "bg-yellow-500 text-black ring-4 ring-yellow-500/20" :
															i === 1 ? "bg-slate-300 text-black" :
															i === 2 ? "bg-orange-400 text-black" :
															"bg-slate-700 text-slate-400"
														}`}>
															{i + 1}
														</div>
														<div>
															<p className={`font-bold ${i === 0 ? "text-yellow-400" : "text-white"}`}>{u.name}</p>
															<p className="text-xs text-slate-500">Sürücü Ligi</p>
														</div>
													</div>
													<div className="flex items-center gap-6">
														<span className="text-2xl filter drop-shadow-lg">{u.badge}</span>
														<div className="text-right">
															<p className="font-mono text-lg font-bold text-blue-300">{u.xp.toLocaleString()} XP</p>
														</div>
													</div>
												</div>
											))}
											
											{/* User's Rank (Fake) */}
											<div className="mt-8 border-t border-slate-700 pt-6">
												<div className="flex items-center justify-between rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4">
													<div className="flex items-center gap-6">
														<div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 text-white font-bold shadow-lg shadow-blue-500/30">
															12
														</div>
														<div>
															<p className="font-bold text-white">Sen</p>
															<p className="text-xs text-blue-300">Yükseliştesin! 🚀</p>
														</div>
													</div>
													<div className="font-mono text-lg font-bold text-blue-300">{user.xp.toLocaleString()} XP</div>
												</div>
											</div>
										</div>
									</div>
								</div>
							)}

						</div>
					) : null}
				</div>
			</div>
		</main>
	);
}
