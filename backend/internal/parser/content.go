package parser

import (
	"regexp"
	"sort"
	"strings"

	"github.com/ahomsi/explain-website/internal/model"
)

var stopWords = map[string]bool{
	"a": true, "about": true, "above": true, "after": true, "again": true,
	"against": true, "all": true, "am": true, "an": true, "and": true,
	"any": true, "are": true, "as": true, "at": true, "be": true,
	"because": true, "been": true, "before": true, "being": true, "below": true,
	"between": true, "both": true, "but": true, "by": true, "can": true,
	"did": true, "do": true, "does": true, "doing": true, "down": true,
	"during": true, "each": true, "few": true, "for": true, "from": true,
	"get": true, "got": true, "had": true, "has": true, "have": true,
	"having": true, "he": true, "her": true, "here": true, "him": true,
	"his": true, "how": true, "i": true, "if": true, "in": true,
	"into": true, "is": true, "it": true, "its": true, "itself": true,
	"just": true, "me": true, "more": true, "most": true, "my": true,
	"no": true, "nor": true, "not": true, "now": true, "of": true,
	"off": true, "on": true, "once": true, "only": true, "or": true,
	"other": true, "our": true, "out": true, "own": true, "s": true,
	"same": true, "she": true, "so": true, "some": true, "such": true,
	"t": true, "than": true, "that": true, "the": true, "their": true,
	"them": true, "then": true, "there": true, "these": true, "they": true,
	"this": true, "those": true, "through": true, "to": true, "too": true,
	"under": true, "until": true, "up": true, "us": true, "very": true,
	"was": true, "we": true, "were": true, "what": true, "when": true,
	"where": true, "which": true, "while": true, "who": true, "why": true,
	"will": true, "with": true, "would": true, "you": true, "your": true,
	"also": true, "may": true, "might": true, "shall": true, "could": true,
	"should": true, "must": true, "let": true, "use": true, "new": true,
	"one": true, "two": true, "three": true, "way": true, "make": true,
	"like": true, "time": true, "know": true, "take": true, "see": true,
	"come": true, "think": true, "look": true, "want": true, "give": true,
	"find": true, "tell": true, "ask": true, "seem": true, "feel": true,
	"try": true, "leave": true, "call": true, "keep": true, "need": true,
}

var nonAlpha = regexp.MustCompile(`[^a-zA-Z]+`)
var sentenceEnder = regexp.MustCompile(`[.!?]+\s+`)

// analyzeContent derives readability and keyword stats from visible page text.
func analyzeContent(text string) model.ContentStats {
	cs := model.ContentStats{TopKeywords: []string{}}
	if strings.TrimSpace(text) == "" {
		cs.ReadingLevel = "simple"
		return cs
	}

	// ── Keyword frequency ────────────────────────────────────────────────────
	freq := make(map[string]int)
	for _, w := range nonAlpha.Split(strings.ToLower(text), -1) {
		if len(w) >= 4 && !stopWords[w] {
			freq[w]++
		}
	}

	type kv struct {
		k string
		v int
	}
	pairs := make([]kv, 0, len(freq))
	for k, v := range freq {
		pairs = append(pairs, kv{k, v})
	}
	sort.Slice(pairs, func(i, j int) bool { return pairs[i].v > pairs[j].v })

	top := 8
	if len(pairs) < top {
		top = len(pairs)
	}
	cs.TopKeywords = make([]string, top)
	for i := 0; i < top; i++ {
		cs.TopKeywords[i] = pairs[i].k
	}

	// ── Average sentence length ──────────────────────────────────────────────
	sentences := sentenceEnder.Split(text, -1)
	totalWords, sentenceCount := 0, 0
	for _, s := range sentences {
		wc := len(strings.Fields(s))
		if wc > 2 {
			totalWords += wc
			sentenceCount++
		}
	}
	if sentenceCount > 0 {
		cs.AvgSentenceLen = totalWords / sentenceCount
	}

	// ── Reading level ────────────────────────────────────────────────────────
	switch {
	case cs.AvgSentenceLen == 0 || cs.AvgSentenceLen <= 12:
		cs.ReadingLevel = "simple"
	case cs.AvgSentenceLen <= 20:
		cs.ReadingLevel = "moderate"
	default:
		cs.ReadingLevel = "advanced"
	}

	return cs
}
