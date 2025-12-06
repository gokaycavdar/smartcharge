// Mock Data Generators for Operator Dashboard

export const generateDailyRevenue = () => {
  // Generate a random revenue between 15000 and 25000
  return {
    total: Math.floor(Math.random() * 10000) + 15000,
    percentageChange: (Math.random() * 20) - 5 // -5% to +15%
  };
};

export const generateMonthlyRevenue = () => {
  // Generate a random revenue between 450000 and 600000
  return {
    total: Math.floor(Math.random() * 150000) + 450000,
    percentageChange: (Math.random() * 15) - 2 // -2% to +13%
  };
};

export const generateCO2Savings = () => {
  // Generate random CO2 savings
  return {
    total: Math.floor(Math.random() * 500) + 1200,
    percentageChange: (Math.random() * 10) + 1 // +1% to +11%
  };
};

export const generateLoadCurve = () => {
  // Generate 24h load curve data
  const data = [];
  for (let i = 0; i < 24; i++) {
    // Simulate a typical load curve: low at night, high in evening
    let baseLoad = 20;
    if (i >= 7 && i <= 10) baseLoad = 60; // Morning peak
    if (i >= 17 && i <= 22) baseLoad = 85; // Evening peak
    if (i >= 11 && i <= 16) baseLoad = 50; // Mid-day
    
    const randomVar = Math.floor(Math.random() * 15) - 7;
    data.push({ hour: `${i}:00`, load: Math.max(0, Math.min(100, baseLoad + randomVar)) });
  }
  return data;
};

export const generateMonthlyRevenueTrend = () => {
  const months = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
  return months.map(month => ({
    month,
    revenue: Math.floor(Math.random() * 50000) + 400000 + (Math.random() * 100000) // Increasing trend
  }));
};

export const generateAIInsights = () => {
  return [
    {
      id: 1,
      type: "warning",
      message: "Alsancak İstasyonu'nda düşük kullanım tespit edildi.",
      action: "Kampanya Oluştur",
      impact: "Kullanımı %15 artırabilir"
    },
    {
      id: 2,
      type: "success",
      message: "Şirket geneli kullanım geçen haftaya göre +%12 arttı.",
      action: "Raporu İncele",
      impact: "Gelir artışı: ₺12.500"
    },
    {
      id: 3,
      type: "info",
      message: "Karşıyaka İstasyonu 18:00-22:00 arası çok yoğun.",
      action: "Off-peak İndirimi Yap",
      impact: "Yükü dengeleyebilir"
    }
  ];
};

export const generateStationInsights = (stationName: string) => {
  return {
    hourlyUsage: generateLoadCurve(),
    dailyReservations: Math.floor(Math.random() * 20) + 5,
    revenueBreakdown: {
      charging: Math.floor(Math.random() * 1000) + 500,
      parking: Math.floor(Math.random() * 200) + 50,
      services: Math.floor(Math.random() * 100)
    },
    insight: `Bu istasyon (${stationName}) hafta sonları %20 daha fazla kullanılıyor.`
  };
};

export const generateCampaignRecommendations = () => {
  return [
    {
      id: 1,
      title: "Akşam İndirimi",
      description: "18:00 - 22:00 arası yoğunluğu azaltmak için %10 indirim.",
      target: "Yoğun İstasyonlar",
      impact: "Yük Dengeleme"
    },
    {
      id: 2,
      title: "Hafta Sonu Kampanyası",
      description: "Düşük kullanım olan hafta sonları için 2x Puan.",
      target: "Tüm Ağ",
      impact: "+%15 Kullanım"
    }
  ];
};
