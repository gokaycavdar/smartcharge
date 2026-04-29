"use client";

import { X, Save } from "lucide-react";
import { useEffect, useState } from "react";

export type CouponFormValues = {
  name: string;
  description: string;
  coinCost: number;
  discountType: "percentage" | "fixed";
  discountValue: number;
  icon: string;
  isActive: boolean;
};

type Props = {
  isOpen: boolean;
  title: string;
  initialValues: CouponFormValues;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (values: CouponFormValues) => void;
};

export default function CouponFormModal({
  isOpen,
  title,
  initialValues,
  isSubmitting,
  onClose,
  onSubmit,
}: Props) {
  const [form, setForm] = useState<CouponFormValues>(initialValues);

  useEffect(() => {
    setForm(initialValues);
  }, [initialValues]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-surface-1 p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-text-tertiary hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Kupon adi"
            className="rounded-xl border border-white/10 bg-surface-2 px-4 py-3 text-sm text-white"
          />

          <input
            value={form.icon}
            onChange={(e) => setForm({ ...form, icon: e.target.value })}
            placeholder="Ikon"
            className="rounded-xl border border-white/10 bg-surface-2 px-4 py-3 text-sm text-white"
          />

          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            placeholder="Aciklama"
            className="md:col-span-2 rounded-xl border border-white/10 bg-surface-2 px-4 py-3 text-sm text-white"
          />

          <input
            type="number"
            min={1}
            value={form.coinCost}
            onChange={(e) => setForm({ ...form, coinCost: Number(e.target.value) || 1 })}
            placeholder="Coin maliyeti"
            className="rounded-xl border border-white/10 bg-surface-2 px-4 py-3 text-sm text-white"
          />

          <input
            type="number"
            min={1}
            step={0.01}
            value={form.discountValue}
            onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) || 1 })}
            placeholder="Indirim degeri"
            className="rounded-xl border border-white/10 bg-surface-2 px-4 py-3 text-sm text-white"
          />

          <select
            value={form.discountType}
            onChange={(e) => setForm({ ...form, discountType: e.target.value as "percentage" | "fixed" })}
            className="rounded-xl border border-white/10 bg-surface-2 px-4 py-3 text-sm text-white"
          >
            <option value="percentage">Yuzde</option>
            <option value="fixed">Sabit Tutar</option>
          </select>

          <label className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-surface-2 px-4 py-3 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            Aktif
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-surface-2 px-4 py-2 text-sm font-semibold text-white"
          >
            Iptal
          </button>
          <button
            disabled={isSubmitting}
            onClick={() => onSubmit(form)}
            className="inline-flex items-center gap-2 rounded-xl bg-accent-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {isSubmitting ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
}
