# Agentic Chatbot - Integration & Testing Guide

## 🔧 Local Testing Setup

### Prerequisites
```bash
# Backend
- Docker & Docker Compose
- Go 1.25+
- PostgreSQL 15 running in container

# Frontend
- Node.js 20+
- npm/yarn

# External
- Gemini API Key (from Google AI Studio)
- Curl or Postman (for API testing)
```

### 1. Environment Setup

Create `.env` file in project root:
```bash
# Backend
DATABASE_URL="postgres://admin:admin@db:5432/evcharge?sslmode=disable"
JWT_SECRET="test-secret-key-at-least-32-chars"
GIN_MODE="debug"
PORT="8080"
FRONTEND_URL="http://localhost:3000"

# Gemini
GEMINI_API_KEY="your-test-api-key"
GEMINI_MODEL="gemini-1.5-flash"

# Optional: Fallback Ollama
LLM_URL="http://localhost:11434"
LLM_MODEL="llama3.2"
```

### 2. Start Infrastructure

```bash
# Start Docker containers
docker compose down
docker compose build
docker compose up -d

# Wait for DB to be ready
sleep 5

# Apply migrations
cd smartcharge-api
migrate -path db/migrations -database $DATABASE_URL up

# Seed data
go run cmd/main.go  # Seeds demo users and stations
```

### 3. Backend Server

```bash
cd smartcharge-api
go run ./cmd/main.go
# Server runs on http://localhost:8080
```

### 4. Frontend Server

```bash
npm run dev
# Frontend runs on http://localhost:3000
```

---

## 🧪 Testing Scenarios

### Test 1: Basic Connectivity

**Command:**
```bash
curl -X POST http://localhost:8080/v1/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Merhaba"
  }'
```

**Expected:**
```json
{
  "success": true,
  "data": {
    "role": "bot",
    "content": "Merhaba! Ben SmartCharge AI asistanı..."
  }
}
```

---

### Test 2: Station Search (Agentic)

**Command:**
```bash
curl -X POST http://localhost:8080/v1/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "message": "Bana istasyon öner"
  }'
```

**Expected:**
- Gemini calls `search_stations` tool
- DB returns stations
- Response includes `stations` array with results

**Check Points:**
```javascript
// Browser console
const response = await (await fetch('/api/chat', {
  method: 'POST',
  body: JSON.stringify({ message: 'Istasyon öner' }),
  headers: { 'Content-Type': 'application/json' }
})).json();

console.log(response.data.stations?.length > 0 ? '✅ PASS' : '❌ FAIL');
```

---

### Test 3: Booking Appointment

**Command:**
```bash
JWT_TOKEN="your-test-token"
curl -X POST http://localhost:8080/v1/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "message": "Yarın saat 14:00 istasyon 1 de randevu oluştur"
  }'
```

**Validation:**
1. Check response `action.type === "book_appointment"`
2. Check response `action.success === true`
3. Check response `action.reservation.id` exists
4. Verify in DB:
   ```sql
   SELECT * FROM reservations WHERE id = $1;
   ```

---

### Test 4: JWT Authentication

**Without Auth:**
```bash
curl -X POST http://localhost:8080/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Randevu oluştur"}'
```

**Expected:** Anonymous mode (userID = 0, booking fails with FK error)

**With Auth:**
```bash
curl -X POST http://localhost:8080/v1/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJ..." \
  -d '{"message": "Randevu oluştur"}'
```

**Expected:** Booking succeeds with proper userID

---

### Test 5: Error Handling

#### Scenario A: Invalid Date
```bash
curl -X POST http://localhost:8080/v1/chat \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "message": "Geçmiş ayda randevu oluştur (01-01-2020)"
  }'
```

**Expected:** Bot returns error message in Turkish, suggests valid dates

#### Scenario B: Gemini API Error
```bash
# Set invalid API key in .env
GEMINI_API_KEY="invalid-key"
docker compose restart api
```

**Expected:** Fallback to Ollama (if available) or error response

#### Scenario C: Tool Execution Failure
```bash
curl -X POST http://localhost:8080/v1/chat \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "message": "Olmayan istasyon 9999de randevu oluştur"
  }'
```

**Expected:** Tool error caught, Gemini generates recovery response

---

## 🔍 Debug Mode

### Backend Logging

Enable verbose logging:
```go
// internal/chat/agents.go
if os.Getenv("DEBUG_CHAT") == "true" {
    fmt.Printf("[CHAT] Tool: %s, Args: %v\n", toolCall.Name, toolCall.Args)
    fmt.Printf("[CHAT] Tool Result: %v\n", toolResult)
}
```

Run with:
```bash
DEBUG_CHAT=true go run ./cmd/main.go
```

### Frontend DevTools

```javascript
// Browser console
// Enable detailed logging
localStorage.setItem('debug', 'smartcharge:*');

// View chat messages
const messages = JSON.parse(localStorage.getItem('chat:messages'));
console.table(messages);

// Track API calls
fetch('/api/chat', {...}).then(r => {
  console.log('Response:', r);
  return r.json();
}).then(console.log);
```

---

## 📊 Load Testing

### Using Apache Bench

```bash
# Generate JWT token first
TOKEN=$(curl -s -X POST http://localhost:8080/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "driver@example.com",
    "password": "password"
  }' | jq -r '.data.token')

# Run load test
ab -n 100 -c 10 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -p chat_payload.json \
  http://localhost:8080/v1/chat
```

`chat_payload.json`:
```json
{"message": "Istasyon öner"}
```

### Expected Metrics
- Requests/sec: ~5-10 (limited by Gemini API)
- Latency p50: 1.5-2s
- Latency p99: 3-4s
- Error rate: <1%

---

## 🐛 Common Issues & Fixes

### Issue 1: "userID: 0" in Database

**Symptom:** Randevu oluşturuldu ama FK error

**Cause:** JWT validation failed

**Fix:**
```bash
# Check token validity
JWT_TOKEN=$(curl -X POST http://localhost:8080/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "driver1@example.com", "password": "password123"}' \
  | jq -r '.data.token')

# Verify token
echo $JWT_TOKEN | jwt decode
```

### Issue 2: "Gemini API not responding"

**Symptom:** All chat requests timeout

**Cause:** Invalid API key or network issue

**Fix:**
```bash
# Test Gemini connectivity
curl -X POST https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=$GEMINI_API_KEY \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{"parts": [{"text": "test"}]}]
  }'
```

### Issue 3: "Stations not found"

**Symptom:** search_stations returns empty array

**Cause:** No seed data in DB

**Fix:**
```bash
# Reseed data
docker compose down
docker compose up -d
# Wait and check
curl http://localhost:8080/v1/stations
```

### Issue 4: Frontend showing "Düşünüyorum..." forever

**Symptom:** Loading spinner never stops

**Cause:** Backend error or network timeout

**Fix:**
```javascript
// Browser console
fetch('/api/chat', {
  method: 'POST',
  body: JSON.stringify({ message: 'test' }),
  headers: { 'Content-Type': 'application/json' }
}).then(r => {
  console.log('Status:', r.status);
  return r.text();
}).then(text => {
  console.log('Response:', text);
  try {
    console.log('JSON:', JSON.parse(text));
  } catch(e) {
    console.error('Parse error:', e);
  }
});
```

---

## ✅ Acceptance Tests

### Test Suite: Happy Path

```go
// internal/chat/service_test.go (TODO)

func TestChatAgenticFlow(t *testing.T) {
    // 1. Create test user
    user := setupTestUser(t)
    
    // 2. Create test stations
    stations := seedTestStations(t)
    
    // 3. Initialize chat service
    svc := initChatService()
    
    // 4. Call ExecuteAgenticChat
    resp, err := svc.ExecuteAgenticChat(ctx, 
        "Bana istasyon öner", 
        user.ID, 
        geminiProvider)
    
    // 5. Assertions
    require.NoError(t, err)
    require.NotEmpty(t, resp.Content)
    require.True(t, len(resp.Stations) > 0, "Should have station results")
}

func TestBookingFlow(t *testing.T) {
    user := setupTestUser(t)
    station := setupTestStation(t)
    
    resp, err := svc.ExecuteAgenticChat(ctx,
        "Yarın saat 14:00 de istasyon " + strconv.Itoa(station.ID) + " de randevu oluştur",
        user.ID,
        geminiProvider)
    
    require.NoError(t, err)
    require.Equal(t, "book_appointment", resp.Action.Type)
    require.True(t, resp.Action.Success)
    require.NotNil(t, resp.Action.Reservation)
    
    // Verify in DB
    res := queryReservation(t, resp.Action.Reservation.ID)
    require.Equal(t, user.ID, res.UserID)
    require.Equal(t, station.ID, res.StationID)
}
```

### Test Suite: Error Cases

```go
func TestInvalidDateFormat(t *testing.T) {
    resp, err := svc.ExecuteAgenticChat(ctx,
        "Eski bir tarihe randevu oluştur (01-01-1990)",
        user.ID,
        geminiProvider)
    
    require.NoError(t, err)
    require.NotContains(t, resp.Content, "başarıyla oluşturuldu")
}

func TestMissingUserID(t *testing.T) {
    resp, err := svc.ExecuteAgenticChat(ctx,
        "Randevu oluştur",
        0, // userID = 0
        geminiProvider)
    
    // Should fallback to legacy or error gracefully
    require.NoError(t, err)
    require.NotNil(t, resp)
}
```

---

## 🚀 Deployment Checklist

- [ ] Gemini API key configured in production secret
- [ ] JWT_SECRET set to strong random value (32+ chars)
- [ ] Database backups enabled
- [ ] Rate limiting configured (API gateway)
- [ ] Error logging to monitoring service
- [ ] Chat analytics tracked (requests/latency)
- [ ] CORS properly configured
- [ ] HTTPS enforced
- [ ] API documentation updated
- [ ] Load test passed (50+ concurrent users)

---

## 📈 Monitoring

### Key Metrics to Track

```
- Chat requests/sec
- Tool execution latency (search_stations, book_appointment)
- Error rate by type
- Token usage (Gemini API)
- Database query times
- User satisfaction (future: thumbs up/down)
```

### Prometheus Metrics (Future)

```go
var (
    chatRequests = prometheus.NewCounter(...)
    toolLatency = prometheus.NewHistogram(...)
    toolErrors = prometheus.NewCounter(...)
)
```

---

**Version:** 1.0.0
**Last Updated:** 2026-03-29
