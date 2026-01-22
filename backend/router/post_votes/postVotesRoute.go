package postVotesRouter

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
	"github.com/jackc/pgx/v5/pgconn"
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
	r.HandleFunc("/deleteVote/{post_vote_id}", h.DeletePostVote).Methods("DELETE")
	//Insert vote (when user vote on a new post)
	r.HandleFunc("/addVote/{user_id}/{post_id}", h.AddPostVote).Methods("POST")

	return r
}

// create new vote
func (h *Handler) AddPostVote(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

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

	var payload types.VoteTypePayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		util.WriteError(w, http.StatusBadRequest, err)
		return
	}

	var newPostVoteID int
	postsVotes := new(types.VoteCountIDResult)

	//get data from db
	err = h.db.QueryRow(ctx,
		`INSERT INTO posts_votes 
		(user_id, post_id, vote_type)
		VALUES ($1, $2, $3) RETURNING post_vote_id`,
		userIDInt, postIDInt, payload.VoteType).Scan(&newPostVoteID)

	if pgErr, ok := err.(*pgconn.PgError); ok && pgErr.Code == "23505" {
		util.WriteError(w, http.StatusConflict, pgErr)
		return
	}

	if err != nil {
		util.WriteError(w, http.StatusInternalServerError, err)
		return
	}

	err = h.db.QueryRow(ctx,
		`SELECT
    		COUNT(post_vote_id) FILTER (WHERE vote_type = 1)  AS upvotes,
    		COUNT(post_vote_id) FILTER (WHERE vote_type = -1) AS downvotes
		FROM posts_votes
		WHERE post_id = $1;
		`,
		postIDInt).Scan(&postsVotes.Upvote_Count, &postsVotes.Downvote_Count)

	if err != nil {
		util.WriteError(w, http.StatusInternalServerError, err)
		return
	}

	postsVotes.Post_Vote_ID = &newPostVoteID

	util.WriteJSON(w, http.StatusCreated, postsVotes)
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

	var postID int
	postsVotes := new(types.VoteCountResult)
	//get data from db
	err = h.db.QueryRow(ctx,
		`UPDATE posts_votes
    	SET vote_type = $1,
        edited_date = current_timestamp
    	WHERE post_vote_id = $2
    	RETURNING post_id
		`,
		payload.VoteType, postVoteIDInt).Scan(&postID)

	if err != nil {
		util.WriteError(w, http.StatusInternalServerError, err)
		return
	}

	err = h.db.QueryRow(ctx,
		`SELECT
    		COUNT(post_vote_id) FILTER (WHERE vote_type = 1)  AS upvotes,
    		COUNT(post_vote_id) FILTER (WHERE vote_type = -1) AS downvotes
		FROM posts_votes
		WHERE post_id = $1;
		`,
		postID).Scan(&postsVotes.Upvote_Count, &postsVotes.Downvote_Count)

	if err != nil {
		util.WriteError(w, http.StatusInternalServerError, err)
		return
	}

	util.WriteJSON(w, http.StatusOK, postsVotes)
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
	var postID int
	postsVotes := new(types.VoteCountResult)
	//get data from db
	err = h.db.QueryRow(ctx,
		`
		DELETE FROM posts_votes WHERE post_vote_id=$1
		RETURNING post_id
		`,
		postVoteIDInt).Scan(&postID)

	if err != nil {
		util.WriteError(w, http.StatusInternalServerError, err)
		return
	}

	err = h.db.QueryRow(ctx,
		`SELECT
    		COUNT(post_vote_id) FILTER (WHERE vote_type = 1)  AS upvotes,
    		COUNT(post_vote_id) FILTER (WHERE vote_type = -1) AS downvotes
		FROM posts_votes
		WHERE post_id = $1;
		`,
		postID).Scan(&postsVotes.Upvote_Count, &postsVotes.Downvote_Count)

	if err != nil {
		util.WriteError(w, http.StatusInternalServerError, err)
		return
	}

	util.WriteJSON(w, http.StatusOK, postsVotes)
}
