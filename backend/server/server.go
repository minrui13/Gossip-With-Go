package server

import (
	"log"
	"net/http"

	"github.com/gorilla/mux"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/minrui13/backend/auth"
	cors "github.com/minrui13/backend/middleware"
	imagesRoute "github.com/minrui13/backend/router/images"
	postsRouter "github.com/minrui13/backend/router/posts"
	topicsRouter "github.com/minrui13/backend/router/topics"
	usersRoute "github.com/minrui13/backend/router/users"
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

// running backend api routes
func (s *APIServer) Run() error {
	newRouter := mux.NewRouter()
	newRouter.Use(cors.CORS)
	newRouter.Methods(http.MethodOptions).HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	subrouter := newRouter.PathPrefix("/api").Subrouter()
	subrouter.HandleFunc("/verifyToken", auth.VerifyToken).Methods("POST")
	usersRoute.NewHandler(s.db).Router(subrouter.PathPrefix("/users").Subrouter())
	imagesRoute.NewHandler(s.db).Router(subrouter.PathPrefix("/images").Subrouter())
	topicsRouter.NewHandler(s.db).Router(subrouter.PathPrefix("/topics").Subrouter())
	postsRouter.NewHandler(s.db).Router(subrouter.PathPrefix("/posts").Subrouter())

	log.Println("Listening on", s.addr)

	return http.ListenAndServe(s.addr, newRouter)
}
