"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, RefreshCcw, TicketPercent } from "lucide-react";
import { authFetch, unwrapResponse } from "@/lib/auth";
import CouponFormModal, { type CouponFormValues } from "@/components/operator/CouponFormModal";
import CouponTable, { type OperatorCoupon } from "@/components/operator/CouponTable";

type CouponListResponse = {
  coupons: OperatorCoupon[];
  total: number;
};

const emptyForm: CouponFormValues = {
  name: "",
  description: "",
  coinCost: 100,
  discountType: "percentage",
  discountValue: 10,
  icon: "*",
  isActive: true,
};

export default function OperatorCouponsPage() {
  const [coupons, setCoupons] = useState<OperatorCoupon[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const [limit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<OperatorCoupon | null>(null);

  const loadCoupons = async (silent = false) => {
    if (!silent) setIsLoading(true);
    if (silent) setIsRefreshing(true);

    try {
      const params = new URLSearchParams();
      params.set("limit", String(limit));
      params.set("offset", String(offset));
      if (search.trim()) params.set("search", search.trim());
      if (activeFilter !== "all") params.set("active", activeFilter === "active" ? "true" : "false");

      const res = await authFetch(`/api/operator/coupons?${params.toString()}`);
      const data = await unwrapResponse<CouponListResponse>(res);
      setCoupons(data.coupons);
      setTotal(data.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kuponlar yuklenemedi.");
    } finally {
      if (!silent) setIsLoading(false);
      if (silent) setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, [offset, activeFilter]);

  const stats = useMemo(() => {
    const active = coupons.filter((c) => c.isActive).length;
    const totalUsage = coupons.reduce((acc, c) => acc + c.totalUsageCount, 0);
    return { active, totalUsage };
  }, [coupons]);

  const openCreate = () => {
    setEditing(null);
    setIsFormOpen(true);
  };

  const openEdit = (coupon: OperatorCoupon) => {
    setEditing(coupon);
    setIsFormOpen(true);
  };

  const initialValues = editing
    ? {
        name: editing.name,
        description: editing.description,
        coinCost: editing.coinCost,
        discountType: editing.discountType,
        discountValue: editing.discountValue,
        icon: editing.icon,
        isActive: editing.isActive,
      }
    : emptyForm;

  const handleSubmit = async (values: CouponFormValues) => {
    setIsSaving(true);
    try {
      if (editing) {
        await unwrapResponse(
          await authFetch(`/api/operator/coupons/${editing.id}`, {
            method: "PUT",
            body: JSON.stringify(values),
          })
        );
      } else {
        await unwrapResponse(
          await authFetch("/api/operator/coupons", {
            method: "POST",
            body: JSON.stringify(values),
          })
        );
      }
      setIsFormOpen(false);
      setEditing(null);
      await loadCoupons(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kaydetme islemi basarisiz.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivate = async (coupon: OperatorCoupon) => {
    const confirmed = window.confirm(`\"${coupon.name}\" kuponunu pasife almak istiyor musunuz?`);
    if (!confirmed) return;
    try {
      await unwrapResponse(await authFetch(`/api/operator/coupons/${coupon.id}`, { method: "DELETE" }));
      await loadCoupons(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kupon pasife alinamadi.");
    }
  };

  const handleHardDelete = async (coupon: OperatorCoupon) => {
    const confirmed = window.confirm(`\"${coupon.name}\" kuponunu kalici silmek istiyor musunuz?`);
    if (!confirmed) return;
    try {
      await unwrapResponse(await authFetch(`/api/operator/coupons/${coupon.id}?hard=true`, { method: "DELETE" }));
      await loadCoupons(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kupon silinemedi.");
    }
  };

  const nextDisabled = offset + limit >= total;

  return (
    <div className="min-h-full p-6 lg:p-12 text-primary">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3rem] text-accent-primary font-bold">Operator Paneli</p>
            <h1 className="mt-2 text-3xl font-bold text-white font-display">Kupon Yonetimi</h1>
            <p className="mt-2 text-sm text-text-secondary">Kupon merkezi katalogunu olusturun, duzenleyin ve yonetin.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => loadCoupons(true)}
              className="rounded-xl border border-white/10 bg-surface-1 px-4 py-2 text-sm font-semibold text-white hover:bg-surface-2 transition inline-flex items-center gap-2"
            >
              <RefreshCcw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} /> Yenile
            </button>
            <button
              onClick={openCreate}
              className="rounded-xl bg-accent-primary px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover transition inline-flex items-center gap-2"
            >
              <Plus className="h-4 w-4" /> Yeni Kupon
            </button>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-surface-1 p-4">
            <p className="text-xs text-text-tertiary">Toplam Kupon</p>
            <p className="mt-2 text-2xl font-bold text-white">{total}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-surface-1 p-4">
            <p className="text-xs text-text-tertiary">Sayfada Aktif</p>
            <p className="mt-2 text-2xl font-bold text-emerald-400">{stats.active}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-surface-1 p-4">
            <p className="text-xs text-text-tertiary">Kullanim (Sayfa)</p>
            <p className="mt-2 text-2xl font-bold text-amber-300">{stats.totalUsage}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-surface-1 p-4 flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <TicketPercent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Kupon adina veya aciklamaya gore ara"
              className="w-full rounded-xl border border-white/10 bg-surface-2 pl-10 pr-4 py-2.5 text-sm text-white"
            />
          </div>
          <select
            value={activeFilter}
            onChange={(e) => {
              setOffset(0);
              setActiveFilter(e.target.value as "all" | "active" | "inactive");
            }}
            className="rounded-xl border border-white/10 bg-surface-2 px-4 py-2.5 text-sm text-white"
          >
            <option value="all">Tum Durumlar</option>
            <option value="active">Sadece Aktif</option>
            <option value="inactive">Sadece Pasif</option>
          </select>
          <button
            onClick={() => {
              setOffset(0);
              loadCoupons(true);
            }}
            className="rounded-xl border border-white/10 bg-surface-2 px-4 py-2.5 text-sm font-semibold text-white"
          >
            Ara
          </button>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
        ) : null}

        {isLoading ? (
          <div className="rounded-2xl border border-white/10 bg-surface-1 p-10 text-center text-text-tertiary">Yukleniyor...</div>
        ) : (
          <>
            <CouponTable
              coupons={coupons}
              onEdit={openEdit}
              onDeactivate={handleDeactivate}
              onHardDelete={handleHardDelete}
            />

            <div className="flex items-center justify-end gap-2">
              <button
                disabled={offset === 0}
                onClick={() => setOffset((prev) => Math.max(0, prev - limit))}
                className="rounded-xl border border-white/10 bg-surface-1 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                Onceki
              </button>
              <button
                disabled={nextDisabled}
                onClick={() => setOffset((prev) => prev + limit)}
                className="rounded-xl border border-white/10 bg-surface-1 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                Sonraki
              </button>
            </div>
          </>
        )}

        <CouponFormModal
          isOpen={isFormOpen}
          title={editing ? "Kupon Duzenle" : "Yeni Kupon Ekle"}
          initialValues={initialValues}
          isSubmitting={isSaving}
          onClose={() => {
            setIsFormOpen(false);
            setEditing(null);
          }}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
