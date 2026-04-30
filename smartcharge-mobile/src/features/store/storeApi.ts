import { api } from "../../lib/api";

export type StoreItem = {
  id: number;
  name: string;
  description: string;
  priceCoins: number;
  stock: number;
  isActive?: boolean;
};

export async function getStoreItems(): Promise<StoreItem[]> {
  const res = await api.get("/v1/store/items");
  return res.data;
}

export async function purchaseStoreItem(itemId: number) {
  const res = await api.post("/v1/store/purchase", {
    itemId,
  });
  return res.data;
}