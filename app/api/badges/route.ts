// /api/badges - Tüm badge'leri getir
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
    try {
        const badges = await prisma.badge.findMany({
            orderBy: { name: "asc" },
        });

        return NextResponse.json({
            success: true,
            badges,
        });
    } catch (error) {
        console.error("Badge fetch error:", error);
        return NextResponse.json(
            { success: false, error: "Badge'ler alınamadı" },
            { status: 500 }
        );
    }
}
