package main

import (
	"log"

	"github.com/minrui13/backend/config"
	db "github.com/minrui13/backend/database"
	"github.com/minrui13/backend/server"
)

func main() {

	// //attempting to load env fle
	// if err := godotenv.Load(); err != nil {
	// 	log.Fatal("Error loading .env file")
	// }

	//connecting the database
	dbPool, err := db.Connect()
	if err != nil {
		log.Fatal(err)
	}

	//init server
	port := ":" + config.Envs.PORT

	newServer := server.NewServer(port, dbPool)

	if err := newServer.Run(); err != nil {
		log.Fatal(err)
	}

}
