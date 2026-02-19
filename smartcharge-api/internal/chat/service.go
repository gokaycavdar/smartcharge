package chat

import (
	"context"

	"smartcharge-api/db/generated"
	apperrors "smartcharge-api/internal/errors"
)

// Service handles chat business logic (stub).
type Service struct {
	queries *generated.Queries
}

// NewService creates a new chat service.
func NewService(queries *generated.Queries) *Service {
	return &Service{queries: queries}
}

// RecommendationResponse is a station recommendation from the "AI".
type RecommendationResponse struct {
	ID      int32  `json:"id"`
	Name    string `json:"name"`
	Hour    string `json:"hour"`
	Coins   int32  `json:"coins"`
	Reason  string `json:"reason"`
	IsGreen bool   `json:"isGreen"`
}

// ChatResponse is the response from the chat endpoint.
type ChatResponse struct {
	Role            string                   `json:"role"`
	Content         string                   `json:"content"`
	Recommendations []RecommendationResponse `json:"recommendations"`
}

// Chat processes a chat message and returns a static response with station recommendations.
func (s *Service) Chat(ctx context.Context) (*ChatResponse, error) {
	// Fetch first 3 stations from DB for recommendation names
	stations, err := s.queries.ListStations(ctx)
	if err != nil {
		return nil, apperrors.ErrInternal
	}

	// Take up to 3 stations
	limit := 3
	if len(stations) < limit {
		limit = len(stations)
	}

	hours := []string{"20:00", "21:00", "22:00"}
	coins := []int32{50, 60, 70}

	recommendations := make([]RecommendationResponse, limit)
	for i := 0; i < limit; i++ {
		recommendations[i] = RecommendationResponse{
			ID:      stations[i].ID,
			Name:    stations[i].Name,
			Hour:    hours[i],
			Coins:   coins[i],
			Reason:  "Düşük şebeke yükü & Yüksek ödül",
			IsGreen: true,
		}
	}

	return &ChatResponse{
		Role:            "bot",
		Content:         "Şu anki şebeke verilerine ve konumuna göre senin için en verimli 3 istasyonu analiz ettim. Akşam saatlerinde şarj ederek %30 daha fazla SmartCoin kazanabilirsin.",
		Recommendations: recommendations,
	}, nil
}
