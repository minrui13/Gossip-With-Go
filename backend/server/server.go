package server

import (
	"log"
	"net/http"

	"github.com/gorilla/mux"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/minrui13/backend/auth"
	cors "github.com/minrui13/backend/middleware"
	commentsVotesRoute "github.com/minrui13/backend/router/comment_votes"
	commentsRouter "github.com/minrui13/backend/router/comments"
	imagesRoute "github.com/minrui13/backend/router/images"
	postBookmarkRoute "github.com/minrui13/backend/router/post_bookmarks"
	postVotesRoute "github.com/minrui13/backend/router/post_votes"
	postsRoute "github.com/minrui13/backend/router/posts"
	tagsRoute "github.com/minrui13/backend/router/tags"
	topicsRoute "github.com/minrui13/backend/router/topics"
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
	topicsRoute.NewHandler(s.db).Router(subrouter.PathPrefix("/topics").Subrouter())
	postsRoute.NewHandler(s.db).Router(subrouter.PathPrefix("/posts").Subrouter())
	postVotesRoute.NewHandler(s.db).Router(subrouter.PathPrefix("/postVotes").Subrouter())
	postBookmarkRoute.NewHandler(s.db).Router(subrouter.PathPrefix("/postBookmarks").Subrouter())
	commentsRouter.NewHandler(s.db).Router(subrouter.PathPrefix("/comments").Subrouter())
	commentsVotesRoute.NewHandler(s.db).Router(subrouter.PathPrefix("/commentVotes").Subrouter())
	tagsRoute.NewHandler(s.db).Router(subrouter.PathPrefix("/tags").Subrouter())

	log.Println("Listening on", s.addr)

	return http.ListenAndServe(":"+s.addr, newRouter)
}
