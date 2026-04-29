package chat

import (
	"context"
	"fmt"
	"sync"
	"time"

	"smartcharge-api/db/generated"
	"smartcharge-api/internal/ai"
	"smartcharge-api/internal/config"
	"smartcharge-api/internal/recommend"
	"smartcharge-api/internal/reservation"
)

// Service handles chat business logic with AI.
type Service struct {
	queries        *generated.Queries
	reservationSvc *reservation.Service
	recommendSvc   *recommend.Service
	geminiProvider *ai.GeminiProvider
	quotaStateMu   sync.RWMutex
	quotaBlockedTo time.Time
}

// NewService creates a new chat service.
func NewService(queries *generated.Queries, reservationSvc *reservation.Service, recommendSvc *recommend.Service, cfg *config.Config) *Service {
	// Gemini provider is required - will panic if API key is not provided
	if cfg.GeminiAPIKey == "" {
		fmt.Println("[ERROR] GEMINI_API_KEY environment variable is required but not set!")
		panic("GEMINI_API_KEY is required for chat service")
	}

	fmt.Printf("[DEBUG] Initializing Gemini provider with model: %s\n", cfg.GeminiModel)
	geminiProvider := ai.NewGeminiProvider(cfg.GeminiAPIKey, cfg.GeminiModel)

	return &Service{
		queries:        queries,
		reservationSvc: reservationSvc,
		recommendSvc:   recommendSvc,
		geminiProvider: geminiProvider,
	}
}

// RecommendationResponse is a station recommendation from the AI.
type RecommendationResponse struct {
	ID      int32  `json:"id"`
	Name    string `json:"name"`
	Hour    string `json:"hour"`
	Coins   int32  `json:"coins"`
	Reason  string `json:"reason"`
	IsGreen bool   `json:"isGreen"`
}

// Action represents an action to take based on user intent.
type Action struct {
	Type        string                     `json:"type"`
	Label       string                     `json:"label,omitempty"`
	StationID   *int32                     `json:"stationId,omitempty"`
	Date        string                     `json:"date,omitempty"`
	Hour        string                     `json:"hour,omitempty"`
	IsGreen     *bool                      `json:"isGreen,omitempty"`
	URL         string                     `json:"url,omitempty"`
	Style       string                     `json:"style,omitempty"`
	Success     bool                       `json:"success,omitempty"`
	Message     string                     `json:"message,omitempty"`
	Reservation *ReservationActionResponse `json:"reservation,omitempty"`
}

type ChatCard struct {
	Type        string    `json:"type"`
	Title       string    `json:"title"`
	Subtitle    string    `json:"subtitle,omitempty"`
	Description string    `json:"description,omitempty"`
	Badges      []string  `json:"badges,omitempty"`
	Actions     []*Action `json:"actions,omitempty"`
}

type ReservationActionResponse struct {
	ID          int32  `json:"id"`
	StationID   int32  `json:"stationId"`
	Date        string `json:"date"`
	Hour        string `json:"hour"`
	EarnedCoins int32  `json:"earnedCoins"`
	Status      string `json:"status"`
}

// ChatResponse is the response from the chat endpoint.
type ChatResponse struct {
	Role            string                   `json:"role"`
	Content         string                   `json:"content"`
	Recommendations []RecommendationResponse `json:"recommendations,omitempty"`
	Cards           []ChatCard               `json:"cards,omitempty"`
	QuickActions    []*Action                `json:"quickActions,omitempty"`
	Action          *Action                  `json:"action,omitempty"`
}

// Chat processes a chat message using AI (Gemini only).
func (s *Service) Chat(ctx context.Context, userID int32, userMessage string, stationID *int32, date string, hour string, isGreen *bool) (*ChatResponse, error) {
	fmt.Printf("[DEBUG] Chat request: userID=%d, message='%s'\n", userID, userMessage)
	fmt.Println("[DEBUG] Using Gemini API with function calling")

	if stationID != nil || date != "" || hour != "" || isGreen != nil {
		userMessage = fmt.Sprintf("%s\n\nEk bağlam: stationId=%v, date=%s, hour=%s", userMessage, stationID, date, hour)
	}

	return s.ExecuteAgenticChat(ctx, userMessage, userID)
}

func (s *Service) createReservationFromAction(ctx context.Context, userID int32, action *Action) (*reservation.ReservationResponse, error) {
	if action.StationID == nil {
		return nil, fmt.Errorf("station ID is required")
	}

	dateStr := action.Date
	if dateStr == "" {
		dateStr = time.Now().Format("2006-01-02")
	}

	hourStr := action.Hour
	if hourStr == "" {
		hourStr = defaultBookingHour()
	}

	isGreen := false
	if action.IsGreen != nil {
		isGreen = *action.IsGreen
	}

	req := reservation.CreateReservationRequest{
		StationID: *action.StationID,
		Date:      dateStr,
		Hour:      hourStr,
		IsGreen:   isGreen,
	}

	return s.reservationSvc.Create(ctx, userID, req)
}

func defaultBookingHour() string {
	now := time.Now()
	next := now.Add(1 * time.Hour)
	return fmt.Sprintf("%02d:00", next.Hour())
}

func (s *Service) isGeminiTemporarilyBlocked() bool {
	s.quotaStateMu.RLock()
	defer s.quotaStateMu.RUnlock()
	return time.Now().Before(s.quotaBlockedTo)
}

func (s *Service) markGeminiQuotaBlocked(duration time.Duration) {
	if duration <= 0 {
		duration = 5 * time.Minute
	}
	s.quotaStateMu.Lock()
	defer s.quotaStateMu.Unlock()
	next := time.Now().Add(duration)
	if next.After(s.quotaBlockedTo) {
		s.quotaBlockedTo = next
	}
}

func (s *Service) clearGeminiQuotaBlock() {
	s.quotaStateMu.Lock()
	s.quotaBlockedTo = time.Time{}
	s.quotaStateMu.Unlock()
}

func (s *Service) ExecuteAction(ctx context.Context, userID int32, action *Action) (*Action, error) {
	if action == nil {
		return nil, fmt.Errorf("action is required")
	}

	switch action.Type {
	case "create_reservation":
		reservationResp, err := s.createReservationFromAction(ctx, userID, action)
		if err != nil {
			return nil, err
		}

		result := &Action{
			Type:      "create_reservation",
			Label:     "Rezervasyon Tamamlandi",
			StationID: &reservationResp.StationID,
			Date:      reservationResp.Date,
			Hour:      reservationResp.Hour,
			Style:     "success",
			Success:   true,
			Message:   "Randevun basariyla olusturuldu.",
			Reservation: &ReservationActionResponse{
				ID:          reservationResp.ID,
				StationID:   reservationResp.StationID,
				Date:        reservationResp.Date,
				Hour:        reservationResp.Hour,
				EarnedCoins: reservationResp.EarnedCoins,
				Status:      reservationResp.Status,
			},
		}

		return result, nil
	case "open_station", "open_appointments", "open_wallet":
		result := *action
		result.Success = true
		if result.Message == "" {
			result.Message = "Eylem hazir"
		}
		return &result, nil
	default:
		return nil, fmt.Errorf("unsupported action type: %s", action.Type)
	}
}
