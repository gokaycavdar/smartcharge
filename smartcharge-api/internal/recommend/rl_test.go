package recommend

import "testing"

func TestRLScorerNameAndMissingQValue(t *testing.T) {
	scorer := NewRLScorer(nil)

	if scorer.Name() != "reinforcement_learning" {
		t.Fatalf("unexpected scorer name: %s", scorer.Name())
	}
	if scorer.getQValue(1, 2, 14, 3) != 0 {
		t.Fatal("expected missing Q value to default to 0")
	}
}

func TestRLScorerUpdateQValueAndSize(t *testing.T) {
	scorer := NewRLScorer(nil)
	scorer.UpdateQValue(1, 2, 14, 3, 15)

	if got := scorer.getQValue(1, 2, 14, 3); got <= 0 {
		t.Fatalf("expected positive Q value after update, got %f", got)
	}
	if size := scorer.GetQTableSize(); size != 1 {
		t.Fatalf("expected Q-table size 1, got %d", size)
	}
}

func TestRLScorerCalculateReward(t *testing.T) {
	scorer := NewRLScorer(nil)

	greenLowLoad := scorer.CalculateReward(10, 0.5, true, 20)
	normalHighLoad := scorer.CalculateReward(10, 0.5, false, 80)

	if greenLowLoad <= normalHighLoad {
		t.Fatalf("expected green low-load reward (%f) to exceed normal high-load reward (%f)", greenLowLoad, normalHighLoad)
	}
}

func TestRLScorerShouldExploreAtDeterministicExtremes(t *testing.T) {
	scorer := NewRLScorer(nil)

	scorer.epsilon = 1
	if !scorer.shouldExplore(1) {
		t.Fatal("expected exploration when epsilon is 1")
	}

	scorer.epsilon = 0
	if scorer.shouldExplore(1) {
		t.Fatal("expected no exploration when epsilon is 0")
	}
}

func TestRLScorerDecayEpsilon(t *testing.T) {
	scorer := NewRLScorer(nil)
	before := scorer.GetEpsilon()
	scorer.decayEpsilon()
	after := scorer.GetEpsilon()

	if after >= before {
		t.Fatalf("expected epsilon to decay, before=%f after=%f", before, after)
	}
}
