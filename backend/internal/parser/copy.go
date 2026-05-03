package parser

import (
	"regexp"
	"strings"

	"github.com/ahomsi/explain-website/internal/model"
)

var vagueList = []struct {
	phrase string
	reason string
}{
	{"best-in-class", "No evidence or comparison to support this claim"},
	{"world-class", "Overused superlative — replace with a specific differentiator"},
	{"industry-leading", "Requires proof — what metric makes it industry-leading?"},
	{"cutting-edge", "Vague — what specific technology or approach is new?"},
	{"state-of-the-art", "Overused — replace with what is actually new about it"},
	{"innovative", "Everyone claims innovation — what specifically is new?"},
	{"revolutionary", "Extraordinary claims need extraordinary evidence"},
	{"groundbreaking", "Extraordinary claims need extraordinary evidence"},
	{"seamless", "Vague — what specifically is frictionless?"},
	{"robust", "Vague technical adjective — be specific about resilience"},
	{"scalable", "Vague — what scale? What load? Add numbers"},
	{"comprehensive", "Overused — list what is actually included instead"},
	{"holistic", "Jargon with no specific meaning in most contexts"},
	{"synergy", "Corporate cliché — replace with what actually combines"},
	{"leverage", "Jargon — use 'use' or 'apply' instead"},
	{"empower", "Overused — describe the concrete capability instead"},
	{"transformative", "Requires proof — what specifically changes?"},
	{"game-changing", "Requires proof — what specifically changes?"},
	{"next-generation", "Vague — what generation and what is new about it?"},
	{"next-gen", "Vague — what generation and what is new about it?"},
	{"turnkey", "Jargon — replace with what is actually included"},
	{"end-to-end", "Overused — specify the actual scope instead"},
	{"best practices", "Vague — which practices? Specified by whom?"},
	{"thought leader", "Self-applied label — let readers judge expertise"},
	{"disruptive", "Overused in tech marketing — be specific about impact"},
	{"paradigm shift", "Jargon — describe the actual change"},
	{"move the needle", "Business jargon — replace with a measurable outcome"},
	{"low-hanging fruit", "Business jargon — describe the actual opportunity"},
	{"deep dive", "Business jargon — say 'detailed look' or 'analysis'"},
	{"mission-critical", "Overused — describe the actual consequence of failure"},
}

var reSpecificity = []*regexp.Regexp{
	regexp.MustCompile(`\d+\s*%`),
	regexp.MustCompile(`\d+[xX]\s`),
	regexp.MustCompile(`\$[\d,]+`),
	regexp.MustCompile(`\d+[,\d]*\s*(users?|customers?|teams?|companies)`),
	regexp.MustCompile(`(vs\.?|versus|compared to|beats?|outperforms?)`),
	regexp.MustCompile(`\b(in|within)\s+\d+\s*(seconds?|minutes?|hours?|days?)`),
}

var specificityLabels = []string{
	"Contains percentage figures",
	"Uses multiplier claims",
	"Mentions specific pricing",
	"References user/customer counts",
	"Includes comparisons",
	"Uses specific timeframes",
}

// AnalyzeCopy scans visible text for vague marketing language and scores specificity.
func AnalyzeCopy(visibleText string) model.CopyAnalysis {
	if strings.TrimSpace(visibleText) == "" {
		return model.CopyAnalysis{Score: 100, Label: "Sharp", VaguePhrases: []model.VaguePhrase{}, SpecificityHints: []string{}}
	}

	lower := strings.ToLower(visibleText)

	var found []model.VaguePhrase
	for _, v := range vagueList {
		if strings.Contains(lower, v.phrase) {
			found = append(found, model.VaguePhrase{Phrase: v.phrase, Reason: v.reason})
		}
	}

	var hints []string
	for i, re := range reSpecificity {
		if re.MatchString(visibleText) {
			hints = append(hints, specificityLabels[i])
		}
	}

	score := 100 - (len(found) * 15) + (len(hints) * 8)
	if score < 0 {
		score = 0
	}
	if score > 100 {
		score = 100
	}

	label := "Sharp"
	if score < 80 {
		label = "Mixed"
	}
	if score < 50 {
		label = "Generic"
	}

	if found == nil {
		found = []model.VaguePhrase{}
	}
	if hints == nil {
		hints = []string{}
	}

	return model.CopyAnalysis{
		Score:            score,
		Label:            label,
		VaguePhrases:     found,
		SpecificityHints: hints,
	}
}
