# SmartCharge Chat System - Error Analysis Summary

## Quick Overview

This analysis covers where and how chat errors are handled across the frontend, backend, and LLM providers.

---

## 1. ERROR MESSAGE LOCATION (FRONTEND)

### Where the Error is Displayed
- **File:** `components/ChatWidget.tsx`
- **Line:** 102
- **Message:** `"Üzgünüm, şu an bağlantı kuramıyorum. Lütfen tekrar dene."`

### When It Appears
When the `authFetch("/api/chat")` call fails:
- Network error
- HTTP error response (not 200)
- JSON parsing error
- Any exception in the try-catch block

### Current Implementation
```tsx
try {
  const res = await authFetch("/api/chat", { /* ... */ });
  if (!res.ok) throw new Error("Failed to fetch");
  const data = await unwrapResponse(res);
  // Display message...
} catch (error) {
  // ERROR DISPLAYED HERE (Line 102)
  setMessages(prev => [...prev, { 
    role: "bot", 
    content: "Üzgünüm, şu an bağlantı kuramıyorum. Lütfen tekrar dene." 
  }]);
} finally {
  setIsLoading(false);
}
```

**Issue:** Error details not logged (missing `console.error(error)`)

---

## 2. BACKEND HANDLER IMPLEMENTATION

### Chat Handler
- **File:** `smartcharge-api/internal/chat/handler.go`
- **Endpoint:** `POST /v1/chat`
- **Auth:** ⚠️ **NONE** - No middleware applied

```go
func (h *Handler) RegisterRoutes(rg *gin.RouterGroup) {
  rg.POST("/chat", h.Chat)  // ← No auth middleware!
}

func (h *Handler) Chat(c *gin.Context) {
  userID, exists := middleware.GetUserID(c)
  if !exists {
    userID = 0  // ← BUG: Defaults to 0 if not authenticated
  }
  
  result, err := h.service.Chat(c.Request.Context(), userID, req.Message, ...)
  if err != nil {
    handleError(c, err)  // Generic error response
    return
  }
  response.OK(c, result)
}

func handleError(c *gin.Context, err error) {
  // Returns: "AI servisi şu an yanıt veremiyor."
  response.Err(c, 500, "INTERNAL_ERROR", "AI servisi şu an yanıt veremiyor.")
}
```

**Known Issues:**
1. **No auth required** - userID defaults to 0
2. **Breaks AI reservations** - userID=0 causes FK violation or orphaned records
3. **Generic error message** - Hides actual error from user

---

## 3. SERVICE LAYER - TWO CHAT MODES

### Mode A: Legacy Chat (Ollama Fallback)
**File:** `smartcharge-api/internal/chat/service.go` (Lines 103-162)

```go
func (s *Service) legacyChat(ctx context.Context, userID int32, userMessage string, ...) (*ChatResponse, error) {
  // 1. Fetch stations
  stations, err := s.queries.ListStations(ctx)
  if err != nil {
    return nil, apperrors.ErrInternal
  }

  // 2. Build system prompt + station context
  messages := []ai.Message{
    {Role: ai.RoleSystem, Content: s.systemPrompt},
    {Role: ai.RoleUser, Content: userMessage + "\n\n" + stationContext},
  }

  // 3. Call Ollama provider
  llmResp, err := s.provider.Complete(ctx, messages,
    ai.WithTemperature(0.7),
    ai.WithMaxTokens(800),
  )
  
  // ⚠️ GRACEFUL ERROR: Returns user-friendly message instead of error
  if err != nil {
    return &ChatResponse{
      Role:    "bot",
      Content: "Üzgünüm, şu anda AI servisine bağlanamıyorum. Lütfen daha sonra tekrar dene.",
    }, nil  // ← Returns nil error (hides problem from handler)
  }

  // 4. Parse action from response
  action, content, err := parseAction(content)

  // 5. Attempt reservation if action = "create_reservation"
  if action.Type == "create_reservation" && action.StationID != nil {
    reservationResp, err := s.createReservationFromAction(ctx, userID, action)
    if err != nil {
      action.Success = false
      action.Message = "Randevu oluşturulamadı: " + err.Error()
    }
  }

  return &ChatResponse{
    Role:    "bot",
    Content: content,
    Action:  action,
  }, nil
}
```

**Error Handling:**
- Ollama error → Graceful message (returns nil error)
- Reservation creation error → action.Success = false (continues)

---

### Mode B: Agentic Chat (Gemini API)
**File:** `smartcharge-api/internal/chat/agents.go` (Lines 341-423)

```go
func (s *Service) ExecuteAgenticChat(ctx context.Context, userMessage string, userID int32, 
    geminiProvider *ai.GeminiProvider) (*ChatResponse, error) {
  
  messages := []ai.Message{ {Role: ai.RoleUser, Content: userMessage} }
  
  for iteration < maxIterations {
    // Call Gemini API with tools (function calling)
    response, err := geminiProvider.CompleteWithTools(ctx, messages, s.defineTools(), ...)
    
    if err != nil {
      // ⚠️ ERROR VISIBLE TO USER: Shows Gemini error details
      fmt.Printf("[DEBUG] Gemini API error: %v\n", err)
      return &ChatResponse{
        Role: "bot",
        Content: fmt.Sprintf(
          "Üzgünüm, AI servisiyle iletişim kuramıyorum.\n\nHata detayı: %v\n\nLütfen API key'inizi kontrol edin.", 
          err
        ),
      }, nil  // ← Still returns nil error, but message has details
    }

    // Execute tool calls (search_stations, book_appointment)
    if toolCall != nil && toolCall.Name != "" {
      toolResult, err := s.executeTool(ctx, toolCall.Name, toolCall.Args, userID)
      if err != nil {
        messages = append(messages, ...)  // Retry with error message
        continue
      }
      messages = append(messages, ...)  // Continue loop
      continue
    }

    // No more tool calls, return
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

**Error Handling:**
- Gemini API error → Visible error + API key hint
- Tool execution error → Retries within conversation
- Max iterations → Friendly message

---

## 4. LLM PROVIDER CONFIGURATION

### Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `LLM_URL` | `http://localhost:11434` | Ollama endpoint |
| `LLM_MODEL` | `llama3.2` | Ollama model |
| `GEMINI_API_KEY` | `` (empty) | Gemini API key (optional) |
| `GEMINI_MODEL` | `gemini-1.5-flash` | Gemini model |

### Ollama Provider
**File:** `smartcharge-api/internal/ai/provider.go` (Lines 65-148)

```go
type OllamaProvider struct {
  baseURL string  // http://localhost:11434
  model   string  // llama3.2
  client  *http.Client  // Timeout: 120 seconds
}

func (p *OllamaProvider) Complete(ctx context.Context, messages []Message, opts ...Option) (*Response, error) {
  // POST http://localhost:11434/api/chat
  req, _ := http.NewRequestWithContext(ctx, "POST", p.baseURL+"/api/chat", ...)
  
  resp, err := p.client.Do(req)
  if err != nil {
    return nil, err  // ← Network error propagates
  }

  if resp.StatusCode != http.StatusOK {
    return nil, &AIError{Code: "API_ERROR", Message: string(body)}  // ← HTTP error
  }

  // Parse JSON response...
  return &Response{Content: content}, nil
}
```

**Possible Errors:**
1. Network error (Ollama not running)
2. HTTP error (model not found, invalid request)
3. JSON parsing error
4. Timeout (120 seconds)

### Gemini Provider
**File:** `smartcharge-api/internal/ai/gemini.go` (custom implementation)

**Possible Errors:**
1. Missing/invalid API key → 401
2. Rate limit → 429
3. Invalid model → 400
4. Network timeout
5. Parsing error

---

## 5. ERROR FLOW DIAGRAM

```
Frontend:
  ChatWidget.tsx:102
  "Üzgünüm, şu an bağlantı kuramıyorum"
        ↑
    authFetch() error
        ↑
    /api/chat fails

Backend Handler:
  chat/handler.go:37
  Chat() → service.Chat()
    ↓
  handleError() → "AI servisi şu an yanıt veremiyor."

Service Layer:
  Two paths:
  
  Path A (Legacy):
    legacyChat() → provider.Complete()
      → Error? Return friendly message (nil error)
      → parseAction()
      → createReservationFromAction()
        → Error? action.Success = false

  Path B (Agentic):
    ExecuteAgenticChat() → geminiProvider.CompleteWithTools()
      → Error? Return message with error details
      → executeTool()
        → Error? Retry in loop

Provider Layer:
  OllamaProvider.Complete() → POST /api/chat
    → Network error? Propagate
    → HTTP error? Return AIError
    → Parse error
