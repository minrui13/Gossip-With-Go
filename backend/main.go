package main

import (
	"log"
	"os"

	db "github.com/minrui13/backend/database"
	"github.com/minrui13/backend/server"
)

func main() {

	//connecting the database
	dbPool, err := db.Connect()
	if err != nil {
		log.Fatal(err)
	}

	address 8080: missing port in address
==> Exited with status 1

	newServer := server.NewServer(port, dbPool)

	if err := newServer.Run(); err != nil {
		log.Fatal(err)
	}

}
