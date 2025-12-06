import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    // Seed dosyasında oluşturulan sabit email'li kullanıcıyı bul
    const user = await prisma.user.findUnique({
      where: { email: "driver@test.com" },
      select: { id: true, name: true, email: true, role: true }
    });

    if (!user) {
      return NextResponse.json({ error: "Demo kullanıcı bulunamadı. Lütfen 'npx prisma db seed' çalıştırın." }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
