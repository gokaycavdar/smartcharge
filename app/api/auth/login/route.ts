import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawEmail = typeof body?.email === "string" ? body.email : "";
    const email = rawEmail.trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "E-posta gerekli" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        badges: true,
        stations: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
    }

    type BadgeRecord = (typeof user.badges)[number];
    type StationRecord = (typeof user.stations)[number];

    const badges = user.badges.map(
      ({ id, name, description, icon }: BadgeRecord) => ({
        id,
        name,
        description,
        icon,
      }),
    );

    const stations = user.stations.map(({ id, name, price }: StationRecord) => ({
      id,
      name,
      price,
    }));

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        coins: user.coins,
        co2Saved: user.co2Saved,
        xp: user.xp,
        badges,
        stations,
      },
    });
  } catch (error) {
    console.error("Login failed", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
