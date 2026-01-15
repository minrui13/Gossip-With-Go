package types

type Config struct {
	PORT                   string
	DATABASE_URL           string
	JWTExpirationInSeconds int64
	JWTSecret              string
}
