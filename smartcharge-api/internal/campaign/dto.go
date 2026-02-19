package campaign

// --- Request DTOs ---

// CreateCampaignRequest is the request body for POST /v1/campaigns.
type CreateCampaignRequest struct {
	Title          string  `json:"title" binding:"required"`
	Description    string  `json:"description"`
	Status         string  `json:"status"`
	Target         string  `json:"target"`
	Discount       string  `json:"discount"`
	EndDate        *string `json:"endDate,omitempty"`
	StationID      *int32  `json:"stationId,omitempty"`
	CoinReward     *int32  `json:"coinReward,omitempty"`
	TargetBadgeIDs []int32 `json:"targetBadgeIds,omitempty"`
}

// UpdateCampaignRequest is the request body for PUT /v1/campaigns/:id.
type UpdateCampaignRequest struct {
	Title          string  `json:"title" binding:"required"`
	Description    string  `json:"description"`
	Status         string  `json:"status"`
	Target         string  `json:"target"`
	Discount       string  `json:"discount"`
	EndDate        *string `json:"endDate,omitempty"`
	StationID      *int32  `json:"stationId,omitempty"`
	CoinReward     *int32  `json:"coinReward,omitempty"`
	TargetBadgeIDs []int32 `json:"targetBadgeIds,omitempty"`
}

// --- Response DTOs ---

// BadgeResponse is a lightweight badge DTO used inside campaign responses.
type BadgeResponse struct {
	ID          int32  `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Icon        string `json:"icon"`
}

// ForUserCampaignResponse is the response DTO for campaigns/for-user (stub).
type ForUserCampaignResponse struct {
	ID            int32           `json:"id"`
	Title         string          `json:"title"`
	Description   string          `json:"description"`
	Discount      string          `json:"discount"`
	CoinReward    int32           `json:"coinReward"`
	EndDate       *string         `json:"endDate"`
	TargetBadges  []BadgeResponse `json:"targetBadges"`
	MatchedBadges []BadgeResponse `json:"matchedBadges"`
}

// CampaignResponse is the response DTO for a campaign.
type CampaignResponse struct {
	ID           int32           `json:"id"`
	Title        string          `json:"title"`
	Description  string          `json:"description"`
	Status       string          `json:"status"`
	Target       string          `json:"target"`
	Discount     string          `json:"discount"`
	EndDate      *string         `json:"endDate"`
	OwnerID      int32           `json:"ownerId"`
	StationID    *int32          `json:"stationId"`
	StationName  *string         `json:"stationName,omitempty"`
	CoinReward   int32           `json:"coinReward"`
	CreatedAt    string          `json:"createdAt"`
	UpdatedAt    string          `json:"updatedAt"`
	TargetBadges []BadgeResponse `json:"targetBadges"`
}
