# SmartCharge Chatbot - Sorun Çözüm Rehberi

## 🚨 Yaşadığınız Sorun

```
[ERROR] GEMINI_API_KEY environment variable is required but not set!
panic: GEMINI_API_KEY is required for chat service
```

---

## 🔍 Sorunun Nedeni

### **Eski Yapı (Ollama Fallback)**
```go
// service.go (eski)
if cfg.GeminiAPIKey != "" {
    geminiProvider = ai.NewGeminiProvider(cfg.GeminiAPIKey, cfg.GeminiModel)
    useAgentic = true
} else {
    fmt.Println("Using Ollama fallback...")
}
```
- Gemini key yoksa Ollama'ya fallback yapıyordu
- Bu yüzden hata sessiz geçiliyordu

### **Yeni Yapı (Gemini-Only)**
```go
// service.go (yeni)
if cfg.GeminiAPIKey == "" {
    fmt.Println("[ERROR] GEMINI_API_KEY environment variable is required but not set!")
    panic("GEMINI_API_KEY is required for chat service")
}
geminiProvider := ai.NewGeminiProvider(cfg.GeminiAPIKey, cfg.GeminiModel)
```
- Gemini key **zorunlu**
- Key yoksa immediately panic yapıyor
- Bu, sorunları hemen ortaya çıkarıyor ✅

---

## ⚙️ Ortam Değişkenleri (Environment Variables) Akışı

```
┌─────────────────────────────────────────────────┐
│  Host Machine (.env file)                       │
│  GEMINI_API_KEY=AIzaSyD21i-xdGd_g393tFdI-...   │
└──────────────────┬──────────────────────────────┘
                   │
        docker-compose.yml referansı
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│  docker-compose.yml (services.api.environment)  │
│  GEMINI_API_KEY: ${GEMINI_API_KEY}              │
└──────────────────┬──────────────────────────────┘
                   │
          Docker variable substitution
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│  Container Process ($ENV vars)                  │
│  GEMINI_API_KEY=AIzaSyD21i-xdGd_g393tFdI-...   │
│                                                  │
│  Go code: os.Getenv("GEMINI_API_KEY")           │
│  ↓                                              │
│  config.go: getEnv("GEMINI_API_KEY", "")       │
│  ↓                                              │
│  service.go: if cfg.GeminiAPIKey == "" {...}  │
└─────────────────────────────────────────────────┘
```

### **Eski (Hatalı) Syntaxta**
```yaml
GEMINI_API_KEY: ${GEMINI_API_KEY:-}
                 └── Bu :- syntax'ı:
                     - Eğer variable SET ise değerini kullan
                     - Eğer variable EMPTY ise boş string döndür
```

Sonuç: Container'da `GEMINI_API_KEY=""` (empty string) olurdu

### **Yeni (Doğru) Syntaxta**
```yaml
GEMINI_API_KEY: ${GEMINI_API_KEY}
                 └── Bu syntaxta:
                     - Değeri exact olarak pass et
                     - Eğer host'da SET değilse container'da da empty olur
```

Sonuç: Container'da `.env` dosyasındaki exact value geçer

---

## 🛠️ Çözüm Adımları

### **Adım 1: .env Dosyasını Kontrol Et**

```bash
cat .env
# Output:
# GEMINI_API_KEY=AIzaSyD21i-xdGd_g393tFdI-H0oK3rqayhH0Ro
# GEMINI_MODEL=gemini-1.5-flash
```

✅ API key var mı? Boş mu?

### **Adım 2: docker-compose.yml Güncellemesi (Zaten Yaptık)**

```yaml
# ✅ Doğru (commit'te var)
GEMINI_API_KEY: ${GEMINI_API_KEY}
```

Eğer hala eski hali varsa:
```yaml
# ❌ Hatalı (ben zaten düzelttim)
GEMINI_API_KEY: ${GEMINI_API_KEY:-}
```

### **Adım 3: Docker Containers'ı Yeniden Başlat**

```bash
# Eski containers'ı durdur ve sil
docker compose down

# API image'ı temiz build et
docker compose build api --no-cache

# Containers'ı start et
docker compose up -d

# Logs'ta Gemini başladığını gör
docker logs -f evcharge-api 2>&1 | grep -i "gemini\|error"
```

Beklenen çıkış:
```
[DEBUG] Initializing Gemini provider with model: gemini-1.5-flash
```

### **Adım 4: Frontend Test Et**

1. Browser açı: `http://localhost:3000`
2. Sağ alt köşedeki ChatWidget butonuna tıkla
3. "Bana istasyon öner" yaz ve Enter
4. **Beklenen sonuçlar:**
   - ✅ AI yanıt verdi → Chatbot çalışıyor! 🎉
   - ❌ "API error 401: invalid API key" → Gemini API key'i invalid
   - ❌ "API error 429: rate limit exceeded" → Google API limiti aşıldı (wait 1-2 dakika)
   - ❌ Hala generic "bağlantı kuramıyorum" → Backend restart gerekmeyebilir, cache clear et

---

## 🧪 Hata Türlerine Göre Çözüm

| Hata | Nedeni | Çözüm |
|------|--------|-------|
| **"required but not set"** | `.env`'de key yok | `.env` dosyasına key ekle |
| **"API error 401"** | Invalid API key | https://aistudio.google.com/app/apikey'den yeni key al |
| **"API error 429"** | Rate limit | 1-2 dakika bekle, retry et |
| **"API error 403"** | API enable değil | Google Cloud Console'da Gemini API'yi enable et |
| **"timeout"** | Network/Firewall | ISP engeli, VPN dene |
| **"no candidates in response"** | Gemini API issue | API downtime, retry et |

---

## 📋 Kontrol Listesi

### **Before Starting**
- [ ] `.env` dosyasında `GEMINI_API_KEY` var mı? (empty değil mi?)
- [ ] `docker-compose.yml` satır 31: `${GEMINI_API_KEY}` (trailing `:-` yok mi?)
- [ ] İnternet bağlantısı var mı?
- [ ] Google Gemini API'ye erişim var mı?

### **After Restart**
- [ ] `docker compose down` çalıştırdı mı?
- [ ] `docker compose build api --no-cache` çalıştırdı mı?
- [ ] `docker compose up -d` çalıştırdı mı?
- [ ] Backend logs'ta "Initializing Gemini" görüyor mu?
- [ ] Frontend chatbot test mesaj gönderebiliyor mu?

### **Sonuç**
- [ ] Chatbot yanıt veriyor: ✅ **BAŞARILI**
- [ ] Spesifik hata görmüyor, generic mesaj: Browser cache'i temizle + refresh
- [ ] Hata devam ediyor: Logs'u screenshot al ve sonra analiz et

---

## 💡 İleri Düzey Debugging

### **Backend Process'inde Environment Variables'ı Gör**

```bash
docker compose exec api printenv | grep GEMINI
# Output:
# GEMINI_API_KEY=AIzaSyD21i-xdGd_g393tFdI-H0oK3rqayhH0Ro
# GEMINI_MODEL=gemini-1.5-flash
```

### **Config'in Ne Okuduğunu Gör**

Go code'unda temporary log ekle:
```go
// config.go
fmt.Printf("[DEBUG] Config loaded: GeminiAPIKey=%s (len=%d)\n", 
    cfg.GeminiAPIKey, len(cfg.GeminiAPIKey))
```

### **Direct API Call Test**

```bash
# Token'sız request
curl -X POST http://localhost:8080/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Merhaba"}' \
  2>&1 | jq .

# Bearer token ile (auth gerekirse)
curl -X POST http://localhost:8080/v1/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"message": "Merhaba"}' \
  2>&1 | jq .
```

---

## 📞 Hala Sorun Yaşıyorsanız

1. **Backend logs**'ı çek:
   ```bash
   docker logs evcharge-api > backend_logs.txt
   ```

2. **Frontend console**'ı (F12) screenshot'ını çek

3. **docker-compose.yml** satır 31'i kontrol et

4. **.env** file'ında `GEMINI_API_KEY` var mı kontrol et

5. Bir bug raporu aç: https://github.com/anomalyco/opencode
