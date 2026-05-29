package errors

import "testing"

func TestAppErrorConstructors(t *testing.T) {
	if ErrUnauthorized.Error() != "Authentication required" {
		t.Fatalf("expected sentinel error message, got %q", ErrUnauthorized.Error())
	}

	validation := NewValidationError("bad request")
	if validation.StatusCode != 400 || validation.Code != "VALIDATION_ERROR" {
		t.Fatalf("unexpected validation error: %+v", validation)
	}

	notFound := NewNotFoundError("Station")
	if notFound.Message != "Station not found" {
		t.Fatalf("unexpected not found message: %s", notFound.Message)
	}

	conflict := NewConflictError("dup")
	if conflict.StatusCode != 409 {
		t.Fatalf("unexpected conflict status: %+v", conflict)
	}

	forbidden := NewForbiddenError("nope")
	if forbidden.StatusCode != 403 {
		t.Fatalf("unexpected forbidden status: %+v", forbidden)
	}
}
