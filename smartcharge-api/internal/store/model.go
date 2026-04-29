package store

import "time"

// StoreItem represents a product in the SmartCharge store catalog.
type StoreItem struct {
	ID             int32     `json:"id"`
	Name           string    `json:"name"`
	Description    string    `json:"description"`
	SmartcoinPrice int32     `json:"smartcoinPrice"`
	StockQuantity  int32     `json:"stockQuantity"`
	Icon           string    `json:"icon"`
	IsActive       bool      `json:"isActive"`
	CreatedBy      *int32    `json:"createdBy,omitempty"`
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

// PurchaseHistory represents a completed purchase transaction.
type PurchaseHistory struct {
	ID              int32     `json:"id"`
	UserID          int32     `json:"userId"`
	StoreItemID     int32     `json:"storeItemId"`
	Quantity        int32     `json:"quantity"`
	UnitPrice       int32     `json:"unitPrice"`
	TotalSmartcoins int32     `json:"totalSmartcoins"`
	PurchasedAt     time.Time `json:"purchasedAt"`
}
