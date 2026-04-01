# SmartCharge Chat System - Comprehensive Analysis

## Overview
The chat system has two implementations: **Legacy Ollama-based chat** (fallback) and **Agentic Gemini chat** (primary with tool calling). This document analyzes error handling, configuration, backend implementation, and known issues.

---

## 1. Frontend Chat Error Handling

### Error Message Display Location

**File:** `C:\Users\Toshiba\Documents\GitHub\smartcharge\components\ChatWidget.tsx`  
**Line:** 102  
**Error Message:** "Üzgünüm, şu an bağlantı kuramıyorum. Lütfen tekrar dene."

**Code Context:**
```tsx
try {
  const res = await authFetch("/api/chat", {
    method: "POST",
    body: JSON.stringify({ message: userMessage }),
  });

  if (!res.ok) throw new Error("Failed to fetch");

  const data = await unwrapResponse<{ role: string; content: string; recommendations?: Recommendation[] }>(res);
  setMessages((prev) => [
    ...prev,
    {
      role: "bot",
      content: data.content,
      recommendations: data.recommendations,
    },
  ]);
} catch (error) {
  setMessages((prev) => [
    ...prev,
    { role: "bot", content: "Üzgünüm, şu an bağlantı kuramıyorum. Lütfen tekrar dene." },  // ← Line 102
  ]);
} finally {
  setIsLoading(false);
}
```

**When Triggered:**
- Network error during chat API call
- Response is not OK (HTTP error status)
- JSON parsing error from `authFetch()` or `unwrapResponse()`
- Any exception during message processing

**Current Behavior:**
- Shows generic error message to user
- Does NOT log error details (console.error missing)
- Loading state is cleared
- User can retry by sending another message

---

## 2. Backend Chat Handler & Service Implementation

### Handler - `chat/handler.go`

**File:** `C:\Users\Toshiba\Documents\GitHub\smartcharge\smartcharge-api\internal\chat\handler.go`  
**Lines:** 1-67

**Key Points:**

```go
// RegisterRoutes registers chat routes on the given router group.
func (h *Handler) RegisterRoutes(rg *gin.RouterGroup) {
  // Chat endpoint with auth - but NO middleware applied!
  rg.POST("/chat", h.Chat)  // ← Auth not required (userID will be 0 if not provided)
}

// Chat handles POST /v1/chat.
func (h *Handler) Chat(c *gin.Context) {
  var req ChatRequest
  if err := c.ShouldBindJSON(&req); err != nil {
    response.Err(c, 400, "VALIDATION_ERROR", "Mesaj alanı zorunludur")
    return
  }

  // Extract userID from JWT (optional for now, but required for agentic chat)
  userID, exists := middleware.GetUserID(c)
  if !exists {
    // For backward compatibility, allow anonymous chat
    userID = 0  // ← KNOWN BUG: Anonymous chat breaks reservation creation
  }

  result, err := h.service.Chat(c.Request.Context(), userID, req.Message, req.StationID, req.Date, req.Hour, req.IsGreen)
  if err != nil {
    handleError(c, err)
    return
  }
  response.OK(c, result)
}

func handleError(c *gin.Context, err error) {
  if appErr, ok := err.(*apperrors.AppError); ok {
    response.Err(c, appErr.StatusCode, appErr.Code, appErr.Message)
    return
  }
  response.Err(c, 500, "INTERNAL_ERROR", "AI servisi şu an yanıt veremiyor.")
}
```

**Critical Issues:**
1. **AUTH BUG (CRITICAL):** Chat endpoint has NO auth middleware applied
   - Users are not required to be authenticated
   - userID defaults to 0 if JWT missing
   - When AI auto-creates reservations, they are orphaned (userID=0 fails FK check or creates broken records)

2. **Request Structure:**
   - Only `message` field is required
   - Optional fields: `stationId`, `date`, `hour`, `isGreen` (rarely used, legacy)

3. **Error Response:** Generic "AI servisi şu an yanıt veremiyor." on provider errors

---

### Service - `chat/service.go`

**File:** `C:\Users\Toshiba\Documents\GitHub\smartcharge\smartcharge-api\internal\chat\service.go`  
**Lines:** 1-262

**Architecture:**
```
Service.Chat()
  ├─ if Gemini configured → ExecuteAgenticChat() [Gemini API + function calling]
  └─ else → legacyChat() [Ollama fallback + action parsing]
```

#### Legacy Chat Flow (Ollama-based)

**Lines 103-162:**
```go
func (s *Service) legacyChat(ctx context.Context, userID int32, userMessage string, ...) (*ChatResponse, error) {
  // 1. Fetch all stations from DB
  stations, err := s.queries.ListStations(ctx)
  if err != nil {
    return nil, apperrors.ErrInternal
  }

  // 2. Build station context string (first 10 stations)
  stationContext := buildStationContext(stations)

  // 3. Build messages array: [system prompt, user message + station context]
  messages := []ai.Message{
    {Role: ai.RoleSystem, Content: s.systemPrompt},
    {Role: ai.RoleUser, Content: userMessage + "\n\n" + stationContext},
  }

  // 4. Call Ollama provider
  llmResp, err := s.provider.Complete(ctx, messages,
    ai.WithTemperature(0.7),
    ai.WithMaxTokens(800),
  )
  
  // ⚠️ ERROR HANDLING: If LLM unavailable, return fallback message
  if err != nil {
    return &ChatResponse{
      Role:    "bot",
      Content: "Üzgünüm, şu anda AI servisine bağlanamıyorum. Lütfen daha sonra tekrar dene.",
    }, nil  // ← Returns nil error, so handler gets success response
  }

  // 5. Parse action from response (JSON between [ACTION]...[/ACTION] tags)
  action, content, err := parseAction(content)
  
  // 6. If action is create_reservation, attempt creation
  if action.Type == "create_reservation" && action.StationID != nil {
    reservationResp, err := s.createReservationFromAction(ctx, userID, action)
    if err != nil {
      action.Success = false
      action.Message = "Randevu oluşturulamadı: " + err.Error()
    } else {
      action.Success = true
      action.Reservation = &ReservationActionResponse{...}
      content = fmt.Sprintf("Randevun başarıyla oluşturuldu! 🎉\n\n%s", content)
    }
  }

  return &ChatResponse{
    Role:    "bot",
    Content: content,
    Action:  action,
  }, nil
}
```

**Error Handling in Legacy Chat:**
- LLM provider error → returns friendly message, does NOT propagate error
- Reservation creation error → sets `action.Success = false`, continues
- All errors are graceful (no crashes)

#### Agentic Chat Flow (Gemini-based)

**Lines 341-423 in `agents.go`:**
```go
func (s *Service) ExecuteAgenticChat(ctx context.Context, userMessage string, userID int32, geminiProvider *ai.GeminiProvider) (*ChatResponse, error) {
  // Multi-turn conversation loop (max 3 iterations)
  for iteration < maxIterations {
    // Call Gemini API with tool definitions
    response, err := geminiProvider.CompleteWithTools(ctx, messages, s.defineTools(), ...)
    
    if err != nil {
      // ⚠️ ERROR: Gemini API failed (network, auth, rate limit, etc.)
      fmt.Printf("[DEBUG] Gemini API error: %v\n", err)
      return &ChatResponse{
        Role:    "bot",
        Content: fmt.Sprintf("Üzgünüm, AI servisiyle iletişim kuramıyorum.\n\nHata detayı: %v\n\nLütfen API key'inizi kontrol edin.", err),
      }, nil  // ← Returns to frontend with error details visible
    }
    
    // If tool called (search_stations, book_appointment)
    if toolCall != nil && toolCall.Name != "" {
      toolResult, err := s.executeTool(ctx, toolCall.Name, toolCall.Args, userID)
      if err != nil {
        // Tool execution failed (e.g., invalid date format)
        messages = append(messages, ...)  // Continue loop to retry
        continue
      }
      // Tool succeeded, add result and continue
      messages = append(messages, ...)
      continue
    }
    
    // No more tool calls, return text response
    return &ChatResponse{
      Role:    "bot",
      Content: textContent,
    }, nil
  }
  
  // Max iterations exceeded
  return &ChatResponse{
    Role:    "bot",
    Content: "Maksimum işlem limiti aşıldı. Lütfen daha spesifik bir istek ile tekrar dene.",
  }, nil
}
```

**Error Handling in Agentic Chat:**
- **Gemini API error** → Visible error message to user (includes hint about API key)
- **Tool execution error** → Retries with error message in conversation
- **Max iterations exceeded** → Friendly message to user

---

## 3. Ollama/LLM Provider Configuration

### Configuration Loading

**File:** `C:\Users\Toshiba\Documents\GitHub\smartc
