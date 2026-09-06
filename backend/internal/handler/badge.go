package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/ahomsi/explain-website/internal/cache"
	"github.com/ahomsi/explain-website/internal/db"
	"github.com/ahomsi/explain-website/internal/model"
	"github.com/ahomsi/explain-website/internal/parser"
)

// BadgeHandler serves GET /api/badge?url=<url> as an SVG score shield built
// from the freshest analysis available for the URL: the 10-minute analysis
// cache first, then the most recent saved audit (any account). URLs never
// analyzed return a neutral badge so embeds never look broken.
func BadgeHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		rawURL := strings.TrimSpace(r.URL.Query().Get("url"))
		if rawURL == "" {
			writeError(w, http.StatusBadRequest, "url query parameter is required")
			return
		}
		normalized, normErr := normalizeAnalyzeURL(rawURL)
		if normErr != "" {
			writeError(w, http.StatusUnprocessableEntity, normErr)
			return
		}

		score, ok := latestScoreForURL(r.Context(), normalized)

		w.Header().Set("Content-Type", "image/svg+xml; charset=utf-8")
		// Overrides the global no-store: badges are meant to be embedded and
		// cached by browsers/CDNs.
		w.Header().Set("Cache-Control", "public, max-age=3600")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(renderScoreSVG(score, ok)))
	}
}

// latestScoreForURL returns the overall score for a normalized URL, if any
// analysis of it is available server-side.
func latestScoreForURL(ctx context.Context, normalizedURL string) (int, bool) {
	if cached, _, _, ok := cache.Default.Get(normalizedURL); ok && cached != nil {
		return parser.OverallScore(*cached), true
	}
	if db.IsAvailable() {
		qctx, cancel := context.WithTimeout(ctx, 3*time.Second)
		defer cancel()
		var raw []byte
		err := db.Pool.QueryRow(qctx,
			`SELECT result FROM audits
			  WHERE deleted_at IS NULL AND LOWER(url) = LOWER($1)
			  ORDER BY created_at DESC LIMIT 1`, normalizedURL,
		).Scan(&raw)
		if err == nil {
			var res model.AnalysisResult
			if json.Unmarshal(raw, &res) == nil {
				return parser.OverallScore(res), true
			}
		}
	}
	return 0, false
}

// renderScoreSVG draws a compact shields.io-style flat badge. The value cell
// is emerald ≥75, amber ≥50, red below; unknown scores render a neutral
// zinc cell.
func renderScoreSVG(score int, ok bool) string {
	label := "audit"
	value := fmt.Sprintf("%d / 100", score)
	color := "#059669" // emerald-600
	if !ok {
		label = "audit score"
		value = "not analyzed yet"
		color = "#52525b" // zinc-600
	} else if score < 50 {
		color = "#dc2626" // red-600
	} else if score < 75 {
		color = "#d97706" // amber-600
	}

	const charW = 6.6 // approx Verdana 11px advance width
	leftW := int(float64(len(label))*charW) + 20
	rightW := int(float64(len(value))*charW) + 20
	total := leftW + rightW

	return fmt.Sprintf(`<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="20" role="img" aria-label="%s: %s">
<linearGradient id="s" x2="0" y2="100%%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>
<clipPath id="r"><rect width="%d" height="20" rx="3" fill="#fff"/></clipPath>
<g clip-path="url(#r)">
<rect width="%d" height="20" fill="#4c1d95"/>
<rect x="%d" width="%d" height="20" fill="%s"/>
<rect width="%d" height="20" fill="url(#s)"/>
</g>
<g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
<text x="%d" y="14">%s</text>
<text x="%d" y="14">%s</text>
</g>
</svg>`,
		total, label, value,
		total,
		leftW,
		leftW, rightW, color,
		total,
		leftW/2, label,
		leftW+rightW/2, value,
	)
}
