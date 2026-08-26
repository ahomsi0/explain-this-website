package handler

import (
	"sync"
	"time"
)

// loginLimiter throttles authentication attempts in-process:
//   - a per-IP budget on all login/signup attempts (credential spraying), and
//   - a per IP+email failure lockout (targeted password guessing).
//
// State is per instance. Behind multiple instances each enforces its own
// budget, which still raises the attacker's cost substantially; a shared
// store only matters at serious abuse volumes.
type loginLimiter struct {
	mu         sync.Mutex
	ipAttempts map[string][]time.Time // IP → all attempt timestamps
	failures   map[string][]time.Time // ip|email → failed attempt timestamps
}

const (
	ipAttemptWindow = time.Minute
	ipAttemptMax    = 20
	failWindow      = 15 * time.Minute
	failMax         = 5
)

var logins = &loginLimiter{
	ipAttempts: map[string][]time.Time{},
	failures:   map[string][]time.Time{},
}

// Allow reports whether this attempt may proceed. Accepted attempts are
// counted against the per-IP budget immediately; failures are recorded
// separately via RecordFailure.
func (l *loginLimiter) Allow(ip, email string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	now := time.Now()

	l.ipAttempts[ip] = pruneWindows(l.ipAttempts[ip], now, ipAttemptWindow)
	if len(l.ipAttempts[ip]) >= ipAttemptMax {
		return false
	}

	key := ip + "|" + email
	l.failures[key] = pruneWindows(l.failures[key], now, failWindow)
	if len(l.failures[key]) >= failMax {
		return false
	}

	l.ipAttempts[ip] = append(l.ipAttempts[ip], now)
	return true
}

func (l *loginLimiter) RecordFailure(ip, email string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	key := ip + "|" + email
	l.failures[key] = append(l.failures[key], time.Now())
}

// RecordSuccess clears the failure history for this IP+email pair so a
// legitimate user who typo'd a few times isn't locked out after signing in.
func (l *loginLimiter) RecordSuccess(ip, email string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	delete(l.failures, ip+"|"+email)
}

func pruneWindows(ts []time.Time, now time.Time, window time.Duration) []time.Time {
	out := ts[:0]
	for _, t := range ts {
		if now.Sub(t) < window {
			out = append(out, t)
		}
	}
	return out
}
