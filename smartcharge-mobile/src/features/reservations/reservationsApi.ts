import { api, unwrap } from "../../lib/api";

export type ReservationActionResponse = {
  id: number;
  status: string;
  confirmedAt?: string;
  startedAt?: string;
  completedAt?: string;
};

export function createReservation(body: {
  stationId: number;
  date: string;
  hour: string;
}) {
  return unwrap<any>(
    api.post("/reservations", body, {
      headers: { "Content-Type": "application/json" },
    })
  );
}

export function confirmReservation(id: number) {
  return unwrap<ReservationActionResponse>(
    api.post(`/reservations/${id}/confirm`)
  );
}

export function startReservation(id: number) {
  return unwrap<ReservationActionResponse>(
    api.post(`/reservations/${id}/start`)
  );
}

export function completeReservation(id: number) {
  return unwrap<any>(api.post(`/reservations/${id}/complete`));
}

export function cancelReservation(id: number) {
  return unwrap<any>(
    api.patch(
      `/reservations/${id}`,
      { status: "CANCELLED" },
      {
        headers: { "Content-Type": "application/json" },
      }
    )
  );
}