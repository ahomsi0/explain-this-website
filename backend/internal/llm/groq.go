// Package llm wraps Groq's OpenAI-compatible API.
//
// Groq runs Llama / Mixtral / Gemma models on custom inference hardware —
// dramatically faster than the OpenAI/Anthropic equivalents and cheaper per
// token, which makes a per-report summary affordable to run on every analysis.
//
// We use the chat-completions endpoint with OpenAI's gpt-oss-120b by default
// (Groq retired llama-3.3-70b-versatile in August 2026); override via GROQ_MODEL.
package llm

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/ahomsi/explain-website/internal/adminstate"
	"github.com/ahomsi/explain-website/internal/model"
)

const (
	groqChatEndpoint = "https://api.groq.com/openai/v1/chat/completions"
	defaultTimeout   = 20 * time.Second
)

// ErrDisabled is returned by Summarise when no API key is configured. Callers
// should treat it as a soft failure and continue without a summary.
var ErrDisabled = errors.New("groq: GROQ_API_KEY not set")

// Client is a thin Groq chat-completions client.
type Client struct {
	apiKey string
	model  string
	http   *http.Client
}

// New returns a Client. If apiKey is empty the client is "disabled" and
// Summarise will return ErrDisabled.
func New(apiKey, modelName string) *Client {
	if modelName == "" {
		modelName = "openai/gpt-oss-120b"
	}
	return &Client{
		apiKey: apiKey,
		model:  modelName,
		http:   &http.Client{Timeout: defaultTimeout},
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

// Summarise asks the model to write a 3-paragraph plain-English narrative
// about the analysed site. Returns the raw text on success, or an error.
//
// On non-disabled errors the summary call is also recorded in adminstate so
// failures show up on the admin dashboard.
func (c *Client) Summarise(ctx context.Context, result *model.AnalysisResult) (string, error) {
	if !c.Enabled() {
		return "", ErrDisabled
	}
	if result == nil {
		return "", errors.New("groq: nil result")
	}

	digest := buildDigest(result)

	body := chatRequest{
		Model: c.model,
		Messages: []chatMessage{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: digest},
		},
		MaxTokens:   600,
		Temperature: 0.4,
	}
	if strings.Contains(c.model, "gpt-oss") || strings.Contains(c.model, "qwen") {
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
		msg := fmt.Sprintf("HTTP %d: %s", resp.StatusCode, truncate(string(raw), 200))
		adminstate.RecordGroqFailure(msg)
		return "", errors.New("groq: " + msg)
	}

	var parsed chatResponse
	if err := json.Unmarshal(raw, &parsed); err != nil {
		adminstate.RecordGroqFailure("decode: " + err.Error())
		return "", fmt.Errorf("groq: decode: %w", err)
	}
	if parsed.Error != nil {
		adminstate.RecordGroqFailure(parsed.Error.Message)
		return "", errors.New("groq: " + parsed.Error.Message)
	}
	if len(parsed.Choices) == 0 || parsed.Choices[0].Message.Content == "" {
		adminstate.RecordGroqFailure("empty response")
		return "", errors.New("groq: empty response")
	}

	adminstate.RecordGroqSuccess()
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
