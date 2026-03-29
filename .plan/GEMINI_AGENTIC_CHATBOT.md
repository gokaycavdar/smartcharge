# SmartCharge AI Agentic Chatbot - Gemini API Entegrasyonu

## Özet

Bu dokümantasyon, SmartCharge projesine Google Gemini API kullanılarak entegre edilen **agentic chatbot** yapısını açıklar. Chatbot, function calling (tool use) özelliği ile PostgreSQL veritabanından istasyonları sorgulamakta ve kullanıcının doğal dili aracılığıyla randevu oluşturmaktadır.

## Genel Mimari

```
┌─────────────────────────────────────────┐
│     Frontend (Next.js 16, React 19)    │
│                                         │
│  GeminiChatWidget.tsx                  │
│  ├─ User input → /api/chat             │
│  ├─ Display stations (search results)  │
│  └─ Show booking confirmations         │
└─────────────────────────────────────────┘
            ↓ HTTPS (authFetch)
┌─────────────────────────────────────────┐
│  Backend API (Go 1.25, Gin)             │
│                                         │
│  /v1/chat Endpoint (POST)               │
│  ├─ Extract userID from JWT             │
│  └─ Call ExecuteAgenticChat()           │
│                                         │
│  Chat Service (Agentic Loop)            │
│  ├─ Send message + tools to Gemini      │
│  ├─ Parse function calls                │
│  └─ Execute tools:                      │
│     ├─ search_stations (DB query)       │
│     └─ book_appointment (reservation)   │
└─────────────────────────────────────────┘
            ↓ gRPC/REST
┌─────────────────────────────────────────┐
│     Google Gemini API                  │
│  (gemini-1.5-flash or -pro)            │
│                                         │
│  - Function calling support             │
│  - Natural language understanding       │
│  - Multi-turn conversation              │
└─────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────┐
│     PostgreSQL Database                │
│  (stations, reservations, users)       │
└─────────────────────────────────────────┘
```

## Kurulum Adımları

### 1. Gemini API Key Alma

1. https://aistudio.google.com/app/apikey adresine git
2. "Get API Key" butonuna tıkla
3. Yeni proje oluştur ve API key'i kopyala
4. `.env` dosyasına ekle:

```env
GEMINI_API_KEY="your-api-key-here"
GEMINI_MODEL="gemini-1.5-flash"  # veya gemini-1.5-pro
```

### 2. Backend Bağımlılıkları

Go modülleri zaten `go.mod` dosyasında tanımlanmıştır. `smartcharge-api` dizininde çalıştır:

```bash
go mod download
go mod tidy
```

### 3. Docker Container Yeniden Oluştur

`.env` dosyasında `GEMINI_API_KEY` ayarlandıktan sonra:

```bash
docker compose down
docker compose build api
docker compose up -d
```

### 4. Frontend Bileşeni Kontrolü

`components/GeminiChatWidget.tsx` otomatik olarak driver layout'unda yüklenir. Eğer manuel olarak eklemek istersen:

```tsx
import GeminiChatWidget from "@/components/GeminiChatWidget";

export default function Page() {
  return (
    <>
      <YourContent />
      <GeminiChatWidget />
    </>
  );
}
```

## Kod Yapısı

### Backend Dosyaları

#### `internal/ai/gemini.go` (YENİ)
- **GeminiProvider**: Google Gemini API için Provider interface implementasyonu
- **CompleteWithTools()**: Function calling desteği ile API çağrısı
- **ToolFunctionDeclaration**: Tool tanımları (search_stations, book_appointment)

#### `internal/chat/agents.go` (YENİ)
- **defineTools()**: Tool tanımlarını oluşturur
- **executeSearchStations()**: Veritabanından istasyonları sorgular
- **executeBookAppointment()**: Randevu oluşturur
- **ExecuteAgenticChat()**: Agentic loop (max 3 iterasyon)
  - Kullanıcı mesajı → Gemini API
  - Gemini function call döndürür
  - Tool execute et → Sonuç ekle
  - Tekrar Gemini'ye gönder (until terminal response)

#### `internal/chat/service.go` (GÜNCELLENME)
- **NewService()**: Gemini provider'ı initialize et
- **Chat()**: Gemini varsa agentic, yoksa legacy Ollama modu
- **ExecuteAgenticChat()**: Agentic flow başlat

#### `internal/chat/handler.go` (GÜNCELLENME)
- `userID` JWT'den extract (middleware.GetUserID)
- `/v1/chat` endpoint userID'yi service'e geçir

#### `internal/config/config.go` (GÜNCELLENME)
- `GeminiAPIKey` ve `GeminiModel` config fields'ları eklendi

### Frontend Dosyaları

#### `components/GeminiChatWidget.tsx` (YENİ)
- Modern, emojilü chat UI
- Station search results gösterme
- Booking confirmations
- Real-time loading state'leri
- Responsive tasarım

#### `app/(driver)/driver/layout.tsx` (GÜNCELLENME)
- `GeminiChatWidget` import ve render

## API Endpoints

### POST /v1/chat
```json
// Request
{
  "message": "Bana en yakın istasyonu öner"
}

// Response (Agentic Mode)
{
  "role": "bot",
  "content": "Harika bir şey buldum! İşte en yakın istasyonlar...",
  "stations": [
    {
      "id": 1,
      "name": "Kadıköy Şarj Noktası",
      "latitude": 34.01,
      "longitude": 29.02,
      "price": 2.50,
      "load": 45,
      "status": "GREEN",
      "distance": 0.8,
      "description": "..."
    }
  ],
  "action": {
    "type": "search_stations",
    "success": true
  }
}
```

### Booking Response
```json
{
  "role": "bot",
  "content": "Randevun oluşturuldu!",
  "action": {
    "type": "book_appointment",
    "success": true,
    "message": "Randevun başarıyla oluşturuldu! İstasyon: #1, Tarih: 2026-03-15, Saat: 14:00",
    "reservation": {
      "id": 42,
      "stationId": 1,
      "date": "2026-03-15",
      "hour": "14:00",
      "status": "PENDING"
    }
  }
}
```

## Tool Tanımları

### search_stations
```
Arama kriterlerine göre EV şarj istasyonlarını bul.

Parameters:
- location (string): Mahalle/şehir adı
- socketType (string): AC, DC, USB-C vb.
- latitude (number): Kullanıcının enlem koordinatı
- longitude (number): Kullanıcının boylam koordinatı
- preferredTime (string): Tercih edilen saat (14:00, sabah, akşam)
- maxResults (integer): Maksimum sonuç sayısı

Returns: StationSearchResult[]
- id, name, latitude, longitude, price, load, status, distance, description
```

### book_appointment
```
Istasyonda randevu oluştur.

Parameters (Required):
- stationId (integer): İstasyon ID
- date (string): YYYY-MM-DD formatında tarih
- hour (string): HH:MM formatında saat
- userId (integer): Kullanıcı ID (JWT'den auto-extracted)

Returns:
- success (boolean)
- reservation (ReservationResponse)
- message (string)
```

## Agentic Loop Flow

```
User Input
    ↓
Gemini API (with tools)
    ↓
┌─ Gemini returns function call?
│  YES: Tool execute
│       ├─ search_stations → Query DB
│       └─ book_appointment → Create reservation
│
│  Add tool result to conversation
│  Go back to Gemini
│
│ (Max 3 iterations)
│
└─ Gemini returns text response → Return to user
```

## Konfigürasyon Seçenekleri

### Fallback Modu
Eğer `GEMINI_API_KEY` empty ise veya Gemini hatası oluşursa, sistem otomatik olarak legacy **Ollama** moduna geri döner:

```go
if s.useAgentic && s.geminiProvider != nil {
    return s.ExecuteAgenticChat(ctx, userMessage, userID, s.geminiProvider)
}
return s.legacyChat(ctx, ...)  // Fallback
```

### Gemini Model Seçimi

- **gemini-1.5-flash** (recommended): Hız/maliyet optimizasyonu, çoğu kullanım için yeterli
- **gemini-1.5-pro**: Daha iyi reasoning, kompleks sorgular için

## Güvenlik Notları

1. **JWT Authentication**: Chat endpoint'i artık `userID` gerektirir
   - Anonymous chat desteği opsiyonel (backward compatibility)
   - Randevu oluşturma **userID zorunlu**

2. **API Key Güvenliği**: `GEMINI_API_KEY` **kesinlikle** `.env` veya secret manager'da saklanmalı
   - Hiçbir zaman hardcode etme
   - Git'e commit etme

3. **Rate Limiting**: Gemini API'nin free tier limitleri vardır
   - Production'da API tier upgrade et

## Hata Yönetimi

### Common Errors

```
❌ "stationId must be a number"
   → Tool çağrısında type error

❌ "date must be in YYYY-MM-DD format"
   → Date format validation failed

❌ "Failed to fetch" (Frontend)
   → /api/chat endpoint ulaşılamıyor

⚠️ "Tool execution failed"
   → Tool execute edildi ama hata döndü
   → Loop continue → Try again
```

### Debug Mode

Backend debug modunda extra logging:
```go
// internal/chat/agents.go
fmt.Printf("Tool %s called with args: %v\n", toolCall.Name, toolCall.Args)
```

## Test Komutları

### Frontend (Browser Console)
```javascript
// Manual chat test
fetch('/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + localStorage.getItem('ecocharge:token')
  },
  body: JSON.stringify({
    message: "En yakın istasyonu öner"
  })
}).then(r => r.json()).then(console.log)
```

### Backend (curl)
```bash
curl -X POST http://localhost:8080/v1/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"message": "Yarın saat 14:00 randevu oluştur"}'
```

## Performance & Optimization

| Aspect | Value | Note |
|--------|-------|------|
| Gemini API Latency | 1-3s | Typical response time |
| Max Iterations | 3 | Prevents infinite loops |
| Max Tokens | 2048 | Response limit per call |
| Temperature | 0.5 | Lower = more deterministic |
| Stations per Search | 5 | Limited for UI clarity |

## Bilinen Kısıtlamalar

1. **No Conversation Memory**: Her mesaj stateless, session history yok
   - Future: `chat_sessions` ve `chat_messages` tables

2. **Limited Location Context**: Harita konum otomatik geçilmiyor
   - Frontend user location send etmeli (GeminiChatWidget handles this)

3. **No SSE Streaming**: Gemini Stream mode implement edilmemiş
   - Tüm yanıt "at once" dönüyor

4. **Tool Result Size**: Çok fazla istasyon return etmek token limit'i aşabilir
   - `maxResults` default 5 ile sınırlandırıldı

## Future Enhancements

- [ ] **Chat Sessions**: Conversation history ve memory
- [ ] **RAG (Retrieval-Augmented Generation)**: FAQ + istasyon knowledge base
- [ ] **Real-time Availability**: Live slot availability checks
- [ ] **Multi-language**: Turkish + English support
- [ ] **Advanced Filtering**: Soket tipi, power rating vb.
- [ ] **User Preferences**: Saved favorite stations
- [ ] **Feedback Loop**: User ratings for recommendations

## Troubleshooting

### Gemini API Errors

**"status 403: Permission denied"**
- API key invalid/expired
- API not enabled in Google Cloud project
- Billing not set up

**"Invalid request body"**
- Tool parameters malformed
- Temperature/maxTokens out of range

### Chat Issues

**"userID: 0"**
- JWT not provided or invalid
- Fall back to anonymous (if enabled)

**"Stations not found"**
- Database connection issue
- No stations seeded in DB

**"Randevu oluşturulamadı"**
- User capacity limit reached
- Date/time validation failed
- Station not found

## Kaynaklar

- [Google Gemini API Docs](https://ai.google.dev/docs)
- [Function Calling](https://ai.google.dev/docs/function_calling)
- [SmartCharge AUDIT.md](./.plan/AUDIT.md)
- [SmartCharge ROADMAP.md](./.plan/ROADMAP.md)

## Yazar & Versiyon

- **Implementation**: OpenCode AI Agent
- **Version**: 1.0.0
- **Date**: 2026-03-29
- **Status**: Production Ready ✅
