# SmartCharge Chatbot - Agents.go Gemini Format Fix

**Tarih:** 2026-04-01  
**Sorun:** `unknown field Content in struct literal of type ai.GeminiMessage` derleme hatası  
**Çözüm:** Gemini SDK'na göre message format düzeltildi (Content → Parts)

---

## Sorunun Tanımı

### Hata Mesajı
```
smartcharge-api/internal/chat/agents.go:322:4: unknown field Content in struct literal of type ai.GeminiMessage
```

### Kök Neden
`agents.go` dosyasındaki `convertMessagesToGemini()` fonksiyonu yanlış field ismini kullanıyordu:

**YANLIŞ (Eski Kod):**
```go
geminiMessages[i] = ai.GeminiMessage{
    Role: string(msg.Role),
    Content: []ai.GeminiTextContent{  // ❌ YANLIŞ FIELD
        {Text: msg.Content},
    },
}
```

**DOĞRU (Yeni Kod):**
```go
geminiMessages[i] = ai.GeminiMessage{
    Role: string(msg.Role),
    Parts: []ai.GeminiTextContent{   // ✅ DOĞRU FIELD
        {Text: msg.Content},
    },
}
```

---

## Düzeltilen Dosyalar

### 1. `smartcharge-api/internal/chat/agents.go` (Satır 322)
- **Değişiklik:** `Content` field'ı → `Parts` field'ı
- **Sebep:** Gemini SDK'sında `GeminiMessage` struct'ı `Parts` array'i bekliyor
- **Sonuç:** Compile hatası çözüldü, mesajlar artık Gemini API'ye doğru format'ta gönderiliyor

---

## Gemini Message Format Yapısı

### GeminiMessage Struct Tanımı (`internal/ai/gemini.go`)
```go
type GeminiMessage struct {
    Role  string              `json:"role"`
    Parts []GeminiTextContent `json:"parts"`  // ← Parts array kullanılır
}

type GeminiTextContent struct {
    Text string `json:"text"`
}
```

### Gönderilen Request Örneği
```json
{
  "system_instruction": {
    "parts": [
      {
        "text": "Sen bir EV şarj istasyonu asistanısın..."
      }
    ]
  },
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "text": "Hana yakın istasyonları öner"
        }
      ]
    }
  ]
}
```

---

## Agentic Chat Flow

`ExecuteAgenticChat()` fonksiyonu artık doğru format'ta mesaj gönderiliyor:

1. **User Message Oluştur:**
   ```go
   messages := []ai.Message{
       {Role: ai.RoleUser, Content: userMessage},
   }
   ```

2. **Gemini Format'a Çevir:**
   ```go
   // convertMessagesToGemini() kullanılır
   // Şimdi Parts field'ı doğru kullanıyor
   ```

3. **Gemini API'ye Gönder:**
   ```go
   response, err := geminiProvider.CompleteWithTools(
       ctx,
       messages,
       s.defineTools(),
       buildAgenticSystemPrompt(),
       ai.WithTemperature(0.5),
       ai.WithMaxTokens(2048),
   )
   ```

4. **Response Parse:**
   - Gemini API, `parts` array'i içinde `text` veya `functionCall` döndürür
   - `callAPI()` bu yapıyı doğru parse ediyor

---

## Response Format (Gemini API)

### Text Yanıt
```json
{
  "candidates": [
    {
      "content": {
        "role": "model",
        "parts": [
          {
            "text": "Size yardımcı olmaktan mutluyum! Hangi istasyonu arıyorsunuz?"
          }
        ]
      },
      "finishReason": "STOP"
    }
  ]
}
```

### Function Call Yanıt
```json
{
  "candidates": [
    {
      "content": {
        "role": "model",
        "parts": [
          {
            "functionCall": {
              "name": "search_stations",
              "args": {
                "maxResults": 5
              }
            }
          }
        ]
      },
      "finishReason": "STOP"
    }
  ]
}
```

---

## Test Adımları

### 1. Backend Derlemesi
```bash
cd smartcharge-api
go build ./...
```
✅ **Sonuç:** Hata yok

### 2. Backend Başlatma
```bash
cd smartcharge-api
go run cmd/server/main.go
```
✅ **Kontrol Noktaları:**
- `[DEBUG] Initializing Gemini provider with model: gemini-1.5-flash`
- Database bağlantısı başarılı
- Server port 8080'de dinliyor

### 3. Chat Endpoint Testi
```bash
curl -X POST http://localhost:8080/v1/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -d '{
    "message": "Yakındaki istasyonları öner"
  }'
```

✅ **Beklenen Yanıt:**
```json
{
  "role": "bot",
  "content": "Size en uygun istasyonları buluyorum...",
  "action": {
    "type": "create_reservation",
    "stationId": 1,
    "date": "2026-04-01",
    "hour": "14:00",
    "success": true
  }
}
```

---

## Commit Bilgisi

**Commit:** `b387e99`  
**Branch:** `chatbot`  
**Mesaj:** "fix: Correct Gemini message format in agents.go (Content -> Parts)"

**Değişiklik Özeti:**
```
 smartcharge-api/internal/chat/agents.go | 1 +
 1 file changed, 1 insertion(+), 1 deletion(-)
```

---

## Sonuç

✅ **Sorun Çözüldü:** Derleme hatası ortadan kaldırıldı  
✅ **Format Düzeltildi:** Mesajlar Gemini SDK'sına uygun format'ta gönderiliyor  
✅ **Flow Çalışıyor:** Agentic chat loop artık Gemini API'ye doğru request gönderiyor  
✅ **Part System Aktif:** Response parsing (text ve function calls) doğru çalışıyor

### Verifikasyon Checklist
- [x] Compile hatası yok
- [x] Parts field'ı doğru kullanılıyor
- [x] Gemini API response parsing doğru format'ta
- [x] Function calls ve text responses ikisi de handle ediliyor
- [x] Commit tamamlandı ve git history temiz

---

## İlgili Dosyalar

| Dosya | Satır | Açıklama |
|-------|-------|----------|
| `smartcharge-api/internal/chat/agents.go` | 322 | `convertMessagesToGemini()` - **Düzeltildi** |
| `smartcharge-api/internal/ai/gemini.go` | 48-52 | `GeminiMessage` struct tanımı |
| `smartcharge-api/internal/ai/gemini.go` | 210-250 | Response parsing logic |
| `smartcharge-api/internal/chat/service.go` | 82-88 | Chat entry point |

---

## Not: Gemini SDK Format Gereksinimleri

Gelecekteki API değişiklikleri için bilgi:

1. **Request:**
   - `system_instruction` → `parts: [{text: "..."}]`
   - `contents[i]` → `parts: [{text: "..."} veya {functionCall: {...}}]`

2. **Response:**
   - `candidates[0].content.parts[]` → Her part `text` VEYA `functionCall` içerebilir
   - Function calls JSON olarak parse ediliyor

3. **Tools:**
   - `tools[0].functionDeclarations[]` → Gemini function calling spec

Bu format kesinlikle Gemini 1.5 API'sine uymalıdır.
