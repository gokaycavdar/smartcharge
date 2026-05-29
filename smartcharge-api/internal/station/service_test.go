package station

import "testing"

func TestLoadStatusThresholds(t *testing.T) {
	if loadStatus(20) != "GREEN" {
		t.Fatalf("expected GREEN for low load")
	}
	if loadStatus(50) != "YELLOW" {
		t.Fatalf("expected YELLOW for medium load")
	}
	if loadStatus(80) != "RED" {
		t.Fatalf("expected RED for high load")
	}
}

func TestStationGreenHourWindow(t *testing.T) {
	if !isGreenHour(23) || !isGreenHour(0) || !isGreenHour(6) {
		t.Fatal("expected 23, 00 and 06 to be green hours")
	}
	if isGreenHour(12) {
		t.Fatal("expected noon to be non-green")
	}
}

func TestParseDiscountRate(t *testing.T) {
	if got := parseDiscountRate("%20"); got != 0.20 {
		t.Fatalf("expected 0.20, got %f", got)
	}
	if got := parseDiscountRate("invalid"); got != 0 {
		t.Fatalf("expected invalid discount to parse as 0, got %f", got)
	}
}
