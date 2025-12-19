package server

import (
	"log"
	"net/http"

	"github.com/gorilla/mux"
	"github.com/jackc/pgx/v5/pgxpool"
	cors "github.com/minrui13/backend/middleware"
	"github.com/minrui13/backend/router"
)

type APIServer struct {
	addr string
	db   *pgxpool.Pool
}

// managing server
func NewServer(addr string, db *pgxpool.Pool) *APIServer {
	return &APIServer{
		addr: addr,
		db:   db,
	}
}

func (s *APIServer) Run() error {
	newRouter := mux.NewRouter()
	newRouter.Use(cors.CORS)
	subrouter := newRouter.PathPrefix("/api").Subrouter()
	router.NewHandler(s.db).Router(subrouter.PathPrefix("/users").Subrouter())

	log.Println("Listening on", s.addr)

	return http.ListenAndServe(s.addr, newRouter)
}
