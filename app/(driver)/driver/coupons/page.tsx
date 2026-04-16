/**
 * Coupon List Page
 * Main page for displaying available coupons and redeeming them
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, CheckCircle, ArrowLeft, Sparkles } from "lucide-react";
import { authFetch, unwrapResponse, getToken } from "@/lib/auth";
import { CoinBalanceCard } from "@/components/CoinBalanceCard";
import { CouponCard } from "@/components/CouponCard";
import Link from "next/link";

type Coupon = {
	id: number;
	name: string;
	description: string;
	discountType: "percentage" | "fixed";
	discountValue: number;
	icon: string;
	coinCost: number;
	canBuy: boolean;
};

type CouponListResponse = {
	userCoins: number;
	availableCoupons: Coupon[];
};

type UserCoupon = {
	id: number;
	couponId: number;
	name: string;
	discountType: string;
	discountValue: number;
	icon: string;
	status: string;
	code: string;
	expiresAt: string;
	createdAt: string;
};

type RedeemResponse = {
	userCoupon: UserCoupon;
	remainingCoins: number;
	message: string;
};

export default function CouponPage() {
	const router = useRouter();
	const [userCoins, setUserCoins] = useState<number>(0);
	const [coupons, setCoupons] = useState<Coupon[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [redeemingId, setRedeemingId] = useState<number | null>(null);
	const [toastMessage, setToastMessage] = useState<{
		type: "success" | "error";
		message: string;
	} | null>(null);

	// Load available coupons
	useEffect(() => {
		const token = getToken();
		if (!token) {
			router.push("/");
			return;
		}

		const loadCoupons = async () => {
			try {
				const response = await authFetch("/api/coupons/list");
				const data = await unwrapResponse<CouponListResponse>(response);
				setUserCoins(data.userCoins);
				setCoupons(data.availableCoupons);
				setError(null);
			} catch (err) {
				console.error("Failed to load coupons:", err);
				setError(
					err instanceof Error ? err.message : "Kuponlar yüklenemedi."
				);
			} finally {
				setIsLoading(false);
			}
		};

		loadCoupons();
	}, [router]);

	// Handle coupon redemption with optimistic UI update
	const handleRedeem = useCallback(
		async (couponId: number) => {
			setRedeemingId(couponId);

			try {
				const response = await authFetch("/api/coupons/redeem", {
					method: "POST",
					body: JSON.stringify({ couponId }),
				});

				const data = await unwrapResponse<RedeemResponse>(response);

				// Update UI
				setUserCoins(data.remainingCoins);
				setToastMessage({
					type: "success",
					message: data.message,
				});

				// Update coupon canBuy states
				setCoupons((prev) =>
					prev.map((c) => ({
						...c,
						canBuy: data.remainingCoins >= c.coinCost,
					}))
				);

				// Auto-dismiss toast after 4 seconds
				setTimeout(() => setToastMessage(null), 4000);
			} catch (err) {
				const errorMsg =
					err instanceof Error ? err.message : "Kupon dönüştürme başarısız oldu.";
				setToastMessage({
					type: "error",
					message: errorMsg,
				});
				setTimeout(() => setToastMessage(null), 5000);
			} finally {
				setRedeemingId(null);
			}
		},
		[]
	);

	return (
		<main className="min-h-screen bg-primary-bg text-primary relative overflow-hidden font-sans pb-20">
			<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent-primary/10 via-primary-bg to-primary-bg" />
			<div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12">
				<header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-8">
					<div>
						<div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-accent-primary">
							<Sparkles className="h-4 w-4" />
							<span>Gamification Hub</span>
						</div>
						<h1 className="mt-2 text-4xl font-bold text-white tracking-tight font-display">Kupon Merkezi</h1>
						<p className="mt-2 max-w-2xl text-text-secondary">
							Biriktirdigin SmartCoin&apos;leri sarj indirim kuponlarina donustur.
						</p>
					</div>
					<Link
						href="/driver"
						className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-surface-1 px-5 py-2.5 text-sm font-semibold text-text-secondary transition hover:border-accent-primary/50 hover:bg-accent-primary/10 hover:text-accent-primary"
					>
						<ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-1" /> Haritaya Don
					</Link>
				</header>

				{/* Main Content */}
				<div>
					{/* Coin Balance Card */}
					<div className="mb-8">
						<CoinBalanceCard coins={userCoins} isLoading={isLoading} />
					</div>

				{/* Error Message */}
				{error && (
					<div className="mb-8 bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
						<AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
						<div>
							<h3 className="font-semibold text-red-300">Hata</h3>
							<p className="text-red-200 text-sm mt-1">{error}</p>
						</div>
					</div>
				)}

				{/* Loading State */}
				{isLoading && (
					<div className="flex items-center justify-center py-12">
						<Loader2 className="w-8 h-8 animate-spin text-accent-primary" />
						<span className="ml-3 text-secondary">Kuponlar yükleniyor...</span>
					</div>
				)}

				{/* Coupons Grid */}
				{!isLoading && coupons.length > 0 && (
					<div>
						<h2 className="text-2xl font-bold text-primary mb-6">
							Dönüştürülebilir Kuponlar
						</h2>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
							{coupons.map((coupon) => (
								<CouponCard
									key={coupon.id}
									{...coupon}
									onRedeem={handleRedeem}
									isLoading={redeemingId === coupon.id}
								/>
							))}
						</div>
					</div>
				)}

				{!isLoading && coupons.length === 0 && !error && (
					<div className="text-center py-12">
						<p className="text-secondary">Şu anda uygun kupon bulunmamaktadır.</p>
					</div>
				)}
				</div>

			{/* Toast Notification */}
			{toastMessage && (
				<div
					className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-4 fade-in duration-300 ${
						toastMessage.type === "success"
							? "bg-green-500 text-black"
							: "bg-red-500 text-white"
					}`}
				>
					{toastMessage.type === "success" ? (
						<CheckCircle className="w-5 h-5" />
					) : (
						<AlertCircle className="w-5 h-5" />
					)}
					<p className="text-sm font-bold">
						{toastMessage.message}
					</p>
				</div>
			)}
			</div>
		</main>
	);
}
