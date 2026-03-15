import { api, unwrap } from "../../lib/api";

export type StationListItem = {
  id: number;
  name: string;
  lat: number;
  lng: number;
  address?: string;
  price?: number;
  density?: number;
};

export type StationDetail = {
  id: number;
  name: string;
  lat: number;
  lng: number;
  slots: Array<{
    hour: number;
    label: string;      // "14:00"
    startTime: string;  // ISO
    isGreen: boolean;
    coins: number;
    price: number;
    status: string;     // "GREEN"/"RED"
    load: number;       // 0-100
  }>;
};

export type BestNowRecommendation = {
  stationId: number;
  name: string;
  hour: number;     // 0-23
  label: string;    // "14:00"
  coins: number;
  price: number;
  load: number;
  isGreen: boolean;
  reason: string;
};

// Stations list
export async function getStations(): Promise<StationListItem[]> {
  return unwrap<StationListItem[]>(api.get("/stations"));
}

// Station detail (slots)
export async function getStationDetail(id: number): Promise<StationDetail> {
  return unwrap<StationDetail>(api.get(`/stations/${id}`));
}

// Best Now (top 3)
export async function getBestNow(): Promise<BestNowRecommendation[]> {
  const now = new Date();
  const currentHour = now.getUTCHours(); // backend slotlar Z gibi dönüyor, UTC daha stabil
  const stations = await getStations();

  // önce yoğunluğu düşük olanlardan top 10 alalım (hız için)
  const top = [...stations]
    .sort((a, b) => (a.density ?? 999) - (b.density ?? 999))
    .slice(0, 10);

  const details = await Promise.all(
    top.map(async (s) => {
      try {
        return await getStationDetail(s.id);
      } catch {
        return null;
      }
    })
  );

  const recs: BestNowRecommendation[] = [];

  for (const d of details) {
    if (!d?.slots?.length) continue;

    // şu anki saate karşılık gelen slotu bul
    const slot =
      d.slots.find((x) => x.hour === currentHour) ??
      d.slots[0];

    if (!slot) continue;

    recs.push({
      stationId: d.id,
      name: d.name,
      hour: slot.hour,
      label: slot.label,
      coins: slot.coins,
      price: slot.price,
      load: slot.load,
      isGreen: slot.isGreen,
      reason: slot.isGreen ? "Düşük şebeke yükü & Yüksek ödül" : "Düşük yoğunluk",
    });
  }

  // en düşük load top3
  return recs.sort((a, b) => a.load - b.load).slice(0, 3);
}

// Personal campaigns
export type Campaign = {
  id: number;
  title: string;
  description: string;
  discount?: string;
  coinReward?: number;
  stationId?: number | null;
};

type ForUserResponse = {
  campaigns: Campaign[];
};

export async function getPersonalCampaigns(): Promise<Campaign[]> {
  const data = await unwrap<ForUserResponse>(api.get("/campaigns/for-user"));
  return data.campaigns ?? [];
}