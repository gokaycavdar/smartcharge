import { api, unwrap } from "../../lib/api";

export type Station = {
  id: number;
  name: string;
  lat: number;
  lng: number;
  status?: "GREEN" | "YELLOW" | "RED";
  load?: number;
  mockStatus?: "GREEN" | "YELLOW" | "RED";
  mockLoad?: number;
  price?: number;
};

export function getStations() {
  return unwrap<Station[]>(api.get("/stations"));
}

export type Slot = {
  hour: number;
  label: string;
  startTime: string;
  isGreen: boolean;
  coins: number;
  price: number;
  status: "GREEN" | "YELLOW" | "RED" | string;
  load: number;
  campaignApplied?: {
    title: string;
    discount: string;
  };
};

export type StationDetail = {
  id: number;
  name: string;
  lat: number;
  lng: number;
  address: string;
  price: number;
  density: number;
  densityProfile: string;
  averageRating?: number;
  reviewCount?: number;
  slots: Slot[];
  activeCampaign?: {
    id: number;
    title: string;
    description: string;
    discount: string;
    coinReward: number;
    stationId: number | null;
  };
};

export function getStationDetail(id: number) {
  return unwrap<StationDetail>(api.get(`/stations/${id}`));
}

export type StationReview = {
  id: number;
  userId: number;
  userName: string;
  stationId: number;
  reservationId: number;
  rating: number;
  comment: string;
  createdAt: string;
};

export type StationReviewsResponse = {
  summary: {
    averageRating: number;
    reviewCount: number;
    fiveStar: number;
    fourStar: number;
    threeStar: number;
    twoStar: number;
    oneStar: number;
  };
  reviews: StationReview[];
};

export function getStationReviews(id: number, limit = 10, offset = 0) {
  return unwrap<StationReviewsResponse>(
    api.get(`/stations/${id}/reviews?limit=${limit}&offset=${offset}`)
  );
}

export function createReview(body: {
  stationId: number;
  reservationId: number;
  rating: number;
  comment: string;
}) {
  return unwrap<any>(
    api.post("/reviews", body, {
      headers: { "Content-Type": "application/json" },
    })
  );
}

export type RecommendationResult = {
  stationId: number;
  score: number;
  components: {
    load: number;
    green: number;
    distance: number;
    price: number;
    rl_bonus: number;
    q_value: number;
  };
  explanation: string;
};

export type RecommendationResponse = {
  algorithm: string;
  results: RecommendationResult[];
};

export function getRecommendedStations(params?: {
  lat?: number;
  lng?: number;
  hour?: number;
  day?: number;
  limit?: number;
}) {
  const q = new URLSearchParams();

  if (params?.lat != null) q.append("lat", String(params.lat));
  if (params?.lng != null) q.append("lng", String(params.lng));
  if (params?.hour != null) q.append("hour", String(params.hour));
  if (params?.day != null) q.append("day", String(params.day));
  if (params?.limit != null) q.append("limit", String(params.limit));

  const qs = q.toString();
  return unwrap<RecommendationResponse>(
    api.get(`/stations/recommend${qs ? `?${qs}` : ""}`)
  );
}