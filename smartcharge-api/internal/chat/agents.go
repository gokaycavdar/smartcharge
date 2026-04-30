package chat

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	"smartcharge-api/internal/ai"
	apperrors "smartcharge-api/internal/errors"
	"smartcharge-api/internal/recommend"
)

const (
	defaultRecLat           = 38.614
	defaultRecLng           = 27.405
	reservationGraceMinutes = 10
)

var chatTurkeyLocation = time.FixedZone("TRT", 3*60*60)

var cityCoordinates = map[string][2]float64{
	"izmir":     {38.4237, 27.1428},
	"manisa":    {38.6191, 27.4289},
	"istanbul":  {41.0082, 28.9784},
	"ankara":    {39.9334, 32.8597},
	"bursa":     {40.1885, 29.0610},
	"antalya":   {36.8969, 30.7133},
	"adana":     {37.0000, 35.3213},
	"konya":     {37.8746, 32.4932},
	"gaziantep": {37.0662, 37.3833},
	"kocaeli":   {40.8533, 29.8815},
	"sakarya":   {40.7569, 30.3781},
	"aydin":     {37.8450, 27.8396},
	"mugla":     {37.2153, 28.3636},
	"balikesir": {39.6484, 27.8826},
}

type toolExecutionResult struct {
	Summary         string
	Recommendations []RecommendationResponse
	Cards           []ChatCard
	QuickActions    []*Action
	Action          *Action
}

func (s *Service) defineTools() []ai.ToolFunctionDeclaration {
	return []ai.ToolFunctionDeclaration{
		{
			Name:        "find_recommendations",
			Description: "Find best nearby charging stations and return recommendation cards.",
			Parameters: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"city":     map[string]interface{}{"type": "string", "description": "City name in Turkey, for example Izmir or Istanbul"},
					"location": map[string]interface{}{"type": "string", "description": "District or city text if exact coordinates are unavailable"},
					"lat":      map[string]interface{}{"type": "number", "description": "User latitude if available"},
					"lng":      map[string]interface{}{"type": "number", "description": "User longitude if available"},
					"hour":     map[string]interface{}{"type": "integer", "description": "Target hour between 0-23"},
					"day":      map[string]interface{}{"type": "integer", "description": "Target day where 0=Monday and 6=Sunday"},
					"limit":    map[string]interface{}{"type": "integer", "description": "Max recommendation count, up to 5"},
				},
				"required": []string{},
			},
		},
		{
			Name:        "create_reservation",
			Description: "Create reservation directly for the user when user clearly asks booking.",
			Parameters: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"stationId": map[string]interface{}{"type": "integer", "description": "Station ID"},
					"date":      map[string]interface{}{"type": "string", "description": "Reservation date in YYYY-MM-DD"},
					"hour":      map[string]interface{}{"type": "string", "description": "Reservation hour in HH:MM"},
					"isGreen":   map[string]interface{}{"type": "boolean", "description": "Optional green preference"},
				},
				"required": []string{"stationId"},
			},
		},
		{
			Name:        "open_page",
			Description: "Suggest a navigation action button for map, appointments, wallet, or station detail.",
			Parameters: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"page":      map[string]interface{}{"type": "string", "description": "One of: driver_map, appointments, wallet, station_detail"},
					"stationId": map[string]interface{}{"type": "integer", "description": "Required for station_detail"},
					"label":     map[string]interface{}{"type": "string", "description": "Optional action button label"},
				},
				"required": []string{"page"},
			},
		},
	}
}

func buildAgenticSystemPrompt() string {
	return `You are SmartCharge assistant for EV drivers.

Rules:
- Always reply in Turkish.
- Use tools whenever user asks for recommendation, reservation, or navigation.
- Keep responses short and action-oriented.
- For "nearest / best station" requests, call find_recommendations first.
- City-level info is enough. Do not insist on exact GPS.
- If user gives city only, still return recommendations using that city center.
- If user explicitly asks booking and enough info exists, call create_reservation.
- If info is missing for booking, provide actionable suggestion and button through open_page or recommendation cards.
- Never invent station IDs.
- Output plain text only; UI buttons/cards are generated from tool results.`
}

func (s *Service) ExecuteAgenticChat(ctx context.Context, userMessage string, userID int32) (*ChatResponse, error) {
	if s.isGeminiTemporarilyBlocked() {
		fallback, fbErr := s.fallbackWithoutGemini(ctx, userMessage, userID)
		if fbErr == nil {
			if strings.TrimSpace(fallback.Content) == "" {
				fallback.Content = "Gemini kotasi dolu oldugu icin gecici olarak yerel asistan modundayim."
			} else {
				fallback.Content = "Gemini kotasi dolu oldugu icin gecici olarak yerel asistan modundayim. " + fallback.Content
			}
			return fallback, nil
		}
	}

	if isRecommendationIntent(userMessage) {
		args := map[string]interface{}{"limit": 3}
		if city := extractKnownCity(normalizeText(userMessage)); city != "" {
			args["city"] = city
		}
		toolResult, err := s.executeFindRecommendations(ctx, args, userID)
		if err == nil {
			return &ChatResponse{
				Role:            "bot",
				Content:         toolResult.Summary,
				Recommendations: toolResult.Recommendations,
				Cards:           toolResult.Cards,
				QuickActions:    toolResult.QuickActions,
				Action:          toolResult.Action,
			}, nil
		}
	}

	messages := []ai.Message{{Role: ai.RoleUser, Content: userMessage}}

	maxIterations := 6
	collected := toolExecutionResult{}

	for i := 0; i < maxIterations; i++ {
		response, err := s.geminiProvider.CompleteWithTools(
			ctx,
			messages,
			s.defineTools(),
			buildAgenticSystemPrompt(),
			ai.WithTemperature(0.3),
			ai.WithMaxTokens(1200),
		)
		if err != nil {
			fmt.Printf("[ERROR] Gemini tool loop failed: %v\n", err)
			if ai.IsQuotaError(err) {
				s.markGeminiQuotaBlocked(5 * time.Minute)
			}
			fallback, fbErr := s.fallbackWithoutGemini(ctx, userMessage, userID)
			if fbErr == nil {
				if ai.IsQuotaError(err) {
					fallback.Content = "Gemini kota limitine ulasti. Gecici olarak yerel asistanla devam ediyorum."
				}
				return fallback, nil
			}
			return &ChatResponse{Role: "bot", Content: "AI asistana su an ulasilamiyor. Lutfen birazdan tekrar dene."}, nil
		}

		s.clearGeminiQuotaBlock()

		if response.FunctionCall == nil || response.FunctionCall.Name == "" {
			content := strings.TrimSpace(response.Content)
			if content == "" {
				content = strings.TrimSpace(collected.Summary)
			}
			if content == "" {
				content = "Senin icin uygun secenekleri hazirladim. Asagidaki aksiyonlari kullanabilirsin."
			}

			return &ChatResponse{
				Role:            "bot",
				Content:         content,
				Recommendations: collected.Recommendations,
				Cards:           collected.Cards,
				QuickActions:    collected.QuickActions,
				Action:          collected.Action,
			}, nil
		}

		toolName := response.FunctionCall.Name
		toolArgs := response.FunctionCall.Args
		if toolArgs == nil {
			toolArgs = map[string]interface{}{}
		}

		result, execErr := s.executeTool(ctx, toolName, toolArgs, userID)
		if execErr != nil {
			toolErr := execErr.Error()
			if appErr, ok := execErr.(*apperrors.AppError); ok {
				toolErr = appErr.Message
			}

			messages = append(messages,
				ai.Message{Role: ai.RoleAssistant, Content: fmt.Sprintf("Tool call: %s", toolName)},
				ai.Message{Role: ai.RoleUser, Content: fmt.Sprintf("Tool error: %s", toolErr)},
			)
			collected.Summary = toolErr
			continue
		}

		mergeToolResult(&collected, result)

		resultJSON, _ := json.Marshal(result)
		messages = append(messages,
			ai.Message{Role: ai.RoleAssistant, Content: fmt.Sprintf("Tool call: %s", toolName)},
			ai.Message{Role: ai.RoleUser, Content: fmt.Sprintf("Tool result: %s", string(resultJSON))},
		)
	}

	if strings.TrimSpace(collected.Summary) == "" {
		fallback, fbErr := s.fallbackWithoutGemini(ctx, userMessage, userID)
		if fbErr == nil {
			return fallback, nil
		}
		collected.Summary = "Istek tamamlanamadi. Daha net bir komutla tekrar deneyebiliriz."
	}

	return &ChatResponse{
		Role:            "bot",
		Content:         collected.Summary,
		Recommendations: collected.Recommendations,
		Cards:           collected.Cards,
		QuickActions:    collected.QuickActions,
		Action:          collected.Action,
	}, nil
}

func (s *Service) fallbackWithoutGemini(ctx context.Context, userMessage string, userID int32) (*ChatResponse, error) {
	msg := normalizeText(userMessage)
	args := map[string]interface{}{"limit": 3}
	if city := extractKnownCity(msg); city != "" {
		args["city"] = city
	}
	toolResult, err := s.executeFindRecommendations(ctx, args, userID)
	if err == nil {
		prefix := "Gemini baglantisi gecici olarak aksadi; yine de senin icin istasyon onerilerini hazirladim."
		if !isRecommendationIntent(msg) {
			prefix = "Gemini baglantisi gecici olarak aksadi; buna ragmen yakindaki uygun istasyonlari cikardim."
		}
		if s.isGeminiTemporarilyBlocked() {
			prefix = "Gemini kota limitine ulasti; su an yerel asistanla devam ediyorum."
		}
		return &ChatResponse{
			Role:            "bot",
			Content:         prefix,
			Recommendations: toolResult.Recommendations,
			Cards:           toolResult.Cards,
			QuickActions:    toolResult.QuickActions,
		}, nil
	}

	return &ChatResponse{
		Role:    "bot",
		Content: "Su an baglanti sorunu var. Lutfen birazdan tekrar dene.",
	}, nil
}

func mergeToolResult(target *toolExecutionResult, current *toolExecutionResult) {
	if current == nil {
		return
	}
	if current.Summary != "" {
		target.Summary = current.Summary
	}
	if len(current.Recommendations) > 0 {
		target.Recommendations = current.Recommendations
	}
	if len(current.Cards) > 0 {
		target.Cards = current.Cards
	}
	if len(current.QuickActions) > 0 {
		target.QuickActions = current.QuickActions
	}
	if current.Action != nil {
		target.Action = current.Action
	}
}

func (s *Service) executeTool(ctx context.Context, toolName string, args map[string]interface{}, userID int32) (*toolExecutionResult, error) {
	switch toolName {
	case "find_recommendations":
		return s.executeFindRecommendations(ctx, args, userID)
	case "create_reservation":
		return s.executeCreateReservation(ctx, args, userID)
	case "open_page":
		return s.executeOpenPage(args)
	default:
		return nil, fmt.Errorf("unknown tool: %s", toolName)
	}
}

func (s *Service) executeFindRecommendations(ctx context.Context, args map[string]interface{}, userID int32) (*toolExecutionResult, error) {
	now := time.Now()
	lat, lng, locationNote := resolveCoordinates(args)
	hour := clampInt(getIntArg(args, "hour", now.Hour()), 0, 23)
	day := clampInt(getIntArg(args, "day", (int(now.Weekday())+6)%7), 0, 6)
	limit := clampInt(getIntArg(args, "limit", 3), 1, 5)

	targetDate, hour, day, adjusted := normalizeRecommendationSlot(now, day, hour)
	timeSlot := time.Date(targetDate.Year(), targetDate.Month(), targetDate.Day(), hour, 0, 0, 0, time.UTC)

	results, err := s.recommendSvc.Recommend(ctx, recommend.ScoreRequest{
		UserID:   userID,
		UserLat:  lat,
		UserLng:  lng,
		TimeSlot: timeSlot,
		Limit:    limit,
	})
	if err != nil {
		return nil, err
	}

	dateText := targetDate.Format("2006-01-02")
	hourText := fmt.Sprintf("%02d:00", hour)
	isGreen := hour >= 23 || hour <= 6

	recs := make([]RecommendationResponse, 0, len(results))
	cards := make([]ChatCard, 0, len(results))

	for _, item := range results {
		station, stationErr := s.queries.GetStationByID(ctx, item.StationID)
		if stationErr != nil {
			continue
		}

		coin := int32(10)
		if isGreen {
			coin = 50
		}

		recs = append(recs, RecommendationResponse{
			ID:      station.ID,
			Name:    station.Name,
			Hour:    hourText,
			Coins:   coin,
			Reason:  item.Explanation,
			IsGreen: isGreen,
		})

		stationID := station.ID
		greenBadge := "Standart Tarife"
		if isGreen {
			greenBadge = "Yesil Saat"
		}

		cards = append(cards, ChatCard{
			Type:        "station_recommendation",
			Title:       station.Name,
			Subtitle:    fmt.Sprintf("Skor %.1f | %.2f TL/kWh", item.Score, station.Price),
			Description: item.Explanation,
			Badges:      []string{greenBadge},
			Actions: []*Action{
				{
					Type:      "open_station",
					Label:     "Istasyonu Ac",
					StationID: &stationID,
					URL:       fmt.Sprintf("/driver?stationId=%d", stationID),
					Style:     "secondary",
				},
				{
					Type:      "create_reservation",
					Label:     "Bu Saatte Rezerve Et",
					StationID: &stationID,
					Date:      dateText,
					Hour:      hourText,
					IsGreen:   &isGreen,
					Style:     "primary",
				},
			},
		})
	}

	summary := fmt.Sprintf("Sana yakin ve uygun %d istasyon buldum.", len(cards))
	if locationNote != "" {
		summary = fmt.Sprintf("%s %s", locationNote, summary)
	}
	if adjusted {
		summary = summary + " Gecmis saat yerine bir sonraki uygun zaman dilimi secildi."
	}

	return &toolExecutionResult{
		Summary:         summary,
		Recommendations: recs,
		Cards:           cards,
		QuickActions: []*Action{
			{Type: "open_appointments", Label: "Randevularimi Ac", URL: "/driver/appointments", Style: "ghost"},
			{Type: "open_wallet", Label: "Cuzdanim", URL: "/driver/wallet", Style: "ghost"},
		},
	}, nil
}

func normalizeRecommendationSlot(now time.Time, day int, hour int) (time.Time, int, int, bool) {
	nowTR := now.In(chatTurkeyLocation)
	currentDay := (int(nowTR.Weekday()) + 6) % 7
	dayDiff := day - currentDay
	targetDate := nowTR.AddDate(0, 0, dayDiff)

	start := time.Date(targetDate.Year(), targetDate.Month(), targetDate.Day(), hour, 0, 0, 0, chatTurkeyLocation)
	allowedUntil := start.Add(reservationGraceMinutes * time.Minute)
	if !nowTR.After(allowedUntil) {
		return targetDate, hour, day, false
	}

	// Shift to the next valid full-hour slot from now.
	next := nowTR.Add(time.Hour).Truncate(time.Hour)
	adjustedDay := (int(next.Weekday()) + 6) % 7
	return next, next.Hour(), adjustedDay, true
}

func (s *Service) executeCreateReservation(ctx context.Context, args map[string]interface{}, userID int32) (*toolExecutionResult, error) {
	if userID == 0 {
		return nil, apperrors.ErrUnauthorized
	}

	stationID := int32(getIntArg(args, "stationId", 0))
	if stationID == 0 {
		return nil, apperrors.NewValidationError("stationId gerekli")
	}

	action := &Action{
		Type:      "create_reservation",
		StationID: &stationID,
		Date:      strings.TrimSpace(getStringArg(args, "date", time.Now().Format("2006-01-02"))),
		Hour:      strings.TrimSpace(getStringArg(args, "hour", defaultBookingHour())),
		Style:     "primary",
	}
	if isGreen, ok := getBoolArg(args, "isGreen"); ok {
		action.IsGreen = &isGreen
	}

	executed, err := s.ExecuteAction(ctx, userID, action)
	if err != nil {
		return nil, err
	}

	card := ChatCard{
		Type:        "reservation_result",
		Title:       "Rezervasyon Olusturuldu",
		Description: executed.Message,
		Badges:      []string{"Basarili"},
		Actions: []*Action{
			{Type: "open_appointments", Label: "Randevulara Git", URL: "/driver/appointments", Style: "primary"},
			{Type: "open_station", Label: "Istasyonu Ac", StationID: executed.StationID, URL: fmt.Sprintf("/driver?stationId=%d", stationID), Style: "secondary"},
		},
	}

	return &toolExecutionResult{
		Summary:      executed.Message,
		Cards:        []ChatCard{card},
		QuickActions: card.Actions,
		Action:       executed,
	}, nil
}

func (s *Service) executeOpenPage(args map[string]interface{}) (*toolExecutionResult, error) {
	page := strings.ToLower(strings.TrimSpace(getStringArg(args, "page", "")))
	label := strings.TrimSpace(getStringArg(args, "label", ""))
	stationID := int32(getIntArg(args, "stationId", 0))

	var action *Action
	switch page {
	case "driver_map":
		action = &Action{Type: "open_map", Label: fallbackLabel(label, "Haritayi Ac"), URL: "/driver", Style: "secondary"}
	case "appointments":
		action = &Action{Type: "open_appointments", Label: fallbackLabel(label, "Randevular"), URL: "/driver/appointments", Style: "secondary"}
	case "wallet":
		action = &Action{Type: "open_wallet", Label: fallbackLabel(label, "Cuzdan"), URL: "/driver/wallet", Style: "secondary"}
	case "station_detail":
		if stationID == 0 {
			return nil, apperrors.NewValidationError("station_detail icin stationId gerekli")
		}
		action = &Action{Type: "open_station", Label: fallbackLabel(label, "Istasyonu Ac"), StationID: &stationID, URL: fmt.Sprintf("/driver?stationId=%d", stationID), Style: "secondary"}
	default:
		return nil, apperrors.NewValidationError("desteklenmeyen page degeri")
	}

	return &toolExecutionResult{
		Summary:      "Istedigin sayfaya gecis butonunu hazirladim.",
		QuickActions: []*Action{action},
		Cards: []ChatCard{{
			Type:        "navigation",
			Title:       action.Label,
			Description: "Devam etmek icin butona tiklayabilirsin.",
			Actions:     []*Action{action},
		}},
	}, nil
}

func fallbackLabel(input, fallback string) string {
	if strings.TrimSpace(input) == "" {
		return fallback
	}
	return input
}

func getIntArg(args map[string]interface{}, key string, fallback int) int {
	v, ok := args[key]
	if !ok || v == nil {
		return fallback
	}
	switch val := v.(type) {
	case float64:
		return int(val)
	case int:
		return val
	case int32:
		return int(val)
	case int64:
		return int(val)
	case string:
		parsed, err := strconv.Atoi(strings.TrimSpace(val))
		if err == nil {
			return parsed
		}
	}
	return fallback
}

func getFloatArg(args map[string]interface{}, key string, fallback float64) float64 {
	v, ok := args[key]
	if !ok || v == nil {
		return fallback
	}
	switch val := v.(type) {
	case float64:
		return val
	case float32:
		return float64(val)
	case int:
		return float64(val)
	case int32:
		return float64(val)
	case int64:
		return float64(val)
	case string:
		parsed, err := strconv.ParseFloat(strings.TrimSpace(val), 64)
		if err == nil {
			return parsed
		}
	}
	return fallback
}

func getStringArg(args map[string]interface{}, key, fallback string) string {
	v, ok := args[key]
	if !ok || v == nil {
		return fallback
	}
	if s, ok := v.(string); ok {
		return s
	}
	return fallback
}

func getBoolArg(args map[string]interface{}, key string) (bool, bool) {
	v, ok := args[key]
	if !ok || v == nil {
		return false, false
	}
	switch val := v.(type) {
	case bool:
		return val, true
	case string:
		parsed, err := strconv.ParseBool(strings.TrimSpace(val))
		if err == nil {
			return parsed, true
		}
	}
	return false, false
}

func clampInt(v, minValue, maxValue int) int {
	if v < minValue {
		return minValue
	}
	if v > maxValue {
		return maxValue
	}
	return v
}

func resolveCoordinates(args map[string]interface{}) (float64, float64, string) {
	lat, latSet := getOptionalFloatArg(args, "lat")
	lng, lngSet := getOptionalFloatArg(args, "lng")
	if latSet && lngSet {
		return lat, lng, ""
	}

	city := normalizeText(getStringArg(args, "city", ""))
	if city == "" {
		city = extractKnownCity(normalizeText(getStringArg(args, "location", "")))
	}
	if city != "" {
		if c, ok := cityCoordinates[city]; ok {
			return c[0], c[1], fmt.Sprintf("%s merkezi baz alindi.", formatCityLabel(city))
		}
	}

	return defaultRecLat, defaultRecLng, "Net konum olmadan varsayilan bolge baz alindi."
}

func getOptionalFloatArg(args map[string]interface{}, key string) (float64, bool) {
	v, ok := args[key]
	if !ok || v == nil {
		return 0, false
	}
	switch val := v.(type) {
	case float64:
		return val, true
	case float32:
		return float64(val), true
	case int:
		return float64(val), true
	case int32:
		return float64(val), true
	case int64:
		return float64(val), true
	case string:
		parsed, err := strconv.ParseFloat(strings.TrimSpace(val), 64)
		if err == nil {
			return parsed, true
		}
	}
	return 0, false
}

func isRecommendationIntent(msg string) bool {
	msg = normalizeText(msg)
	keywords := []string{"oner", "öner", "istasyon", "yakın", "yakin", "bul", "tavsiye", "recommend"}
	for _, kw := range keywords {
		if strings.Contains(msg, kw) {
			return true
		}
	}
	return false
}

func extractKnownCity(text string) string {
	text = normalizeText(text)
	for city := range cityCoordinates {
		if strings.Contains(text, city) {
			return city
		}
	}
	return ""
}

func normalizeText(input string) string {
	s := strings.TrimSpace(strings.ToLower(input))
	replacer := strings.NewReplacer(
		"ı", "i",
		"İ", "i",
		"ş", "s",
		"Ş", "s",
		"ğ", "g",
		"Ğ", "g",
		"ü", "u",
		"Ü", "u",
		"ö", "o",
		"Ö", "o",
		"ç", "c",
		"Ç", "c",
	)
	return replacer.Replace(s)
}

func formatCityLabel(city string) string {
	if city == "" {
		return city
	}
	if len(city) == 1 {
		return strings.ToUpper(city)
	}
	return strings.ToUpper(city[:1]) + city[1:]
}
