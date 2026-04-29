package store

// CreateStoreItemRequest is request body for creating a store item.
type CreateStoreItemRequest struct {
	Name           string `json:"name" binding:"required"`
	Description    string `json:"description"`
	SmartcoinPrice int32  `json:"smartcoinPrice" binding:"required,min=1"`
	StockQuantity  int32  `json:"stockQuantity" binding:"required,min=0"`
	Icon           string `json:"icon"`
	IsActive       *bool  `json:"isActive"`
}

// UpdateStoreItemRequest updates item pricing and stock values.
type UpdateStoreItemRequest struct {
	SmartcoinPrice int32 `json:"smartcoinPrice" binding:"required,min=1"`
	StockQuantity  int32 `json:"stockQuantity" binding:"required,min=0"`
}

// PurchaseItemRequest is request body for purchasing a store item.
type PurchaseItemRequest struct {
	StoreItemID int32 `json:"storeItemId" binding:"required,min=1"`
	Quantity    int32 `json:"quantity" binding:"omitempty,min=1"`
}

// StoreCatalogItem is an item in user-facing store catalog.
type StoreCatalogItem struct {
	ID             int32  `json:"id"`
	Name           string `json:"name"`
	Description    string `json:"description"`
	SmartcoinPrice int32  `json:"smartcoinPrice"`
	StockQuantity  int32  `json:"stockQuantity"`
	Icon           string `json:"icon"`
	CanBuy         bool   `json:"canBuy"`
}

// StoreCatalogResponse wraps active items with current user coin balance.
type StoreCatalogResponse struct {
	UserCoins int32              `json:"userCoins"`
	Items     []StoreCatalogItem `json:"items"`
}

// PurchaseItemResponse returns purchase result and updated balances.
type PurchaseItemResponse struct {
	Purchase       PurchaseHistory `json:"purchase"`
	RemainingCoins int32           `json:"remainingCoins"`
	RemainingStock int32           `json:"remainingStock"`
	Message        string          `json:"message"`
}
