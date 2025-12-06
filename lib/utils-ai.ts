export type DensityLevel = "LOW" | "MEDIUM" | "HIGH";

export function getDensityLevel(load: number): DensityLevel {
  if (load < 40) return "LOW";
  if (load < 70) return "MEDIUM";
  return "HIGH";
}

export function calculateGreenRewards(isGreen: boolean, basePrice: number) {
  if (!isGreen) return { coins: 10, xp: 5, co2: 0 };
  return {
    coins: 50,
    xp: 25,
    co2: 1.2, // kg
  };
}

export function generateDynamicTimeslots() {
  const now = new Date();
  const currentHour = now.getHours();
  const slots = [];

  for (let i = 0; i < 24; i++) {
    const hour = (currentHour + i) % 24;
    const nextHour = (hour + 1) % 24;
    const label = `${hour.toString().padStart(2, "0")}:00 - ${nextHour.toString().padStart(2, "0")}:00`;
    
    // Mock logic for green/load
    // Night times (22-06) are usually green
    // Day times (07-21) are mixed
    let load = Math.floor(Math.random() * 60) + 20; // 20-80 base
    if (hour >= 22 || hour < 6) {
      load = Math.floor(Math.random() * 30); // 0-30
    } else if (hour >= 17 && hour <= 20) {
      load = Math.floor(Math.random() * 40) + 60; // 60-100 (Peak)
    }

    const isGreen = load < 40;
    const rewards = calculateGreenRewards(isGreen, 5.0);

    slots.push({
      hour,
      label,
      startTime: new Date(now.setHours(hour, 0, 0, 0)).toISOString(),
      isGreen,
      load,
      price: 5.0,
      coins: rewards.coins,
      xp: rewards.xp,
      co2: rewards.co2,
      status: "AVAILABLE",
    });
  }
  return slots;
}

export const MOCK_LEADERBOARD = [
  { id: 1, name: "Ahmet Y.", xp: 12500, badge: "🏆" },
  { id: 2, name: "Ayşe K.", xp: 11200, badge: "🥈" },
  { id: 3, name: "Mehmet T.", xp: 9800, badge: "🥉" },
  { id: 4, name: "Zeynep B.", xp: 8500, badge: "⚡" },
  { id: 5, name: "Can R.", xp: 7200, badge: "🌱" },
];
