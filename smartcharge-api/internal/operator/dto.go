package operator

// --- Request DTOs ---

// CreateStationRequest is the request body for POST /v1/company/my-stations.
type CreateStationRequest struct {
	Name    string  `json:"name" binding:"required"`
	Lat     float64 `json:"lat" binding:"required"`
	Lng     float64 `json:"lng" binding:"required"`
	Address *string `json:"address,omitempty"`
	Price   float64 `json:"price" binding:"required"`
}

// UpdateStationRequest is the request body for PUT /v1/company/my-stations/:id.
type UpdateStationRequest struct {
	Name    *string  `json:"name,omitempty"`
	Lat     *float64 `json:"lat,omitempty"`
	Lng     *float64 `json:"lng,omitempty"`
	Address *string  `json:"address,omitempty"`
	Price   *float64 `json:"price,omitempty"`
}

// --- Response DTOs ---

// StationSummary is a single station with computed stats for the operator dashboard.
type StationSummary struct {
	ID                    int32   `json:"id"`
	Name                  string  `json:"name"`
	Lat                   float64 `json:"lat"`
	Lng                   float64 `json:"lng"`
	Address               *string `json:"address"`
	Price                 float64 `json:"price"`
	Load                  int32   `json:"load"`
	Status                string  `json:"status"`
	ReservationCount      int32   `json:"reservationCount"`
	GreenReservationCount int32   `json:"greenReservationCount"`
	Revenue               float64 `json:"revenue"`
}

// AggregateStats are the total stats across all operator stations.
type AggregateStats struct {
	TotalRevenue      float64 `json:"totalRevenue"`
	TotalReservations int32   `json:"totalReservations"`
	GreenShare        float64 `json:"greenShare"`
	AvgLoad           int32   `json:"avgLoad"`
}

// MyStationsResponse is the response for GET /v1/company/my-stations.
type MyStationsResponse struct {
	Stats    AggregateStats   `json:"stats"`
	Stations []StationSummary `json:"stations"`
}

// StationResponse is a basic station response for create/update.
type StationResponse struct {
	ID      int32   `json:"id"`
	Name    string  `json:"name"`
	Lat     float64 `json:"lat"`
	Lng     float64 `json:"lng"`
	Address *string `json:"address"`
	Price   float64 `json:"price"`
	Density int32   `json:"density"`
}
