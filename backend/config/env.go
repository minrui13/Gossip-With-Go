// Loading .env file and  provide easy retrieval for other functions
package config

import (
	"os"
	"strconv"

	"github.com/minrui13/backend/types"

	"github.com/joho/godotenv"
)

var Envs = initConfig()

func initConfig() types.Config {
	if os.Getenv("GO_ENV") != "production" {
		_ = godotenv.Load() 
	}
	return types.Config{
		PORT:                   getEnv("PORT", "8080"),
		DATABASE_URL:           getEnv("DATABASE_URL", ""),
		JWTExpirationInSeconds: getEnvAsInt("JWT_EXP", 3600*24*7),
		JWTSecret:              getEnv("SECRET", "NIL"),
	}
}

// get the non-integral data from the .env file
func getEnv(key, fallback string) string {
	//look for data in.env file or return the fallback value
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}

// get the integral data from the .env file
func getEnvAsInt(key string, fallback int64) int64 {
	//look for data in.env file or return the fallback value
	if value, ok := os.LookupEnv(key); ok {
		//parse value to check for validity
		i, err := strconv.ParseInt(value, 10, 64)
		if err != nil {
			return fallback
		}
		return i
	}
	return fallback
}
