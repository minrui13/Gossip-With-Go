package postBookmarkRouter

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/minrui13/backend/util"
)

type Handler struct {
	db *pgxpool.Pool
}

func NewHandler(db *pgxpool.Pool) *Handler {
	return &Handler{db: db}
}

func (h *Handler) Router(r *mux.Router) *mux.Router {
	//Remove bookmark (when user remove their vote)
	r.HandleFunc("/deleteBookmark/{bookmark_id}", h.DeleteBookmark).Methods("DELETE")
	//Add bookmark (when user vote on a new post)
	r.HandleFunc("/addBookmark/{user_id}/{post_id}", h.AddBookmark).Methods("POST")

	return r
}

// create new vote
func (h *Handler) AddBookmark(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	//only verified users can access the data
	//check token and token header
	authToken := r.Header.Get("Authorization")
	//check if authHeader is empty
	if authToken == "" {
		util.WriteError(w, http.StatusUnauthorized, errors.New("Missing authorization header"))
		return
	}

	//get user_id from params
	userID := mux.Vars(r)["user_id"]
	//convert userID to integer (check if valid integer)
	userIDInt, err := strconv.Atoi(userID)
	//check if userID is an integer
	if err != nil {
		util.WriteError(w, http.StatusBadRequest, err)
		return
	}

	//get post_id from params
	postID := mux.Vars(r)["post_id"]
	//convert postID to integer (check if valid integer)
	postIDInt, err := strconv.Atoi(postID)
	//check if postID is an integer
	if err != nil {
		util.WriteError(w, http.StatusBadRequest, err)
		return
	}

	var Bookmark_ID int

	//get data from db
	err = h.db.QueryRow(ctx,
		`INSERT INTO posts_bookmarks 
		(user_id, post_id)
		VALUES ($1, $2) RETURNING post_bookmark_id`,
		userIDInt, postIDInt).Scan(&Bookmark_ID)

	if pgErr, ok := err.(*pgconn.PgError); ok && pgErr.Code == "23505" {
		util.WriteError(w, http.StatusConflict, pgErr)
		return
	}

	if err != nil {
		util.WriteError(w, http.StatusInternalServerError, err)
		return
	}

	util.WriteJSON(w, http.StatusCreated, Bookmark_ID)
}

// Delete vote by post_vote_id
func (h *Handler) DeleteBookmark(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	//get post_vote_id from params
	postBookmarkID := mux.Vars(r)["bookmark_id"]
	//convert postVoteID to integer (check if valid integer)
	postBookmarkIDInt, err := strconv.Atoi(postBookmarkID)
	//check if postVoteID is an integer
	if err != nil {
		util.WriteError(w, http.StatusBadRequest, err)
		return
	}

	//get data from db
	result, err := h.db.Exec(ctx,
		`DELETE FROM posts_bookmarks WHERE post_bookmark_id=$1`,
		postBookmarkIDInt)

	if err != nil {
		util.WriteError(w, http.StatusInternalServerError, err)
		return
	}

	if result.RowsAffected() == 0 {
		util.WriteError(w, http.StatusNotFound, errors.New("delete failed"))
		return
	}

	util.WriteJSON(w, http.StatusOK, map[string]string{
		"message": "deleted successfully",
	})
}
