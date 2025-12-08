import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const LOAD_STATUSES = {
  GREEN: { min: 10, max: 45 },
  YELLOW: { min: 46, max: 65 },
  RED: { min: 66, max: 95 },
} as const;

type LoadKey = keyof typeof LOAD_STATUSES;

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateLoad(): { status: LoadKey; value: number } {
  const statuses: LoadKey[] = ["GREEN", "YELLOW", "RED"];
  const status = statuses[Math.floor(Math.random() * statuses.length)];
  const range = LOAD_STATUSES[status];
  return { status, value: randomInt(range.min, range.max) };
}

export async function GET() {
  try {
    const stations = await prisma.station.findMany({
      include: { owner: { select: { id: true, name: true } } },
      orderBy: { id: "asc" },
    });

    type StationRecord = (typeof stations)[number];

    const payload = stations.map((station: StationRecord) => {
      // Use DB density if available, otherwise fallback to random
      const loadValue = station.density > 0 ? station.density : generateLoad().value;
      
      let status: LoadKey = "GREEN";
      if (loadValue > 65) status = "RED";
      else if (loadValue > 45) status = "YELLOW";

      return {
        id: station.id,
        name: station.name,
        lat: station.lat,
        lng: station.lng,
        price: Number(station.price.toFixed(2)),
        ownerId: station.ownerId,
        ownerName: station.owner?.name ?? null,
        mockLoad: loadValue,
        mockStatus: status,
        nextGreenHour: "23:00",
      };
    });

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Station fetch failed", error);
    return NextResponse.json({ error: "İstasyonlar çekilemedi" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, latitude, longitude, address, price, ownerId } = body;

    const station = await prisma.station.create({
      data: {
        name,
        lat: latitude,
        lng: longitude,
        address,
        price,
        ownerId,
      },
    });

    return NextResponse.json(station);
  } catch (error) {
    console.error("Error creating station:", error);
    return NextResponse.json(
      { error: "Failed to create station" },
      { status: 500 }
    );
  }
}