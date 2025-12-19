package config

import (
	"os"
	"strconv"

	"github.com/minrui13/backend/types"

	"github.com/joho/godotenv"
)

var Envs = initConfig()

func initConfig() types.Config {
	godotenv.Load()
	return types.Config{
		PORT:                   getEnv("PORT", "8080"),
		DATABASE_URL:           getEnv("DATABASE_URL", ""),
		JWTExpirationInSeconds: getEnvAsInt("JWT_EXP", 3600*24*7),
		JWTSecret:              getEnv("SECRET", "NIL"),
	}
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}

func getEnvAsInt(key string, fallback int64) int64 {
	if value, ok := os.LookupEnv(key); ok {
		i, err := strconv.ParseInt(value, 10, 64)
		if err != nil {
			return fallback
		}
		return i
	}
	return fallback
}
