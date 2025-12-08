import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const reservationId = parseInt(id, 10);
    const body = await req.json();
    const { status } = body;

    if (!reservationId || !status) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { user: true }
    });

    if (!reservation) {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    }

    // If completing, award rewards
    if (status === "COMPLETED" && reservation.status !== "COMPLETED") {
      await prisma.$transaction([
        prisma.reservation.update({
          where: { id: reservationId },
          data: { status: "COMPLETED" }
        }),
        prisma.user.update({
          where: { id: reservation.userId },
          data: {
            coins: { increment: reservation.earnedCoins },
            xp: { increment: 100 }, // Fixed XP for completion
            co2Saved: { increment: reservation.isGreen ? 2.5 : 0.5 }
          }
        })
      ]);
    } else {
      // Just update status (e.g. CANCELLED)
      await prisma.reservation.update({
        where: { id: reservationId },
        data: { status }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reservation update failed", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
