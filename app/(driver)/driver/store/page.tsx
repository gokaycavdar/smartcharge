"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, AlertCircle, CheckCircle2, Coins, PackageOpen } from "lucide-react";
import { authFetch, getToken, unwrapResponse } from "@/lib/auth";
import { useRouter } from "next/navigation";

type StoreItem = {
	id: number;
	name: string;
	description: string;
	smartcoinPrice: number;
	stockQuantity: number;
	icon: string;
	canBuy: boolean;
};

type StoreListResponse = {
	userCoins: number;
	items: StoreItem[];
};

type PurchasePayload = {
	purchase: {
		id: number;
		storeItemId: number;
		quantity: number;
		totalSmartcoins: number;
		purchasedAt: string;
	};
	remainingCoins: number;
	remainingStock: number;
	message: string;
};

type ToastState = {
	type: "success" | "error";
	message: string;
};

export default function DriverStorePage() {
	const router = useRouter();
	const [isLoading, setIsLoading] = useState(true);
	const [items, setItems] = useState<StoreItem[]>([]);
	const [userCoins, setUserCoins] = useState(0);
	const [error, setError] = useState<string | null>(null);
	const [purchasingId, setPurchasingId] = useState<number | null>(null);
	const [toast, setToast] = useState<ToastState | null>(null);

	const loadStore = useCallback(async () => {
		try {
			const res = await authFetch("/api/store/items");
			const data = await unwrapResponse<StoreListResponse>(res);
			setUserCoins(data.userCoins);
			setItems(data.items);
			setError(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Magaza urunleri yuklenemedi.");
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		const token = getToken();
		if (!token) {
			router.push("/");
			return;
		}
		loadStore();
	}, [router, loadStore]);

	const showToast = (next: ToastState) => {
		setToast(next);
		setTimeout(() => setToast(null), 3500);
	};

	const handlePurchase = async (item: StoreItem) => {
		if (item.stockQuantity <= 0) {
			showToast({ type: "error", message: "Bu urunun stogu tukendi." });
			return;
		}
		if (userCoins < item.smartcoinPrice) {
			showToast({ type: "error", message: "Yetersiz Smartcoin bakiyesi." });
			return;
		}

		setPurchasingId(item.id);
		try {
			const res = await authFetch("/api/store/purchase", {
				method: "POST",
				body: JSON.stringify({ storeItemId: item.id, quantity: 1 }),
			});
			const data = await unwrapResponse<PurchasePayload>(res);

			setUserCoins(data.remainingCoins);
			setItems((prev) =>
				prev.map((i) => {
					if (i.id !== item.id) {
						return {
							...i,
							canBuy: i.stockQuantity > 0 && data.remainingCoins >= i.smartcoinPrice,
						};
					}
					const remainingStock = data.remainingStock;
					return {
						...i,
						stockQuantity: remainingStock,
						canBuy: remainingStock > 0 && data.remainingCoins >= i.smartcoinPrice,
					};
				})
			);

			showToast({ type: "success", message: data.message });
		} catch (err) {
			showToast({ type: "error", message: err instanceof Error ? err.message : "Satin alma basarisiz." });
		} finally {
			setPurchasingId(null);
		}
	};

	return (
		<main className="min-h-screen bg-primary-bg text-primary font-sans pb-20">
			<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent-primary/10 via-primary-bg to-primary-bg" />
			<div className="relative z-10 mx-auto max-w-6xl px-6 py-12 space-y-8">
				<header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-8">
					<div>
						<p className="text-xs uppercase tracking-[0.3rem] text-accent-primary font-bold">SmartCharge Store</p>
						<h1 className="mt-2 text-4xl font-bold text-white font-display">Magaza</h1>
						<p className="mt-2 text-text-secondary max-w-2xl">Smartcoin birikimini odullere donustur, surus deneyimini gelistir.</p>
					</div>
					<Link href="/driver" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-surface-1 px-5 py-2.5 text-sm font-semibold text-text-secondary hover:border-accent-primary/50 hover:bg-accent-primary/10 hover:text-accent-primary transition">
						<ArrowLeft className="h-4 w-4" /> Haritaya Don
					</Link>
				</header>

				<div className="rounded-2xl border border-amber-400/30 bg-gradient-to-r from-amber-500/15 to-orange-500/15 p-6">
					<div className="flex items-center justify-between gap-3">
						<div>
							<p className="text-xs uppercase tracking-widest text-amber-300">Anlik Bakiye</p>
							<p className="mt-2 text-3xl font-bold text-white">{userCoins.toLocaleString("tr-TR")} <span className="text-lg text-amber-300">SC</span></p>
						</div>
						<div className="h-12 w-12 rounded-full bg-amber-500/20 flex items-center justify-center">
							<Coins className="h-6 w-6 text-amber-300" />
						</div>
					</div>
				</div>

				{error && (
					<div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200 text-sm flex items-center gap-2">
						<AlertCircle className="h-4 w-4" /> {error}
					</div>
				)}

				{isLoading ? (
					<div className="flex items-center justify-center py-16 text-text-secondary">
						<Loader2 className="h-6 w-6 animate-spin text-accent-primary mr-2" /> Urunler yukleniyor...
					</div>
				) : items.length === 0 ? (
					<div className="rounded-2xl border border-white/10 bg-surface-1 p-12 text-center text-text-secondary">
						<PackageOpen className="h-8 w-8 mx-auto mb-3 opacity-60" />
						Aktif urun bulunmuyor.
					</div>
				) : (
					<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
						{items.map((item) => {
							const insufficientBalance = userCoins < item.smartcoinPrice;
							const outOfStock = item.stockQuantity <= 0;
							const disabled = purchasingId === item.id || outOfStock || insufficientBalance;

							let helperText = "Hemen satin al";
							if (outOfStock) helperText = "Stok tukendi";
							else if (insufficientBalance) helperText = "Yetersiz bakiye";

							return (
								<div key={item.id} className="rounded-2xl border border-white/10 bg-surface-1 p-5 flex flex-col">
									<div className="flex items-start justify-between gap-3">
										<div className="flex items-center gap-3">
											<span className="h-12 w-12 rounded-xl bg-surface-2 flex items-center justify-center text-2xl">{item.icon || "*"}</span>
											<div>
												<h3 className="font-bold text-white leading-tight">{item.name}</h3>
												<p className="text-xs text-text-tertiary mt-1">Stok: {item.stockQuantity}</p>
											</div>
										</div>
										<span className="rounded-full bg-amber-500/15 text-amber-300 text-xs font-semibold px-2.5 py-1">
											{item.smartcoinPrice.toLocaleString("tr-TR")} SC
										</span>
									</div>

									<p className="mt-4 text-sm text-text-secondary flex-1">{item.description}</p>

									<div className="mt-5">
										<button
											onClick={() => handlePurchase(item)}
											disabled={disabled}
											className="w-full rounded-xl py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 bg-accent-primary text-white hover:bg-accent-hover"
										>
											{purchasingId === item.id ? "Satin aliniyor..." : "Satin Al"}
										</button>
										<p className={`mt-2 text-xs ${disabled ? "text-amber-300" : "text-text-tertiary"}`}>{helperText}</p>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>

			{toast && (
				<div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 rounded-full px-5 py-2.5 text-sm font-semibold shadow-2xl inline-flex items-center gap-2 ${toast.type === "success" ? "bg-emerald-500 text-black" : "bg-red-500 text-white"}`}>
					{toast.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
					{toast.message}
				</div>
			)}
		</main>
	);
}
