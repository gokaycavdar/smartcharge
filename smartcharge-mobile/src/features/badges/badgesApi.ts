import { api, unwrap } from "../../lib/api";

export type Badge = {
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

export function getBadges() {
  return unwrap<Badge[]>(api.get("/badges"));
}

export function getBadgeProgress() {
  return unwrap<BadgeProgress[]>(api.get("/badges/progress"));
}