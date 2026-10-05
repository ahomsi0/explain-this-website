package handler

import (
	"context"
	"time"

	"github.com/ahomsi/explain-website/internal/db"
)

// The admin charts below combine signed-in users' saved audits (audits) with
// anonymous analyses (anonymous_analyses) so they reflect all traffic.
// Aggregates deliberately keep soft-deleted audits: clearing history must not
// erase activity analytics (only the itemized "Recent Audits" list hides them).

// loadAuditsByDay returns analysis counts for the last 14 days, zero-filled so
// the chart renders evenly.
func loadAuditsByDay(ctx context.Context) []dayCount {
	rows, err := db.Pool.Query(ctx, `
		SELECT to_char(created_at::date, 'YYYY-MM-DD') AS d, COUNT(*) AS n
		  FROM (
			SELECT created_at FROM audits WHERE created_at >= NOW() - INTERVAL '14 days'
			UNION ALL
			SELECT created_at FROM anonymous_analyses WHERE created_at >= NOW() - INTERVAL '14 days'
		  ) a
		 GROUP BY d
		 ORDER BY d ASC`)
	if err != nil {
		return []dayCount{}
	}
	defer rows.Close()
	counts := map[string]int{}
	for rows.Next() {
		var d string
		var n int
		if err := rows.Scan(&d, &n); err == nil {
			counts[d] = n
		}
	}
	out := make([]dayCount, 0, 14)
	for i := 13; i >= 0; i-- {
		date := time.Now().AddDate(0, 0, -i).Format("2006-01-02")
		out = append(out, dayCount{Date: date, Count: counts[date]})
	}
	return out
}

// loadTopURLs returns the 10 most analyzed URLs in the last 30 days.
func loadTopURLs(ctx context.Context) []urlCount {
	out := []urlCount{}
	rows, err := db.Pool.Query(ctx, `
		SELECT url, COUNT(*) AS n
		  FROM (
			SELECT url FROM audits WHERE created_at >= NOW() - INTERVAL '30 days'
			UNION ALL
			SELECT url FROM anonymous_analyses WHERE created_at >= NOW() - INTERVAL '30 days'
		  ) a
		 GROUP BY url
		 ORDER BY n DESC, url ASC
		 LIMIT 10`)
	if err != nil {
		return out
	}
	defer rows.Close()
	for rows.Next() {
		var row urlCount
		if err := rows.Scan(&row.URL, &row.Count); err == nil {
			out = append(out, row)
		}
	}
	return out
}

// loadSlowAudits returns the 10 slowest analyses in the last 30 days.
func loadSlowAudits(ctx context.Context) []slowAuditRow {
	out := []slowAuditRow{}
	rows, err := db.Pool.Query(ctx, `
		SELECT url, duration_ms, created_at
		  FROM (
			SELECT url, duration_ms, created_at FROM audits
			 WHERE duration_ms IS NOT NULL AND deleted_at IS NULL
			UNION ALL
			SELECT url, duration_ms, created_at FROM anonymous_analyses
			 WHERE duration_ms IS NOT NULL
		  ) a
		 WHERE created_at > NOW() - INTERVAL '30 days'
		 ORDER BY duration_ms DESC
		 LIMIT 10`)
	if err != nil {
		return out
	}
	defer rows.Close()
	for rows.Next() {
		var r slowAuditRow
		if err := rows.Scan(&r.URL, &r.DurationMs, &r.CreatedAt); err == nil {
			out = append(out, r)
		}
	}
	return out
}

// loadAuditOutcomes returns the PageSpeed hit rate per day for the last 14 days.
func loadAuditOutcomes(ctx context.Context) []auditOutcomeRow {
	out := []auditOutcomeRow{}
	rows, err := db.Pool.Query(ctx, `
		SELECT to_char(created_at::date, 'YYYY-MM-DD') AS d,
		       COUNT(*)                                 AS total,
		       SUM(CASE WHEN perf_available IS TRUE THEN 1 ELSE 0 END) AS perf_ok,
		       SUM(CASE WHEN perf_available IS NOT TRUE THEN 1 ELSE 0 END) AS perf_fail
		  FROM (
			SELECT created_at, perf_available FROM audits WHERE deleted_at IS NULL
			UNION ALL
			SELECT created_at, perf_available FROM anonymous_analyses
			 WHERE perf_available IS NOT NULL -- rows logged before the column existed have no outcome
		  ) a
		 WHERE created_at > NOW() - INTERVAL '14 days'
		 GROUP BY d
		 ORDER BY d DESC`)
	if err != nil {
		return out
	}
	defer rows.Close()
	for rows.Next() {
		var r auditOutcomeRow
		if err := rows.Scan(&r.Date, &r.Total, &r.PerfOK, &r.PerfFail); err == nil {
			out = append(out, r)
		}
	}
	return out
}
