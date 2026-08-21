package handler

import (
	"context"
	"encoding/hex"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/ahomsi/explain-website/internal/auth"
	"github.com/ahomsi/explain-website/internal/db"
	"github.com/ahomsi/explain-website/internal/model"
	"github.com/jackc/pgx/v5"
)

type auditComparisonSnapshot struct {
	ID                   string    `json:"id"`
	URL                  string    `json:"url"`
	Title                string    `json:"title"`
	CreatedAt            time.Time `json:"createdAt"`
	SEOScore             int       `json:"seoScore"`
	UXScore              int       `json:"uxScore"`
	ConversionScore      int       `json:"conversionScore"`
	PerformanceScore     *int      `json:"performanceScore,omitempty"`
	PriorityIssueCount   int       `json:"priorityIssueCount"`
	BrokenLinkCount      int       `json:"brokenLinkCount"`
	SecurityFailureCount int       `json:"securityFailureCount"`
}

type auditComparisonResponse struct {
	Before auditComparisonSnapshot `json:"before"`
	After  auditComparisonSnapshot `json:"after"`
}

func validAuditID(id string) bool {
	if len(id) != 32 {
		return false
	}
	_, err := hex.DecodeString(id)
	return err == nil
}

func loadOwnedAudit(ctx context.Context, id string, userID int64) (model.AnalysisResult, string, time.Time, error) {
	var raw []byte
	var title string
	var createdAt time.Time
	if err := db.Pool.QueryRow(ctx, `
		SELECT result, COALESCE(title, ''), created_at
		  FROM audits
		 WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`, id, userID).
		Scan(&raw, &title, &createdAt); err != nil {
		return model.AnalysisResult{}, "", time.Time{}, err
	}
	var result model.AnalysisResult
	if err := json.Unmarshal(raw, &result); err != nil {
		return model.AnalysisResult{}, "", time.Time{}, err
	}
	return result, title, createdAt, nil
}

func comparisonSnapshot(id, title string, createdAt time.Time, result model.AnalysisResult) auditComparisonSnapshot {
	pass := 0
	required := 0
	for _, check := range result.SEOChecks {
		if check.Optional {
			continue
		}
		required++
		if check.Status == "pass" {
			pass++
		}
	}
	seoScore := 0
	if required > 0 {
		seoScore = (pass * 100) / required
	}
	uxSignals := []bool{
		result.UX.HasCTA,
		result.UX.HasForms,
		result.UX.HasSocialProof,
		result.UX.HasTrustSignals,
		result.UX.HasContactInfo,
		result.UX.MobileReady,
	}
	uxPassed := 0
	for _, signal := range uxSignals {
		if signal {
			uxPassed++
		}
	}
	uxScore := (uxPassed * 100) / len(uxSignals)

	snapshot := auditComparisonSnapshot{
		ID:                   id,
		URL:                  result.URL,
		Title:                title,
		CreatedAt:            createdAt,
		SEOScore:             seoScore,
		UXScore:              uxScore,
		ConversionScore:      result.ConversionScores.Overall,
		PriorityIssueCount:   len(result.PrioritizedIssues),
		BrokenLinkCount:      result.LinkCheck.Broken,
		SecurityFailureCount: 0,
	}
	for _, check := range result.SecurityHeaders {
		if check.Status == "fail" {
			snapshot.SecurityFailureCount++
		}
	}
	if result.Performance != nil && result.Performance.Available {
		strategy := result.Performance.Mobile
		if strategy == nil {
			strategy = result.Performance.Desktop
		}
		if strategy != nil {
			snapshot.PerformanceScore = strategy.Lighthouse.Performance
		}
	}
	return snapshot
}

// CompareAuditsHandler compares two saved audits owned by the current user.
// The response is ordered chronologically, regardless of query parameter order.
func CompareAuditsHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !db.IsAvailable() {
			writeJSONError(w, http.StatusServiceUnavailable, "accounts are not enabled on this server")
			return
		}
		firstID := strings.TrimSpace(r.URL.Query().Get("a"))
		secondID := strings.TrimSpace(r.URL.Query().Get("b"))
		if !validAuditID(firstID) || !validAuditID(secondID) || firstID == secondID {
			writeJSONError(w, http.StatusBadRequest, "two different audit ids are required")
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()
		uid := auth.UserIDFromContext(r.Context())
		first, firstTitle, firstCreatedAt, err := loadOwnedAudit(ctx, firstID, uid)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				writeJSONError(w, http.StatusNotFound, "audit not found")
				return
			}
			writeJSONError(w, http.StatusInternalServerError, "could not load audits")
			return
		}
		second, secondTitle, secondCreatedAt, err := loadOwnedAudit(ctx, secondID, uid)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				writeJSONError(w, http.StatusNotFound, "audit not found")
				return
			}
			writeJSONError(w, http.StatusInternalServerError, "could not load audits")
			return
		}

		before := comparisonSnapshot(firstID, firstTitle, firstCreatedAt, first)
		after := comparisonSnapshot(secondID, secondTitle, secondCreatedAt, second)
		if after.CreatedAt.Before(before.CreatedAt) {
			before, after = after, before
		}
		writeJSON(w, http.StatusOK, auditComparisonResponse{Before: before, After: after})
	}
}
