package user

// --- Request DTOs ---

// UpdateProfileRequest is the request body for PUT /v1/users/:id.
type UpdateProfileRequest struct {
	Name  string `json:"name" binding:"required"`
	Email string `json:"email" binding:"required,email"`
}

// --- Response DTOs ---

// ProfileResponse is the full user profile with badges, stations, and reservations.
type ProfileResponse struct {
	ID           int32             `json:"id"`
	Name         string            `json:"name"`
	Email        string            `json:"email"`
	Role         string            `json:"role"`
	Coins        int32             `json:"coins"`
	Co2Saved     float64           `json:"co2Saved"`
	XP           int32             `json:"xp"`
	Badges       []BadgeItem       `json:"badges"`
	Stations     []StationItem     `json:"stations"`
	Reservations []ReservationItem `json:"reservations"`
}

// BadgeItem is a minimal badge for the profile.
type BadgeItem struct {
	ID          int32  `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Icon        string `json:"icon"`
}

// StationItem is a minimal station for the profile.
type StationItem struct {
	ID    int32   `json:"id"`
	Name  string  `json:"name"`
	Price float64 `json:"price"`
	Lat   float64 `json:"lat"`
	Lng   float64 `json:"lng"`
}

// ReservationItem is a reservation with station info for the profile.
type ReservationItem struct {
	ID          int32              `json:"id"`
	Date        string             `json:"date"`
	Hour        string             `json:"hour"`
	IsGreen     bool               `json:"isGreen"`
	EarnedCoins int32              `json:"earnedCoins"`
	Status      string             `json:"status"`
	Station     ReservationStation `json:"station"`
}

// ReservationStation is the station info nested in a reservation.
type ReservationStation struct {
	ID    int32   `json:"id"`
	Name  string  `json:"name"`
	Price float64 `json:"price"`
}

// LeaderboardEntry is a single entry in the leaderboard.
type LeaderboardEntry struct {
	ID   int32  `json:"id"`
	Name string `json:"name"`
	XP   int32  `json:"xp"`
}

// UserBasicResponse is the response for update operations.
type UserBasicResponse struct {
	ID       int32   `json:"id"`
	Name     string  `json:"name"`
	Email    string  `json:"email"`
	Role     string  `json:"role"`
	Coins    int32   `json:"coins"`
	Co2Saved float64 `json:"co2Saved"`
	XP       int32   `json:"xp"`
}
