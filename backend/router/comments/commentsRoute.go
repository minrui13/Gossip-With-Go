package commentsRouter

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/gorilla/mux"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/minrui13/backend/cursor"
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
	//Get all comments (Only comments, no reply)
	r.HandleFunc("/GetCommentsByPostID/{user_id}/{post_id}", h.GetMainCommentsByPostID).Methods("POST")
	r.HandleFunc("/GetReplyByCommentID/{user_id}/{parent_comment_id}", h.GetReplyByCommentId).Methods("POST")
	r.HandleFunc("/AddNewComment/{user_id}/{post_id}/{parent_comment_id}", h.AddComment).Methods("POST")
	r.HandleFunc("/UpdateComment/{comment_id}", h.UpdateComment).Methods("PUT")
	r.HandleFunc("/DeleteComment/{comment_id}", h.DeleteComment).Methods("DELETE")

	return r
}

// Get comments by post id
func (h *Handler) GetMainCommentsByPostID(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	//use query to filter
	query := r.URL.Query()
	limit := query.Get("limit")
	cursorParam := query.Get("cursor")
	sortBy := query.Get("sortBy")

	//get post_id from params
	postID := mux.Vars(r)["post_id"]
	//convert postID to integer (check if valid integer)
	postIDInt, err := strconv.Atoi(postID)
	//check if id is an integer
	if err != nil {
		util.WriteError(w, http.StatusBadRequest, err)
		return
	}

	//get id from params
	id := mux.Vars(r)["user_id"]
	//convert userID to integer (check if valid integer)
	userID, err := strconv.Atoi(id)
	//check if id is an integer
	if err != nil {
		util.WriteError(w, http.StatusBadRequest, err)
		return
	}

	var commentCount int

	err = h.db.QueryRow(ctx, `
	SELECT COUNT(comment_id) 
	FROM posts_comments
	WHERE post_id = $1 AND parent_comment_id IS NULL
	GROUP BY post_id`, postIDInt).Scan(&commentCount)

	//database error 500 status code
	//same as res.send(500)
	if err != nil {
		util.WriteError(w, http.StatusInternalServerError, err)
		return
	}

	//convert limitQuery to integer (check if valid integer)
	limitQuery, err := strconv.Atoi(limit)
	//check if limit is an integer
	if err != nil {
		util.WriteError(w, http.StatusBadRequest, err)
		return
	}
	//add one for later on to check if there is more post
	limitAddOne := limitQuery + 1

	//check cursor
	var decodedCursor any
	if cursorParam != "" {

		decodedCursor, err = cursor.DecodeSumVotesDateCursor(cursorParam)

		if err != nil {
			util.WriteError(w, http.StatusBadRequest, err)
			return
		}
	}
	var (
		rows pgx.Rows
	)

	//get comments with upvotes and downvotes and replies
	//only if comments are under limit 10
	baseSQLStatement := `SELECT
		pc.comment_id,
		pc.user_id,
		u.username,
		u.display_name,
		i.image_name,
		pc.post_id,
		pc.parent_comment_id,
		pc.content,
		pc.created_date,
		cvv.comment_vote_id as vote_id,
		COALESCE(cv.num_of_upvotes, 0) as num_of_upvotes,
		COALESCE(cv.num_of_downvotes, 0) as num_of_downvotes,
		COALESCE(cv.sum_of_votes, 0) as sum_of_votes,
		COALESCE(cvv.vote_type, 0) AS vote_status,
		COALESCE(cc.num_of_replies, 0) as num_of_replies
		FROM posts_comments pc
		INNER JOIN users u ON u.user_id = pc.user_id
		INNER JOIN profile_image i ON i.image_id = u.image_id
		LEFT JOIN (
		SELECT comment_id,
		COUNT(comment_id) FILTER (WHERE vote_type = 1) as num_of_upvotes,
		COUNT(comment_id) FILTER (WHERE vote_type = -1) as num_of_downvotes,
		SUM(vote_type) as sum_of_votes
		FROM comments_votes
		GROUP BY comment_id
		) cv ON cv.comment_id = pc.comment_id
		LEFT JOIN (
		SELECT parent_comment_id, 
		COUNT(comment_id) as num_of_replies
		FROM posts_comments 
		WHERE parent_comment_id IS NOT NULL
		GROUP BY parent_comment_id
		) cc ON cc.parent_comment_id = pc.comment_id
		LEFT JOIN comments_votes cvv ON cvv.comment_id = pc.comment_id AND cvv.user_id = $1
		WHERE pc.post_id =  $2
		`

	if commentCount > 10 {
		baseSQLStatement += ` AND pc.parent_comment_id IS NULL `
	}

	if cursorParam == "" {
		var orderStatement string
		switch sortBy {
		case "new":
			orderStatement = `  ORDER BY pc.created_date DESC,  COALESCE(cv.sum_of_votes,0) DESC, COALESCE(cc.num_of_replies,0) DESC, pc.comment_id DESC  `
		default:
			orderStatement = ` ORDER BY sum_of_votes DESC, COALESCE(cc.num_of_replies,0) DESC, pc.created_date DESC,  pc.comment_id DESC `
		}
		SQLStatement := baseSQLStatement + orderStatement + ` LIMIT $3`

		rows, err = h.db.Query(ctx, SQLStatement, userID, postIDInt, limitAddOne)
	} else {
		d := decodedCursor.(*types.SumVotesDateCursor)
		switch sortBy {
		case "new":
			SQLStatement := baseSQLStatement + `
				AND (
					pc.created_date < $3
					OR (pc.created_date = $3 AND COALESCE(cv.sum_of_votes,0) < $4)
					OR (pc.created_date = $3 AND COALESCE(cv.sum_of_votes,0) = $4 AND COALESCE(cc.num_of_replies, 0) < $5)
					OR (pc.created_date = $3 AND COALESCE(cv.sum_of_votes,0) = $4 AND COALESCE(cc.num_of_replies, 0) = $5 AND pc.comment_id <$6)
				)
				ORDER BY pc.created_date DESC, COALESCE(cv.sum_of_votes,0) DESC, COALESCE(cc.num_of_replies,0) DESC, pc.comment_id DESC
				LIMIT $7`

			rows, err = h.db.Query(
				ctx,
				SQLStatement,
				userID,
				postIDInt,
				d.Created_Date,
				d.Sum_Votes_Count,
				d.Comment_Count,
				d.Comment_ID,
				limitAddOne,
			)
		default:
			SQLStatement := baseSQLStatement + `
			AND (
				COALESCE(cv.sum_of_votes,0) < $3
				OR ( COALESCE(cv.sum_of_votes,0) = $3 AND COALESCE(cc.num_of_replies,0) < $4)
				OR ( COALESCE(cv.sum_of_votes,0) = $3 AND COALESCE(cc.num_of_replies,0) = $4 AND pc.created_date < $5)
				OR ( COALESCE(cv.sum_of_votes,0) = $3 AND COALESCE(cc.num_of_replies,0) = $4 AND pc.created_date = $5 AND pc.comment_id < $6)
			)
			ORDER BY COALESCE(cv.sum_of_votes,0) DESC, COALESCE(cc.num_of_replies,0) DESC, pc.created_date DESC, pc.comment_id DESC
			LIMIT $7`
			rows, err = h.db.Query(
				ctx,
				SQLStatement,
				userID,
				postIDInt,
				d.Sum_Votes_Count,
				d.Comment_Count,
				d.Created_Date,
				d.Comment_ID,
				limitAddOne,
			)
		}
	}

	//database error 500 status code
	//same as res.send(500)
	if err != nil {
		util.WriteError(w, http.StatusInternalServerError, err)
		return
	}

	commentsArr := make([]types.CommentDefaultType, 0)
	for rows.Next() {
		var comment types.CommentDefaultType
		var created time.Time

		if err := rows.Scan(&comment.Comment_ID, &comment.User_ID, &comment.Username, &comment.DisplayName, &comment.Image_Name, &comment.Post_ID,
			&comment.Parent_Comment_ID, &comment.Content, &created, &comment.Vote_ID, &comment.Upvote_Count, &comment.Downvote_Count,
			&comment.Sum_Votes, &comment.Vote_Status, &comment.Reply_Count); err != nil {
			util.WriteError(w, http.StatusInternalServerError, err)
			return
		}

		comment.Created_Date = created.Format(time.RFC3339)
		commentsArr = append(commentsArr, comment)
	}

	var nextCursor *string
	if len(commentsArr) > limitQuery {
		last := commentsArr[limitQuery-1]
		c, err := cursor.EncodeSumVotesDateCursor(types.SumVotesDateCursor{
			Created_Date:    last.Created_Date,
			Sum_Votes_Count: last.Sum_Votes,
			Comment_Count:   last.Reply_Count,
			Comment_ID:      &last.Comment_ID,
		})
		if err == nil {
			nextCursor = &c
		}
		commentsArr = commentsArr[:limitQuery]
	} else {
		nextCursor = nil
	}

	util.WriteJSON(w, http.StatusOK, map[string]any{
		"result": commentsArr,
		"cursor": nextCursor,
	})
}

// Get replies by comment id
func (h *Handler) GetReplyByCommentId(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	//get parent_comment_id from params
	parentCommentID := mux.Vars(r)["parent_comment_id"]
	//convert postID to integer (check if valid integer)
	parentCommentIDInt, err := strconv.Atoi(parentCommentID)
	//check if id is an integer
	if err != nil {
		util.WriteError(w, http.StatusBadRequest, err)
		return
	}

	//get user_id from params
	userID := mux.Vars(r)["user_id"]
	//convert userID to integer (check if valid integer)
	userIDInt, err := strconv.Atoi(userID)
	//check if id is an integer
	if err != nil {
		util.WriteError(w, http.StatusBadRequest, err)
		return
	}

	//get data from db
	rows, err := h.db.Query(ctx,
		`
		WITH RECURSIVE all_replies AS (
			SELECT 
			pc.comment_id,
			pc.user_id,
			u.username,
			u.display_name,
			i.image_name,
			pc.post_id,
			pc.parent_comment_id,
			pc.content,
			pc.created_date,
			cvv.comment_vote_id as vote_id,
			COALESCE(cv.num_of_upvotes, 0) as num_of_upvotes,
			COALESCE(cv.num_of_downvotes, 0) as num_of_downvotes,
			COALESCE(cv.sum_of_votes, 0) as sum_of_votes,
			COALESCE(cvv.vote_type, 0) AS vote_status,
			COALESCE(cc.num_of_replies, 0) as num_of_replies
			FROM posts_comments pc
			INNER JOIN users u ON u.user_id = pc.user_id
			INNER JOIN profile_image i ON i.image_id = u.image_id
			LEFT JOIN (
			SELECT comment_id,
			COUNT(comment_id) FILTER (WHERE vote_type = 1) as num_of_upvotes,
			COUNT(comment_id) FILTER (WHERE vote_type = -1) as num_of_downvotes,
			SUM(vote_type) as sum_of_votes
			FROM comments_votes
			GROUP BY comment_id
			) cv ON cv.comment_id = pc.comment_id
			LEFT JOIN (
			SELECT parent_comment_id, 
			COUNT(comment_id) as num_of_replies
			FROM posts_comments 
			WHERE parent_comment_id IS NOT NULL
			GROUP BY parent_comment_id
			) cc ON cc.parent_comment_id = pc.comment_id
			LEFT JOIN comments_votes cvv ON cvv.comment_id = pc.comment_id AND cvv.user_id = $1
			WHERE pc.parent_comment_id = $2 
			
			UNION ALL

			SELECT 
			pc.comment_id,
			pc.user_id,
			u.username,
			u.display_name,
			i.image_name,
			pc.post_id,
			pc.parent_comment_id,
			pc.content,
			pc.created_date,
			cvv.comment_vote_id as vote_id,
			COALESCE(cv.num_of_upvotes, 0) as num_of_upvotes,
			COALESCE(cv.num_of_downvotes, 0) as num_of_downvotes,
			COALESCE(cv.sum_of_votes, 0) as sum_of_votes,
			COALESCE(cvv.vote_type, 0) AS vote_status,
			COALESCE(cc.num_of_replies, 0) as num_of_replies
			FROM posts_comments pc
			INNER JOIN users u ON u.user_id = pc.user_id
			INNER JOIN profile_image i ON i.image_id = u.image_id
			LEFT JOIN (
			SELECT comment_id,
			COUNT(comment_id) FILTER (WHERE vote_type = 1) as num_of_upvotes,
			COUNT(comment_id) FILTER (WHERE vote_type = -1) as num_of_downvotes,
			SUM(vote_type) as sum_of_votes
			FROM comments_votes
			GROUP BY comment_id
			) cv ON cv.comment_id = pc.comment_id
			LEFT JOIN (
			SELECT parent_comment_id, 
			COUNT(comment_id) as num_of_replies
			FROM posts_comments 
			WHERE parent_comment_id IS NOT NULL
			GROUP BY parent_comment_id
			) cc ON cc.parent_comment_id = pc.comment_id
			LEFT JOIN comments_votes cvv ON cvv.comment_id = pc.comment_id AND cvv.user_id = $1
			INNER JOIN all_replies ar ON pc.parent_comment_id = ar.comment_id
		)
		SELECT *
		FROM all_replies
		ORDER BY created_date ASC`,
		userIDInt, parentCommentIDInt)

	//database error 500 status code
	//same as res.send(500)
	if err != nil {
		util.WriteError(w, http.StatusNotFound, err)
		return
	}

	commentsArr := make([]types.CommentDefaultType, 0)

	for rows.Next() {
		var comment types.CommentDefaultType
		var created time.Time

		if err := rows.Scan(&comment.Comment_ID, &comment.User_ID, &comment.Username, &comment.DisplayName, &comment.Image_Name, &comment.Post_ID,
			&comment.Parent_Comment_ID, &comment.Content, &created, &comment.Vote_ID, &comment.Upvote_Count, &comment.Downvote_Count,
			&comment.Sum_Votes, &comment.Vote_Status, &comment.Reply_Count); err != nil {
			util.WriteError(w, http.StatusInternalServerError, err)
			return
		}

		comment.Created_Date = created.Format(time.RFC3339)
		commentsArr = append(commentsArr, comment)
	}

	util.WriteJSON(w, http.StatusOK, commentsArr)
}

// Get comment by comment id
func (h *Handler) GetCommentByCommentId(ctx context.Context, payload *types.CommentUserId) (*types.CommentDefaultType, error) {

	comment := new(types.CommentDefaultType)
	var created time.Time
	//get data from db
	err := h.db.QueryRow(ctx,
		`
			SELECT 
			pc.comment_id,
			pc.user_id,
			u.username,
			u.display_name,
			i.image_name,
			pc.post_id,
			pc.parent_comment_id,
			pc.content,
			pc.created_date,
			cvv.comment_vote_id as vote_id,
			COALESCE(cv.num_of_upvotes, 0) as num_of_upvotes,
			COALESCE(cv.num_of_downvotes, 0) as num_of_downvotes,
			COALESCE(cv.sum_of_votes, 0) as sum_of_votes,
			COALESCE(cvv.vote_type, 0) AS vote_status,
			COALESCE(cc.num_of_replies, 0) as num_of_replies
			FROM posts_comments pc
			INNER JOIN users u ON u.user_id = pc.user_id
			INNER JOIN profile_image i ON i.image_id = u.image_id
			LEFT JOIN (
			SELECT comment_id,
			COUNT(comment_id) FILTER (WHERE vote_type = 1) as num_of_upvotes,
			COUNT(comment_id) FILTER (WHERE vote_type = -1) as num_of_downvotes,
			SUM(vote_type) as sum_of_votes
			FROM comments_votes
			GROUP BY comment_id
			) cv ON cv.comment_id = pc.comment_id
			LEFT JOIN (
			SELECT parent_comment_id, 
			COUNT(comment_id) as num_of_replies
			FROM posts_comments 
			WHERE parent_comment_id IS NOT NULL
			GROUP BY parent_comment_id
			) cc ON cc.parent_comment_id = pc.comment_id
			LEFT JOIN comments_votes cvv ON cvv.comment_id = pc.comment_id AND cvv.user_id = $1
			WHERE pc.comment_id = $2 
			`, payload.User_ID, payload.Comment_ID).Scan(&comment.Comment_ID, &comment.User_ID, &comment.Username, &comment.DisplayName, &comment.Image_Name, &comment.Post_ID,
		&comment.Parent_Comment_ID, &comment.Content, &created, &comment.Vote_ID, &comment.Upvote_Count, &comment.Downvote_Count,
		&comment.Sum_Votes, &comment.Vote_Status, &comment.Reply_Count)

	comment.Created_Date = created.Format(time.RFC3339)
	if err != nil {
		return nil, err
	}

	return comment, nil
}

// Add new comment
func (h *Handler) AddComment(w http.ResponseWriter, r *http.Request) {
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

	//get post_id from params
	parentCommentID := mux.Vars(r)["parent_comment_id"]
	var parentCommentIDInt *int
	if parentCommentID != "null" {
		//convert postID to integer (check if valid integer)
		parentCommentIDNum, err := strconv.Atoi(parentCommentID)
		//check if postID is an integer
		if err != nil {
			util.WriteError(w, http.StatusBadRequest, err)
			return
		}
		parentCommentIDInt = &parentCommentIDNum
	}

	var payload types.CommentContent
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		util.WriteError(w, http.StatusBadRequest, err)
		return
	}

	var newCommentID int
	//get data from db
	err = h.db.QueryRow(ctx,
		`INSERT INTO posts_comments
		(user_id, post_id, parent_comment_id, content)
		VALUES ($1, $2, $3, $4) RETURNING comment_id`,
		userIDInt, postIDInt, parentCommentIDInt, payload.Content).Scan(&newCommentID)

	if err != nil {
		util.WriteError(w, http.StatusInternalServerError, err)
		return
	}

	getCommentPayload := new(types.CommentUserId)
	getCommentPayload.User_ID = userIDInt
	getCommentPayload.Comment_ID = newCommentID
	newParentReply, err := h.GetCommentByCommentId(ctx, getCommentPayload)

	if err != nil {
		util.WriteError(w, http.StatusInternalServerError, err)
		return
	}

	util.WriteJSON(w, http.StatusCreated, newParentReply)
}

// Update new comment
func (h *Handler) UpdateComment(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	//only verified users can access the data
	//check token and token header
	authToken := r.Header.Get("Authorization")
	//check if authHeader is empty
	if authToken == "" {
		util.WriteError(w, http.StatusUnauthorized, errors.New("Missing authorization header"))
		return
	}

	//get comment_id from params
	commentID := mux.Vars(r)["comment_id"]
	//convert commentID to integer (check if valid integer)
	commentIDInt, err := strconv.Atoi(commentID)
	//check if commentID is an integer
	if err != nil {
		util.WriteError(w, http.StatusBadRequest, err)
		return
	}

	var payload types.CommentContent
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		util.WriteError(w, http.StatusBadRequest, err)
		return
	}

	getCommentPayload := new(types.CommentUserId)

	//get data from db
	err = h.db.QueryRow(ctx,
		`UPDATE posts_comments
			SET content = $1,
			WHERE comment_id = $2
			RETURNING parent_comment_id, user_id`,
		payload.Content, commentIDInt).Scan(getCommentPayload.Comment_ID, getCommentPayload.User_ID)

	if pgErr, ok := err.(*pgconn.PgError); ok && pgErr.Code == "23505" {
		util.WriteError(w, http.StatusConflict, pgErr)
		return
	}

	if err != nil {
		util.WriteError(w, http.StatusInternalServerError, err)
		return
	}

	newParentReply, err := h.GetCommentByCommentId(ctx, getCommentPayload)

	if err != nil {
		util.WriteError(w, http.StatusInternalServerError, err)
		return
	}

	util.WriteJSON(w, http.StatusCreated, newParentReply)
}

// Delete new comment
func (h *Handler) DeleteComment(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	//only verified users can access the data
	//check token and token header
	authToken := r.Header.Get("Authorization")
	//check if authHeader is empty
	if authToken == "" {
		util.WriteError(w, http.StatusUnauthorized, errors.New("Missing authorization header"))
		return
	}

	//get comment_id from params
	commentID := mux.Vars(r)["comment_id"]
	//convert commentID to integer (check if valid integer)
	commentIDInt, err := strconv.Atoi(commentID)
	//check if commentID is an integer
	if err != nil {
		util.WriteError(w, http.StatusBadRequest, err)
		return
	}

	getCommentPayload := new(types.CommentUserId)

	//get data from db
	err = h.db.QueryRow(ctx,
		`DELETE FROM posts_comments WHERE comment_id=$1
			RETURNING parent_comment_id, user_id`,
		commentIDInt).Scan(getCommentPayload.Comment_ID, getCommentPayload.User_ID)

	if pgErr, ok := err.(*pgconn.PgError); ok && pgErr.Code == "23505" {
		util.WriteError(w, http.StatusConflict, pgErr)
		return
	}

	if err != nil {
		util.WriteError(w, http.StatusInternalServerError, err)
		return
	}

	newParentReply, err := h.GetCommentByCommentId(ctx, getCommentPayload)

	if err != nil {
		util.WriteError(w, http.StatusInternalServerError, err)
		return
	}

	util.WriteJSON(w, http.StatusCreated, newParentReply)
}
