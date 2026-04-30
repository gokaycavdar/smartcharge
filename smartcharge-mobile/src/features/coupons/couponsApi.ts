import { api } from "../../lib/api";

export type Coupon = {
  id: number;
  title: string;
  description: string;
  costCoins: number;
  discountType?: string;
  discountValue?: number;
  isActive?: boolean;
};

export async function getCoupons(): Promise<Coupon[]> {
  const res = await api.get("/v1/coupons/list");
  return res.data;
}

export async function redeemCoupon(couponId: number) {
  const res = await api.post("/v1/coupons/redeem", {
    couponId,
  });
  return res.data;
}