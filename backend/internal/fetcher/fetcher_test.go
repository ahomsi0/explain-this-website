package fetcher

import (
	"bytes"
	"compress/gzip"
	"compress/zlib"
	"context"
	"io"
	"net/http"
	"strings"
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

func TestReadBodySupportsCompression(t *testing.T) {
	const payload = "compressed page content"

	for _, tc := range []struct {
		name   string
		encode func(*bytes.Buffer) error
	}{
		{name: "gzip", encode: func(buf *bytes.Buffer) error {
			w := gzip.NewWriter(buf)
			if _, err := w.Write([]byte(payload)); err != nil {
				return err
			}
			return w.Close()
		}},
		{name: "deflate", encode: func(buf *bytes.Buffer) error {
			w := zlib.NewWriter(buf)
			if _, err := w.Write([]byte(payload)); err != nil {
				return err
			}
			return w.Close()
		}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			var encoded bytes.Buffer
			if err := tc.encode(&encoded); err != nil {
				t.Fatalf("encode() error = %v", err)
			}
			resp := &http.Response{
				Body:   io.NopCloser(bytes.NewReader(encoded.Bytes())),
				Header: http.Header{"Content-Encoding": []string{tc.name}},
			}
			got, err := readBody(resp, int64(len(payload)))
			if err != nil {
				t.Fatalf("readBody() error = %v", err)
			}
			if got != payload {
				t.Fatalf("readBody() = %q, want %q", got, payload)
			}
		})
	}
}

func TestReadBodyRejectsOversizedResponse(t *testing.T) {
	resp := &http.Response{
		Body:   io.NopCloser(strings.NewReader("0123456789")),
		Header: make(http.Header),
	}
	if _, err := readBody(resp, 5); err == nil {
		t.Fatal("expected oversized response to be rejected")
	}
}
