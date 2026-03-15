import { api, unwrap } from "../../lib/api";

export type LeaderboardUser = {
  id: number;
  name: string;
  xp: number;
  totalCoins: number;
};

export function getLeaderboard() {
  return unwrap<LeaderboardUser[]>(
    api.get("/users/leaderboard")
  );
}