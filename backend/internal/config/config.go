package config

import (
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

// Config holds all runtime configuration loaded from environment variables.
type Config struct {
	Port             string
	AllowedOrigin    string
	FetchTimeoutSec  int
	MaxBodyBytes     int64
	PageSpeedAPIKey  string // optional; enables Google PageSpeed Insights integration
}

// Load reads .env (if present) and populates Config with sensible defaults.
func Load() Config {
	// Silently ignore missing .env so production deployments using real env vars work fine.
	_ = godotenv.Load()

	return Config{
		Port:            getEnv("PORT", "8080"),
		AllowedOrigin:   getEnv("ALLOWED_ORIGIN", "http://localhost:5173,http://127.0.0.1:5173"),
		FetchTimeoutSec: getEnvInt("FETCH_TIMEOUT_SEC", 60),
		MaxBodyBytes:    getEnvInt64("MAX_BODY_BYTES", 5*1024*1024),
		PageSpeedAPIKey: getEnv("PAGESPEED_API_KEY", ""),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return fallback
}

func getEnvInt64(key string, fallback int64) int64 {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.ParseInt(v, 10, 64); err == nil {
			return n
		}
	}
	return fallback
}
