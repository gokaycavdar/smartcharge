// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { linearRegression, linearRegressionLine } from 'simple-statistics'

const prisma = new PrismaClient()

// ========================================
// LINEAR REGRESSION İLE YOĞUNLUK TAHMİNİ
// (simple-statistics kütüphanesi kullanılıyor)
// ========================================

// 2 aylık mock data oluştur (simüle)
function generateTwoMonthMockData(profile: "central" | "suburban" | "outskirt") {
  const data: { day: number; dayOfWeek: number; hour: number; load: number }[] = [];

  // Profil bazlı base load ve peak değerleri
  const profiles = {
    central: { baseLoad: 50, peakMultiplier: 1.8, variance: 15 },
    suburban: { baseLoad: 35, peakMultiplier: 1.5, variance: 12 },
    outskirt: { baseLoad: 20, peakMultiplier: 1.3, variance: 8 }
  };

  const config = profiles[profile];

  // 60 günlük simülasyon (her gün her saat)
  for (let day = 0; day < 60; day++) {
    const dayOfWeek = day % 7; // 0-6 (Pzt-Paz)
    const isWeekend = dayOfWeek >= 5;

    for (let hour = 0; hour < 24; hour++) {
      let load = config.baseLoad;

      // Saat bazlı pattern
      if (hour >= 7 && hour <= 9) {
        // Sabah peak (işe gidiş)
        load *= isWeekend ? 1.1 : config.peakMultiplier;
      } else if (hour >= 12 && hour <= 14) {
        // Öğle
        load *= 1.3;
      } else if (hour >= 17 && hour <= 20) {
        // Akşam peak (işten dönüş)
        load *= isWeekend ? 1.2 : config.peakMultiplier;
      } else if (hour >= 22 || hour < 6) {
        // Gece (düşük)
        load *= 0.4;
      }

      // Hafta sonu farklılığı
      if (isWeekend) {
        load *= 0.85;
      }

      // Rastgele varyans ekle (gerçekçilik için)
      const variance = (Math.random() - 0.5) * config.variance;
      load = Math.min(100, Math.max(0, load + variance));

      // Zaman içinde hafif trend ekle (gerçekçilik için)
      // Bazı istasyonlar zamanla daha popüler oluyor
      const trendFactor = 1 + (day / 60) * 0.1 * (Math.random() > 0.5 ? 1 : -1);
      load = Math.min(100, Math.max(0, load * trendFactor));

      data.push({ day, dayOfWeek, hour, load: Math.round(load) });
    }
  }

  return data;
}

// Linear Regression ile haftalık tahmin (simple-statistics kullanarak)
function linearRegressionToWeekly(mockData: { day: number; dayOfWeek: number; hour: number; load: number }[]) {
  const weeklyForecast: { dayOfWeek: number; hour: number; predictedLoad: number }[] = [];

  // Her gün-saat kombinasyonu için linear regression uygula
  for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
    for (let hour = 0; hour < 24; hour++) {
      const samples = mockData.filter(d => d.dayOfWeek === dayOfWeek && d.hour === hour);

      if (samples.length < 2) {
        // Yeterli veri yoksa ortalama al
        const avg = samples.reduce((sum, s) => sum + s.load, 0) / samples.length;
        weeklyForecast.push({ dayOfWeek, hour, predictedLoad: Math.round(avg) });
        continue;
      }

      // Linear regression için veri hazırla: [[x1, y1], [x2, y2], ...]
      // x = gün indeksi (0-59), y = load değeri
      const regressionData: [number, number][] = samples.map((s, idx) => [idx, s.load]);

      // simple-statistics ile linear regression
      const regression = linearRegression(regressionData);
      const predict = linearRegressionLine(regression);

      // Gelecek hafta için tahmin (son veri noktasından sonraki değer)
      const predictedLoad = predict(samples.length);

      // 0-100 arasında sınırla
      const boundedLoad = Math.min(100, Math.max(0, Math.round(predictedLoad)));

      weeklyForecast.push({ dayOfWeek, hour, predictedLoad: boundedLoad });
    }
  }

  return weeklyForecast;
}

// Haftalık tahminlerden ortalama density hesapla
function calculateAverageDensity(forecasts: { predictedLoad: number }[]): number {
  if (forecasts.length === 0) return 50;
  const sum = forecasts.reduce((acc, f) => acc + f.predictedLoad, 0);
  return Math.round(sum / forecasts.length);
}

async function main() {
  console.log('🌱 Seed işlemi başlıyor...')

  // 1. Önce eski verileri temizle (Hata almamak için)
  // deleteMany sıralaması önemli: Önce child (bağımlı) tablolar silinmeli
  await prisma.stationDensityForecast.deleteMany()
  await prisma.campaign.deleteMany()
  await prisma.reservation.deleteMany()
  await prisma.station.deleteMany()
  await prisma.badge.deleteMany()
  await prisma.user.deleteMany()

  // Şifreleri hash'le
  const defaultPassword = await bcrypt.hash('demo123', 10)

  // 2. Rozetleri (Gamification) Ekle
  const badgeNight = await prisma.badge.create({
    data: { name: "Gece Kuşu", description: "Gece tarifesinde 5 şarj", icon: "🦉" }
  })

  const badgeEco = await prisma.badge.create({
    data: { name: "Eco Şampiyonu", description: "Sadece yeşil enerjili istasyonları tercih et", icon: "🌱" }
  })

  const badgeWeekend = await prisma.badge.create({
    data: { name: "Hafta Sonu Savaşçısı", description: "Hafta sonu şarj et", icon: "🏖️" }
  })

  const badgeEarlyBird = await prisma.badge.create({
    data: { name: "Erken Kalkan", description: "Sabah 06:00 - 09:00 arası şarj et", icon: "🌅" }
  })

  const badgeLongHauler = await prisma.badge.create({
    data: { name: "Uzun Yolcu", description: "Şehirlerarası istasyonlarda şarj et", icon: "🛣️" }
  })

  // 3. Firma Hesabı Oluştur (Operator)
  const company = await prisma.user.create({
    data: {
      name: "Zorlu Enerji",
      email: "info@zorlu.com",
      password: defaultPassword,
      role: "OPERATOR",
    }
  })

  // 4. Sürücü Hesabı Oluştur (Driver)
  await prisma.user.create({
    data: {
      name: "Hackathon Sürücü",
      email: "driver@test.com",
      password: defaultPassword,
      role: "DRIVER",
      badges: { connect: [{ id: badgeNight.id }, { id: badgeEco.id }, { id: badgeWeekend.id }, { id: badgeEarlyBird.id }] }
    }
  })

  console.log('📝 Demo kullanıcılar oluşturuldu:')
  console.log('   Sürücü: driver@test.com / demo123')
  console.log('   Operatör: info@zorlu.com / demo123')

  // 5. İstasyonları Ekle (HARİTADA GÖRÜNECEK NOKTALAR 📍)
  // densityProfile: "central" | "suburban" | "outskirt" - yoğunluk tahmin patternini belirler
  await prisma.station.createMany({
    data: [
      // Manisa Merkez & Çevre
      { name: "Manisa Magnesia AVM", lat: 38.614, lng: 27.405, ownerId: company.id, price: 7.5, address: "Laleli, Magnesia AVM, Manisa", density: 85, densityProfile: "central" },
      { name: "Uncubozköy Kampüs", lat: 38.625, lng: 27.420, ownerId: company.id, price: 6.0, address: "Uncubozköy, CBÜ Kampüs, Manisa", density: 40, densityProfile: "suburban" },
      { name: "Manisa Organize Sanayi", lat: 38.580, lng: 27.350, ownerId: company.id, price: 8.5, address: "MOSB 1. Kısım, Manisa", density: 90, densityProfile: "central" },
      { name: "Manisa Prime AVM", lat: 38.618, lng: 27.412, ownerId: company.id, price: 7.8, address: "Güzelyurt, Manisa Prime, Manisa", density: 65, densityProfile: "suburban" },
      { name: "Spil Dağı Milli Parkı", lat: 38.550, lng: 27.450, ownerId: company.id, price: 9.5, address: "Spil Dağı Zirve Yolu, Manisa", density: 10, densityProfile: "outskirt" },
      { name: "Manisa Şehir Hastanesi", lat: 38.605, lng: 27.380, ownerId: company.id, price: 6.5, address: "Adnan Menderes, Şehir Hastanesi, Manisa", density: 75, densityProfile: "central" },
      { name: "Muradiye Kampüs", lat: 38.650, lng: 27.320, ownerId: company.id, price: 5.5, address: "Muradiye, CBÜ Kampüs, Manisa", density: 30, densityProfile: "outskirt" },
      { name: "Saruhanlı Merkez", lat: 38.730, lng: 27.570, ownerId: company.id, price: 7.0, address: "Saruhanlı Meydan, Manisa", density: 20, densityProfile: "outskirt" },
      { name: "Turgutlu Otoyol Çıkışı", lat: 38.490, lng: 27.700, ownerId: company.id, price: 8.0, address: "Turgutlu E-96 Karayolu, Manisa", density: 50, densityProfile: "suburban" },
      { name: "Akhisar Novada", lat: 38.920, lng: 27.830, ownerId: company.id, price: 7.5, address: "Akhisar Çevre Yolu, Manisa", density: 60, densityProfile: "suburban" },
      { name: "Manisa Garaj", lat: 38.610, lng: 27.430, ownerId: company.id, price: 6.8, address: "Yeni Garaj, Manisa", density: 55, densityProfile: "suburban" },
      { name: "Manisa Valilik", lat: 38.612, lng: 27.425, ownerId: company.id, price: 7.2, address: "Hükümet Konağı, Manisa", density: 45, densityProfile: "suburban" },
      { name: "Manisa 19 Mayıs Stadyumu", lat: 38.616, lng: 27.418, ownerId: company.id, price: 6.5, address: "Stadyum Çevresi, Manisa", density: 35, densityProfile: "outskirt" },
      { name: "Manisa Celal Bayar Hastanesi", lat: 38.628, lng: 27.422, ownerId: company.id, price: 6.2, address: "Hastane Otoparkı, Manisa", density: 70, densityProfile: "central" },
      { name: "Manisa Kenan Evren Sanayi", lat: 38.600, lng: 27.390, ownerId: company.id, price: 7.0, address: "Sanayi Sitesi, Manisa", density: 80, densityProfile: "central" },
      { name: "Manisa Tarzan Meydanı", lat: 38.613, lng: 27.426, ownerId: company.id, price: 7.3, address: "Tarzan Meydanı, Manisa", density: 60, densityProfile: "suburban" },
      { name: "Manisa 45 Park AVM", lat: 38.620, lng: 27.395, ownerId: company.id, price: 7.6, address: "Güzelyurt, 45 Park, Manisa", density: 50, densityProfile: "suburban" },
      { name: "Manisa Yunusemre Belediyesi", lat: 38.615, lng: 27.400, ownerId: company.id, price: 6.9, address: "Yunusemre, Manisa", density: 40, densityProfile: "suburban" },
      { name: "Manisa Şehzadeler Belediyesi", lat: 38.611, lng: 27.428, ownerId: company.id, price: 6.9, address: "Şehzadeler, Manisa", density: 45, densityProfile: "suburban" },
      { name: "Manisa Tren Garı", lat: 38.608, lng: 27.432, ownerId: company.id, price: 6.5, address: "İstasyon Cad., Manisa", density: 30, densityProfile: "outskirt" },
      { name: "Manisa OSB 2. Kısım", lat: 38.590, lng: 27.340, ownerId: company.id, price: 8.2, address: "MOSB 2. Kısım, Manisa", density: 85, densityProfile: "central" },
      { name: "Manisa OSB 3. Kısım", lat: 38.570, lng: 27.330, ownerId: company.id, price: 8.0, address: "MOSB 3. Kısım, Manisa", density: 75, densityProfile: "central" },
      { name: "Manisa OSB 4. Kısım", lat: 38.560, lng: 27.320, ownerId: company.id, price: 7.8, address: "MOSB 4. Kısım, Manisa", density: 65, densityProfile: "suburban" },
      { name: "Manisa OSB 5. Kısım", lat: 38.550, lng: 27.310, ownerId: company.id, price: 7.5, address: "MOSB 5. Kısım, Manisa", density: 55, densityProfile: "suburban" },
      { name: "Manisa Muradiye Sanayi", lat: 38.640, lng: 27.330, ownerId: company.id, price: 6.8, address: "Muradiye Sanayi, Manisa", density: 45, densityProfile: "suburban" },
      { name: "Manisa Horozköy Garı", lat: 38.630, lng: 27.400, ownerId: company.id, price: 6.2, address: "Horozköy, Manisa", density: 35, densityProfile: "outskirt" },
      { name: "Manisa Barbaros Mahallesi", lat: 38.620, lng: 27.410, ownerId: company.id, price: 6.5, address: "Barbaros, Manisa", density: 40, densityProfile: "suburban" },
      { name: "Manisa Kuşlubahçe", lat: 38.615, lng: 27.420, ownerId: company.id, price: 6.7, address: "Kuşlubahçe, Manisa", density: 50, densityProfile: "suburban" },
      { name: "Manisa Spil Yolu Girişi", lat: 38.605, lng: 27.435, ownerId: company.id, price: 7.0, address: "Karaköy, Manisa", density: 25, densityProfile: "outskirt" },
      { name: "Manisa Akgedik TOKİ", lat: 38.680, lng: 27.400, ownerId: company.id, price: 6.0, address: "Akgedik, Manisa", density: 20, densityProfile: "outskirt" },
      { name: "Manisa Gürle", lat: 38.660, lng: 27.380, ownerId: company.id, price: 6.3, address: "Gürle, Manisa", density: 15, densityProfile: "outskirt" },
      { name: "Manisa Karaoğlanlı", lat: 38.580, lng: 27.480, ownerId: company.id, price: 6.5, address: "Karaoğlanlı, Manisa", density: 10, densityProfile: "outskirt" },
      { name: "Manisa Sancaklıbozköy", lat: 38.550, lng: 27.520, ownerId: company.id, price: 6.8, address: "Sancaklıbozköy, Manisa", density: 12, densityProfile: "outskirt" },
      { name: "Manisa Aşağıçobanisa", lat: 38.520, lng: 27.580, ownerId: company.id, price: 7.0, address: "Aşağıçobanisa, Manisa", density: 18, densityProfile: "outskirt" },
      { name: "Manisa Hamzabeyli", lat: 38.500, lng: 27.620, ownerId: company.id, price: 7.2, address: "Hamzabeyli, Manisa", density: 22, densityProfile: "outskirt" },
      { name: "Manisa Nurlupınar", lat: 38.600, lng: 27.440, ownerId: company.id, price: 6.6, address: "Nurlupınar, Manisa", density: 55, densityProfile: "suburban" },
      { name: "Manisa Alaybey", lat: 38.610, lng: 27.435, ownerId: company.id, price: 6.9, address: "Alaybey, Manisa", density: 60, densityProfile: "suburban" },
      { name: "Manisa Malta Parkı", lat: 38.625, lng: 27.415, ownerId: company.id, price: 7.1, address: "Malta, Manisa", density: 45, densityProfile: "suburban" },
      { name: "Manisa Uncubozköy Meydan", lat: 38.630, lng: 27.425, ownerId: company.id, price: 7.4, address: "Uncubozköy, Manisa", density: 70, densityProfile: "central" },
      { name: "Manisa Laleli Parkı", lat: 38.618, lng: 27.408, ownerId: company.id, price: 7.3, address: "Laleli, Manisa", density: 80, densityProfile: "central" },
      { name: "Manisa Mesir Tabiat Parkı", lat: 38.622, lng: 27.410, ownerId: company.id, price: 7.5, address: "Mesir, Manisa", density: 65, densityProfile: "suburban" },
      { name: "Manisa Kent Park", lat: 38.612, lng: 27.415, ownerId: company.id, price: 7.2, address: "Kent Park, Manisa", density: 75, densityProfile: "central" },
      { name: "Manisa Ulupark", lat: 38.614, lng: 27.428, ownerId: company.id, price: 7.0, address: "Ulupark, Manisa", density: 85, densityProfile: "central" },
      { name: "Manisa Fatih Parkı", lat: 38.610, lng: 27.430, ownerId: company.id, price: 6.8, address: "Fatih Parkı, Manisa", density: 50, densityProfile: "suburban" },

      // İzmir & Çevre (Referans noktaları)
      { name: "İzmir Bornova DC", lat: 38.460, lng: 27.220, ownerId: company.id, price: 9.0, address: "Bornova Merkez, İzmir", density: 95, densityProfile: "central" },
      { name: "Alsancak Liman", lat: 38.435, lng: 27.150, ownerId: company.id, price: 10.0, address: "Alsancak Liman Cad., İzmir", density: 80, densityProfile: "central" },
    ]
  })

  console.log('✅ İstasyonlar yüklendi.')

  // 6. Linear Regression ile Haftalık Yoğunluk Tahminleri Oluştur
  console.log('📊 Linear Regression (simple-statistics) ile yoğunluk tahminleri oluşturuluyor...')

  const stations = await prisma.station.findMany()

  for (const station of stations) {
    const profile = station.densityProfile as "central" | "suburban" | "outskirt"

    // 2 aylık mock data oluştur
    const mockData = generateTwoMonthMockData(profile)

    // Linear regression ile haftalık tahmine dönüştür
    const weeklyForecast = linearRegressionToWeekly(mockData)

    // Veritabanına kaydet
    for (const forecast of weeklyForecast) {
      await prisma.stationDensityForecast.create({
        data: {
          stationId: station.id,
          dayOfWeek: forecast.dayOfWeek,
          hour: forecast.hour,
          predictedLoad: forecast.predictedLoad
        }
      })
    }

    // Station.density alanını haftalık tahminlerin ortalamasıyla güncelle
    const avgDensity = calculateAverageDensity(weeklyForecast)
    await prisma.station.update({
      where: { id: station.id },
      data: { density: avgDensity }
    })
  }

  console.log(`✅ ${stations.length} istasyon için haftalık tahminler oluşturuldu (${stations.length * 7 * 24} kayıt).`)
  console.log(`✅ İstasyon density değerleri haftalık ortalama ile güncellendi.`)

  // 7. Badge'lere hedeflenmiş örnek kampanyalar oluştur
  await prisma.campaign.create({
    data: {
      title: "Gece Kuşu Özel - %20 İndirim",
      description: "Gece 22:00 - 06:00 arası şarj et, %20 indirim kazan!",
      status: "ACTIVE",
      target: "Gece Kuşu badge'ine sahip kullanıcılar",
      discount: "%20",
      coinReward: 100,
      ownerId: company.id,
      endDate: new Date('2026-03-01'),
      targetBadges: { connect: [{ id: badgeNight.id }] }
    }
  })

  await prisma.campaign.create({
    data: {
      title: "Eco Fırsat - 2x Coin",
      description: "Yeşil enerjili istasyonlarda şarj et, 2 kat coin kazan!",
      status: "ACTIVE",
      target: "Eco Şampiyonu badge'ine sahip kullanıcılar",
      discount: "2x Coin",
      coinReward: 200,
      ownerId: company.id,
      endDate: new Date('2026-02-28'),
      targetBadges: { connect: [{ id: badgeEco.id }] }
    }
  })

  await prisma.campaign.create({
    data: {
      title: "Hafta Sonu Kaçamağı - Ücretsiz İlk Saat",
      description: "Hafta sonu şarj etmeyi seven sürücülere özel!",
      status: "ACTIVE",
      target: "Hafta Sonu Savaşçısı badge'ine sahip kullanıcılar",
      discount: "İlk saat ücretsiz",
      coinReward: 75,
      ownerId: company.id,
      endDate: new Date('2026-02-15'),
      targetBadges: { connect: [{ id: badgeWeekend.id }] }
    }
  })

  await prisma.campaign.create({
    data: {
      title: "Erken Kalkan Yol Alır - %15 İndirim",
      description: "Sabah 06:00 - 09:00 arası şarj et, %15 indirim!",
      status: "ACTIVE",
      target: "Erken Kalkan badge'ine sahip kullanıcılar",
      discount: "%15",
      coinReward: 50,
      ownerId: company.id,
      endDate: new Date('2026-03-15'),
      targetBadges: { connect: [{ id: badgeEarlyBird.id }] }
    }
  })

  console.log('✅ Badge hedefli kampanyalar oluşturuldu.')
  console.log('✅ Veriler başarıyla yüklendi! Harita hazır.')
}

main()
  .then(async () => await prisma.$disconnect())
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })