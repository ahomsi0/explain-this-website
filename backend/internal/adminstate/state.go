// Package adminstate holds runtime observability and feature-flag state shared
// between the analyzer pipeline (parser, email, etc.) and the admin dashboard.
// Observability is process-local; feature flags can be restored from storage.
package adminstate

import (
	"sync"
	"time"
)

// FailureEntry is a single recent error captured during analysis.
type FailureEntry struct {
	At      time.Time `json:"at"`
	URL     string    `json:"url"`
	Message string    `json:"message"`
	UserID  int64     `json:"userId,omitempty"`
}

// HealthState tracks the latest known status of an external dependency.
type HealthState struct {
	LastSuccessAt time.Time `json:"lastSuccessAt"`
	LastErrorAt   time.Time `json:"lastErrorAt"`
	LastErrorMsg  string    `json:"lastErrorMsg"`
}

const (
	FlagPageSpeed = "pagespeed_enabled"
	FlagEmail     = "email_enabled"
)

// adminState holds runtime-mutable admin observability and feature-flag state.
// All fields are guarded by mu — no field is touched outside helpers below.
type adminState struct {
	mu              sync.RWMutex
	failureLog      []FailureEntry // newest at index 0
	pagespeedHealth HealthState
	resendHealth    HealthState
	groqHealth      HealthState
	flags           map[string]bool
}

const failureLogCap = 50

// state is the singleton tracker. Process-local — restart drops the data.
var state = &adminState{
	flags: map[string]bool{
		FlagPageSpeed: true,
		FlagEmail:     true,
	},
}

// RecordAnalyzeFailure pushes a failure onto the ring buffer.
func RecordAnalyzeFailure(url string, userID int64, msg string) {
	state.mu.Lock()
	defer state.mu.Unlock()
	entry := FailureEntry{At: time.Now(), URL: url, UserID: userID, Message: msg}
	state.failureLog = append([]FailureEntry{entry}, state.failureLog...)
	if len(state.failureLog) > failureLogCap {
		state.failureLog = state.failureLog[:failureLogCap]
	}
}

// RecordPageSpeedSuccess / RecordPageSpeedFailure update the in-memory health.
func RecordPageSpeedSuccess() {
	state.mu.Lock()
	state.pagespeedHealth.LastSuccessAt = time.Now()
	state.mu.Unlock()
	notifyPersist("pagespeed")
}
func RecordPageSpeedFailure(msg string) {
	state.mu.Lock()
	state.pagespeedHealth.LastErrorAt = time.Now()
	state.pagespeedHealth.LastErrorMsg = msg
	state.mu.Unlock()
	notifyPersist("pagespeed")
}

// RecordEmailSuccess / RecordEmailFailure track the Resend dependency.
func RecordEmailSuccess() {
	state.mu.Lock()
	state.resendHealth.LastSuccessAt = time.Now()
	state.mu.Unlock()
	notifyPersist("resend")
}
func RecordEmailFailure(msg string) {
	state.mu.Lock()
	state.resendHealth.LastErrorAt = time.Now()
	state.resendHealth.LastErrorMsg = msg
	state.mu.Unlock()
	notifyPersist("resend")
}

// RecordGroqSuccess / RecordGroqFailure track the LLM summary dependency.
func RecordGroqSuccess() {
	state.mu.Lock()
	state.groqHealth.LastSuccessAt = time.Now()
	state.mu.Unlock()
	notifyPersist("groq")
}
func RecordGroqFailure(msg string) {
	state.mu.Lock()
	state.groqHealth.LastErrorAt = time.Now()
	state.groqHealth.LastErrorMsg = msg
	state.mu.Unlock()
	notifyPersist("groq")
}

// persistHook, when set, mirrors health mutations into durable storage. It
// exists so the db package can persist health without adminstate importing db
// (db already imports adminstate — a direct call would cycle). The db package
// installs it via SetPersistHook during Init.
var persistHook func(component string)

// SetPersistHook installs the durability hook. Pass nil to disable.
func SetPersistHook(f func(component string)) {
	persistHook = f
}

// notifyPersist fires the hook after a health mutation. Never blocks the
// caller — the hook itself is responsible for being async if it does I/O.
func notifyPersist(component string) {
	if persistHook != nil {
		persistHook(component)
	}
}

// LoadHealth restores persisted dependency health (e.g. from Postgres at
// startup) so deploys and multi-instance deployments don't reset the admin
// dashboard to "never". Components absent from the map keep their defaults.
func LoadHealth(states map[string]HealthState) {
	state.mu.Lock()
	defer state.mu.Unlock()
	if h, ok := states["pagespeed"]; ok {
		state.pagespeedHealth = h
	}
	if h, ok := states["resend"]; ok {
		state.resendHealth = h
	}
	if h, ok := states["groq"]; ok {
		state.groqHealth = h
	}
}

// FlagEnabled reports the current value of a feature flag (defaults to true
// for unknown flags so a typo doesn't accidentally turn things off).
func FlagEnabled(name string) bool {
	state.mu.RLock()
	defer state.mu.RUnlock()
	v, ok := state.flags[name]
	if !ok {
		return true
	}
	return v
}

// SetFlag is the admin toggle. Returns the new value.
func SetFlag(name string, enabled bool) bool {
	state.mu.Lock()
	defer state.mu.Unlock()
	state.flags[name] = enabled
	return enabled
}

// SnapshotFailures returns a copy of the failure log for the admin endpoint.
func SnapshotFailures() []FailureEntry {
	state.mu.RLock()
	defer state.mu.RUnlock()
	out := make([]FailureEntry, len(state.failureLog))
	copy(out, state.failureLog)
	return out
}

func SnapshotHealth() (HealthState, HealthState) {
	state.mu.RLock()
	defer state.mu.RUnlock()
	return state.pagespeedHealth, state.resendHealth
}

// SnapshotGroqHealth returns the current Groq summariser health state. Kept
// separate from SnapshotHealth so legacy admin-dashboard callers don't need to
// be updated in the same PR that adds Groq.
func SnapshotGroqHealth() HealthState {
	state.mu.RLock()
	defer state.mu.RUnlock()
	return state.groqHealth
}

func SnapshotFlags() map[string]bool {
	state.mu.RLock()
	defer state.mu.RUnlock()
	out := make(map[string]bool, len(state.flags))
	for k, v := range state.flags {
		out[k] = v
	}
	return out
}

// LoadFlags restores persisted feature flags without removing defaults that are
// absent from storage (useful when a new flag is introduced in a later build).
func LoadFlags(flags map[string]bool) {
	state.mu.Lock()
	defer state.mu.Unlock()
	for name, enabled := range flags {
		state.flags[name] = enabled
	}
}
