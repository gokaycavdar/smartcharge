package chat

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"strconv"
	"strings"

	"smartcharge-api/internal/ai"
	apperrors "smartcharge-api/internal/errors"
	"smartcharge-api/internal/reservation"
)

// ToolInput represents input for a tool call.
type ToolInput struct {
	Location      string  `json:"location,omitempty"`
	SocketType    string  `json:"socketType,omitempty"`
	Latitude      float64 `json:"latitude,omitempty"`
	Longitude     float64 `json:"longitude,omitempty"`
	PreferredTime string  `json:"preferredTime,omitempty"`
	StationID     int32   `json:"stationId,omitempty"`
	Date          string  `json:"date,omitempty"`
	Hour          string  `json:"hour,omitempty"`
	UserID        int32   `json:"userId,omitempty"`
}

// ToolResponse represents the response from a tool execution.
type ToolResponse struct {
	Name    string      `json:"name"`
	Content interface{} `json:"content"`
}

// StationSearchResult represents a station search result.
type StationSearchResult struct {
	ID          int32   `json:"id"`
	Name        string  `json:"name"`
	Latitude    float64 `json:"latitude"`
	Longitude   float64 `json:"longitude"`
	Price       float64 `json:"price"`
	Load        int32   `json:"load"`
	Status      string  `json:"status"`
	Distance    float64 `json:"distance,omitempty"`
	Description string  `json:"description"`
}

// defineTools returns the tool definitions for Gemini API.
func (s *Service) defineTools() []ai.ToolFunctionDeclaration {
	return []ai.ToolFunctionDeclaration{
		{
			Name:        "search_stations",
			Description: "Arama kriterlerine göre EV şarj istasyonlarını bul. Kullanıcının lokasyonu, mesafe tercihini veya diğer kriterleri kullanarak en uygun istasyonları bulur.",
			Parameters: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"location": map[string]interface{}{
						"type":        "string",
						"description": "Istasyonun konumu veya mahallesi (ör. Kadıköy, Taksim)",
					},
					"socketType": map[string]interface{}{
						"type":        "string",
						"description": "Soket tipi (ör. AC, DC, USB-C)",
					},
					"latitude": map[string]interface{}{
						"type":        "number",
						"description": "Enlem koordinatı",
					},
					"longitude": map[string]interface{}{
						"type":        "number",
						"description": "Boylam koordinatı",
					},
					"preferredTime": map[string]interface{}{
						"type":        "string",
						"description": "Tercih edilen şarj saati (ör. 14:00, sabah, akşam)",
					},
					"maxResults": map[string]interface{}{
						"type":        "integer",
						"description": "Maksimum sonuç sayısı (varsayılan: 5)",
					},
				},
				"required": []string{},
			},
		},
		{
			Name:        "book_appointment",
			Description: "Bir istasyonda randevu oluştur. Kullanıcı seçili bir istasyonda belirli tarih ve saatte randevu almak istediğinde bu tool'ı kullan.",
			Parameters: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"stationId": map[string]interface{}{
						"type":        "integer",
						"description": "İstasyon ID'si",
					},
					"date": map[string]interface{}{
						"type":        "string",
						"description": "Randevu tarihi (YYYY-MM-DD formatında)",
					},
					"hour": map[string]interface{}{
						"type":        "string",
						"description": "Randevu saati (HH:MM formatında)",
					},
					"userId": map[string]interface{}{
						"type":        "integer",
						"description": "Kullanıcı ID'si",
					},
				},
				"required": []string{"stationId", "date", "hour", "userId"},
			},
		},
	}
}

// executeSearchStations executes the search_stations tool.
func (s *Service) executeSearchStations(ctx context.Context, args map[string]interface{}) (interface{}, error) {
	stations, err := s.queries.ListStations(ctx)
	if err != nil {
		return nil, apperrors.ErrInternal
	}

	results := make([]StationSearchResult, 0)
	maxResults := 5

	if mr, ok := args["maxResults"].(float64); ok {
		maxResults = int(mr)
	}

	for _, st := range stations {
		result := StationSearchResult{
			ID:        st.ID,
			Name:      st.Name,
			Latitude:  st.Lat,
			Longitude: st.Lng,
			Price:     st.Price,
			Load:      st.Density,
			Status:    s.loadStatus(st.Density),
			Description: fmt.Sprintf(
				"%s istasyonu - Fiyat: %.2f TL/kWh, Yoğunluk: %s (%d%%)",
				st.Name, st.Price, s.loadStatus(st.Density), st.Density,
			),
		}

		// Calculate distance if coordinates provided
		if lat, ok := args["latitude"].(float64); ok {
			if lng, ok := args["longitude"].(float64); ok {
				result.Distance = s.haversineDistance(lat, lng, st.Lat, st.Lng)
			}
		}

		results = append(results, result)

		if len(results) >= maxResults {
			break
		}
	}

	return results, nil
}

// executeBookAppointment executes the book_appointment tool.
func (s *Service) executeBookAppointment(ctx context.Context, args map[string]interface{}, userID int32) (interface{}, error) {
	stationID, ok := args["stationId"].(float64)
	if !ok {
		return nil, fmt.Errorf("stationId must be a number")
	}

	date, ok := args["date"].(string)
	if !ok {
		return nil, fmt.Errorf("date is required")
	}

	hour, ok := args["hour"].(string)
	if !ok {
		return nil, fmt.Errorf("hour is required")
	}

	// Validate date and hour format
	if !isValidDateFormat(date) {
		return nil, fmt.Errorf("date must be in YYYY-MM-DD format")
	}

	if !isValidTimeFormat(hour) {
		return nil, fmt.Errorf("hour must be in HH:MM format")
	}

	req := reservation.CreateReservationRequest{
		StationID: int32(stationID),
		Date:      date,
		Hour:      hour,
		IsGreen:   false,
	}

	// Use the reservation service to create the appointment
	reservationResp, err := s.reservationSvc.Create(ctx, userID, req)
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"success":     true,
		"reservation": reservationResp,
		"message":     fmt.Sprintf("Randevun başarıyla oluşturuldu! İstasyon: #%d, Tarih: %s, Saat: %s", req.StationID, date, hour),
	}, nil
}

// loadStatus returns "GREEN", "YELLOW", or "RED" based on load percentage.
func (s *Service) loadStatus(load int32) string {
	if load > 65 {
		return "RED"
	}
	if load > 45 {
		return "YELLOW"
	}
	return "GREEN"
}

// haversineDistance calculates the distance between two coordinates in kilometers.
func (s *Service) haversineDistance(lat1, lon1, lat2, lon2 float64) float64 {
	const R = 6371 // Earth radius in kilometers

	lat1Rad := toRadians(lat1)
	lat2Rad := toRadians(lat2)
	deltaLat := toRadians(lat2 - lat1)
	deltaLon := toRadians(lon2 - lon1)

	a := math.Sin(deltaLat/2)*math.Sin(deltaLat/2) +
		math.Cos(lat1Rad)*math.Cos(lat2Rad)*math.Sin(deltaLon/2)*math.Sin(deltaLon/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))

	return R * c
}

// toRadians converts degrees to radians.
func toRadians(degrees float64) float64 {
	return degrees * math.Pi / 180
}

// isValidDateFormat checks if date is in YYYY-MM-DD format.
func isValidDateFormat(date string) bool {
	parts := strings.Split(date, "-")
	if len(parts) != 3 {
		return false
	}

	year, err := strconv.Atoi(parts[0])
	if err != nil || year < 2000 || year > 2100 {
		return false
	}

	month, err := strconv.Atoi(parts[1])
	if err != nil || month < 1 || month > 12 {
		return false
	}

	day, err := strconv.Atoi(parts[2])
	if err != nil || day < 1 || day > 31 {
		return false
	}

	return true
}

// isValidTimeFormat checks if time is in HH:MM format.
func isValidTimeFormat(time string) bool {
	parts := strings.Split(time, ":")
	if len(parts) != 2 {
		return false
	}

	hour, err := strconv.Atoi(parts[0])
	if err != nil || hour < 0 || hour > 23 {
		return false
	}

	minute, err := strconv.Atoi(parts[1])
	if err != nil || minute < 0 || minute > 59 {
		return false
	}

	return true
}

// executeTool executes a tool based on its name.
func (s *Service) executeTool(ctx context.Context, toolName string, args map[string]interface{}, userID int32) (interface{}, error) {
	switch toolName {
	case "search_stations":
		return s.executeSearchStations(ctx, args)
	case "book_appointment":
		return s.executeBookAppointment(ctx, args, userID)
	default:
		return nil, fmt.Errorf("unknown tool: %s", toolName)
	}
}

// buildAgenticSystemPrompt builds the system prompt for agentic mode.
func buildAgenticSystemPrompt() string {
	return `Sen SmartCharge'un akıllı asistanısın. Türkiye'de EV sahiplerine şarj istasyonları bulmalarında ve randevu oluşturmalarında yardımcı oluyorsun.

TEMEL GÖREVLERIN:
1. Kullanıcının isteyini anla ve en uygun istasyonları bul (search_stations tool'unu kullan)
2. Istasyonlar hakkında bilgi ver ve öneriler sun
3. Kullanıcı randevu oluşturmak isterse, book_appointment tool'unu kullan

DAVRANIŞ KURALLAR:
- Her zaman Türkçe yanıt ver
- Kullanıcının konumunu anlarsan, search_stations'da kullan (distance hesaplaması için)
- Randevu oluştururken gereken bilgileri sor: tarih (YYYY-MM-DD), saat (HH:MM)
- Hata durumlarında, kullanıcıyı yönlendir ve tekrar dene
- Mümkün olduğunca tool'ları aktif kullan - sadece soru/cevap yapmak yerine aksiyonu al

KONUŞMA STİLİ:
- Dostane ve yardımcı ol
- Emoji kullanabilirsin (örnek: ⚡, 🔌, 📍, ⏰)
- Kısa ve anlaşılır yanıtlar ver`
}

// convertMessagesToGemini converts internal messages to Gemini format with tools.
func (s *Service) convertMessagesToGemini(messages []ai.Message) []ai.GeminiMessage {
	geminiMessages := make([]ai.GeminiMessage, len(messages))
	for i, msg := range messages {
		geminiMessages[i] = ai.GeminiMessage{
			Role: string(msg.Role),
			Content: []ai.GeminiTextContent{
				{Text: msg.Content},
			},
		}
	}
	return geminiMessages
}

// parseFunctionCallFromResponse parses a function call from Gemini response.
func parseFunctionCallFromResponse(content string) (*ai.GeminiFunctionCall, string) {
	var call ai.GeminiFunctionCall
	if err := json.Unmarshal([]byte(content), &call); err == nil && call.Name != "" {
		return &call, ""
	}
	return nil, content
}

// ExecuteAgenticChat runs the agentic chat loop with Gemini API.
func (s *Service) ExecuteAgenticChat(ctx context.Context, userMessage string, userID int32, geminiProvider *ai.GeminiProvider) (*ChatResponse, error) {
	messages := []ai.Message{
		{Role: ai.RoleUser, Content: userMessage},
	}

	maxIterations := 3
	iteration := 0

	for iteration < maxIterations {
		iteration++

		// Call Gemini API with tools
		response, err := geminiProvider.CompleteWithTools(
			ctx,
			messages,
			s.defineTools(),
			buildAgenticSystemPrompt(),
			ai.WithTemperature(0.5),
			ai.WithMaxTokens(2048),
		)

		if err != nil {
			return &ChatResponse{
				Role:    "bot",
				Content: "Üzgünüm, AI servisiyle iletişim kuramıyorum. Lütfen daha sonra tekrar dene.",
			}, nil
		}

		// Check if this is a function call
		toolCall, textContent := parseFunctionCallFromResponse(response.Content)

		if toolCall != nil && toolCall.Name != "" {
			// Execute the tool
			toolResult, err := s.executeTool(ctx, toolCall.Name, toolCall.Args, userID)
			if err != nil {
				// Add error to messages and continue the loop
				messages = append(messages, ai.Message{
					Role:    ai.RoleAssistant,
					Content: fmt.Sprintf(`{"name": "%s", "args": %v}`, toolCall.Name, toolCall.Args),
				})

				messages = append(messages, ai.Message{
					Role:    ai.RoleUser,
					Content: fmt.Sprintf("Tool '%s' execution failed: %v. Please try again or provide an alternative solution.", toolCall.Name, err),
				})
				continue
			}

			// Add tool result to messages and continue the loop
			toolResultJSON, _ := json.Marshal(toolResult)
			messages = append(messages, ai.Message{
				Role:    ai.RoleAssistant,
				Content: fmt.Sprintf(`{"name": "%s", "args": %v}`, toolCall.Name, toolCall.Args),
			})

			messages = append(messages, ai.Message{
				Role:    ai.RoleUser,
				Content: fmt.Sprintf("Tool result for %s: %s", toolCall.Name, string(toolResultJSON)),
			})

			// Continue the loop to get the assistant's response
			continue
		}

		// No more function calls, return the response
		return &ChatResponse{
			Role:    "bot",
			Content: textContent,
		}, nil
	}

	return &ChatResponse{
		Role:    "bot",
		Content: "Maksimum işlem limiti aşıldı. Lütfen daha spesifik bir istek ile tekrar dene.",
	}, nil
}
