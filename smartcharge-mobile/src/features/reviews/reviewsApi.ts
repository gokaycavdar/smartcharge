import { api, unwrap } from "../../lib/api";

export type CreateReviewBody = {
  stationId: number;
  reservationId: number;
  rating: number;
  comment: string;
};

export type Review = {
  id: number;
  userId: number;
  userName: string;
  stationId: number;
  reservationId: number;
  rating: number;
  comment: string;
  createdAt: string;
};

export function createReview(body: CreateReviewBody) {
  return unwrap<Review>(
    api.post("/reviews", body, {
      headers: { "Content-Type": "application/json" },
    })
  );
}