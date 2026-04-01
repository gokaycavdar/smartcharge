# SmartCharge Backend - Local Development Guide (go run)

## 🚀 Hızlı Başlangıç

### **Adım 1: Backend .env Dosyasını Konfigure Et**

```bash
cd smartcharge-api

# .env.example'ı kopyala
cp .env.example .env

# .env dosyasını düzenle ve GEMINI_API_KEY'ini ekle
# Geçerli bir Gemini API key'ini yap yapıştır
# GEMINI_API_KEY=AIzaSyD...
```

### **Adım 2: PostgreSQL Başlat**

```bash
# Docker ile PostgreSQL başlat (smartcharge-api dizininden)
docker compose up -d db

# veya manuel olarak PostgreSQL kurup çalıştır
# https://www.postgresql.org/download/
```

### **Adım 3: Database Migrasyonları Çalıştır**

```bash
# smartcharge-api dizininde
sqlc generate -f db/sqlc.yaml

# PostgreSQL migrate tool ile migrasyonları uygula
# (veya sql dosyalarını manuel olarak psql'de çalıştır)
```

### **Adım 4: Go Dependencies İndir**

```bash
# smartcharge-api dizininde
go mod tidy
go mod download
```

### **Adım 5: Backend Server Başlat**

```bash
# smartcharge-api dizininde
go run cmd/server/main.go
```

**Beklenen çıkış:**
```
[DEBUG] Initializing Gemini provider with model: gemini-1.5-flash
[DEBUG] Database connected
[DEBUG] Routes initialized
[GIN-debug] Listening and serving HTTP on :8080
```

### **Adım 6: Frontend Başlat (Başka Terminal'de)**

```bash
# Proje kökü dizininde (smartcharge)
npm install
npm run dev
```

**Frontend:** `http://localhost:3000`  
**Backend:** `http://localhost:8080`

---

## 📁 Dosya Yapısı

```
smartcharge/
├── .env                                # Repo kökü (Next.js için)
│   ├── GEMINI_API_KEY=...
│   ├── API_URL=http://localhost:8080
│   └── NODE_ENV=development
│
└── smartcharge-api/
    └── .env                            # Backend için (go run okuyor)
        ├── GEMINI_API_KEY=...           # ← ZORUNLU
        ├── DATABASE_URL=postgres://...
        ├── JWT_SECRET=...
        └── PORT=8080
```

**Önemli:** `go run` çalıştırdığında, **`smartcharge-api/.env`** okunur, repo kökündeki `.env` değil!

---

## ✅ Kontrol Listesi

- [ ] `smartcharge-api/.env` dosyası var mı?
- [ ] `GEMINI_API_KEY=...` boş değil mi?
- [ ] `DATABASE_URL` doğru mu?
- [ ] PostgreSQL çalışıyor mu (`docker ps` veya `psql -U admin -d evcharge`)?
- [ ] Migrasyonlar uygulandı mı?
- [ ] `go run cmd/server/main.go` hata vermiyor mu?

---

## 🧪 Test

### **Backend API Test**

```bash
# Chat endpoint test
curl -X POST http://localhost:8080/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Merhaba"}' \
  2>&1 | jq .

# Beklenen:
# {
#   "success": true,
#   "data": {
#     "role": "bot",
#     "content": "Merhaba! Ben SmartCharge AI asistanı..."
#   }
# }
```

### **Frontend Test**

1. Browser: `http://localhost:3000`
2. ChatWidget'i aç (sağ alt)
3. "Bana istasyon öner" yaz
4. AI yanıt verdi mi?

---

## 🛠️ Sorun Çözümü

### **"GEMINI_API_KEY is required"**

```
[ERROR] GEMINI_API_KEY environment variable is required but not set!
panic: GEMINI_API_KEY is required for chat service
```

**Çözüm:**
1. `smartcharge-api/.env` var mı? → `cp .env.example .env`
2. `GEMINI_API_KEY=...` boş mu? → API key ekle: https://aistudio.google.com/app/apikey
3. `.env` dosyasını kaydet ve `go run` tekrar başlat

### **"database connection refused"**

```
failed to connect to database: ...
```

**Çözüm:**
1. PostgreSQL çalışıyor mu? → `docker compose up -d db`
2. `DATABASE_URL` doğru mu? → `smartcharge-api/.env` kontrol et
3. Migrasyonlar uygulandı mı? → Database boş mu?

### **"Port already in use :8080"**

```
listen tcp :8080: bind: An attempt was made to use a socket address...
```

**Çözüm:**
1. Başka bir `go run` çalışıyor mu? → `ps aux | grep go`
2. Docker port çakışması? → `docker ps` ile kontrol et
3. PORT'u değiştir: `PORT=8081 go run cmd/server/main.go`

### **Frontend'de "API connection error"**

**Kontrol et:**
1. Backend çalışıyor mu? → `curl http://localhost:8080/health`
2. Frontend `.env` doğru mu? → `API_URL=http://localhost:8080`
3. CORS hatası? → Browser console'da check et

---

## 🔄 İş Akışı (Development)

```bash
# Terminal 1: Backend
cd smartcharge-api
go run cmd/server/main.go

# Terminal 2: Frontend
cd smartcharge
npm run dev

# Terminal 3: Database (optional, eğer Docker container olmadıysa)
docker compose up db

# Terminal 4: Debugging
docker logs evcharge-db  # DB logs
tail -f /tmp/backend.log  # Custom logs
```

---

## 📝 Ortam Değişkenleri Referansı

### **Backend (`smartcharge-api/.env`)**

| Variable | Gerekli | Varsayılan | Açıklama |
|----------|---------|-----------|----------|
| `DATABASE_URL` | ✅ | - | PostgreSQL bağlantı string'i |
| `JWT_SECRET` | ✅ | - | JWT token imzası için secret |
| `PORT` | ❌ | 8080 | Backend sunucu portu |
| `GIN_MODE` | ❌ | debug | "debug" veya "release" |
| `FRONTEND_URL` | ❌ | http://localhost:3000 | Frontend URL (CORS) |
| `GEMINI_API_KEY` | ✅ | - | Google Gemini API key |
| `GEMINI_MODEL` | ❌ | gemini-1.5-flash | Gemini model adı |

### **Frontend (`.env` - repo kökü)**

| Variable | Gerekli | Varsayılan | Açıklama |
|----------|---------|-----------|----------|
| `API_URL` | ❌ | http://localhost:8080 | Backend API URL |
| `NODE_ENV` | ❌ | development | "development" veya "production" |

---

## 💡 İpuçları

### **Hızlı Restart**

```bash
# Backend'i kill et (Ctrl+C) ve restart et
# veya
pkill -f "go run"
go run cmd/server/main.go
```

### **Logs Debugging**

```bash
# Backend logs'ı grep ile filtrele
go run cmd/server/main.go 2>&1 | grep -E "Chat|Gemini|ERROR"

# Specific route logs
go run cmd/server/main.go 2>&1 | grep "/v1/chat"
```

### **Database Kontrol**

```bash
# Database'e bağlan
psql -U admin -d evcharge -h localhost

# Tüm tables'ı gör
\dt

# Belirli query çalıştır
SELECT COUNT(*) FROM users;
```

---

## 📞 Destek

Hata yaşıyorsanız:
1. Backend logs'ını kontrol et
2. Frontend console'unu kontrol et (F12)
3. `.env` dosyasını kontrol et
4. Database'i ping'le: `psql -U admin -d evcharge`
5. Bug report aç: https://github.com/anomalyco/opencode
