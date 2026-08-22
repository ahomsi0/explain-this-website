package handler

import (
	"strings"
	"testing"
)

func TestRenderScoreSVGThresholds(t *testing.T) {
	cases := []struct {
		score int
		ok    bool
		color string
	}{
		{95, true, "#059669"},
		{75, true, "#059669"},
		{60, true, "#d97706"},
		{10, true, "#dc2626"},
	}
	for _, c := range cases {
		svg := renderScoreSVG(c.score, c.ok)
		if !strings.Contains(svg, c.color) {
			t.Errorf("score %d: expected color %s in svg", c.score, c.color)
		}
		if !strings.Contains(svg, "audit") {
			t.Errorf("score %d: missing label", c.score)
		}
	}

	neutral := renderScoreSVG(0, false)
	if !strings.Contains(neutral, "not analyzed yet") || !strings.Contains(neutral, "#52525b") {
		t.Fatal("unknown URL should render the neutral badge")
	}
}
