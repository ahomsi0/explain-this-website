package llm

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"

	"github.com/ahomsi/explain-website/internal/model"
)

// setEndpoint points the client at a test server for the duration of the test.
func setEndpoint(t *testing.T, url string) {
	t.Helper()
	old := groqChatEndpoint
	groqChatEndpoint = url
	t.Cleanup(func() { groqChatEndpoint = old })
}

func testResult() *model.AnalysisResult {
	return &model.AnalysisResult{URL: "https://example.com"}
}

// chatResponseOK builds a minimal successful Groq chat-completions body.
func chatResponseOK(content string) string {
	return `{"choices":[{"message":{"role":"assistant","content":` + jsonQuote(content) + `}}]}`
}

func jsonQuote(s string) string {
	b, _ := json.Marshal(s)
	return string(b)
}

// recordedCall captures what the client sent for one request.
type recordedCall struct {
	Model           string `json:"model"`
	ReasoningEffort string `json:"reasoning_effort"`
}

func TestSummariseSuccess(t *testing.T) {
	var calls []recordedCall
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req recordedCall
		_ = json.NewDecoder(r.Body).Decode(&req)
		calls = append(calls, req)
		w.Write([]byte(chatResponseOK("a fine summary")))
	}))
	defer srv.Close()
	setEndpoint(t, srv.URL)

	c := New("key", defaultModel, "")
	out, err := c.Summarise(context.Background(), testResult())
	if err != nil {
		t.Fatalf("Summarise: %v", err)
	}
	if out != "a fine summary" {
		t.Fatalf("content = %q", out)
	}
	if len(calls) != 1 || calls[0].Model != defaultModel {
		t.Fatalf("calls = %+v, want single %s call", calls, defaultModel)
	}
}

func TestSummariseFallsBackOnModelNotFound(t *testing.T) {
	var mu sync.Mutex
	var calls []recordedCall
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req recordedCall
		_ = json.NewDecoder(r.Body).Decode(&req)
		mu.Lock()
		calls = append(calls, req)
		n := len(calls)
		mu.Unlock()
		if n == 1 {
			w.WriteHeader(http.StatusNotFound)
			w.Write([]byte(`{"error":{"message":"The model ` + req.Model + ` does not exist or you do not have access to it.","type":"invalid_request_error","code":"model_not_found"}}`))
			return
		}
		w.Write([]byte(chatResponseOK("fallback summary")))
	}))
	defer srv.Close()
	setEndpoint(t, srv.URL)

	c := New("key", "llama-3.3-70b-versatile", "")
	out, err := c.Summarise(context.Background(), testResult())
	if err != nil {
		t.Fatalf("Summarise: %v", err)
	}
	if out != "fallback summary" {
		t.Fatalf("content = %q", out)
	}
	mu.Lock()
	defer mu.Unlock()
	if len(calls) != 2 {
		t.Fatalf("made %d calls, want 2", len(calls))
	}
	if calls[0].Model != "llama-3.3-70b-versatile" || calls[1].Model != defaultFallbackModel {
		t.Fatalf("models = [%s, %s], want primary then fallback", calls[0].Model, calls[1].Model)
	}
}

func TestSummariseFallsBackOnRateLimit(t *testing.T) {
	n := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		n++
		if n == 1 {
			w.WriteHeader(http.StatusTooManyRequests)
			w.Write([]byte(`{"error":{"message":"Rate limit reached for model","type":"rate_limit_error"}}`))
			return
		}
		w.Write([]byte(chatResponseOK("ok")))
	}))
	defer srv.Close()
	setEndpoint(t, srv.URL)

	c := New("key", defaultModel, "")
	if _, err := c.Summarise(context.Background(), testResult()); err != nil {
		t.Fatalf("Summarise: %v", err)
	}
	if n != 2 {
		t.Fatalf("calls = %d, want 2 (fallback after 429)", n)
	}
}

func TestSummariseNoFallbackOnServerError(t *testing.T) {
	n := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		n++
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error":{"message":"internal error"}}`))
	}))
	defer srv.Close()
	setEndpoint(t, srv.URL)

	c := New("key", defaultModel, "")
	_, err := c.Summarise(context.Background(), testResult())
	if err == nil {
		t.Fatal("want error")
	}
	if n != 1 {
		t.Fatalf("calls = %d, want 1 (500 is not model-specific)", n)
	}
}

func TestSummariseBothModelsFail(t *testing.T) {
	n := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		n++
		w.WriteHeader(http.StatusNotFound)
		w.Write([]byte(`{"error":{"message":"model not found","code":"model_not_found"}}`))
	}))
	defer srv.Close()
	setEndpoint(t, srv.URL)

	c := New("key", defaultModel, "")
	_, err := c.Summarise(context.Background(), testResult())
	if err == nil {
		t.Fatal("want error")
	}
	if n != 2 {
		t.Fatalf("calls = %d, want 2 (primary + one fallback)", n)
	}
	if !strings.Contains(err.Error(), "HTTP 404") {
		t.Fatalf("err = %v, want HTTP 404 detail", err)
	}
}

func TestSummariseEmptyResponse(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Reasoning models can exhaust max_tokens on reasoning: 200 OK but no content.
		w.Write([]byte(`{"choices":[{"message":{"role":"assistant","content":""}}]}`))
	}))
	defer srv.Close()
	setEndpoint(t, srv.URL)

	c := New("key", defaultModel, "")
	if _, err := c.Summarise(context.Background(), testResult()); err == nil || !strings.Contains(err.Error(), "empty response") {
		t.Fatalf("err = %v, want empty response error", err)
	}
}

func TestReasoningEffortOnlyForReasoningModels(t *testing.T) {
	var mu sync.Mutex
	var calls []recordedCall
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req recordedCall
		_ = json.NewDecoder(r.Body).Decode(&req)
		mu.Lock()
		calls = append(calls, req)
		mu.Unlock()
		w.Write([]byte(chatResponseOK("ok")))
	}))
	defer srv.Close()
	setEndpoint(t, srv.URL)

	New("key", "openai/gpt-oss-120b", "").Summarise(context.Background(), testResult())
	New("key", "some-future-llama", "").Summarise(context.Background(), testResult())

	mu.Lock()
	defer mu.Unlock()
	if len(calls) != 2 {
		t.Fatalf("calls = %d, want 2", len(calls))
	}
	if calls[0].ReasoningEffort != "low" {
		t.Fatalf("gpt-oss reasoning_effort = %q, want low", calls[0].ReasoningEffort)
	}
	if calls[1].ReasoningEffort != "" {
		t.Fatalf("non-reasoning model sent reasoning_effort %q", calls[1].ReasoningEffort)
	}
}

func TestDisabledClient(t *testing.T) {
	c := New("", defaultModel, "")
	if c.Enabled() {
		t.Fatal("client without key should be disabled")
	}
	if _, err := c.Summarise(context.Background(), testResult()); !errors.Is(err, ErrDisabled) {
		t.Fatalf("err = %v, want ErrDisabled", err)
	}
}

func TestSameModelDisablesFallback(t *testing.T) {
	c := New("key", "qwen/qwen3.6-27b", "")
	if c.fallback != "" {
		t.Fatalf("fallback = %q, want empty when it equals the primary model", c.fallback)
	}
}
