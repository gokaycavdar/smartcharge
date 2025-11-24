import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ownerIdParam = searchParams.get("ownerId");
  const ownerId = ownerIdParam ? Number.parseInt(ownerIdParam, 10) : undefined;

  if (!ownerId) {
    return NextResponse.json({ error: "ownerId gerekli" }, { status: 400 });
  }

  try {
    const campaigns = await prisma.campaign.findMany({
      where: { ownerId },
      include: { station: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(campaigns);
  } catch (error) {
    console.error("Campaigns fetch failed", error);
    return NextResponse.json({ error: "Kampanyalar yüklenemedi" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, status, target, discount, endDate, ownerId, stationId, coinReward } = body;

    if (!title || !ownerId) {
      return NextResponse.json({ error: "Eksik bilgi" }, { status: 400 });
    }

    const campaign = await prisma.campaign.create({
      data: {
        title,
        description,
        status,
        target,
        discount,
        endDate: endDate ? new Date(endDate) : null,
        ownerId: Number(ownerId),
        stationId: stationId ? Number(stationId) : null,
        coinReward: coinReward ? Number(coinReward) : 0,
      },
    });

    return NextResponse.json(campaign);
  } catch (error) {
    console.error("Campaign create failed", error);
    return NextResponse.json({ error: "Kampanya oluşturulamadı" }, { status: 500 });
  }
}
