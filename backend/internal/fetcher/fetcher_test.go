package fetcher

import (
	"context"
	"testing"
	"time"
)

func TestTimeoutFromContext_WithDeadline(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	timeout := timeoutFromContext(ctx, 15*time.Second)
	if timeout > 2*time.Second || timeout <= 0 {
		t.Fatalf("expected timeout to follow context deadline, got %v", timeout)
	}
}

func TestTimeoutFromContext_WithoutDeadline(t *testing.T) {
	fallback := 15 * time.Second
	timeout := timeoutFromContext(context.Background(), fallback)
	if timeout != fallback {
		t.Fatalf("expected fallback timeout %v, got %v", fallback, timeout)
	}
}
