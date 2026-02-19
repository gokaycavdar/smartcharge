// /api/stations/forecast - Anlık gün/saat için yoğunluk tahminlerini getir
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);

        // Query params: day (0-6), hour (0-23) - verilmezse anlık değerler kullanılır
        const now = new Date();
        const dayOfWeek = searchParams.get("day")
            ? parseInt(searchParams.get("day")!, 10)
            : (now.getDay() + 6) % 7; // JS: 0=Pazar, biz 0=Pazartesi istiyoruz
        const hour = searchParams.get("hour")
            ? parseInt(searchParams.get("hour")!, 10)
            : now.getHours();

        // Tüm istasyonlar için o gün/saat tahminlerini getir
        const forecasts = await prisma.stationDensityForecast.findMany({
            where: {
                dayOfWeek,
                hour,
            },
            include: {
                station: {
                    select: {
                        id: true,
                        name: true,
                        lat: true,
                        lng: true,
                        price: true,
                        address: true,
                        densityProfile: true,
                    },
                },
            },
            orderBy: {
                predictedLoad: "asc", // En düşük yoğunluktan sırala
            },
        });

        // Response formatı
        const result = forecasts.map((f) => ({
            stationId: f.station.id,
            stationName: f.station.name,
            lat: f.station.lat,
            lng: f.station.lng,
            price: f.station.price,
            address: f.station.address,
            densityProfile: f.station.densityProfile,
            predictedLoad: f.predictedLoad,
            dayOfWeek: f.dayOfWeek,
            hour: f.hour,
        }));

        return NextResponse.json({
            success: true,
            currentTime: { dayOfWeek, hour },
            forecasts: result,
        });
    } catch (error) {
        console.error("Forecast fetch error:", error);
        return NextResponse.json(
            { success: false, error: "Tahminler alınamadı" },
            { status: 500 }
        );
    }
}
