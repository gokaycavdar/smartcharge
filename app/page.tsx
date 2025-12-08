"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Zap, MapPin, Trophy, Building2, ArrowRight, CheckCircle2, X } from "lucide-react";

type LoginResponse = {
	user?: {
		id: number;
		role: string;
		name: string;
	};
	error?: string;
};

const DEMO_EMAILS = {
	driver: "driver@test.com",
	operator: "info@zorlu.com",
};

export default function AuthLandingPage() {
	const router = useRouter();
	const [showLogin, setShowLogin] = useState(false);
	const [email, setEmail] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const predictedRole = useMemo(() => {
		const e = email.trim().toLowerCase();
		if (!e || !e.includes("@")) return null;
		if (e === DEMO_EMAILS.driver) return "Sürücü";
		if (e === DEMO_EMAILS.operator) return "Operatör";
		const domain = e.split("@")[1];
		if (!domain) return null;
		const consumerDomains = ["gmail.com", "outlook.com", "hotmail.com", "yahoo.com", "icloud.com", "proton.me", "protonmail.com"];
		if (consumerDomains.includes(domain)) return "Sürücü";
		const operatorHints = ["enerji", "energy", "power", "elektrik", "grid", "charge", "ev", "zorlu", "shell", "bp", "tesla"];
		if (operatorHints.some((k) => domain.includes(k))) return "Operatör";
		return "Sürücü";
	}, [email]);

	const handleSubmit = async (targetEmail?: string) => {
		const payloadEmail = (targetEmail ?? email).trim().toLowerCase();
		if (!payloadEmail) {
			setError("Lütfen e-posta adresinizi girin");
			return;
		}

		try {
			setIsSubmitting(true);
			setError(null);

			const response = await fetch("/api/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: payloadEmail }),
			});

			const data: LoginResponse = await response.json();

			if (!response.ok || !data.user) {
				throw new Error(data.error ?? "Giriş başarısız");
			}

			if (typeof window !== "undefined") {
				localStorage.setItem("ecocharge:userId", data.user.id.toString());
				localStorage.setItem("ecocharge:role", data.user.role);
				localStorage.setItem("ecocharge:name", data.user.name);
			}

			router.push(data.user.role === "OPERATOR" ? "/operator" : "/driver");
		} catch (err) {
			const message = err instanceof Error ? err.message : "Giriş sırasında hata oluştu";
			setError(message);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<main className="relative min-h-screen w-full overflow-hidden bg-slate-900 text-white font-sans selection:bg-blue-500/30">
			{/* Background Effects */}
			<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-slate-950" />
			<div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />
			
			{/* Content Container */}
			<div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-12 lg:px-8">
				
				{/* Hero Section */}
				<div className="mx-auto max-w-4xl text-center animate-in fade-in slide-in-from-bottom-8 duration-700">
					<div className="mb-8 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-1.5 text-sm font-medium text-blue-300 shadow-lg shadow-blue-500/10 backdrop-blur-sm">
						<Zap className="h-4 w-4 fill-blue-300" />
						<span>Hackathon Prototype v1.0</span>
					</div>
					
					<h1 className="mb-6 text-5xl font-bold tracking-tight text-white sm:text-7xl drop-shadow-2xl">
						SmartCharge
						<span className="block mt-2 text-3xl sm:text-4xl font-medium text-slate-400 tracking-normal">
							Yapay Zekâ Destekli Akıllı Şarj Ağı
						</span>
					</h1>
					
					<p className="mx-auto mb-10 max-w-2xl text-lg text-slate-400 leading-relaxed">
						Şebeke yüküne göre en verimli saatleri öneren, boş istasyonları otomatik bulan, 
						Coin ve XP ile oyunlaştırılmış yeni nesil şarj platformu.
					</p>

					{/* Feature Grid */}
					<div className="mb-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-left">
						<div className="group rounded-2xl border border-slate-800 bg-slate-800/50 p-5 transition hover:border-blue-500/30 hover:bg-slate-800">
							<div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
								<Zap className="h-5 w-5" />
							</div>
							<h3 className="font-semibold text-white">AI Smart Pick</h3>
							<p className="mt-1 text-xs text-slate-400">En uygun ve ekonomik şarj saatlerini belirler.</p>
						</div>
						<div className="group rounded-2xl border border-slate-800 bg-slate-800/50 p-5 transition hover:border-green-500/30 hover:bg-slate-800">
							<div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10 text-green-400 group-hover:scale-110 transition-transform">
								<MapPin className="h-5 w-5" />
							</div>
							<h3 className="font-semibold text-white">Yoğunluk Haritası</h3>
							<p className="mt-1 text-xs text-slate-400">Gerçek zamanlı istasyon doluluk takibi.</p>
						</div>
						<div className="group rounded-2xl border border-slate-800 bg-slate-800/50 p-5 transition hover:border-yellow-500/30 hover:bg-slate-800">
							<div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10 text-yellow-400 group-hover:scale-110 transition-transform">
								<Trophy className="h-5 w-5" />
							</div>
							<h3 className="font-semibold text-white">Gamification</h3>
							<p className="mt-1 text-xs text-slate-400">Coin, XP ve rozetlerle ödül sistemi.</p>
						</div>
						<div className="group rounded-2xl border border-slate-800 bg-slate-800/50 p-5 transition hover:border-purple-500/30 hover:bg-slate-800">
							<div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform">
								<Building2 className="h-5 w-5" />
							</div>
							<h3 className="font-semibold text-white">İşletme Paneli</h3>
							<p className="mt-1 text-xs text-slate-400">Operatörler için detaylı yönetim.</p>
						</div>
					</div>

					{/* CTA Button */}
					{!showLogin ? (
						<button
							onClick={() => setShowLogin(true)}
							className="group relative inline-flex items-center gap-3 rounded-full bg-white px-8 py-4 text-lg font-bold text-slate-900 transition-all hover:bg-blue-50 hover:scale-105 hover:shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] active:scale-95"
						>
							Uygulamaya Başla
							<ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
						</button>
					) : (
						/* Login Form (Inline) */
						<div className="mx-auto max-w-md animate-in fade-in zoom-in duration-300">
							<div className="relative overflow-hidden rounded-3xl border border-slate-700 bg-slate-800/80 p-8 shadow-2xl backdrop-blur-xl">
								<button 
									onClick={() => setShowLogin(false)}
									className="absolute right-4 top-4 text-slate-500 hover:text-white transition"
								>
									<X className="h-5 w-5" />
								</button>
								
								<h2 className="mb-6 text-2xl font-bold text-white">Giriş Yap</h2>
								
								<div className="space-y-4">
									<div>
										<label htmlFor="email" className="sr-only">E-posta</label>
										<input
											id="email"
											type="email"
											placeholder="E-posta adresiniz"
											value={email}
											onChange={(e) => setEmail(e.target.value)}
											className="w-full rounded-xl border border-slate-600 bg-slate-900/50 px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
											onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
										/>
										{predictedRole && (
											<p className="mt-2 flex items-center gap-1.5 text-xs text-blue-400">
												<CheckCircle2 className="h-3 w-3" />
												{predictedRole} olarak algılandı
											</p>
										)}
									</div>

									<button
										onClick={() => handleSubmit()}
										disabled={isSubmitting}
										className="w-full rounded-xl bg-blue-600 py-3 font-bold text-white transition hover:bg-blue-500 disabled:opacity-50"
									>
										{isSubmitting ? (
											<span className="flex items-center justify-center gap-2">
												<Loader2 className="h-4 w-4 animate-spin" /> Giriş Yapılıyor...
											</span>
										) : (
											"Devam Et"
										)}
									</button>

									{error && (
										<div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-200 border border-red-500/20">
											{error}
										</div>
									)}

									<div className="relative py-2">
										<div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-700"></div></div>
										<div className="relative flex justify-center"><span className="bg-slate-800 px-2 text-xs text-slate-500">veya demo hesap seç</span></div>
									</div>

									<div className="grid grid-cols-2 gap-3">
										<button
											onClick={() => handleSubmit(DEMO_EMAILS.driver)}
											className="rounded-xl border border-slate-700 bg-slate-800 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition"
										>
											Sürücü Demo
										</button>
										<button
											onClick={() => handleSubmit(DEMO_EMAILS.operator)}
											className="rounded-xl border border-slate-700 bg-slate-800 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition"
										>
											Operatör Demo
										</button>
									</div>
								</div>
							</div>
						</div>
					)}
				</div>
				
				{/* Footer */}
				<footer className="absolute bottom-6 text-center text-xs text-slate-600">
					&copy; 2025 SmartCharge. All rights reserved.
				</footer>
			</div>
		</main>
	);
}
