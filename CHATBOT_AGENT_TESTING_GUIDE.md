# SmartCharge Chatbot - Agent Mode Testing & Debugging Guide

**Tarih:** 2026-04-01  
**Versiyon:** 2.0 - Agent Tool Calling  
**Durum:** 🚀 Ready for Testing

---

## 📋 İçindekiler

1. [Nedir Bu? - Chatbot Agent Mode](#nedir-bu)
2. [Sistem Mimarisi](#sistem-mimarisi)
3. [Tools Tanımları](#tools-tanımları)
4. [Başlama Rehberi](#başlama-rehberi)
5. [Test Senaryoları](#test-senaryoları)
6. [Debug & Logging](#debug--logging)
7. [Olası Sorunlar & Çözümler](#olası-sorunlar--çözümler)
8. [Response Örnekleri](#response-örnekleri)

---

## 🎯 Nedir Bu?

### Eski Davranış (Text-Only)
```
Kullanıcı: "Yakında istasyon var mı?"
Chatbot: "Evet, yakının da birkaç istasyon var. Hangi semtte arıyor sunuz?"
❌ Sonuç: Hiçbir aksiyon yok, sadece sohbet
```

### Yeni Davranış (Agent Mode)
```
Kullanıcı: "Yakında istasyon var mı?"
Chatbot: 
  1. search_stations() TOOL'UNU ÇAĞIR
  2. İstasyonları LİSTELE (tablo formatı)
  3. Öneriler SUN
✅ Sonuç: Gerçek veriler, istasyonlar, randevu seçeneği
```

---

## 🏗️ Sistem Mimarisi

```
┌─────────────────────────────────────────────────────────┐
│                  Frontend Chatbot                       │
│              (ChatWidget.tsx / components)              │
└────────────────────┬────────────────────────────────────┘
                     │ POST /v1/chat
                     ↓
┌─────────────────────────────────────────────────────────┐
│            Backend Chat Handler                         │
│          (internal/chat/handler.go)                     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│         ExecuteAgenticChat Loop                         │
│      (internal/chat/agents.go:340-447)                 │
│                                                         │
│  1. Build messages[]                                    │
│  2. Call CompleteWithTools()                            │
│  3. Parse response                                      │
│  4. Tool call mi? -> executeTool()                      │
│  5. Loop sürüyor mü? -> Iteration++                     │
└────────────────────┬────────────────────────────────────┘
                     │
                 ┌───┴────────────────────┐
                 ↓                        ↓
        ┌────────────────────┐  ┌────────────────────┐
        │ Gemini API         │  │ Tool Execution     │
        │ (CompleteWithTools)│  │ (executeSearchSt..)│
        └────────────────────┘  └────────────────────┘
                 │                        │
                 └───────────┬────────────┘
                             ↓
                    ┌────────────────────┐
                    │ Final Response     │
                    │ (text + actions)   │
                    └────────────────────┘
```

### Agentic Loop Flow

```
Iteration 1:
  User: "Yakında istasyon var mı?"
  → Gemini: "Bırak arayalım" + search_stations() çağrısı
  → Tool Execute: 5 istasyon bulundu
  → Continue Loop (iteration 2)

Iteration 2:
  System: "Tool sonuçları: [station1, station2, ...]"
  → Gemini: "İşte size 5 istasyon... [listele]"
  → Text Response: NO MORE TOOLS
  → Return Response

Kullanıcıya dönen sonuç:
{
  "role": "bot",
  "content": "İşte size yakın istasyonlar:\n1. Station A\n2. Station B\n..."
}
```

---

## 🔧 Tools Tanımları

### Tool 1: `search_stations`

**Amacı:** Kullanıcının kriterlerine göre EV şarj istasyonlarını bul

**Parametreler:**
```json
{
  "location": "string (opsiyonel)",      // "Taksim", "Kadıköy"
  "socketType": "string (opsiyonel)",    // "AC", "DC"
  "latitude": "number (opsiyonel)",      // 38.7
  "longitude": "number (opsiyonel)",     // 27.4
  "preferredTime": "string (opsiyonel)", // "14:00"
  "maxResults": "integer (default: 5)"   // 10 adedine kadar
}
```

**Response Format:**
```json
[
  {
    "id": 1,
    "name": "Station A",
    "latitude": 38.7,
    "longitude": 27.4,
    "price": 15.50,
    "load": 65,
    "status": "YELLOW",
    "distance": 2.3,
    "description": "Station A istasyonu - Fiyat: 15.50 TL/kWh, Yoğunluk: YELLOW (65%)"
  },
  ...
]
```

**Status Kodları:**
- 🟢 **GREEN** (0-45%) - Az yoğun, hızlı şarj
- 🟡 **YELLOW** (46-65%) - Orta yoğun
- 🔴 **RED** (>65%) - Çok yoğun

### Tool 2: `book_appointment`

**Amacı:** Seçili bir istasyonda belirli tarih/saatte randevu oluştur

**Parametreler:**
```json
{
  "stationId": "integer (zorunlu)",   // 1, 2, 3...
  "date": "string (zorunlu)",         // "2026-04-01"
  "hour": "string (zorunlu)",         // "14:00"
  "userId": "integer (zorunlu)"       // JWT'den otomatik
}
```

**Response Format:**
```json
{
  "id": 42,
  "stationId": 1,
  "userId": 1,
  "date": "2026-04-01",
  "hour": "14:00",
  "status": "PENDING",
  "earnedCoins": 50,
  "savedCo2": 0.5,
  "createdAt": "2026-04-01T10:00:00Z"
}
```

---

## 🚀 Başlama Rehberi

### 1️⃣ Backend Başlat

```bash
cd smartcharge-api

# İlk defa çalıştırıyorsan
go mod tidy
go build ./...

# Backend'i başlat
go run cmd/server/main.go
```

**Beklenen Çıktı:**
```
[DEBUG] Initializing Gemini provider with model: gemini-2.5-flash
Server running on :8080
```

### 2️⃣ Frontend Başlat (başka terminal)

```bash
cd smartcharge  # repo root

# Node modules'ı kontrol et
npm install

# Frontend'i başlat
npm run dev
```

**Beklenen Çıktı:**
```
▲ Next.js 16.0.0
  - Local:        http://localhost:3000
  ✓ Ready in 2.5s
```

### 3️⃣ Test Et

1. **Tarayıcı:** http://localhost:3000 aç
2. **Login:** Driver hesabıyla giriş yap (demo user)
3. **ChatWidget:** Sağ altı köşedeki chat butonuna tıkla
4. **Message gönder:** "Yakında iyi istasyon var mı?"

---

## 📝 Test Senaryoları

### Senaryo 1: Basit Istasyon Arama

**Input:**
```
"Yakında istasyon var mı?"
```

**Beklenen Flow:**
1. ✅ Gemini search_stations() tool'unu çağrır
2. ✅ Backend 5-10 istasyon döndürür
3. ✅ Gemini istasyonları biçimli şekilde listeleyerek yanıt verir
4. ✅ Chatbot UI'da istasyonların listesi görülür

**Backend Logs (bunu göreceksin):**
```
[DEBUG] Chat request: userID=1, message='Yakında istasyon var mı?'
[DEBUG] Using Gemini API for agentic chat
[DEBUG] Executing agentic chat iteration 1 with message: Yakında istasyon var mı?
[DEBUG] Gemini request JSON: {"system_instruction":{...},"contents":[...],"tools":[...]}
[DEBUG] Iteration 1 Response Content (raw): {"name":"search_stations","args":{}}
[DEBUG] Iteration 1 Parse Result - Tool Name: search_stations, Text: 
[DEBUG] Executing agentic chat iteration 1 Executing tool: search_stations with args: map[]
[DEBUG] executeSearchStations called with args: map[]
[DEBUG] Found 10 total stations
[DEBUG] Returning 5 search results
[DEBUG] Iteration 1 Tool execution successful. Result: [...]
[DEBUG] Executing agentic chat iteration 2 with message: Yakında istasyon var mı?
[DEBUG] Iteration 2 Response Content (raw): İşte size yakın istasyonlar:\n1. Station A\n...
[DEBUG] Iteration 2 Parse Result - Tool Name: NONE, Text: İşte size yakın istasyonlar...
```

✅ **Başarılı:** `Tool Name: search_stations` ve `Tool execution successful` görüyorsan OK

---

### Senaryo 2: Randevu Oluşturma

**Input (2 mesaj):**
```
1. "Taksim'de istasyon bulabilir misin?"
2. "İlk istasyonda bugün saat 14:00'de randevu alalım"
```

**Beklenen Flow:**

**1. Mesaj - Arama:**
```
Iteration 1: search_stations(location="Taksim") ➜ 5 istasyon
Iteration 2: Gemini yanıt verir -> listeler
```

**2. Mesaj - Randevu:**
```
Iteration 1: book_appointment(stationId=1, date="2026-04-01", hour="14:00")
Iteration 2: Gemini yanıt verir -> "Randevu oluşturuldu!"
```

**Backend Logs:**
```
[DEBUG] executeSearchStations called with args: map[location:Taksim]
[DEBUG] Found 10 total stations
[DEBUG] Returning 5 search results

[DEBUG] Iteration 2 Executing tool: book_appointment with args: map[stationId:1 date:2026-04-01 hour:14:00]
[DEBUG] Iteration 2 Tool execution successful
```

✅ **Başarılı:** Her iki tool da başarılı execute ederse

---

### Senaryo 3: Koordinat ile Mesafe Hesabı

**Input:**
```
"Konumum (38.7, 27.4). Yakında istasyon bulabilir misin?"
```

**Beklenen Flow:**
1. Gemini latitude/longitude parametrelerini geçer
2. Backend haversine distance hesaplar
3. Istasyonlar mesafe bilgisiyle döner

**Backend Logs:**
```
[DEBUG] executeSearchStations called with args: map[latitude:38.7 longitude:27.4]
[DEBUG] Found 10 total stations
[DEBUG] Returning 5 search results
```

---

## 🔍 Debug & Logging

### Log Seviyeleri

#### 🟩 INFO - Normal İşlem
```
[DEBUG] Chat request: userID=1, message='...'
[DEBUG] Executing agentic chat iteration 1 with message: '...'
[DEBUG] executeSearchStations called with args: map[...]
```

#### 🟨 WARN - Uyarı (işlem yine de başarılı)
```
[DEBUG] No tool results yet, continuing loop
[DEBUG] Tool returned empty results
```

#### 🟥 ERROR - Hata (işlem başarısız)
```
[ERROR] Gemini API returned status 401: {"error":{"code":401,"message":"Invalid API key"}}
[ERROR] Failed to list stations: connection refused
[DEBUG] Iteration 1 Tool execution failed: stationId must be a number
```

### Backend Logs Takip Etme

**Terminal'de gerçek zamanlı log görmek için:**

```bash
# Backend terminal'inde
cd smartcharge-api
go run cmd/server/main.go 2>&1 | grep -E "\[DEBUG\]|\[ERROR\]"
```

**Belirli bir flow'ı izlemek:**

```bash
# Sadece agentic chat logs
go run cmd/server/main.go 2>&1 | grep "Iteration\|executeSearchStations\|Tool execution"

# Sadece Gemini API calls
go run cmd/server/main.go 2>&1 | grep "Gemini request\|Gemini response"
```

### Request/Response Inspection

**Frontend DevTools Console:**
```javascript
// Chat API çağrısını görmek
console.log("Chat Request:", {
  message: "Yakında istasyon var mı?",
  userID: 1
});

// Response'ı görmek
console.log("Chat Response:", response);
```

---

## ⚠️ Olası Sorunlar & Çözümler

### Problem 1: Tool Calling Hiç Çalışmıyor (Sadece Text)

**Belirtileri:**
```
[DEBUG] Iteration 1 Parse Result - Tool Name: NONE, Text: "Üzgünüm, AI servisiyle..."
```

**Olası Sebepler:**
1. Gemini API anahtarı yanlış
2. Model adı yanlış (`gemini-2.5-flash` yerine `gemini-1.5-flash`)
3. System prompt yeterince agresif değil

**Çözümler:**

a) API Key'i kontrol et:
```bash
cd smartcharge-api
grep GEMINI_API_KEY .env
echo $GEMINI_API_KEY  # Windows: echo %GEMINI_API_KEY%
```

b) Model adını kontrol et:
```bash
grep GEMINI_MODEL .env
# Çıktı: GEMINI_MODEL=gemini-2.5-flash
```

c) Backend'i yeniden başlat:
```bash
Ctrl+C (durdur)
go run cmd/server/main.go (yeniden başlat)
```

d) System prompt'unu kontrol et:
```go
// File: smartcharge-api/internal/chat/agents.go:295
// Satır 308'de şu yazmalı:
// "- GÖREVINI UNUTMA: Soru sormak yerine tool çağır!"
```

---

### Problem 2: "status 401: Invalid API key"

**Log Çıktısı:**
```
[ERROR] Gemini API returned status 401: {"error":{"code":401,"message":"Invalid API key"}}
```

**Çözüm:**
1. [Google Cloud Console](https://console.cloud.google.com) aç
2. API Key'ini yeniden oluştur
3. `smartcharge-api/.env` güncelle:
   ```
   GEMINI_API_KEY=<new-key-here>
   ```
4. Backend'i restart et

---

### Problem 3: "status 404: models/gemini-1.5-flash not found"

**Log Çıktısı:**
```
[ERROR] Gemini API returned status 404: {"error":{"message":"models/gemini-1.5-flash is not found for API version v1beta"}}
```

**Çözüm:**
1. `.env`'de model adı yanlış olabilir
2. Doğru model adını ayarla:
   ```bash
   GEMINI_MODEL=gemini-2.5-flash  # veya gemini-1.5-pro
   ```
3. Backend restart et

**Mevcut Modeller:**
- `gemini-2.5-flash` - Hızlı, ekonomik (önerilen)
- `gemini-1.5-pro` - Daha güçlü ama yavaş
- `gemini-1.5-flash` - Eski (depricated olabilir)

---

### Problem 4: Tool Çağrılıyor Ama "Tool execution failed"

**Log Çıktısı:**
```
[DEBUG] Iteration 1 Executing tool: search_stations with args: map[...]
[DEBUG] Iteration 1 Tool execution failed: database connection refused
```

**Çözüm:**
1. PostgreSQL çalışıyor mu?
   ```bash
   # Docker kontrol et
   docker ps | grep postgres
   
   # Eğer çalışmıyorsa başlat
   docker compose up -d db
   ```

2. Database URL doğru mu?
   ```bash
   grep DATABASE_URL smartcharge-api/.env
   # Beklenen: postgres://admin:admin@localhost:5432/evcharge?sslmode=disable
   ```

---

### Problem 5: Frontend'de Chatbot Yanıt Vermiyor

**Belirtileri:**
- Mesaj gönderdikten sonra loading döndürüyor
- 30 saniye sonra timeout

**Debug Adımları:**

1. **DevTools Network Tab:**
   - F12 → Network
   - POST /v1/chat çağrısına bak
   - Response status'ı kontrol et

2. **Backend Logs:**
   ```bash
   # Chat endpoint'ine request geldi mi?
   go run cmd/server/main.go 2>&1 | grep "Chat request"
   ```

3. **CORS Hatası mı?**
   - DevTools Console'da bak
   - "CORS policy" hatası varsa, backend CORS config'ini kontrol et

---

## 📊 Response Örnekleri

### ✅ Başarılı Text + Tool Response

```json
{
  "role": "bot",
  "content": "⚡ İşte size yakın istasyonlar:\n\n1. **Taksim Station** 🔌\n   - Fiyat: 15.50 TL/kWh 💰\n   - Yoğunluk: 🟢 GREEN (35%)\n   - Mesafe: 2.3 km 📍\n\n2. **Kadıköy Hub** ⚡\n   - Fiyat: 14.75 TL/kWh 💰\n   - Yoğunluk: 🟡 YELLOW (58%)\n   - Mesafe: 4.5 km 📍\n\nHangi istasyonda randevu alalım?",
  "recommendations": [
    {
      "id": 1,
      "name": "Taksim Station",
      "latitude": 38.75,
      "longitude": 27.38,
      "price": 15.50,
      "load": 35,
      "status": "GREEN",
      "distance": 2.3
    }
  ]
}
```

### ✅ Başarılı Randevu Response

```json
{
  "role": "bot",
  "content": "✅ Randevu başarıyla oluşturuldu!\n\n📍 Station: Taksim Station\n📅 Tarih: 2026-04-01\n⏰ Saat: 14:00\n💰 Kazanacak Coin: 50\n🌱 CO2 Tasarrufu: 2.5 kg\n\nŞarjınız için iyi günler! ⚡",
  "action": {
    "type": "create_reservation",
    "stationId": 1,
    "date": "2026-04-01",
    "hour": "14:00",
    "success": true,
    "reservation": {
      "id": 42,
      "stationId": 1,
      "date": "2026-04-01",
      "hour": "14:00",
      "earnedCoins": 50,
      "status": "PENDING"
    }
  }
}
```

### ❌ Hata Response

```json
{
  "role": "bot",
  "content": "😔 Üzgünüm, bir sorun oluştu:\n\nHata: stationId must be a number\n\nLütfen istasyon ID'sini kontrol edin ve tekrar deneyin.",
  "action": {
    "type": "error",
    "message": "Tool execution failed",
    "success": false
  }
}
```

---

## 🧪 Integration Testing Checklist

- [ ] Backend çalışıyor (port 8080)
- [ ] Frontend çalışıyor (port 3000)
- [ ] Gemini API key geçerli
- [ ] Database çalışıyor
- [ ] Chatbot widget açılıyor
- [ ] "Yakında istasyon var mı?" mesajına tool call dönüyor
- [ ] Istasyonlar listeleniyor
- [ ] Randevu talebi tool call dönüyor
- [ ] Randevu başarılı oluşturuluyor
- [ ] Logs DEBUG mesajlarını gösteriyor

---

## 🎯 Sonraki Adımlar

1. **Conversation Memory:**
   - `chat_sessions` ve `chat_messages` tabloları ekle
   - Geçmiş konuşmaları sakla

2. **Streaming Support:**
   - `Provider.Stream()` implementasyonu
   - Uzun yanıtları real-time gönder

3. **RAG Integration:**
   - pgvector ile station bilgileri embed'le
   - Benzer sorulara daha iyi yanıt ver

4. **RL Feedback Loop:**
   - User feedback'i topla
   - Model seçimini optimize et

---

**Sorularınız varsa backend logs'u ve DevTools console'u kontrol etmeyi unutmayın!** 🚀
