"use client";

import { Pencil, Trash2, Archive } from "lucide-react";

export type OperatorCoupon = {
  id: number;
  name: string;
  description: string;
  coinCost: number;
  discountType: "percentage" | "fixed";
  discountValue: number;
  icon: string;
  isActive: boolean;
  totalUsageCount: number;
  activeUsageCount: number;
  createdAt: string;
  updatedAt: string;
};

type Props = {
  coupons: OperatorCoupon[];
  onEdit: (coupon: OperatorCoupon) => void;
  onDeactivate: (coupon: OperatorCoupon) => void;
  onHardDelete: (coupon: OperatorCoupon) => void;
};

export default function CouponTable({ coupons, onEdit, onDeactivate, onHardDelete }: Props) {
  return (
    <div className="rounded-2xl border border-white/10 bg-surface-1 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-surface-2 text-xs uppercase tracking-wider text-text-tertiary">
            <tr>
              <th className="px-4 py-3 text-left">Kupon</th>
              <th className="px-4 py-3 text-left">Maliyet</th>
              <th className="px-4 py-3 text-left">Indirim</th>
              <th className="px-4 py-3 text-left">Kullanim</th>
              <th className="px-4 py-3 text-left">Durum</th>
              <th className="px-4 py-3 text-left">Guncelleme</th>
              <th className="px-4 py-3 text-right">Islem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {coupons.map((coupon) => (
              <tr key={coupon.id} className="hover:bg-surface-2/40 transition">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-surface-2 flex items-center justify-center text-base">
                      {coupon.icon || "*"}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{coupon.name}</p>
                      <p className="text-xs text-text-tertiary line-clamp-1">{coupon.description}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 font-semibold text-amber-300">{coupon.coinCost.toLocaleString("tr-TR")} SC</td>
                <td className="px-4 py-3 text-white">
                  {coupon.discountType === "percentage"
                    ? `%${coupon.discountValue.toLocaleString("tr-TR")}`
                    : `${coupon.discountValue.toLocaleString("tr-TR")} TL`}
                </td>
                <td className="px-4 py-3 text-text-secondary">
                  <span className="text-white font-semibold">{coupon.totalUsageCount}</span>
                  <span className="text-xs"> toplam / </span>
                  <span className="text-emerald-300 font-semibold">{coupon.activeUsageCount}</span>
                  <span className="text-xs"> aktif</span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                      coupon.isActive ? "bg-emerald-500/15 text-emerald-300" : "bg-zinc-500/15 text-zinc-300"
                    }`}
                  >
                    {coupon.isActive ? "Aktif" : "Pasif"}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-text-tertiary">
                  {new Date(coupon.updatedAt).toLocaleString("tr-TR")}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onEdit(coupon)}
                      className="rounded-lg border border-white/10 bg-surface-2 px-2.5 py-2 text-text-secondary hover:text-white"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    {coupon.isActive ? (
                      <button
                        onClick={() => onDeactivate(coupon)}
                        className="rounded-lg border border-white/10 bg-surface-2 px-2.5 py-2 text-amber-300 hover:text-amber-200"
                      >
                        <Archive className="h-4 w-4" />
                      </button>
                    ) : null}
                    <button
                      onClick={() => onHardDelete(coupon)}
                      className="rounded-lg border border-red-500/40 bg-red-500/10 px-2.5 py-2 text-red-300 hover:text-red-200"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
