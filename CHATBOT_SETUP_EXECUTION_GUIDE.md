# SmartCharge Chatbot - Complete Setup & Execution Guide

**Tarih:** 2026-04-01  
**Konu:** Agent mode chatbot'u sıfırdan ayarlayıp çalıştırma  
**Hedef Audience:** Developers, QA, Product Managers

---

## 🎯 Quick Start (5 dakika)

### Seçenek 1: Docker Compose ile (Önerilen)

```bash
# 1. Repo root'ta docker compose'ı başlat
docker compose up -d

# 2. Backend logs'unu izle
docker logs -f smartcharge-api

# 3. Frontend'i başlat (yeni terminal)
npm install
npm run dev

# 4. Tarayıcı: http://localhost:3000
```

### Seçenek 2: Local `go run` ile

```bash
# Terminal 1: Backend
cd smartcharge-api
go run cmd/server/main.go

# Terminal 2: Frontend  
cd smartcharge
npm run dev

# Terminal 3: Database (Docker)
docker compose up -d db
```

---

## 📋 Full Setup Guide

### Ön Koşullar

- **Node.js** 18+ (Frontend)
- **Go** 1.25+ (Backend)
- **PostgreSQL** 15 (Docker veya local)
- **Docker & Docker Compose** (database için)
- **Google Gemini API Key** (https://aistudio.google.com)

### Adım 1: Google Gemini API Key Oluştur

1. **Google AI Studio'ya git:** https://aistudio.google.com
2. **"Get API Key" tıkla** → "Create API key in new project"
3. **API Key'i kopyala**
4. **Güvende sakla!** (public repo'ya commit'leme)

### Adım 2: Environment Dosyalarını Ayarla

#### `.env` (Repo root)
```bash
# Frontend'in backend'e erişmesi için
API_URL=http://localhost:8080

# Gemini API Key
GEMINI_API_KEY=<YOUR_API_KEY_HERE>
GEMINI_MODEL=gemini-2.5-flash
```

#### `smartcharge-api/.env`
```bash
# Database
DATABASE_URL=postgres://admin:admin@localhost:5432/evcharge?sslmode=disable

# JWT
JWT_SECRET=<generate-a-random-string>

# Server
PORT=8080
GIN_MODE=debug  # production için release

# Gemini
GEMINI_API_KEY=<YOUR_API_KEY_HERE>
GEMINI_MODEL=gemini-2.5-flash

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

### Adım 3: Database'i Başlat

```bash
# Docker ile PostgreSQL başlat
docker compose up -d db

# Database'in ready olmasını bekle
sleep 5

# Migrations'ı çalıştır (Docker compose yapıyor)
docker compose up db
```

**Kontrol:**
```bash
# Database'e bağlan
psql -U admin -d evcharge -h localhost

# Tables'ı kontrol et
\dt

# Çıkış: \q
```

### Adım 4: Backend Başlat

```bash
cd smartcharge-api

# Dependencies
go mod tidy

# Build test
go build ./...

# Run
go run cmd/server/main.go
```

**Beklenen Çıktı:**
```
[DEBUG] Initializing Gemini provider with model: gemini-2.5-flash
[DEBUG] Database connected successfully
Server running on :8080
```

### Adım 5: Frontend Başlat (Yeni Terminal)

```bash
cd smartcharge

# Dependencies
npm install

# Development server
npm run dev
```

**Beklenen Çıktı:**
```
  ▲ Next.js 16.0.0
  - Local:        http://localhost:3000
  ✓ Ready in 2.5s
```

### Adım 6: Chatbot Test Et

1. **Tarayıcı:** http://localhost:3000 aç
2. **Login:**
   - Email: `driver@test.com`
   - Password: `password123`
3. **Chat Widget:** Sağ alttan chat butonuna tıkla
4. **Test Mesajı Gönder:**
   ```
   "Yakında istasyon var mı?"
   ```

---

## 🔍 Verification Checklist

### Backend Checks
```bash
# 1. Port 8080 dinliyor mu?
netstat -an | grep 8080  # macOS/Linux
netstat -ano | findstr :8080  # Windows

# 2. Database bağlantısı var mı?
# Backend logs'ta "Database connected" mesajı

# 3. Gemini API key geçerli mi?
# Backend logs'ta "Initializing Gemini provider" ve hata yok

# 4. Chat endpoint çalışıyor mu?
curl -X POST http://localhost:8080/v1/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -d '{"message": "Merhaba"}'
```

### Frontend Checks
```bash
# 1. Frontend running?
# http://localhost:3000 açıldı mı?

# 2. Chat widget visible?
# Sağ alt köşeye bak, chat icon var mı?

# 3. API calls working?
# DevTools → Network → POST /v1/chat çağrıları var mı?

# 4. Response parsing?
# DevTools → Console hata yok mu?
```

---

## 🚀 Running with Different Configurations

### Production-like Setup
```bash
# 1. Build Backend
cd smartcharge-api
go build -o bin/server cmd/server/main.go

# 2. Build Frontend
cd smartcharge
npm run build

# 3. Start with env
GIN_MODE=release PORT=8080 ./bin/server
npm start  # Frontend

# 4. Open browser
http://localhost:3000
```

### Debug Mode (Verbose Logging)
```bash
# Backend
GIN_MODE=debug go run cmd/server/main.go 2>&1 | grep -E "\[DEBUG\]|\[ERROR\]"

# Frontend
npm run dev -- --debug

# Combined logs
cd smartcharge-api && go run cmd/server/main.go &
cd smartcharge && npm run dev
# Ctrl+C to stop all
```

### Docker Full Stack
```bash
# Build ve başlat
docker compose build
docker compose up -d

# Logs
docker logs -f smartcharge-api
docker logs -f smartcharge-frontend  # eğer Dockerfile varsa

# Durdur
docker compose down
```

---

## 📊 Monitoring & Debugging

### Backend Logs Real-time
```bash
# All logs
go run cmd/server/main.go

# Only chat-related
go run cmd/server/main.go 2>&1 | grep -i chat

# Only errors
go run cmd/server/main.go 2>&1 | grep ERROR

# Gemini API calls
go run cmd/server/main.go 2>&1 | grep "Gemini"
```

### Frontend DevTools
```javascript
// Browser Console (F12)

// 1. Chat API çağrısını izle
console.log = (function(old) {
  return function log(...args) {
    if (args.toString().includes('chat')) {
      console.groupCollapsed('Chat API');
      console.log(...args);
      console.groupEnd();
    }
    old.apply(console, args);
  };
})(console.log);

// 2. Response format'ını göster
fetch('/v1/chat', {
  method: 'POST',
  body: JSON.stringify({message: "Yakında istasyon var mı?"})
}).then(r => r.json()).then(d => console.log(JSON.stringify(d, null, 2)));
```

### Database Queries
```bash
# Database'e bağlan
psql -U admin -d evcharge -h localhost

# Tüm tabloları göster
\dt

# Chat messages table'ını sorgu (gelecek phase)
SELECT * FROM chat_messages ORDER BY created_at DESC LIMIT 10;

# Reservations göster
SELECT id, user_id, station_id, status FROM reservations LIMIT 10;
```

---

## 🛠️ Common Issues & Solutions

### Issue 1: "Connection refused" at localhost:8080

**Çözüm:**
```bash
# Backend çalışıyor mu kontrol et
ps aux | grep "go run"

# Eğer çalışmıyorsa:
cd smartcharge-api
go run cmd/server/main.go

# Port kullanımda mı?
netstat -an | grep 8080
# Eğer yes, port'u change et: PORT=8081 go run cmd/server/main.go
```

### Issue 2: "API key invalid" from Gemini

**Çözüm:**
```bash
# 1. API key'i kontrol et
grep GEMINI_API_KEY smartcharge-api/.env

# 2. Boş mu?
echo $GEMINI_API_KEY

# 3. Yeni bir tane oluştur ve değiştir
# https://aistudio.google.com → Get API Key

# 4. Backend'i restart et
# Ctrl+C, then: go run cmd/server/main.go
```

### Issue 3: Database "connection refused"

**Çözüm:**
```bash
# 1. Docker running?
docker ps | grep postgres

# 2. Eğer no, başlat:
docker compose up -d db

# 3. URL kontrol et
grep DATABASE_URL smartcharge-api/.env
# Beklenen: postgres://admin:admin@localhost:5432/evcharge

# 4. Migrations applied?
docker compose exec db psql -U admin evcharge -c "\dt"
```

### Issue 4: Frontend doesn't show chat widget

**Çözüm:**
```bash
# 1. DevTools açıp console'ı kontrol et (F12)
# Hata var mı?

# 2. API URL doğru mu?
grep API_URL .env
# .env dosyası root'ta olmalı

# 3. npm install yeniden yap
npm install

# 4. Cache temizle
rm -rf .next node_modules
npm install
npm run dev
```

---

## 📝 Development Workflow

### Chatbot Feature Development

```
1. Git branch oluştur
   git checkout -b chatbot/feature-name

2. Backend geliştir
   - agents.go üzerinde çalış
   - Local test et: go run cmd/server/main.go

3. Frontend geliştir
   - ChatWidget.tsx üzerinde çalış
   - Chrome DevTools'ta test et

4. Logs kontrol et
   - Backend: [DEBUG] mesajlarını takip et
   - Frontend: Console'da response format'ını göster

5. Commit et
   git add -A
   git commit -m "feat: Add new chatbot feature"

6. Push & PR
   git push origin chatbot/feature-name
```

### Testing

```bash
# Unit tests (gelecek)
go test ./internal/chat/...

# Integration tests
# Chatbot test senaryolarını CHATBOT_AGENT_TESTING_GUIDE.md'de kullan

# Manual testing
# http://localhost:3000 → chat widget'ı test et
```

---

## 📚 Important Files & Locations

| Component | File | Purpose |
|-----------|------|---------|
| **System Prompt** | `smartcharge-api/internal/chat/agents.go:295` | Tool calling instructions |
| **Tool Definitions** | `smartcharge-api/internal/chat/agents.go:48` | search_stations, book_appointment |
| **Agentic Loop** | `smartcharge-api/internal/chat/agents.go:340` | Main execution logic |
| **Gemini Integration** | `smartcharge-api/internal/ai/gemini.go` | API calls & response parsing |
| **Chat Handler** | `smartcharge-api/internal/chat/handler.go` | HTTP endpoint |
| **Frontend Chat** | `smartcharge/components/ChatWidget.tsx` | UI & user interaction |
| **Auth** | `smartcharge/lib/auth.ts` | JWT token management |

---

## 🔗 Useful Links

- **Google Gemini Docs:** https://ai.google.dev/docs
- **Function Calling:** https://ai.google.dev/docs/function_calling
- **SmartCharge Architecture:** `.plan/ROADMAP.md`
- **API Audit:** `.plan/AUDIT.md` (Section 4 - Chat)
- **Gemini Models:** https://ai.google.dev/models

---

## 📞 Getting Help

1. **Backend issues?** → Check logs: `go run cmd/server/main.go 2>&1 | grep ERROR`
2. **Frontend issues?** → DevTools: F12 → Console & Network
3. **API issues?** → curl test endpoint locally
4. **Database issues?** → psql connect & query

---

**Chatbot artık agent mode'da ve tool calling destekliyor! 🚀**

Son test: `"Yakında istasyon var mı?"` mesajını gönder ve logs'ta `Tool Name: search_stations` göreceksin.
