import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  const stationId = Number.parseInt(id, 10);

  try {
    const body = await request.json();
    const { name, lat, lng, address, price } = body;

    const station = await prisma.station.update({
      where: { id: stationId },
      data: {
        name,
        lat: lat ? Number(lat) : undefined,
        lng: lng ? Number(lng) : undefined,
        address,
        price: price ? Number(price) : undefined,
      },
    });

    return NextResponse.json(station);
  } catch (error) {
    console.error("Station update failed", error);
    return NextResponse.json({ error: "Güncelleme başarısız" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;
  const stationId = Number.parseInt(id, 10);

  try {
    // Check if there are reservations or campaigns linked to this station
    // For simplicity in this hackathon, we might just delete them or fail.
    // Let's try to delete. Prisma might throw if there are foreign key constraints without cascade.
    // The schema doesn't specify onDelete: Cascade, so we might need to handle it.
    // But for now let's try simple delete.
    
    await prisma.station.delete({
      where: { id: stationId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Station delete failed", error);
    return NextResponse.json({ error: "Silme başarısız. İstasyona bağlı rezervasyonlar olabilir." }, { status: 500 });
  }
}
