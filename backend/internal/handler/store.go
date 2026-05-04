package handler

import (
	"crypto/rand"
	"encoding/hex"
	"sync"
	"time"

	"github.com/ahomsi/explain-website/internal/model"
)

const reportTTL = 48 * time.Hour

type reportStore struct {
	mu      sync.RWMutex
	entries map[string]reportEntry
}

type reportEntry struct {
	result    model.AnalysisResult
	createdAt time.Time
	userID    int64
	shared    bool
}

var globalStore = &reportStore{
	entries: make(map[string]reportEntry),
}

func (s *reportStore) save(result model.AnalysisResult, userID int64, shared bool) string {
	id := newReportID()
	s.mu.Lock()
	s.entries[id] = reportEntry{result: result, createdAt: time.Now(), userID: userID, shared: shared}
	s.mu.Unlock()
	go s.sweep()
	return id
}

func (s *reportStore) get(id string) (reportEntry, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	e, ok := s.entries[id]
	return e, ok
}

func (s *reportStore) sweep() {
	cutoff := time.Now().Add(-reportTTL)
	s.mu.Lock()
	defer s.mu.Unlock()
	for id, e := range s.entries {
		if e.createdAt.Before(cutoff) {
			delete(s.entries, id)
		}
	}
}

func newReportID() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}
