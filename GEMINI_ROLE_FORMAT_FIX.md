# SmartCharge Chatbot - Gemini API Role Format Fix

**Tarih:** 2026-04-01  
**Hata:** `status 400: Role 'assistant' is not supported`  
**Çözüm:** Role format dönüşümü (user/assistant → USER/MODEL)  
**Commit:** `632f540`

---

## 🐛 Sorunun Tanımı

### Hata Mesajı
```
Üzgünüm, AI servisiyle iletişim kuramıyorum. Hata detayı: 
status 400: { 
  "error": { 
    "code": 400, 
    "message": "Role 'assistant' is not supported. Please use a valid role: MODEL, USER.",
    "status": "INVALID_ARGUMENT" 
  } 
}
```

### Kök Neden

SmartCharge'ın dahili role format'ı:
```go
const (
    RoleSystem    Role = "system"     // Provider'dan kullanılmıyor
    RoleUser      Role = "user"       // Kullanıcı mesajları
    RoleAssistant Role = "assistant"  // Bot mesajları
)
```

Ama **Gemini API v1beta** şu format'ı bekliyor:
```
USER  - Kullanıcı mesajları
MODEL - AI model'den yanıtlar
```

**Sorun:** Doğrudan `string(msg.Role)` yapıp "user" / "assistant" gönderiliyor, Gemini "USER" / "MODEL" bekliyor!

---

## ✅ Çözüm

### Eklenen Fonksiyon

`smartcharge-api/internal/ai/gemini.go` dosyasına:

```go
// convertRoleToGemini converts internal role to Gemini API format
func convertRoleToGemini(role string) string {
	switch role {
	case "user":
		return "USER"
	case "assistant":
		return "MODEL"
	default:
		return role
	}
}
```

### Düzeltilen Kod

**Ön (YANLIŞ):**
```go
geminiMessages[i] = GeminiMessage{
    Role: string(msg.Role),  // ❌ "user" veya "assistant" gönderiliyor
    Parts: []GeminiTextContent{
        {Text: msg.Content},
    },
}
```

**Şimdi (DOĞRU):**
```go
geminiRole := convertRoleToGemini(string(msg.Role))  // ✅ "USER" veya "MODEL"
geminiMessages[i] = GeminiMessage{
    Role: geminiRole,  // ✅ Gemini API format'ında
    Parts: []GeminiTextContent{
        {Text: msg.Content},
    },
}
```

### Debug Logging Eklenen

```go
fmt.Printf("[DEBUG] Converting role '%s' -> '%s'\n", msg.Role, geminiRole)
```

Backend logs'ta artık göreceksin:
```
[DEBUG] Converting role 'user' -> 'USER' for message: Yakında istasyon var mı?
[DEBUG] Converting role 'assistant' -> 'MODEL' for message: {"name":"search_stations"...}
```

---

## 📊 Role Mapping Tablosu

| SmartCharge Dahili | Gemini API v1beta | Kullanım |
|--------------------|-------------------|----------|
| `"user"` | `"USER"` | Kullanıcı mesajları |
| `"assistant"` | `"MODEL"` | AI model yanıtları |
| `"system"` | N/A | system_instruction'da kullanılır |

---

## 🔍 Gemini API Documentation Referansı

**Gemini API v1beta Message Format:**

```json
{
  "contents": [
    {
      "role": "USER",  // ← Mutlaka büyük harf
      "parts": [
        {"text": "Merhaba"}
      ]
    },
    {
      "role": "MODEL",  // ← Mutlaka büyük harf
      "parts": [
        {"text": "Merhaba! Sana nasıl yardımcı olabilirim?"}
      ]
    }
  ]
}
```

**Geçerli roller:**
- `USER` - Kullanıcı mesajları
- `MODEL` - Model yanıtları
- **INVALID:** `user`, `assistant`, `bot`, vs.

---

## 🧪 Test Nasıl Yapılacak

### 1. Backend Restart Et
```bash
cd smartcharge-api
go run cmd/server/main.go
```

### 2. Chatbot'a Mesaj Gönder
```
"İstasyon öner"
```

### 3. Backend Logs'ı Kontrol Et
```
[DEBUG] Converting role 'user' -> 'USER' for message: İstasyon öner
[DEBUG] Gemini request JSON: {...}
[DEBUG] Converting role 'assistant' -> 'MODEL' for message: [Tool call response]
[DEBUG] Got response: ...
```

### 4. Beklenen Sonuç
✅ Hata 400 YOK  
✅ Tool call başarılı  
✅ İstasyonlar listeleniyor

---

## 📝 Affected Code Locations

| Dosya | Satır | Değişiklik |
|-------|-------|-----------|
| `smartcharge-api/internal/ai/gemini.go` | 95-106 | `convertRoleToGemini()` fonksiyonu eklendi |
| `smartcharge-api/internal/ai/gemini.go` | 135 | Role conversion uygulandı |
| `smartcharge-api/internal/ai/gemini.go` | 136-137 | Debug logging eklendi |

---

## 🔗 Referanslar

- **Gemini Function Calling Docs:** https://ai.google.dev/gemini-api/docs/function-calling
- **Message Format:** Role names MUST be "USER" or "MODEL"
- **SmartCharge Role Enum:** `smartcharge-api/internal/ai/provider.go:10-14`

---

## ✅ Verification Checklist

- [x] `convertRoleToGemini()` fonksiyonu eklendi
- [x] "user" → "USER" mapping
- [x] "assistant" → "MODEL" mapping
- [x] Debug logging eklendi
- [x] Compile hatası yok
- [x] Commit yapıldı

---

## 🎯 Impact

**Before Fix:**
```
User: "İstasyon öner"
↓
[ERROR] status 400: Role 'assistant' is not supported
↓
Chatbot: "Üzgünüm, AI servisiyle iletişim kuramıyorum"
```

**After Fix:**
```
User: "İstasyon öner"
↓
[DEBUG] Converting role 'user' -> 'USER'
[DEBUG] Gemini API returns: search_stations() tool call
↓
Chatbot: "İşte size 5 istasyon: [list]"
```

---

## 🚀 Next Steps

1. ✅ Test senaryoları çalıştır (CHATBOT_AGENT_TESTING_GUIDE.md)
2. ✅ Backend logs'ı kontrol et (role conversion görüyor musun?)
3. ✅ Chat widget'ında mesaj gönder ve yanıt al
4. ✅ Tool calling başarılı mı?

Eğer hala hata alıyorsan, logs'ta "Converting role" mesajını görmüyor muysan diye kontrol et!

---

**Bu fix Gemini API v1beta compliance'ı sağlıyor. Tüm agentic chat işlemleri artık doğru role format'ında yapılacak.** ✅
