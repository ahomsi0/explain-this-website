// Package llm wraps Groq's OpenAI-compatible API.
//
// Groq runs Llama / Mixtral / Gemma models on custom inference hardware —
// dramatically faster than the OpenAI/Anthropic equivalents and cheaper per
// token, which makes a per-report summary affordable to run on every analysis.
//
// We use the chat-completions endpoint with OpenAI's gpt-oss-120b by default
// (Groq retired llama-3.3-70b-versatile in August 2026); override via
// GROQ_MODEL. Because Groq has retired model IDs several times, a failed
// model lookup or an exhausted per-model rate bucket automatically retries
// once with a fallback model (GROQ_FALLBACK_MODEL, default qwen/qwen3.6-27b)
// so a single decommissioned model can't take summaries down silently again.
package llm

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/ahomsi/explain-website/internal/adminstate"
	"github.com/ahomsi/explain-website/internal/model"
)

var groqChatEndpoint = "https://api.groq.com/openai/v1/chat/completions"

const (
	defaultTimeout = 20 * time.Second
	// defaultModel is the primary summariser. Reasoning-capable — the client
	// caps its hidden chain-of-thought via reasoning_effort (see chatRequest).
	defaultModel = "openai/gpt-oss-120b"
	// defaultFallbackModel absorbs Groq's frequent model deprecations and
	// per-model rate-limit buckets (RPM/RPD are tracked per model, so the
	// fallback has its own quota).
	defaultFallbackModel = "qwen/qwen3.6-27b"
)

// ErrDisabled is returned by Summarise when no API key is configured. Callers
// should treat it as a soft failure and continue without a summary.
var ErrDisabled = errors.New("groq: GROQ_API_KEY not set")

// Client is a thin Groq chat-completions client with one-level model fallback.
type Client struct {
	apiKey   string
	model    string
	fallback string // empty = no fallback
	http     *http.Client
}

// New returns a Client. If apiKey is empty the client is "disabled" and
// Summarise will return ErrDisabled. An empty fallbackModelName selects the
// package default; a fallback equal to the primary model disables fallback.
func New(apiKey, modelName, fallbackModelName string) *Client {
	if modelName == "" {
		modelName = defaultModel
	}
	fallback := fallbackModelName
	if fallback == "" {
		fallback = defaultFallbackModel
	}
	if fallback == modelName {
		fallback = ""
	}
	return &Client{
		apiKey:   apiKey,
		model:    modelName,
		fallback: fallback,
		http:     &http.Client{Timeout: defaultTimeout},
	}
}

// Enabled reports whether the client has an API key and will actually call
// Groq. Used by callers that want to skip summary work entirely when disabled.
func (c *Client) Enabled() bool { return c != nil && c.apiKey != "" }

type chatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type chatRequest struct {
	Model       string        `json:"model"`
	Messages    []chatMessage `json:"messages"`
	MaxTokens   int           `json:"max_tokens"`
	Temperature float64       `json:"temperature"`
	// ReasoningEffort caps the hidden chain-of-thought budget on reasoning
	// models (gpt-oss, qwen3). Without it those models can exhaust
	// max_tokens on reasoning and return empty content. Omitted for models
	// that don't accept the parameter.
	ReasoningEffort string `json:"reasoning_effort,omitempty"`
}

type chatResponse struct {
	Choices []struct {
		Message chatMessage `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
		Type    string `json:"type"`
	} `json:"error,omitempty"`
}

// apiError is a non-2xx Groq response (or a Groq-reported API error). The
// status code drives the fallback decision.
type apiError struct {
	status int
	msg    string
}

func (e *apiError) Error() string {
	return fmt.Sprintf("groq: HTTP %d: %s", e.status, truncate(e.msg, 200))
}

// retryableModel reports whether a different model could succeed: the model ID
// was decommissioned/unknown, or its per-model rate bucket is exhausted.
func (e *apiError) retryableModel() bool {
	if e.status == http.StatusNotFound || e.status == http.StatusTooManyRequests {
		return true
	}
	return e.status == http.StatusBadRequest && strings.Contains(strings.ToLower(e.msg), "model")
}

// Summarise asks the model to write a 3-paragraph plain-English narrative
// about the analysed site. Returns the raw text on success, or an error.
//
// On non-disabled errors the summary call is also recorded in adminstate so
// failures show up on the admin dashboard. A model-specific failure (retired
// ID, per-model 429) is retried once against the fallback model before giving
// up, so Groq's frequent model deprecations degrade instead of breaking.
func (c *Client) Summarise(ctx context.Context, result *model.AnalysisResult) (string, error) {
	if !c.Enabled() {
		return "", ErrDisabled
	}
	if result == nil {
		return "", errors.New("groq: nil result")
	}

	digest := buildDigest(result)

	models := []string{c.model}
	if c.fallback != "" {
		models = append(models, c.fallback)
	}

	var lastErr error
	for i, m := range models {
		content, err := c.chat(ctx, m, digest)
		if err == nil {
			adminstate.RecordGroqSuccess()
			return content, nil
		}
		lastErr = err
		var apiErr *apiError
		if i < len(models)-1 && errors.As(err, &apiErr) && apiErr.retryableModel() {
			log.Printf("groq: model %s unavailable (%v) — retrying with %s", m, apiErr, models[i+1])
			continue
		}
		break
	}
	return "", lastErr
}

// chat performs one chat-completions request and returns the message content.
// All failures are recorded in adminstate; success recording lives in
// Summarise so a fallback retry that eventually succeeds counts as healthy.
func (c *Client) chat(ctx context.Context, modelName, digest string) (string, error) {
	body := chatRequest{
		Model: modelName,
		Messages: []chatMessage{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: digest},
		},
		MaxTokens:   600,
		Temperature: 0.4,
	}
	if strings.Contains(modelName, "gpt-oss") || strings.Contains(modelName, "qwen") {
		body.ReasoningEffort = "low"
	}
	payload, err := json.Marshal(body)
	if err != nil {
		return "", fmt.Errorf("groq: marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, groqChatEndpoint, bytes.NewReader(payload))
	if err != nil {
		return "", fmt.Errorf("groq: new request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := c.http.Do(req)
	if err != nil {
		adminstate.RecordGroqFailure(err.Error())
		return "", fmt.Errorf("groq: http: %w", err)
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(io.LimitReader(resp.Body, 64*1024))
	if err != nil {
		adminstate.RecordGroqFailure("read body: " + err.Error())
		return "", fmt.Errorf("groq: read body: %w", err)
	}

	if resp.StatusCode >= 400 {
		apiErr := &apiError{status: resp.StatusCode, msg: string(raw)}
		adminstate.RecordGroqFailure(apiErr.Error())
		return "", apiErr
	}

	var parsed chatResponse
	if err := json.Unmarshal(raw, &parsed); err != nil {
		adminstate.RecordGroqFailure("decode: " + err.Error())
		return "", fmt.Errorf("groq: decode: %w", err)
	}
	if parsed.Error != nil {
		apiErr := &apiError{status: resp.StatusCode, msg: parsed.Error.Message}
		adminstate.RecordGroqFailure(apiErr.Error())
		return "", apiErr
	}
	if len(parsed.Choices) == 0 || parsed.Choices[0].Message.Content == "" {
		adminstate.RecordGroqFailure("empty response")
		return "", errors.New("groq: empty response")
	}

	return parsed.Choices[0].Message.Content, nil
}

const systemPrompt = `You are a senior product analyst writing a plain-English summary of a website for a non-technical reader.

Output exactly three paragraphs, separated by a single blank line, no headings, no bullets, no markdown, no preamble like "Here is your summary":

1. **What this site is** — Describe the site's purpose, audience, and tone in 2-3 sentences. Be specific and concrete; cite product names, sectors, or services that appear in the data. Avoid generic phrases like "this website provides information about its products."

2. **What's working** — Call out the top 2-3 genuine strengths from the data. Cite specific signals (high SEO score, fast LCP, clear CTAs, strong trust elements, etc.). If there's nothing strong, say so honestly in one sentence.

3. **What needs work** — Call out the top 2-3 most impactful issues from the data. Be specific (not "improve SEO" but "the missing meta description on the homepage costs Google search clickthrough"). End with the single most useful thing the owner should fix first.

Keep total length under 220 words. Write like a thoughtful consultant, not marketing copy. Do not flatter, do not hedge with weasel words ("might", "could perhaps").`

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "…"
}
