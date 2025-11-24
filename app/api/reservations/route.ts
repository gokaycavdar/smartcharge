import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, stationId, date, hour, isGreen } = body ?? {};

    if (!userId || !stationId || !date || !hour || typeof isGreen !== "boolean") {
      return NextResponse.json({ error: "Eksik rezervasyon bilgisi" }, { status: 400 });
    }

    const reservationDate = new Date(date);
    if (Number.isNaN(reservationDate.getTime())) {
      return NextResponse.json({ error: "Geçersiz tarih" }, { status: 400 });
    }

    // Check for active campaigns to apply bonus coins
    const campaigns = await prisma.campaign.findMany({
      where: {
        status: "ACTIVE",
        endDate: { gte: new Date() },
        OR: [
          { stationId: stationId },
          { stationId: null }
        ]
      },
      orderBy: { createdAt: "desc" }
    });

    const activeCampaign = campaigns[0];

    let earnedCoins = isGreen ? 50 : 10;
    if (activeCampaign?.coinReward) {
      earnedCoins += activeCampaign.coinReward;
    }

    const co2SavedDelta = isGreen ? 2.5 : 0.5;

    const [reservation, user] = await prisma.$transaction([
      prisma.reservation.create({
        data: {
          userId,
          stationId,
          date: reservationDate,
          hour,
          isGreen,
          earnedCoins,
          status: "CONFIRMED",
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          coins: { increment: earnedCoins },
          co2Saved: { increment: co2SavedDelta },
          xp: { increment: isGreen ? 150 : 60 },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Rezervasyon kaydedildi",
      reservation,
      user: {
        id: user.id,
        coins: user.coins,
        co2Saved: user.co2Saved,
        xp: user.xp,
      },
    });
  } catch (error) {
    console.error("Reservation create failed", error);
    return NextResponse.json({ error: "İşlem başarısız" }, { status: 500 });
  }
}