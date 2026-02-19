package badge

import (
	"context"

	"smartcharge-api/db/generated"
	apperrors "smartcharge-api/internal/errors"
)

// Service handles badge business logic.
type Service struct {
	queries *generated.Queries
}

// NewService creates a new badge service.
func NewService(queries *generated.Queries) *Service {
	return &Service{queries: queries}
}

// BadgeResponse is the response DTO for a badge.
type BadgeResponse struct {
	ID          int32  `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Icon        string `json:"icon"`
}

// List returns all badges sorted by name ASC.
func (s *Service) List(ctx context.Context) ([]BadgeResponse, error) {
	badges, err := s.queries.ListBadges(ctx)
	if err != nil {
		return nil, apperrors.ErrInternal
	}

	result := make([]BadgeResponse, len(badges))
	for i, b := range badges {
		result[i] = BadgeResponse{
			ID:          b.ID,
			Name:        b.Name,
			Description: b.Description,
			Icon:        b.Icon,
		}
	}
	return result, nil
}
