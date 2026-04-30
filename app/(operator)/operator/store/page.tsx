"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Package, RefreshCcw, Trash2, X, Save } from "lucide-react";
import { authFetch, unwrapResponse } from "@/lib/auth";

type StoreItem = {
	id: number;
	name: string;
	description: string;
	smartcoinPrice: number;
	stockQuantity: number;
	icon: string;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
};

type ItemFormState = {
	name: string;
	description: string;
	smartcoinPrice: number;
	stockQuantity: number;
	icon: string;
	isActive: boolean;
};

const emptyForm: ItemFormState = {
	name: "",
	description: "",
	smartcoinPrice: 100,
	stockQuantity: 0,
	icon: "*",
	isActive: true,
};

export default function OperatorStorePage() {
	const [items, setItems] = useState<StoreItem[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState(false);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [editingItem, setEditingItem] = useState<StoreItem | null>(null);
	const [showForm, setShowForm] = useState(false);
	const [form, setForm] = useState<ItemFormState>(emptyForm);

	const loadItems = async (silent = false) => {
		if (!silent) setIsLoading(true);
		if (silent) setIsRefreshing(true);
		try {
			const res = await authFetch("/api/store/items/admin");
			const data = await unwrapResponse<StoreItem[]>(res);
			setItems(data);
			setError(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Magaza urunleri yuklenemedi.");
		} finally {
			if (!silent) setIsLoading(false);
			if (silent) setIsRefreshing(false);
		}
	};

	useEffect(() => {
		loadItems();
	}, []);

	const stats = useMemo(() => {
		const active = items.filter((i) => i.isActive).length;
		const outOfStock = items.filter((i) => i.stockQuantity <= 0).length;
		return { total: items.length, active, outOfStock };
	}, [items]);

	const openCreateForm = () => {
		setEditingItem(null);
		setForm(emptyForm);
		setShowForm(true);
	};

	const openEditForm = (item: StoreItem) => {
		setEditingItem(item);
		setForm({
			name: item.name,
			description: item.description,
			smartcoinPrice: item.smartcoinPrice,
			stockQuantity: item.stockQuantity,
			icon: item.icon || "*",
			isActive: item.isActive,
		});
		setShowForm(true);
	};

	const closeForm = () => {
		setShowForm(false);
		setEditingItem(null);
		setForm(emptyForm);
	};

	const handleCreate = async () => {
		setIsSaving(true);
		try {
			await unwrapResponse(
				await authFetch("/api/store/items", {
					method: "POST",
					body: JSON.stringify(form),
				})
			);
			closeForm();
			await loadItems(true);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Urun ekleme basarisiz.");
		} finally {
			setIsSaving(false);
		}
	};

	const handleUpdate = async () => {
		if (!editingItem) return;
		setIsSaving(true);
		try {
			await unwrapResponse(
				await authFetch(`/api/store/items/${editingItem.id}`, {
					method: "PUT",
					body: JSON.stringify({
						smartcoinPrice: form.smartcoinPrice,
						stockQuantity: form.stockQuantity,
					}),
				})
			);

			if (!form.isActive) {
				await unwrapResponse(
					await authFetch(`/api/store/items/${editingItem.id}`, {
						method: "DELETE",
					})
				);
			}

			closeForm();
			await loadItems(true);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Urun guncelleme basarisiz.");
		} finally {
			setIsSaving(false);
		}
	};

	const deactivateItem = async (id: number) => {
		try {
			await unwrapResponse(await authFetch(`/api/store/items/${id}`, { method: "DELETE" }));
			await loadItems(true);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Urun pasife alinamadi.");
		}
	};

	const hardDeleteItem = async (id: number) => {
		try {
			await unwrapResponse(await authFetch(`/api/store/items/${id}?hard=true`, { method: "DELETE" }));
			await loadItems(true);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Urun silinemedi.");
		}
	};

	return (
		<div className="min-h-full p-6 lg:p-12 text-primary">
			<div className="mx-auto max-w-7xl space-y-8">
				<header className="flex flex-wrap items-start justify-between gap-4">
					<div>
						<p className="text-xs uppercase tracking-[0.3rem] text-accent-primary font-bold">Operator Paneli</p>
						<h1 className="mt-2 text-3xl font-bold text-white font-display">Magaza Yonetimi</h1>
						<p className="mt-2 text-sm text-text-secondary">Magaza urunlerini olusturun, fiyat ve stoklarini yonetin.</p>
					</div>
					<div className="flex gap-2">
						<button
							onClick={() => loadItems(true)}
							className="rounded-xl border border-white/10 bg-surface-1 px-4 py-2 text-sm font-semibold text-white hover:bg-surface-2 transition inline-flex items-center gap-2"
						>
							<RefreshCcw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} /> Yenile
						</button>
						<button
							onClick={openCreateForm}
							className="rounded-xl bg-accent-primary px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover transition inline-flex items-center gap-2"
						>
							<Plus className="h-4 w-4" /> Yeni Urun
						</button>
					</div>
				</header>

				<div className="grid gap-4 md:grid-cols-3">
					<div className="rounded-2xl border border-white/10 bg-surface-1 p-4">
						<p className="text-xs text-text-tertiary">Toplam Urun</p>
						<p className="mt-2 text-2xl font-bold text-white">{stats.total}</p>
					</div>
					<div className="rounded-2xl border border-white/10 bg-surface-1 p-4">
						<p className="text-xs text-text-tertiary">Aktif Urun</p>
						<p className="mt-2 text-2xl font-bold text-emerald-400">{stats.active}</p>
					</div>
					<div className="rounded-2xl border border-white/10 bg-surface-1 p-4">
						<p className="text-xs text-text-tertiary">Stokta Yok</p>
						<p className="mt-2 text-2xl font-bold text-amber-400">{stats.outOfStock}</p>
					</div>
				</div>

				{error && (
					<div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
				)}

				{showForm && (
					<div className="rounded-2xl border border-white/10 bg-surface-1 p-6">
						<div className="mb-4 flex items-center justify-between">
							<h2 className="text-lg font-bold text-white">{editingItem ? "Urun Duzenle" : "Yeni Urun Ekle"}</h2>
							<button onClick={closeForm} className="text-text-tertiary hover:text-white">
								<X className="h-4 w-4" />
							</button>
						</div>
						<div className="grid gap-4 md:grid-cols-2">
							<input className="rounded-xl border border-white/10 bg-surface-2 px-4 py-3 text-sm text-white" placeholder="Urun adi" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} disabled={!!editingItem} />
							<input className="rounded-xl border border-white/10 bg-surface-2 px-4 py-3 text-sm text-white" placeholder="Ikon" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} disabled={!!editingItem} />
							<textarea className="md:col-span-2 rounded-xl border border-white/10 bg-surface-2 px-4 py-3 text-sm text-white" placeholder="Aciklama" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} disabled={!!editingItem} />
							<input type="number" min={1} className="rounded-xl border border-white/10 bg-surface-2 px-4 py-3 text-sm text-white" placeholder="Smartcoin Fiyati" value={form.smartcoinPrice} onChange={(e) => setForm({ ...form, smartcoinPrice: Number(e.target.value) || 1 })} />
							<input type="number" min={0} className="rounded-xl border border-white/10 bg-surface-2 px-4 py-3 text-sm text-white" placeholder="Stok" value={form.stockQuantity} onChange={(e) => setForm({ ...form, stockQuantity: Number(e.target.value) || 0 })} />
							<label className="md:col-span-2 inline-flex items-center gap-2 text-sm text-text-secondary">
								<input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Aktif olarak yayinla
							</label>
						</div>
						<div className="mt-4 flex justify-end">
							<button
								onClick={editingItem ? handleUpdate : handleCreate}
								disabled={isSaving}
								className="rounded-xl bg-accent-primary px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover transition inline-flex items-center gap-2 disabled:opacity-60"
							>
								<Save className="h-4 w-4" /> {isSaving ? "Kaydediliyor..." : "Kaydet"}
							</button>
						</div>
					</div>
				)}

				{isLoading ? (
					<div className="rounded-2xl border border-white/10 bg-surface-1 p-10 text-center text-text-tertiary">Yukleniyor...</div>
				) : (
					<div className="rounded-2xl border border-white/10 bg-surface-1 overflow-hidden">
						<div className="overflow-x-auto">
							<table className="w-full min-w-[760px] text-sm">
								<thead className="bg-surface-2 text-xs uppercase tracking-wider text-text-tertiary">
									<tr>
										<th className="px-4 py-3 text-left">Urun</th>
										<th className="px-4 py-3 text-left">Fiyat</th>
										<th className="px-4 py-3 text-left">Stok</th>
										<th className="px-4 py-3 text-left">Durum</th>
										<th className="px-4 py-3 text-left">Guncelleme</th>
										<th className="px-4 py-3 text-right">Islem</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-white/5">
									{items.map((item) => (
										<tr key={item.id} className="hover:bg-surface-2/40 transition">
											<td className="px-4 py-3">
												<div className="flex items-center gap-3">
													<div className="h-9 w-9 rounded-lg bg-surface-2 flex items-center justify-center text-base">{item.icon || "*"}</div>
													<div>
														<p className="font-semibold text-white">{item.name}</p>
														<p className="text-xs text-text-tertiary line-clamp-1">{item.description}</p>
													</div>
												</div>
											</td>
											<td className="px-4 py-3 font-semibold text-amber-300">{item.smartcoinPrice.toLocaleString("tr-TR")} SC</td>
											<td className="px-4 py-3 text-white">{item.stockQuantity}</td>
											<td className="px-4 py-3">
												<span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${item.isActive ? "bg-emerald-500/15 text-emerald-300" : "bg-zinc-500/15 text-zinc-300"}`}>
													{item.isActive ? "Aktif" : "Pasif"}
												</span>
											</td>
											<td className="px-4 py-3 text-xs text-text-tertiary">{new Date(item.updatedAt).toLocaleString("tr-TR")}</td>
											<td className="px-4 py-3">
												<div className="flex items-center justify-end gap-2">
													<button onClick={() => openEditForm(item)} className="rounded-lg border border-white/10 bg-surface-2 px-2.5 py-2 text-text-secondary hover:text-white"><Pencil className="h-4 w-4" /></button>
													{item.isActive ? (
														<button onClick={() => deactivateItem(item.id)} className="rounded-lg border border-white/10 bg-surface-2 px-2.5 py-2 text-amber-300 hover:text-amber-200"><Package className="h-4 w-4" /></button>
													) : null}
													<button onClick={() => hardDeleteItem(item.id)} className="rounded-lg border border-red-500/40 bg-red-500/10 px-2.5 py-2 text-red-300 hover:text-red-200"><Trash2 className="h-4 w-4" /></button>
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
