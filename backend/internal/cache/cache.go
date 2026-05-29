// Package cache holds short-TTL analysis result cache. Saves work (and
// PageSpeed API quota) when the same URL is analysed twice in quick succession
// — common for demos, shared examples, and "re-run" clicks.
//
// Strategy: store the parser output keyed by the canonical URL, with a fixed
// TTL. Entries are deep-copied on read via JSON round-trip so callers can
// safely mutate per-request fields (Usage, ReportID, etc.) without poisoning
// the cache.
//
// Process-local — restart clears everything, which is fine for the workload.
package cache

import (
	"bytes"
	"encoding/gob"
	"net/http"
	"sync"
	"time"

	"github.com/ahomsi/explain-website/internal/model"
)

// DefaultTTL is the entry lifetime. 10 minutes is long enough to absorb
// reload/share/demo bursts but short enough that scores stay roughly fresh.
const DefaultTTL = 10 * time.Minute

// maxEntries caps the cache to keep memory bounded. Entries past this count
// are evicted on Set in insertion order (cheap, no LRU). 500 × ~50 KB = 25 MB.
const maxEntries = 500

type entry struct {
	resultBytes  []byte
	respHeaders  http.Header
	expiresAt    time.Time
	insertedAt   time.Time
}

// Cache is a goroutine-safe TTL cache of analysis results.
type Cache struct {
	mu      sync.RWMutex
	entries map[string]entry
	order   []string
	ttl     time.Duration

	hits   uint64
	misses uint64
}

// New returns a Cache with the given TTL.
func New(ttl time.Duration) *Cache {
	return &Cache{
		entries: make(map[string]entry, maxEntries),
		order:   make([]string, 0, maxEntries),
		ttl:     ttl,
	}
}

// Get returns a deep copy of the cached result + the original response headers
// for the given URL, or (nil, nil, false) on miss / expiry.
func (c *Cache) Get(url string) (*model.AnalysisResult, http.Header, bool) {
	c.mu.RLock()
	e, ok := c.entries[url]
	c.mu.RUnlock()
	if !ok || time.Now().After(e.expiresAt) {
		c.mu.Lock()
		c.misses++
		c.mu.Unlock()
		return nil, nil, false
	}

	// Deep-copy via gob round-trip so the caller can freely mutate the
	// returned struct without affecting the cache.
	var out model.AnalysisResult
	if err := gob.NewDecoder(bytes.NewReader(e.resultBytes)).Decode(&out); err != nil {
		// Decode failure → treat as miss; don't crash.
		c.mu.Lock()
		c.misses++
		c.mu.Unlock()
		return nil, nil, false
	}

	// Copy the headers so mutations on the returned http.Header don't leak.
	h := make(http.Header, len(e.respHeaders))
	for k, v := range e.respHeaders {
		cp := make([]string, len(v))
		copy(cp, v)
		h[k] = cp
	}

	c.mu.Lock()
	c.hits++
	c.mu.Unlock()
	return &out, h, true
}

// Set stores a result keyed by URL. Existing entries with the same key are
// replaced. When the cache is at capacity, the oldest entry is evicted.
func (c *Cache) Set(url string, result *model.AnalysisResult, respHeaders http.Header) {
	if result == nil {
		return
	}
	var buf bytes.Buffer
	if err := gob.NewEncoder(&buf).Encode(result); err != nil {
		return // best-effort; skip caching on encode failure
	}

	// Copy headers so external mutation doesn't poison the cache.
	h := make(http.Header, len(respHeaders))
	for k, v := range respHeaders {
		cp := make([]string, len(v))
		copy(cp, v)
		h[k] = cp
	}

	now := time.Now()
	c.mu.Lock()
	defer c.mu.Unlock()

	if _, exists := c.entries[url]; !exists {
		// New key — track insertion order for eviction.
		if len(c.entries) >= maxEntries {
			oldest := c.order[0]
			c.order = c.order[1:]
			delete(c.entries, oldest)
		}
		c.order = append(c.order, url)
	}
	c.entries[url] = entry{
		resultBytes: buf.Bytes(),
		respHeaders: h,
		expiresAt:   now.Add(c.ttl),
		insertedAt:  now,
	}
}

// Stats returns simple observability counters for the admin dashboard.
type Stats struct {
	Entries int    `json:"entries"`
	Hits    uint64 `json:"hits"`
	Misses  uint64 `json:"misses"`
	TTLSec  int    `json:"ttlSec"`
}

// Snapshot returns a copy of current cache statistics.
func (c *Cache) Snapshot() Stats {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return Stats{
		Entries: len(c.entries),
		Hits:    c.hits,
		Misses:  c.misses,
		TTLSec:  int(c.ttl.Seconds()),
	}
}

// Clear removes every entry. Intended for admin-triggered cache reset.
func (c *Cache) Clear() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.entries = make(map[string]entry, maxEntries)
	c.order = c.order[:0]
}

// Default is the process-wide singleton used by handlers. Mirrors the
// adminstate pattern: handler code does cache.Default.Get(...), not threading
// a *Cache through every signature.
var Default = New(DefaultTTL)
