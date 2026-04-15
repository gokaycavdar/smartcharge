# SmartCoin Kupon Sistemi - Implementasyon Özeti

## 📋 Genel Bakış

SmartCharge platformunda kullanıcıların biriktirdikleri **SmartCoin**'leri şarj işlemlerinde indirim kuponlarına dönüştürebilecekleri yeni bir sistem implementasyon edilmiştir.

---

## 🏗️ Mimari

### Veritabanı Şeması

```sql
coupon_catalog (Kupon Kataloğu)
├─ id: SERIAL PRIMARY KEY
├─ name: VARCHAR(255) -- "%10 İndirim", "50 TL İndirim", vb.
├─ coin_cost: INT -- 500, 1000, 1500, 2500 SmartCoin
├─ discount_type: VARCHAR(50) -- "percentage" | "fixed"
├─ discount_value: FLOAT -- 10 (%), 50 (TL), 200 (TL), vb.
├─ icon: VARCHAR(10) -- Emoji: 🎟️, ✨, 💳, 💰, 🏆
├─ active: BOOLEAN DEFAULT true
└─ created_at, updated_at: TIMESTAMPTZ

user_coupons (Kullanıcı Kuponları)
├─ id: SERIAL PRIMARY KEY
├─ user_id: INT REFERENCES users(id)
├─ coupon_id: INT REFERENCES coupon_catalog(id)
├─ status: VARCHAR(50) -- "ACTIVE", "USED", "EXPIRED"
├─ code: VARCHAR(50) UNIQUE -- "SC-ABC123DEF456..." (QR code)
├─ used_at: TIMESTAMPTZ
├─ created_at: TIMESTAMPTZ DEFAULT NOW()
├─ expires_at: TIMESTAMPTZ -- NOW() + 90 gün
└─ Indexes: user_id, user_id+status, code
```

### Backend Endpoints

#### GET `/v1/coupons/list` (Authenticated)
Kullanıcının coin bakiyesini ve satın alınabilecek kuponları döndürür.

**Response:**
```json
{
  "success": true,
  "data": {
    "userCoins": 2500,
    "availableCoupons": [
      {
        "id": 1,
        "name": "%10 İndirim",
        "description": "Şarj işleminde %10 indirim",
        "coinCost": 500,
        "discountType": "percentage",
        "discountValue": 10,
        "icon": "🎟️",
        "canBuy": true
      },
      {
        "id": 2,
        "name": "50 TL İndirim",
        "coinCost": 1000,
        "discountType": "fixed",
        "discountValue": 50,
        "icon": "💳",
        "canBuy": true
      }
    ]
  }
}
```

#### POST `/v1/coupons/redeem` (Authenticated)
Kullanıcının belirtilen kuponu SmartCoin'lerle satın almasını işler. **ACID transaction** içinde çalışır.

**Request:**
```json
{
  "couponId": 1
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "userCoupon": {
      "id": 42,
      "couponId": 1,
      "name": "%10 İndirim",
      "discountType": "percentage",
      "discountValue": 10,
      "icon": "🎟️",
      "status": "ACTIVE",
      "code": "SC-ABCD1234EFGH5678",
      "expiresAt": "2026-07-01T23:59:59Z",
      "createdAt": "2026-04-01T12:00:00Z"
    },
    "remainingCoins": 2000,
    "message": "✅ %10 İndirim kuponu başarıyla elde edildi! 90 gün geçerli."
  }
}
```

**Response (Error - Insufficient Coins):**
```json
{
  "success": false,
  "error": {
    "code": "insufficient_coins",
    "message": "Not enough coins. Have 300, need 500"
  }
}
```

#### GET `/v1/coupons/active` (Authenticated)
Kullanıcının aktif, süresi geçmemiş kuponlarını döndürür.

---

## 🔒 Güvenlik: ACID Transaction Garantileri

### Race Condition Koruması

**Problem:** Aynı kullanıcı aynı anda 2 redeem isteği atarsa ne olur?
- **Eski davranış:** Her iki işlem de başarılı olurdu → Negative balance mümkün
- **Yeni davranış:** PostgreSQL transaction lock mekanizması ile çözüldü

**Implementasyon (Go Service):**

```go
// SERIALIZABLE isolation level + SELECT FOR UPDATE
tx, err := s.pool.BeginTx(ctx, pgx.TxOptions{
    IsoLevel: pgx.Serializable,
})

// Step 1: Lock user row
userBalance, err := qtx.GetUserCoinBalance(ctx, userID) // SELECT FOR UPDATE

// Step 2: Validate
if userBalance < coupon.CoinCost {
    tx.Rollback(ctx)
    return nil, ErrInsufficientCoins
}

// Step 3: Insert coupon
userCoupon, err := qtx.CreateUserCoupon(ctx, ...)

// Step 4: Deduct coins
remainingCoins, err := qtx.DeductUserCoins(ctx, userID, coupon.CoinCost)

// Step 5: Commit (atomic)
tx.Commit(ctx)
```

### Garantiler

| Senaryö | Sonuç |
|---------|-------|
| Race condition (2 simultaneous redeem) | 2. request blocks, waits for 1. to commit, then re-checks balance |
| Partial failure (coupon inserted, coins not deducted) | ROLLBACK → Atomicity guaranteed |
| User manually sets coin amount (via DB) | Still protected for future redeems |

---

## 🎨 Frontend Komponen Mimarisi

### Components

#### `CoinBalanceCard.tsx`
Kullanıcının güncel SmartCoin bakiyesini prominent card'da gösterir.
- Gradient background (amber → orange)
- Büyük font ile balance gösterimi
- Loading state desteği

#### `CouponCard.tsx`
Tek bir kuponu grid'de gösterir.
- Emoji icon + discount display
- Coin cost gösterimi
- "Dönüştür" button (disabled if insufficient coins)
- Loading spinner during redemption
- Error message if canBuy=false

#### `app/(driver)/driver/coupons/page.tsx`
Ana coupon sayfası.
- Tab açılır (standalone page)
- Coin balance card + Grid of coupons
- Toast notifications (success/error)
- Optimistic UI updates

---

## 🚀 Kullanım Akışı

### 1. Frontend Başlatma
```bash
npm run dev
```

### 2. Backend Başlatma (Docker)
```bash
docker compose up -d
```
- Migration 000006 otomatik çalışır
- `coupon_catalog` tabloya seed data yerleştirilir (5 kupon)

### 3. Driver Dashboard'dan Erişim
1. Login: `driver@test.com` / `password`
2. `/driver/wallet` → Sol sidebar'da "Kupon Merkezi" link'i ya da
3. Doğrudan: `/driver/coupons` sayfasına git

### 4. Kupon Dönüştürme
1. "Dönüştür" button'una tıkla
2. ACID transaction çalışır:
   - User locked
   - Balance checked
   - Kupon created
   - Coins deducted
   - Commit
3. Toast notification gösterilir
4. UI güncellenir (coins azalır, canBuy flags updated)

---

## 🧪 Test Senaryoları

### Scenario 1: Successful Redemption
```
Initial: 2500 coins
Action: Redeem "%10 İndirim" (500 coins)
Result: 2000 coins remaining, kupon ACTIVE status, 90 gün expire date
```

### Scenario 2: Insufficient Coins
```
Initial: 300 coins
Action: Redeem "50 TL İndirim" (1000 coins)
Result: HTTP 409, message: "Not enough coins. Have 300, need 1000"
```

### Scenario 3: Simultaneous Redemption (Race Condition Test)
```
Concurrent requests from 2 clients:
- Client A: POST /redeem {coupon_id: 1}
- Client B: POST /redeem {coupon_id: 1}
Result: A succeeds, B waits on lock, then A's balance updated,
        B re-checks: "Not enough coins"
```

---

## 📦 Deployment (Docker)

### Dockerfile Changes
- SQLC queries generate'i edildi (migration → `coupon_catalog` seed)
- Go handler'lar routing'e eklendi
- Frontend component'ler added

### Build & Run
```bash
# Build images
docker compose build

# Start services
docker compose up -d

# Logs
docker compose logs -f api
docker compose logs -f postgres
```

---

## 🔄 Future Enhancements

1. **Coupon Kullanma** - Reservation complete işlemi sırasında coupon automatically apply
2. **Coupon History** - Kullanılmış kuponlar + expiration tracking
3. **Admin Panel** - Operator'lar coupon_catalog'u edit edebilir
4. **Notification** - Coupon expiring in 7 days → send alert
5. **Analytics** - Most redeemed coupons dashboard

---

## 📝 SQL Seed Data (000006_coupon_system.up.sql)

```sql
INSERT INTO coupon_catalog (name, coin_cost, discount_type, discount_value, icon)
VALUES
    ('%10 İndirim', 500, 'percentage', 10, '🎟️'),
    ('%20 İndirim', 1000, 'percentage', 20, '✨'),
    ('50 TL İndirim', 800, 'fixed', 50, '💳'),
    ('100 TL İndirim', 1500, 'fixed', 100, '💰'),
    ('200 TL İndirim', 2500, 'fixed', 200, '🏆');
```

---

## 🛠️ Teknik Stack

- **Backend:** Go 1.25 + Gin + SQLC + pgx/v5 (Connection Pooling + Transactions)
- **Frontend:** Next.js 16 + React 19 + TypeScript + TailwindCSS
- **Database:** PostgreSQL 15 (Docker)
- **Infrastructure:** Docker Compose, GitHub Actions CI/CD

---

## ✅ Checklist

- [x] Migration files created (000006_coupon_system.up/down.sql)
- [x] SQLC queries written (db/queries/coupons.sql)
- [x] Go DTOs created (internal/coupon/dto.go)
- [x] Service layer with ACID transaction (internal/coupon/service.go)
- [x] HTTP handlers (internal/coupon/handler.go)
- [x] Routes registered (cmd/server/main.go)
- [x] Frontend components (CoinBalanceCard, CouponCard)
- [x] Frontend page (app/(driver)/driver/coupons/page.tsx)
- [x] Documentation (this file)
- [ ] Docker rebuild & test
- [ ] Mobile API documentation update (future)

---

## 📞 Support

Sorunlar için SmartCharge team'e ulaşın veya GitHub issue açın.
