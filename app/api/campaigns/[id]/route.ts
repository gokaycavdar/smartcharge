import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  const campaignId = Number.parseInt(id, 10);

  try {
    const body = await request.json();
    const { title, description, status, target, discount, endDate, stationId, coinReward, targetBadgeIds } = body;

    // Önce mevcut badge bağlantılarını kaldır
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        targetBadges: { set: [] },
      },
    });

    // Sonra yeni verileri güncelle ve badge'leri bağla
    const campaign = await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        title,
        description,
        status,
        target,
        discount,
        endDate: endDate ? new Date(endDate) : null,
        stationId: stationId ? Number(stationId) : null,
        coinReward: coinReward ? Number(coinReward) : 0,
        targetBadges: targetBadgeIds && targetBadgeIds.length > 0
          ? { connect: targetBadgeIds.map((id: number) => ({ id })) }
          : undefined,
      },
      include: { targetBadges: true },
    });

    return NextResponse.json(campaign);
  } catch (error) {
    console.error("Campaign update failed", error);
    return NextResponse.json({ error: "Güncelleme başarısız" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;
  const campaignId = Number.parseInt(id, 10);

  try {
    await prisma.campaign.delete({
      where: { id: campaignId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Campaign delete failed", error);
    return NextResponse.json({ error: "Silme başarısız" }, { status: 500 });
  }
}
