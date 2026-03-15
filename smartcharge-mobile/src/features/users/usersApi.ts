import { api, unwrap } from "../../lib/api";

export type UserBadge = {
  id: number;
  name: string;
  description: string;
  icon?: string;
};

export type BadgeProgress = {
  id: number;
  name: string;
  description: string;
  icon?: string;
  metric: string;
  threshold: number;
  currentCount: number;
  earned: boolean;
  earnedAt?: string | null;
};

export type Reservation = {
  id: number;
  date: string;
  hour: string;
  isGreen?: boolean;
  earnedCoins?: number;
  status: "PENDING" | "CONFIRMED" | "CHARGING" | "COMPLETED" | "CANCELLED" | "FAILED" | string;
  confirmedAt?: string;
  startedAt?: string;
  completedAt?: string;
  station: {
    id: number;
    name: string;
    price?: number;
  };
};

export type UserProfile = {
  id: number;
  name?: string;
  email?: string;
  badges: UserBadge[];
  allBadges?: BadgeProgress[];
  reviewedReservationIds?: number[];
  reservations: Reservation[];
};

export function getUser(id: number) {
  return unwrap<UserProfile>(api.get(`/users/${id}`));
}