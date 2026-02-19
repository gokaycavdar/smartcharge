-- AlterTable
ALTER TABLE "Station" ADD COLUMN     "densityProfile" TEXT NOT NULL DEFAULT 'suburban';

-- CreateTable
CREATE TABLE "StationDensityForecast" (
    "id" SERIAL NOT NULL,
    "stationId" INTEGER NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "hour" INTEGER NOT NULL,
    "predictedLoad" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StationDensityForecast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CampaignTargetBadges" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "StationDensityForecast_stationId_dayOfWeek_hour_key" ON "StationDensityForecast"("stationId", "dayOfWeek", "hour");

-- CreateIndex
CREATE UNIQUE INDEX "_CampaignTargetBadges_AB_unique" ON "_CampaignTargetBadges"("A", "B");

-- CreateIndex
CREATE INDEX "_CampaignTargetBadges_B_index" ON "_CampaignTargetBadges"("B");

-- AddForeignKey
ALTER TABLE "StationDensityForecast" ADD CONSTRAINT "StationDensityForecast_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CampaignTargetBadges" ADD CONSTRAINT "_CampaignTargetBadges_A_fkey" FOREIGN KEY ("A") REFERENCES "Badge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CampaignTargetBadges" ADD CONSTRAINT "_CampaignTargetBadges_B_fkey" FOREIGN KEY ("B") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
