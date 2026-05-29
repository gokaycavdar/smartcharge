package response

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestOKCreatedPaginatedAndErr(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("ok", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		OK(c, gin.H{"x": 1})
		if w.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d", w.Code)
		}
	})

	t.Run("created", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		Created(c, gin.H{"id": 1})
		if w.Code != http.StatusCreated {
			t.Fatalf("expected 201, got %d", w.Code)
		}
	})

	t.Run("paginated", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		Paginated(c, []int{1, 2}, Meta{Page: 1, PerPage: 2, TotalCount: 10})
		if w.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d", w.Code)
		}
	})

	t.Run("err", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		Err(c, http.StatusBadRequest, "BAD", "broken")
		if w.Code != http.StatusBadRequest {
			t.Fatalf("expected 400, got %d", w.Code)
		}
		if !c.IsAborted() {
			t.Fatal("expected context to be aborted")
		}
	})
}
