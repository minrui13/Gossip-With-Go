package main

import (
	"context"
	"log"

	"github.com/joho/godotenv"
	"github.com/minrui13/backend/config"
	db "github.com/minrui13/backend/database"
	"github.com/minrui13/backend/server"
)

func main() {

	if err := godotenv.Load(); err != nil {
		log.Fatal("Error loading .env file")
	}

	//connecting the database
	dbPool, err := db.Connect()
	if err != nil {
		log.Fatal(err)
	}

	var version string
	if err := dbPool.QueryRow(context.Background(), "SELECT version()").Scan(&version); err != nil {
		log.Fatalf("Query failed: %v", err)
	}

	//init server
	port := ":" + config.Envs.PORT

	newServer := server.NewServer(port, dbPool)

	if err := newServer.Run(); err != nil {
		log.Fatal(err)
	}

}
