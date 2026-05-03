package parser

import (
	"regexp"
	"strings"

	"github.com/ahomsi/explain-website/internal/model"
)

var vagueList = []struct {
	re     *regexp.Regexp
	phrase string
	reason string
}{
	{regexp.MustCompile(`(?i)\bbest-in-class\b`), "best-in-class", "No evidence or comparison to support this claim"},
	{regexp.MustCompile(`(?i)\bworld-class\b`), "world-class", "Overused superlative — replace with a specific differentiator"},
	{regexp.MustCompile(`(?i)\bindustry-leading\b`), "industry-leading", "Requires proof — what metric makes it industry-leading?"},
	{regexp.MustCompile(`(?i)\bcutting-edge\b`), "cutting-edge", "Vague — what specific technology or approach is new?"},
	{regexp.MustCompile(`(?i)\bstate-of-the-art\b`), "state-of-the-art", "Overused — replace with what is actually new about it"},
	{regexp.MustCompile(`(?i)\binnovative\b`), "innovative", "Everyone claims innovation — what specifically is new?"},
	{regexp.MustCompile(`(?i)\brevolutionary\b`), "revolutionary", "Extraordinary claims need extraordinary evidence"},
	{regexp.MustCompile(`(?i)\bgroundbreaking\b`), "groundbreaking", "Extraordinary claims need extraordinary evidence"},
	{regexp.MustCompile(`(?i)\bseamless\b`), "seamless", "Vague — what specifically is frictionless?"},
	{regexp.MustCompile(`(?i)\brobust\b`), "robust", "Vague technical adjective — be specific about resilience"},
	{regexp.MustCompile(`(?i)\bscalable\b`), "scalable", "Vague — what scale? What load? Add numbers"},
	{regexp.MustCompile(`(?i)\bcomprehensive\b`), "comprehensive", "Overused — list what is actually included instead"},
	{regexp.MustCompile(`(?i)\bholistic\b`), "holistic", "Jargon with no specific meaning in most contexts"},
	{regexp.MustCompile(`(?i)\bsynergy\b`), "synergy", "Corporate cliché — replace with what actually combines"},
	{regexp.MustCompile(`(?i)\bleverage\b`), "leverage", "Jargon — use 'use' or 'apply' instead"},
	{regexp.MustCompile(`(?i)\bempower\b`), "empower", "Overused — describe the concrete capability instead"},
	{regexp.MustCompile(`(?i)\btransformative\b`), "transformative", "Requires proof — what specifically changes?"},
	{regexp.MustCompile(`(?i)\bgame-changing\b`), "game-changing", "Requires proof — what specifically changes?"},
	{regexp.MustCompile(`(?i)\bnext-generation\b`), "next-generation", "Vague — what generation and what is new about it?"},
	{regexp.MustCompile(`(?i)\bnext-gen\b`), "next-gen", "Vague — what generation and what is new about it?"},
	{regexp.MustCompile(`(?i)\bturnkey\b`), "turnkey", "Jargon — replace with what is actually included"},
	{regexp.MustCompile(`(?i)\bend-to-end\b`), "end-to-end", "Overused — specify the actual scope instead"},
	{regexp.MustCompile(`(?i)\bbest practices\b`), "best practices", "Vague — which practices? Specified by whom?"},
	{regexp.MustCompile(`(?i)\bthought leader\b`), "thought leader", "Self-applied label — let readers judge expertise"},
	{regexp.MustCompile(`(?i)\bdisruptive\b`), "disruptive", "Overused in tech marketing — be specific about impact"},
	{regexp.MustCompile(`(?i)\bparadigm shift\b`), "paradigm shift", "Jargon — describe the actual change"},
	{regexp.MustCompile(`(?i)\bmove the needle\b`), "move the needle", "Business jargon — replace with a measurable outcome"},
	{regexp.MustCompile(`(?i)\blow-hanging fruit\b`), "low-hanging fruit", "Business jargon — describe the actual opportunity"},
	{regexp.MustCompile(`(?i)\bdeep dive\b`), "deep dive", "Business jargon — say 'detailed look' or 'analysis'"},
	{regexp.MustCompile(`(?i)\bmission-critical\b`), "mission-critical", "Overused — describe the actual consequence of failure"},
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

	var found []model.VaguePhrase
	for _, v := range vagueList {
		if v.re.MatchString(visibleText) {
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
