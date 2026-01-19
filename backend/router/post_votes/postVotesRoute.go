package postVotesRouter

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/minrui13/backend/types"
	"github.com/minrui13/backend/util"
)

type Handler struct {
	db *pgxpool.Pool
}

func NewHandler(db *pgxpool.Pool) *Handler {
	return &Handler{db: db}
}

func (h *Handler) Router(r *mux.Router) *mux.Router {
	//Update vote (when user changes their vote)
	r.HandleFunc("/updateVote/{post_vote_id}", h.UpdatePostVote).Methods("PUT")
	//Delete vote (when user remove their vote)
	r.HandleFunc("/deleteVote/{post_vote_id}", h.UpdatePostVote).Methods("DELETE")
	//Insert vote (when user vote on a new post)
	r.HandleFunc("/addVote/{user_id}/{post_id}", h.UpdatePostVote).Methods("POST")

	return r
}

// create new vote
func (h *Handler) AddPostVote(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	//get post_id from params
	postID := mux.Vars(r)["post_id"]
	//convert postID to integer (check if valid integer)
	postIDInt, err := strconv.Atoi(postID)
	//check if postID is an integer
	if err != nil {
		util.WriteError(w, http.StatusBadRequest, err)
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

	var payload types.VoteTypePayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		util.WriteError(w, http.StatusBadRequest, err)
		return
	}

	//get data from db
	_, err = h.db.Exec(ctx,
		`INSERT INTO posts_votes 
		(user_id, post_id, vote_type)
		VALUES ($1, $2, $3)`,
		userIDInt, postIDInt, payload.VoteType)

	if err != nil {
		util.WriteError(w, http.StatusInternalServerError, err)
		return
	}

	util.WriteJSON(w, http.StatusCreated, map[string]string{
		"message": "vote created successfully",
	})
}

// Update vote by post_vote_id
func (h *Handler) UpdatePostVote(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	//get post_vote_id from params
	postVoteID := mux.Vars(r)["post_vote_id"]
	//convert postVoteID to integer (check if valid integer)
	postVoteIDInt, err := strconv.Atoi(postVoteID)
	//check if postVoteID is an integer
	if err != nil {
		util.WriteError(w, http.StatusBadRequest, err)
		return
	}

	var payload types.VoteTypePayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		util.WriteError(w, http.StatusBadRequest, err)
		return
	}

	//get data from db
	result, err := h.db.Exec(ctx,
		`UPDATE posts_votes
		SET vote_type = $1, edited_date = current_timestamp
		WHERE post_vote_id=$2`,
		payload.VoteType, postVoteIDInt)

	if err != nil {
		util.WriteError(w, http.StatusInternalServerError, err)
		return
	}

	if result.RowsAffected() == 0 {
		util.WriteError(w, http.StatusNotFound, errors.New("vote not found"))
		return
	}

	util.WriteJSON(w, http.StatusOK, map[string]string{
		"message": "vote updated successfully",
	})
}

// Delete vote by post_vote_id
func (h *Handler) DeletePostVote(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	//get post_vote_id from params
	postVoteID := mux.Vars(r)["post_vote_id"]
	//convert postVoteID to integer (check if valid integer)
	postVoteIDInt, err := strconv.Atoi(postVoteID)
	//check if postVoteID is an integer
	if err != nil {
		util.WriteError(w, http.StatusBadRequest, err)
		return
	}

	//get data from db
	result, err := h.db.Exec(ctx,
		`DELETE FROM posts_votes WHERE post_vote_id=$1`,
		postVoteIDInt)

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
