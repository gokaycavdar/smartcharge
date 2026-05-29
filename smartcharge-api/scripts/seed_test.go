package main

import "testing"

func TestGenerateTwoMonthMockData(t *testing.T) {
	data := generateTwoMonthMockData("central")

	if len(data) != 60*24 {
		t.Fatalf("expected 1440 data points, got %d", len(data))
	}

	for _, point := range data {
		if point.load < 0 || point.load > 100 {
			t.Fatalf("expected bounded load, got %f", point.load)
		}
	}
}

func TestLinearRegressionToWeekly(t *testing.T) {
	data := generateTwoMonthMockData("suburban")
	forecasts := linearRegressionToWeekly(data)

	if len(forecasts) != 7*24 {
		t.Fatalf("expected 168 weekly forecast points, got %d", len(forecasts))
	}

	for _, forecast := range forecasts {
		if forecast.predictedLoad < 0 || forecast.predictedLoad > 100 {
			t.Fatalf("expected bounded predicted load, got %d", forecast.predictedLoad)
		}
	}
}

func TestCalculateAverageDensity(t *testing.T) {
	avg := calculateAverageDensity([]weeklyForecast{
		{predictedLoad: 10},
		{predictedLoad: 20},
		{predictedLoad: 30},
	})

	if avg != 20 {
		t.Fatalf("expected average density 20, got %d", avg)
	}
}
