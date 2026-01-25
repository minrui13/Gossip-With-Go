package commentsVotesRoute

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
	"github.com/jackc/pgx/v5"
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
	//Insert vote (when user vote on a new comment)
	r.HandleFunc("/addVote/{user_id}/{comment_id}", h.AddCommentVote).Methods("POST")
	//Update vote (when user changes their vote)
	r.HandleFunc("/updateVote/{comment_vote_id}", h.UpdateCommentVote).Methods("PUT")
	//Delete vote (when user remove their vote)
	r.HandleFunc("/deleteVote/{comment_vote_id}", h.DeleteCommentVote).Methods("DELETE")

	return r
}

// create new vote
func (h *Handler) AddCommentVote(w http.ResponseWriter, r *http.Request) {
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
	commentID := mux.Vars(r)["comment_id"]
	//convert postID to integer (check if valid integer)
	commentIDInt, err := strconv.Atoi(commentID)
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

	var newCommentVoteID int
	commentVotes := new(types.VoteCountIDResult)

	//get data from db
	err = h.db.QueryRow(ctx,
		`INSERT INTO comments_votes
		(user_id, comment_id, vote_type)
		VALUES ($1, $2, $3) RETURNING comment_vote_id`,
		userIDInt, commentIDInt, payload.VoteType).Scan(&newCommentVoteID)

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
    		COUNT(comment_vote_id) FILTER (WHERE vote_type = 1)  AS upvotes,
    		COUNT(comment_vote_id) FILTER (WHERE vote_type = -1) AS downvotes
		FROM comments_votes
		WHERE comment_id = $1;
		`,
		commentIDInt).Scan(&commentVotes.Upvote_Count, &commentVotes.Downvote_Count)

	if err != nil {
		util.WriteError(w, http.StatusInternalServerError, err)
		return
	}

	commentVotes.Comment_Vote_ID = &newCommentVoteID
	util.WriteJSON(w, http.StatusCreated, commentVotes)
}

// Update vote by post_vote_id
func (h *Handler) UpdateCommentVote(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	//only verified users can access the data
	//check token and token header
	authToken := r.Header.Get("Authorization")
	//check if authHeader is empty
	if authToken == "" {
		util.WriteError(w, http.StatusUnauthorized, errors.New("Missing authorization header"))
		return
	}

	//get post_vote_id from params
	commentVoteID := mux.Vars(r)["comment_vote_id"]
	//convert postVoteID to integer (check if valid integer)
	commentVoteIDInt, err := strconv.Atoi(commentVoteID)
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

	var commentID int
	commentVotes := new(types.VoteCountResult)
	//get data from db
	err = h.db.QueryRow(ctx,
		`UPDATE comments_votes
    	SET vote_type = $1,
        edited_date = current_timestamp
    	WHERE comment_vote_id = $2
    	RETURNING comment_id
		`,
		payload.VoteType, commentVoteIDInt).Scan(&commentID)

	if err != nil {
		util.WriteError(w, http.StatusInternalServerError, err)
		return
	}

	err = h.db.QueryRow(ctx,
		`SELECT
    		COUNT(comment_vote_id) FILTER (WHERE vote_type = 1)  AS upvotes,
    		COUNT(comment_vote_id) FILTER (WHERE vote_type = -1) AS downvotes
		FROM comments_votes
		WHERE comment_id = $1;
		`,
		commentID).Scan(&commentVotes.Upvote_Count, &commentVotes.Downvote_Count)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			util.WriteJSON(w, http.StatusOK, commentVotes)
			return
		}
		util.WriteError(w, http.StatusInternalServerError, err)
		return
	}

	util.WriteJSON(w, http.StatusOK, commentVotes)
}

// Delete vote by post_vote_id
func (h *Handler) DeleteCommentVote(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	//get post_vote_id from params
	commentVoteID := mux.Vars(r)["comment_vote_id"]
	//convert postVoteID to integer (check if valid integer)
	commentVoteIDInt, err := strconv.Atoi(commentVoteID)
	//check if postVoteID is an integer
	if err != nil {
		util.WriteError(w, http.StatusBadRequest, err)
		return
	}
	var commentID int
	commentsVotes := new(types.VoteCountResult)
	//get data from db
	err = h.db.QueryRow(ctx,
		`
		DELETE FROM comments_votes WHERE comment_vote_id=$1
		RETURNING comment_id
		`,
		commentVoteIDInt).Scan(&commentID)

	if err != nil {
		util.WriteError(w, http.StatusInternalServerError, err)
		return
	}

	err = h.db.QueryRow(ctx,
		`SELECT
    		COUNT(comment_vote_id) FILTER (WHERE vote_type = 1)  AS upvotes,
    		COUNT(comment_vote_id) FILTER (WHERE vote_type = -1) AS downvotes
		FROM comments_votes
		WHERE comment_id = $1;
		`,
		commentID).Scan(&commentsVotes.Upvote_Count, &commentsVotes.Downvote_Count)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			util.WriteJSON(w, http.StatusOK, commentsVotes)
			return
		}
		util.WriteError(w, http.StatusInternalServerError, err)
		return
	}

	util.WriteJSON(w, http.StatusOK, commentsVotes)
}
