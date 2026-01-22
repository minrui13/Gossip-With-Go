package postsRouter

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/gorilla/mux"
	"github.com/jackc/pgx/v5"
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
	//Get all posts
	r.HandleFunc("/allPostsByFilter/{user_id}", h.GetAllPosts).Methods("POST")
	//Get posts by id
	r.HandleFunc("/postsByID/{user_id}/{post_id}", h.GetPostById).Methods("POST")
	//Get most popular posts
	r.HandleFunc("/getPostsByPopularityAndFollow/{user_id}", h.FilterByFollowAndPopularity).Methods("POST")
	//Get most popular posts
	r.HandleFunc("/getPostsByFollow/{user_id}", h.FilterByFollow).Methods("POST")

	return r
}

// Get all posts with user id
func (h *Handler) GetAllPosts(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	query := r.URL.Query()
	limit := query.Get("limit")
	cursorParam := query.Get("cursor")
	search := "%" + query.Get("search") + "%"

	//convert limitQuery to integer (check if valid integer)
	limitQuery, err := strconv.Atoi(limit)
	//check if limit is an integer
	if err != nil {
		util.WriteError(w, http.StatusBadRequest, err)
		return
	}

	//add one for later on to check if there is more post
	limitAddOne := limitQuery + 1
	//get id from params
	//pass in 0 if non signup or login users
	id := mux.Vars(r)["user_id"]
	//convert userID to integer (check if valid integer)
	userID, err := strconv.Atoi(id)
	//check if id is an integer
	if err != nil {
		util.WriteError(w, http.StatusBadRequest, err)
		return
	}

	//check cursor
	var decodedCursor *types.UpvotesPostCursor
	if cursorParam != "" {
		decodedCursor, err = cursor.DecodeUpvoteCursor(cursorParam)
		if err != nil {
			util.WriteError(w, http.StatusBadRequest, err)
			return
		}
	}

	var (
		rows pgx.Rows
	)

	//n this query, it retrieves all the information needed when dispalying the post
	//in top of post information, get number of votes, comments and if user bookmarked the post
	//since user_id starts from 1, if pass in user_id 0, bookmark instantly false
	//order by created date and then add limit and offset
	baseSQLStatement := `SELECT 
		p.post_id,
		u.user_id, 
		u.username, 
		i.image_name, 
		t.topic_name, 
		c.icon_name as category_icon, 
		tags.tag_name, 
		tags.icon_name as tag_icon, 
		tags.description as tag_description, 
		p.title, 
		p.content, 
		p.created_date,
		pvv.post_vote_id as vote_id,
		COALESCE(pv.num_of_upvotes, 0) as num_of_upvotes,
		COALESCE(pv.num_of_downvotes, 0) as num_of_downvotes,
		COALESCE(pvv.vote_type, 0) AS vote_status,
		COALESCE(pc.num_of_comments, 0) AS num_comments,
		pb.post_bookmark_id as bookmark_id, 
		CASE WHEN pb.post_id IS NULL THEN FALSE ELSE TRUE END AS is_bookmarked
		FROM posts p 
		LEFT JOIN tags ON tags.tag_id = p.tag_id
		INNER JOIN users u ON u.user_id = p.author_id
		INNER JOIN profile_image i ON u.image_id = i.image_id
		INNER JOIN topics t ON t.topic_id = p.topic_id
		INNER JOIN categories c ON t.category_id = c.category_id
		LEFT JOIN (
      SELECT post_id, 
      COUNT(post_vote_id) FILTER (WHERE vote_type = 1) as num_of_upvotes,
      COUNT(post_vote_id) FILTER (WHERE vote_type = -1) as num_of_downvotes 
      FROM posts_votes
      GROUP BY post_id
    ) pv ON p.post_id = pv.post_id 
		LEFT JOIN posts_votes pvv ON p.post_id = pvv.post_id AND pvv.user_id = $1
		LEFT JOIN (
      SELECT post_id,
      COUNT(comment_id) as num_of_comments 
      FROM posts_comments
      GROUP BY post_id
    ) pc ON pc.post_id = p.post_id
		LEFT JOIN posts_bookmarks pb ON pb.post_id = p.post_id AND pb.user_id = $1
		WHERE LOWER(p.title) LIKE $2 
		`
	if cursorParam == "" {
		SQLStatement := baseSQLStatement + `
		GROUP BY p.post_id, u.user_id, u.username, i.image_name, t.topic_name, c.icon_name, tags.tag_name, tag_icon, tag_description, p.title, p.content, p.created_date, pb.post_id, pvv.vote_type, vote_id, bookmark_id, pv.num_of_upvotes,
		pv.num_of_downvotes, pc.num_of_comments
		ORDER BY p.created_date DESC, num_of_upvotes DESC
		LIMIT $3`
		rows, err = h.db.Query(ctx, SQLStatement, userID, search, limitAddOne)
	} else {
		SQLStatement := baseSQLStatement + `
		AND (
			p.created_date < $3
			OR (p.created_date = $3 AND num_of_upvotes < $4)
			OR (p.created_date = $3 AND num_of_upvotes = $4)
		)
		GROUP BY p.post_id, u.user_id, u.username, i.image_name, t.topic_name, c.icon_name, tags.tag_name, tag_icon, tag_description, p.title, p.content, p.created_date, pb.post_id, pvv.vote_type, vote_id, bookmark_id, pv.num_of_upvotes,
		pv.num_of_downvotes, pc.num_of_comments
		ORDER BY p.created_date DESC, num_of_upvotes DESC
		LIMIT $5`

		rows, err = h.db.Query(
			ctx,
			SQLStatement,
			userID,
			search,
			decodedCursor.Created_Date,
			decodedCursor.Upvotes_Count,
			limitAddOne,
		)
	}

	//database error 500 status code
	//same as res.send(500)
	if err != nil {
		util.WriteError(w, http.StatusInternalServerError, err)
		return
	}

	var postsArr []types.PostDefaultResult
	for rows.Next() {
		var post types.PostDefaultResult
		var created time.Time

		if err := rows.Scan(&post.Post_ID, &post.User_ID, &post.Username, &post.User_Image, &post.Topic_Name, &post.Category_Icon, &post.Tag_Name, &post.Tag_Icon, &post.Tag_Description,
			&post.Title, &post.Content, &created, &post.Vote_ID, &post.Upvote_Count, &post.Downvote_Count, &post.Vote_Status, &post.Comment_Count, &post.Bookmark_ID, &post.Is_Bookmarked); err != nil {
			util.WriteError(w, http.StatusInternalServerError, err)
			return
		}

		post.Created_Date = created.Format(time.RFC3339)
		postsArr = append(postsArr, post)
	}

	var nextCursor *string
	if len(postsArr) > limitQuery {
		last := postsArr[limitQuery-1]
		c, err := cursor.EncodeUpvoteCursor(types.UpvotesPostCursor{
			Created_Date:  last.Created_Date,
			Upvotes_Count: last.Upvote_Count,
		})
		if err == nil {
			nextCursor = &c
		}
		postsArr = postsArr[:limitQuery]
	} else {
		nextCursor = nil
	}

	util.WriteJSON(w, http.StatusOK, map[string]any{
		"result": postsArr,
		"cursor": nextCursor,
	})
}

// Get all posts by post id
func (h *Handler) GetPostById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	post := new(types.PostDefaultResult)
	var created time.Time
	//get post_id from params
	postID := mux.Vars(r)["post_id"]
	//convert postID to integer (check if valid integer)
	postIDInt, err := strconv.Atoi(postID)
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
	err = h.db.QueryRow(ctx,
		`SELECT 
		p.post_id, 
		u.user_id,
		u.username, 
		i.image_name, 
		t.topic_name, 
		c.icon_name as category_icon, 
		tags.tag_name, 
		tags.icon_name as tag_icon, 
		tags.description as tag_description, 
		p.title, 
		p.content, 
		p.created_date,
		pvv.post_vote_id as vote_id,
		COALESCE(pv.num_of_upvotes, 0) as num_of_upvotes,
		COALESCE(pv.num_of_downvotes, 0) as num_of_downvotes,
		COALESCE(pvv.vote_type, 0) AS vote_status,
		COALESCE(pc.num_of_comments, 0) AS num_comments,
		pb.post_bookmark_id as bookmark_id, 
		CASE WHEN pb.post_id IS NULL THEN FALSE ELSE TRUE END AS is_bookmarked
		FROM posts p
		INNER JOIN topics t ON t.topic_id = p.topic_id
		INNER JOIN users u ON u.user_id = p.author_id
		INNER JOIN profile_image i ON u.image_id = i.image_id
		INNER JOIN categories c ON t.category_id = c.category_id
		LEFT JOIN tags ON tags.tag_id = p.tag_id
		LEFT JOIN (
		SELECT post_id, 
		COUNT(post_vote_id) FILTER (WHERE vote_type = 1) as num_of_upvotes,
		COUNT(post_vote_id) FILTER (WHERE vote_type = -1) as num_of_downvotes 
		FROM posts_votes
		GROUP BY post_id
		) pv ON p.post_id = pv.post_id 
		LEFT JOIN posts_votes pvv ON p.post_id = pvv.post_id AND pvv.user_id = $1
		LEFT JOIN (
		SELECT post_id,
		COUNT(comment_id) as num_of_comments 
		FROM posts_comments
		GROUP BY post_id
		) pc ON pc.post_id = p.post_id
		LEFT JOIN posts_bookmarks pb ON pb.post_id = p.post_id AND pb.user_id = $1
		WHERE p.post_id = $2
		GROUP BY p.post_id, u.username, u.user_id, i.image_name, t.topic_name, c.icon_name, tags.tag_name, tag_icon, tag_description, p.title, p.content, p.created_date, pb.post_id, pvv.vote_type, vote_id, bookmark_id, pv.num_of_upvotes,
    pv.num_of_downvotes, pc.num_of_comments
		ORDER BY p.created_date DESC`,
		userIDInt, postIDInt).
		Scan(&post.Post_ID, &post.User_ID, &post.Username, &post.User_Image, &post.Topic_Name, &post.Category_Icon, &post.Tag_Name, &post.Tag_Icon, &post.Tag_Description,
			&post.Title, &post.Content, &created, &post.Vote_ID, &post.Upvote_Count, &post.Downvote_Count, &post.Vote_Status, &post.Comment_Count, &post.Bookmark_ID, &post.Is_Bookmarked)

	if err != nil {
		util.WriteError(w, http.StatusNotFound, err)
		return
	}

	util.WriteJSON(w, http.StatusOK, post)
}

// main page for login user
// get posts from topics that are under same categories of the topics user follows as well as the most popular posts
// only if user folllows topics with limits
func (h *Handler) FilterByFollowAndPopularity(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	query := r.URL.Query()
	limit := query.Get("limit")
	cursorParam := query.Get("cursor")

	//only verified users can access the data
	//check token and token header
	authToken := r.Header.Get("Authorization")
	//check if authHeader is empty
	if authToken == "" {
		util.WriteError(w, http.StatusUnauthorized, errors.New("Missing authorization header"))
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
	var decodedCursor *types.SumVotesPostCursor
	if cursorParam != "" {
		decodedCursor, err = cursor.DecodeSumVotesCursor(cursorParam)
		if err != nil {
			util.WriteError(w, http.StatusBadRequest, err)
			return
		}
	}

	var (
		rows pgx.Rows
	)
	//get data from db //for main feed
	//first select statement, treat num_followers as null so to make sure it comes first
	//first select statement - get posts from topics that are under same categories of the topics user follows
	//second select statement - most popular posts
	baseSQLStatement := `SELECT * FROM (
    		SELECT DISTINCT
				p.post_id,
				u.user_id,
				u.username, 
				i.image_name, 
				t.topic_name, 
				c.icon_name as category_icon, 
				tags.tag_name, 
				tags.icon_name as tag_icon, 
				tags.description as tag_description, 
				p.title,
				p.content,
				p.created_date,
				pvv.post_vote_id as vote_id,
				COALESCE(pv.num_of_upvotes, 0) as num_of_upvotes,
				COALESCE(pv.num_of_downvotes, 0) as num_of_downvotes,
				0::INT AS sum_of_votes,
				COALESCE(pvv.vote_type, 0) AS vote_status,
				COALESCE(pc.num_of_comments, 0) AS num_comments,
				pb.post_bookmark_id as bookmark_id,
				CASE WHEN pb.post_id IS NULL THEN FALSE ELSE TRUE END AS is_bookmarked
				FROM posts p
				INNER JOIN users u ON u.user_id = p.author_id
				INNER JOIN profile_image i ON u.image_id = i.image_id
				INNER JOIN topics t ON p.topic_id = t.topic_id
				INNER JOIN categories c ON t.category_id = c.category_id
				INNER JOIN topics_followers tf ON tf.topic_id = t.topic_id
				LEFT JOIN tags ON tags.tag_id = p.tag_id
				LEFT JOIN (
					SELECT post_id, 
					COUNT(post_vote_id) FILTER (WHERE vote_type = 1) as num_of_upvotes,
					COUNT(post_vote_id) FILTER (WHERE vote_type = -1) as num_of_downvotes 
					FROM posts_votes
					GROUP BY post_id
    		) pv ON p.post_id = pv.post_id 
				LEFT JOIN posts_votes pvv ON p.post_id = pvv.post_id AND pvv.user_id = $1
				LEFT JOIN (
					SELECT post_id,
					COUNT(comment_id) as num_of_comments 
					FROM posts_comments
					GROUP BY post_id
				) pc ON pc.post_id = p.post_id
				LEFT JOIN posts_bookmarks pb ON pb.post_id = p.post_id AND pb.user_id = $1
				WHERE tf.user_id = $1
				GROUP BY p.post_id, u.user_id, u.username, i.image_name, t.topic_name, c.icon_name, tags.tag_name, tag_icon, tag_description, p.title, p.content, p.created_date, pb.post_id, pvv.vote_type, vote_id, bookmark_id, pv.num_of_upvotes, pv.num_of_downvotes, pc.num_of_comments
    		UNION
			SELECT
				p.post_id,
				u.user_id,
				u.username, 
				i.image_name, 
				t.topic_name, 
				c.icon_name as category_icon, 
				tags.tag_name, 
				tags.icon_name as tag_icon, 
				tags.description as tag_description,
				p.title,
				p.content,
				p.created_date,
				pvv.post_vote_id as vote_id,
				COALESCE(pv.num_of_upvotes, 0) as num_of_upvotes,
				COALESCE(pv.num_of_downvotes, 0) as num_of_downvotes,
				COALESCE(pv.sum_of_votes, 0) AS sum_of_votes,
				COALESCE(pvv.vote_type, 0) AS vote_status,
				COALESCE(pc.num_of_comments, 0) AS num_comments,
				pb.post_bookmark_id as bookmark_id,
				CASE WHEN pb.post_id IS NULL THEN FALSE ELSE TRUE END AS is_bookmarked
				FROM posts p
				INNER JOIN users u ON u.user_id = p.author_id
				INNER JOIN profile_image i ON u.image_id = i.image_id
				INNER JOIN topics t ON p.topic_id = t.topic_id
				INNER JOIN categories c ON t.category_id = c.category_id
				LEFT JOIN (
					SELECT post_id, 
					COUNT(post_vote_id) FILTER (WHERE vote_type = 1) as num_of_upvotes,
					COUNT(post_vote_id) FILTER (WHERE vote_type = -1) as num_of_downvotes,
					SUM(vote_type) as sum_of_votes 
					FROM posts_votes
					GROUP BY post_id
				) pv ON p.post_id = pv.post_id 
				LEFT JOIN posts_votes pvv ON p.post_id = pvv.post_id AND pvv.user_id = $1
				LEFT JOIN (
					SELECT post_id,
					COUNT(comment_id) as num_of_comments 
					FROM posts_comments
					GROUP BY post_id
				) pc ON pc.post_id = p.post_id
				LEFT JOIN tags ON tags.tag_id = p.tag_id
				LEFT JOIN posts_bookmarks pb ON pb.post_id = p.post_id AND pb.user_id = $1
				WHERE t.visibility = 'public'
				GROUP BY p.post_id, u.user_id, u.username, t.topic_name, i.image_name, c.icon_name,tags.tag_name, p.title, p.content, p.created_date, pb.post_id, pvv.vote_type, vote_id, bookmark_id, tag_icon, tag_description, pv.num_of_upvotes, pv.num_of_downvotes, pc.num_of_comments, pv.sum_of_votes
		) main_feed_post
		`

	if cursorParam == "" {
		//if ?cursor= gives empty string
		SQLStatement := baseSQLStatement + `ORDER BY created_date DESC, sum_of_votes DESC
		LIMIT $2`
		rows, err = h.db.Query(ctx, SQLStatement, userID, limitAddOne)
	} else {
		SQLStatement := baseSQLStatement + `
		WHERE (
			created_date < $2
			OR (created_date = $2 AND sum_of_votes < $3)
			OR (created_date = $2 AND sum_of_votes = $3)
		)
		ORDER BY created_date DESC, sum_of_votes DESC
		LIMIT $4`
		rows, err = h.db.Query(ctx, SQLStatement, userID,
			decodedCursor.Created_Date,
			decodedCursor.Sum_Votes_Count,
			limitAddOne)
	}

	//database error 500 status code
	//same as res.send(500)
	if err != nil {
		util.WriteError(w, http.StatusInternalServerError, err)
		return
	}

	postsArr := make([]types.PostByFollowPopularityResult, 0)
	for rows.Next() {
		var post types.PostByFollowPopularityResult
		var created time.Time

		if err := rows.Scan(&post.Post_ID, &post.User_ID, &post.Username, &post.User_Image, &post.Topic_Name, &post.Category_Icon, &post.Tag_Name, &post.Tag_Icon, &post.Tag_Description,
			&post.Title, &post.Content, &created, &post.Vote_ID, &post.Upvote_Count, &post.Downvote_Count, &post.Sum_Votes, &post.Vote_Status, &post.Comment_Count, &post.Bookmark_ID, &post.Is_Bookmarked); err != nil {
			util.WriteError(w, http.StatusInternalServerError, err)
			return
		}

		post.Created_Date = created.Format(time.RFC3339)
		postsArr = append(postsArr, post)
	}

	var nextCursor *string
	if len(postsArr) > limitQuery {
		last := postsArr[limitQuery-1]
		c, err := cursor.EncodeSumVotesCursor(types.SumVotesPostCursor{
			Created_Date:    last.Created_Date,
			Sum_Votes_Count: last.Sum_Votes,
		})
		if err == nil {
			nextCursor = &c
		}
		postsArr = postsArr[:limitQuery]
	} else {
		nextCursor = nil
	}

	util.WriteJSON(w, http.StatusOK, map[string]any{
		"result": postsArr,
		"cursor": nextCursor,
	})
}

// for the for you tab just for post under topics user follow
func (h *Handler) FilterByFollow(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	query := r.URL.Query()
	limit := query.Get("limit")
	cursorParam := query.Get("cursor")

	//only verified users can access the data
	//check token and token header
	authToken := r.Header.Get("Authorization")
	//check if authHeader is empty
	if authToken == "" {
		util.WriteError(w, http.StatusUnauthorized, errors.New("Missing authorization header"))
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

	var payload types.PostByFollowPayload
	err = json.NewDecoder(r.Body).Decode(&payload)

	//check username
	if err != nil {
		util.WriteError(w, http.StatusBadRequest, err)
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
	var decodedCursor *types.DatePostCursor
	if cursorParam != "" {
		decodedCursor, err = cursor.DecodeDateCursor(cursorParam)
		if err != nil {
			util.WriteError(w, http.StatusBadRequest, err)
			return
		}
	}

	var (
		rows pgx.Rows
	)

	//get data from db //for main feed
	//first select statement, treat num_followers as null so to make sure it comes first
	//first select statement - get posts from topics that are under same categories of the topics user follows
	//second select statement - most popular posts
	baseSQLStatement := `SELECT DISTINCT
		p.post_id,
		u.user_id,
		u.username, 
		i.image_name, 
		t.topic_name, 
		c.icon_name as category_icon, 
		tags.tag_name, 
		tags.icon_name as tag_icon, 
		tags.description as tag_description,
		p.title,
		p.content,
		p.created_date,
		pvv.post_vote_id as vote_id, 
		COALESCE(SUM(CASE WHEN pv.vote_type = 1 THEN 1 ELSE 0 END), 0) AS num_of_upvotes,
		COALESCE(SUM(CASE WHEN pv.vote_type = 0 THEN 1 ELSE 0 END), 0) AS num_of_downvotes,
		COALESCE(COUNT(DISTINCT pv.post_vote_id), 0) AS num_of_votes,
		COALESCE(pvv.vote_type, 0) AS vote_status,
		COALESCE(COUNT(DISTINCT pc.comment_id), 0) AS num_comments,
		pb.post_bookmark_id as bookmark_id, 
		CASE 
			WHEN pb.post_id IS NULL 
			THEN FALSE ELSE TRUE 
    	END AS is_bookmarked
		FROM posts p
		LEFT JOIN tags ON tags.tag_id = p.tag_id
		INNER JOIN users u ON u.user_id = p.author_id
		INNER JOIN profile_image i ON i.image_id = u.image_id
		INNER JOIN topics t ON t.topic_id = p.topic_id
		INNER JOIN categories c ON t.category_id = c.category_id
		LEFT JOIN posts_votes pv ON p.post_id = pv.post_id 
		LEFT JOIN posts_votes pvv ON pvv.post_id = p.post_id AND pvv.user_id = $1
		LEFT JOIN posts_comments pc ON pc.post_id = p.post_id
		LEFT JOIN posts_bookmarks pb ON pb.post_id = p.post_id AND pb.user_id = $1
		INNER JOIN topics_followers tf ON tf.topic_id = t.topic_id
		WHERE tf.user_id = $1
		`
	//if no cursor param. first batch
	if cursorParam == "" {
		SQLStatement := baseSQLStatement + `
		ORDER BY p.created_date DESC 
		LIMIT $2`
		rows, err = h.db.Query(ctx, SQLStatement, userID, limitAddOne)
	} else {
		SQLStatement := baseSQLStatement + `
		AND (
			p.created_date < $2
			OR p.created_date = $2
		)
		ORDER BY p.created_date DESC 
		LIMIT $3`

		rows, err = h.db.Query(
			ctx,
			SQLStatement,
			userID,
			decodedCursor.Created_Date,
			limitAddOne,
		)
	}

	//database error 500 status code
	//same as res.send(500)
	if err != nil {
		util.WriteError(w, http.StatusInternalServerError, err)
		return
	}

	postsArr := make([]types.PostDefaultResult, 0)
	for rows.Next() {
		var post types.PostDefaultResult
		var created time.Time

		if err := rows.Scan(&post.Post_ID, &post.User_ID, &post.Username, &post.User_Image, &post.Topic_Name, &post.Category_Icon, &post.Tag_Name, &post.Tag_Icon, &post.Tag_Description,
			&post.Title, &post.Content, &created, &post.Vote_ID, &post.Upvote_Count, &post.Downvote_Count, &post.Vote_Status, &post.Comment_Count, &post.Bookmark_ID, &post.Is_Bookmarked); err != nil {
			util.WriteError(w, http.StatusInternalServerError, err)
			return
		}

		post.Created_Date = created.Format(time.RFC3339)
		postsArr = append(postsArr, post)
	}

	var nextCursor *string
	if len(postsArr) > limitQuery {
		last := postsArr[limitQuery-1]
		c, err := cursor.EncodeDateCursor(types.DatePostCursor{
			Created_Date: last.Created_Date,
		})
		if err == nil {
			nextCursor = &c
		}
		postsArr = postsArr[:limitQuery]
	} else {
		nextCursor = nil
	}

	util.WriteJSON(w, http.StatusOK, map[string]any{
		"result": postsArr,
		"cursor": nextCursor,
	})
}
