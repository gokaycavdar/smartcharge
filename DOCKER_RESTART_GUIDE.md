# Docker Tekrar Başlatma Rehberi

## ⚠️ Problem
```
[ERROR] GEMINI_API_KEY environment variable is required but not set!
panic: GEMINI_API_KEY is required for chat service
```

## ✅ Çözüm

Docker Compose'u tekrar başlatın:

```bash
# 1. Containers'ı durdur ve sil
docker compose down

# 2. API image'ı rebuild et (yeni config'i alması için)
docker compose build api --no-cache

# 3. Containers'ı start et
docker compose up -d

# 4. Backend logs'ı kontrol et (Gemini başlattığını gör)
docker logs -f evcharge-api 2>&1 | grep -E "DEBUG|ERROR|Chat"
```

Beklenen çıkış:
```
[DEBUG] Initializing Gemini provider with model: gemini-1.5-flash
[DEBUG] Chat request: userID=1, message='...'
[DEBUG] Using Gemini API for agentic chat
```

---

## 🔍 Ne Değişti?

**docker-compose.yml satır 31:**

```yaml
# Eski (hatalı)
GEMINI_API_KEY: ${GEMINI_API_KEY:-}
# ^^ Bu syntaxta eğer variable boş ise empty string dönüyor!

# Yeni (doğru)
GEMINI_API_KEY: ${GEMINI_API_KEY}
# ^^ Bu syntaxta .env dosyasından exact value okunuyor
```

---

## 🧪 Çalışıyor mu Test Et

### **Backend Check**
```bash
docker logs evcharge-api 2>&1 | grep "Initializing Gemini"
# Çıkısı: [DEBUG] Initializing Gemini provider with model: gemini-1.5-flash
```

### **Frontend Check**
1. Browser: `http://localhost:3000`
2. ChatWidget'i aç (sağ alt)
3. "Bana istasyon öner" yaz
4. **Beklenen:** AI yanıt veya spesifik hata mesajı
5. **Hatalı:** "Üzgünüm, şu an bağlantı kuramıyorum"

### **API Direct Test**
```bash
curl -X POST http://localhost:8080/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Merhaba"}' \
  2>&1 | jq .

# Beklenen çıkış:
# {
#   "success": true,
#   "data": {
#     "role": "bot",
#     "content": "Merhaba! Ben SmartCharge AI asistanı..."
#   }
# }
```

---

## 📝 Kontrol Listesi

- [ ] `docker compose down` çalıştırdı
- [ ] `docker compose build api --no-cache` çalıştırdı
- [ ] `docker compose up -d` çalıştırdı
- [ ] Backend logs'ta "Initializing Gemini" mesajı gördü
- [ ] Frontend ChatWidget'ten test mesaj gönderdi
- [ ] AI yanıt verdi veya hata mesajı görüldü

Tamamlanırsa ✅ chatbot çalışacak!
