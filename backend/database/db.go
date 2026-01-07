// connecting the database to the server
package db

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/minrui13/backend/config"
)

func Connect() (*pgxpool.Pool, error) {

	//configure connection pool
	connection, err := pgxpool.ParseConfig(config.Envs.DATABASE_URL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse DATABASE_URL: %w", err)
	}

	//connect database
	pool, err := pgxpool.NewWithConfig(context.Background(), connection)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to DB: %w", err)
	}

	return pool, nil
}
