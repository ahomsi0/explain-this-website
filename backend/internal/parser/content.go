package parser

import (
	"regexp"
	"sort"
	"strings"
	"unicode"
	"unicode/utf8"

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

var sentenceEnder = regexp.MustCompile(`[.!?]+\s+`)

// splitWords lowercases text and splits it into runs of letters. Unlike an
// ASCII-only pattern it keeps accented and non-Latin letters intact, so
// "café" stays one word instead of being mangled into "caf".
func splitWords(text string) []string {
	words := []string{}
	var b strings.Builder
	flush := func() {
		if b.Len() > 0 {
			words = append(words, b.String())
			b.Reset()
		}
	}
	for _, r := range strings.ToLower(text) {
		if unicode.IsLetter(r) {
			b.WriteRune(r)
		} else {
			flush()
		}
	}
	flush()
	return words
}

// analyzeContent derives readability and keyword stats from visible page text.
func analyzeContent(text string) model.ContentStats {
	cs := model.ContentStats{TopKeywords: []string{}}
	if strings.TrimSpace(text) == "" {
		cs.ReadingLevel = "simple"
		return cs
	}

	// ── Keyword frequency ────────────────────────────────────────────────────
	freq := make(map[string]int)
	for _, w := range splitWords(text) {
		// Require 5+ chars to filter UI fragments like "espa", "fran", "nav"
		if utf8.RuneCountInString(w) >= 5 && !stopWords[w] {
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
	// Only count sentences with 8+ words to filter out nav items, button labels,
	// headings, and other short UI fragments that skew the average upward.
	sentences := sentenceEnder.Split(text, -1)
	totalWords, sentenceCount := 0, 0
	for _, s := range sentences {
		wc := len(strings.Fields(s))
		if wc >= 8 {
			totalWords += wc
			sentenceCount++
		}
	}
	if sentenceCount > 0 {
		cs.AvgSentenceLen = totalWords / sentenceCount
	}

	// ── Average content-word length (vocabulary complexity proxy) ────────────
	// We measure the mean length of non-stop, alphabetic words (≥4 chars).
	// Longer words (e.g. "implementation", "configuration") indicate more
	// technical or formal writing, independent of sentence length.
	totalCharLen, wordCount := 0, 0
	for _, w := range splitWords(text) {
		if n := utf8.RuneCountInString(w); n >= 4 && !stopWords[w] {
			totalCharLen += n
			wordCount++
		}
	}
	avgWordLen := 0
	if wordCount > 0 {
		avgWordLen = totalCharLen / wordCount
	}

	// ── Reading level ────────────────────────────────────────────────────────
	// Two-factor classification: sentence length AND vocabulary complexity.
	// A page with short sentences but long technical words is still "moderate".
	// Thresholds are generous — website copy is naturally more fragmented than prose.
	sentLong := cs.AvgSentenceLen > 22   // sentences are long
	sentVLong := cs.AvgSentenceLen > 32  // sentences are very long
	wordHard := avgWordLen >= 7          // vocabulary is complex (e.g. avg word ≥ 7 chars)

	switch {
	case cs.AvgSentenceLen == 0:
		// No qualifying sentences — page is navigation/UI-heavy; treat as simple.
		cs.ReadingLevel = "simple"
	case sentVLong || (sentLong && wordHard):
		cs.ReadingLevel = "advanced"
	case sentLong || wordHard:
		cs.ReadingLevel = "moderate"
	default:
		cs.ReadingLevel = "simple"
	}

	return cs
}
