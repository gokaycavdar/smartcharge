import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

const GREEN_START = 23;
const GREEN_END = 6;

const GREEN_LOAD_RANGE = [12, 38] as const;
const RED_LOAD_RANGE = [55, 92] as const;

function isGreenHour(hour: number) {
  return hour >= GREEN_START || hour <= GREEN_END;
}

function getRandomLoad(isGreen: boolean) {
  const [min, max] = isGreen ? GREEN_LOAD_RANGE : RED_LOAD_RANGE;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const stationId = Number.parseInt(id, 10);

  if (Number.isNaN(stationId)) {
    return NextResponse.json({ error: "Geçersiz istasyon kimliği" }, { status: 400 });
  }

  const station = await prisma.station.findUnique({
    where: { id: stationId },
  });

  if (!station) {
    return NextResponse.json({ error: "İstasyon bulunamadı" }, { status: 404 });
  }

  const today = new Date();
  today.setMinutes(0, 0, 0);

  const slots = Array.from({ length: 24 }, (_, hour) => {
    const slotDate = new Date(today);
    slotDate.setHours(hour, 0, 0, 0);

    const green = isGreenHour(hour);
    const price = Number((station.price * (green ? 0.8 : 1)).toFixed(2));

    return {
      hour,
      label: `${hour.toString().padStart(2, "0")}:00`,
      startTime: slotDate.toISOString(),
      isGreen: green,
      coins: green ? 50 : 10,
      price,
      status: green ? "GREEN" : "RED",
      load: getRandomLoad(green),
    };
  });

  return NextResponse.json({ ...station, slots });
}