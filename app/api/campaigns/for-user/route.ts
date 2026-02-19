// /api/campaigns/for-user - Kullanıcının badge'lerine göre kampanyaları getir
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get("userId");

        if (!userId) {
            return NextResponse.json(
                { success: false, error: "userId gerekli" },
                { status: 400 }
            );
        }

        // Kullanıcının badge'lerini al
        const user = await prisma.user.findUnique({
            where: { id: parseInt(userId, 10) },
            include: {
                badges: true,
            },
        });

        if (!user) {
            return NextResponse.json(
                { success: false, error: "Kullanıcı bulunamadı" },
                { status: 404 }
            );
        }

        const userBadgeIds = user.badges.map((b) => b.id);

        // Kullanıcının badge'leriyle eşleşen AKTİF kampanyaları getir
        const campaigns = await prisma.campaign.findMany({
            where: {
                status: "ACTIVE",
                targetBadges: {
                    some: {
                        id: { in: userBadgeIds },
                    },
                },
            },
            include: {
                targetBadges: true,
                station: {
                    select: {
                        id: true,
                        name: true,
                        lat: true,
                        lng: true,
                    },
                },
            },
            orderBy: {
                coinReward: "desc",
            },
        });

        // Response formatı
        const result = campaigns.map((c) => ({
            id: c.id,
            title: c.title,
            description: c.description,
            discount: c.discount,
            coinReward: c.coinReward,
            endDate: c.endDate,
            targetBadges: c.targetBadges.map((b) => ({
                id: b.id,
                name: b.name,
                icon: b.icon,
            })),
            station: c.station,
            // Kullanıcının sahip olduğu eşleşen badge'ler
            matchedBadges: c.targetBadges.filter((b) => userBadgeIds.includes(b.id)),
        }));

        return NextResponse.json({
            success: true,
            userBadges: user.badges,
            campaigns: result,
        });
    } catch (error) {
        console.error("Campaign fetch error:", error);
        return NextResponse.json(
            { success: false, error: "Kampanyalar alınamadı" },
            { status: 500 }
        );
    }
}
