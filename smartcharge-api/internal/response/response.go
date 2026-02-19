package response

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// StandardResponse is the unified JSON envelope for all API responses.
type StandardResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   *ErrorBody  `json:"error,omitempty"`
	Meta    *Meta       `json:"meta,omitempty"`
}

// ErrorBody holds error details in the response.
type ErrorBody struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// Meta holds pagination metadata.
type Meta struct {
	Page       int `json:"page,omitempty"`
	PerPage    int `json:"perPage,omitempty"`
	TotalCount int `json:"totalCount,omitempty"`
}

// OK sends a 200 success response with data.
func OK(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, StandardResponse{
		Success: true,
		Data:    data,
	})
}

// Created sends a 201 response.
func Created(c *gin.Context, data interface{}) {
	c.JSON(http.StatusCreated, StandardResponse{
		Success: true,
		Data:    data,
	})
}

// Paginated sends a success response with pagination metadata.
func Paginated(c *gin.Context, data interface{}, meta Meta) {
	c.JSON(http.StatusOK, StandardResponse{
		Success: true,
		Data:    data,
		Meta:    &meta,
	})
}

// Err sends an error response and aborts the request.
func Err(c *gin.Context, statusCode int, code string, message string) {
	c.AbortWithStatusJSON(statusCode, StandardResponse{
		Success: false,
		Error: &ErrorBody{
			Code:    code,
			Message: message,
		},
	})
}
