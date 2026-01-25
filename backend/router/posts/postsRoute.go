package postsRouter

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"net/url"
	"strconv"
	"strings"
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
	//Get all posts by topic_id
	r.HandleFunc("/allPostsByTopic/{topic_id}/{user_id}", h.GetAllPostsByTopicID).Methods("POST")
	//Get post by id
	r.HandleFunc("/getPostByID/{user_id}", h.GetPostById).Methods("POST")
	//Get post by url
	r.HandleFunc("/getPostByURL/{user_id}/{post_url}", h.GetPostByURL).Methods("POST")
	//Get most popular posts
	r.HandleFunc("/getPostsByPopularityAndFollow/{user_id}", h.FilterByFollowAndPopularity).Methods("POST")
	//Get posts from topics that user follows
	r.HandleFunc("/getPostsByFollow/{user_id}", h.FilterByFollow).Methods("POST")
	//Add posts
	r.HandleFunc("/addPost/{topic_id}/{user_id}", h.AddPost).Methods("POST")
	//Update posts
	r.HandleFunc("/updatePost/{post_id}", h.UpdatePost).Methods("PUT")
	//Delete posts
	r.HandleFunc("/deletePost/{post_id}", h.DeletePost).Methods("DELETE")

	return r
}

// Get all posts by search, sort and cursor
func (h *Handler) GetAllPosts(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	query := r.URL.Query()
	limit := query.Get("limit")
	cursorParam := query.Get("cursor")
	sortBy := query.Get("sortBy")
	search := query.Get("search")
	search, err := url.QueryUnescape(search)

	if err != nil {
		util.WriteError(w, http.StatusBadRequest, err)
		return
	}

	search = "%" + strings.ToLower(search) + "%"

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
	var decodedCursor any
	if cursorParam != "" {
		//buzzing - post =  then sum_of_votes then created date first
		//sum of votes over num of upvotes because a post can have a lot of upvotes
		//but the downvotes might contradict whether it is actally the best
		//new -  post =   then created date first then sum_of_votes
		switch sortBy {
		case "alpha":
			decodedCursor, err = cursor.DecodeAlphaCursor(cursorParam)
		default:
			decodedCursor, err = cursor.DecodeSumVotesDateCursor(cursorParam)
		}

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
		p.post_url,
		u.user_id, 
		u.username, 
		u.display_name,
		i.image_name, 
		t.topic_id, 
		t.creator_id, 
		t.topic_name, 
		t.topic_url,
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
		COALESCE(pc.num_of_comments, 0) AS num_of_comments,
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
		LEFT JOIN posts_bookmarks pb ON pb.post_id = p.post_id AND pb.user_id = $1
		WHERE LOWER(p.title) LIKE $2 
		`
	if cursorParam == "" {
		var orderStatement string
		switch sortBy {
		case "new":
			orderStatement = `  ORDER BY p.created_date DESC, COALESCE(pv.sum_of_votes,0) DESC, COALESCE(pc.num_of_comments, 0) DESC, p.post_id DESC `
		case "alpha":
			orderStatement = ` ORDER BY p.title ASC,  p.created_date DESC`
		default:
			orderStatement = ` ORDER BY COALESCE(pv.sum_of_votes,0) DESC, COALESCE(pc.num_of_comments, 0) DESC, p.created_date DESC, p.post_id DESC  `
		}
		SQLStatement := baseSQLStatement + `
		GROUP BY p.post_id, p.post_url, u.user_id, u.username, u.display_name, i.image_name, t.topic_id, t.creator_id, t.topic_name, t.topic_url, c.icon_name, tags.tag_name, tag_icon, tag_description, p.title, p.content, p.created_date, pb.post_id, pvv.vote_type, vote_id, bookmark_id, pv.num_of_upvotes,
		pv.num_of_downvotes, pc.num_of_comments, pv.sum_of_votes ` + orderStatement + ` LIMIT $3`
		rows, err = h.db.Query(ctx, SQLStatement, userID, search, limitAddOne)
	} else {
		switch d := decodedCursor.(type) {
		case *types.SumVotesDateCursor:
			var SQLStatement string
			d = decodedCursor.(*types.SumVotesDateCursor)
			switch sortBy {
			case "new":
				SQLStatement = baseSQLStatement + `
				AND (
					p.created_date < $3
					OR (p.created_date = $3 AND COALESCE(pv.sum_of_votes,0) < $4)
					OR (p.created_date = $3 AND COALESCE(pv.sum_of_votes,0) = $4 AND COALESCE(pc.num_of_comments, 0) < $5)
					OR (p.created_date = $3 AND COALESCE(pv.sum_of_votes,0) = $4 AND COALESCE(pc.num_of_comments, 0) = $5 AND p.post_id < $6)
				)
				GROUP BY p.post_id, p.post_url, u.user_id, u.username, u.display_name, i.image_name, t.topic_id, t.creator_id, t.topic_name, t.topic_url, c.icon_name, tags.tag_name, tag_icon, tag_description, p.title, p.content, p.created_date, pb.post_id, pvv.vote_type, vote_id, bookmark_id, pv.num_of_upvotes,
				pv.num_of_downvotes, pc.num_of_comments, pv.sum_of_votes
				ORDER BY p.created_date DESC, COALESCE(pv.sum_of_votes,0) DESC, COALESCE(pc.num_of_comments, 0) DESC, p.post_id DESC LIMIT $7`
				rows, err = h.db.Query(
					ctx,
					SQLStatement,
					userID,
					search,
					d.Created_Date,
					d.Sum_Votes_Count,
					d.Comment_Count,
					d.Post_ID,
					limitAddOne,
				)
			default:
				SQLStatement = baseSQLStatement + `
				AND (
					COALESCE(pv.sum_of_votes,0) < $3
					OR (COALESCE(pv.sum_of_votes,0) = $3 AND COALESCE(pc.num_of_comments, 0) < $4)
					OR (COALESCE(pv.sum_of_votes,0) = $3 AND COALESCE(pc.num_of_comments, 0) = $4 AND p.created_date < $5)
					OR (COALESCE(pv.sum_of_votes,0) = $3 AND COALESCE(pc.num_of_comments, 0) = $4 AND p.created_date = $5 AND p.post_id < $6)
				)
				GROUP BY p.post_id, p.post_url, u.user_id, u.username, u.display_name, i.image_name,t.topic_id, t.creator_id, t.topic_name, t.topic_url, c.icon_name, tags.tag_name, tag_icon, tag_description, p.title, p.content, p.created_date, pb.post_id, pvv.vote_type, vote_id, bookmark_id, pv.num_of_upvotes,
				pv.num_of_downvotes, pc.num_of_comments, pv.sum_of_votes
				ORDER BY COALESCE(pv.sum_of_votes,0) DESC, COALESCE(pc.num_of_comments, 0) DESC, p.created_date DESC, p.post_id DESC
				LIMIT $7
			`
				rows, err = h.db.Query(
					ctx,
					SQLStatement,
					userID,
					search,
					d.Sum_Votes_Count,
					d.Comment_Count,
					d.Created_Date,
					d.Post_ID,
					limitAddOne,
				)
			}
		case *types.AlphaDateCursor:
			d = decodedCursor.(*types.AlphaDateCursor)
			SQLStatement := baseSQLStatement + `
			AND (
				p.title > $4
				OR (p.title = $4 AND p.created_date < $3)
			)
			GROUP BY p.post_id, p.post_url, u.user_id, u.username, u.display_name, i.image_name, t.topic_id, t.creator_id, t.topic_name, t.topic_url, c.icon_name, tags.tag_name, tag_icon, tag_description, p.title, p.content, p.created_date, pb.post_id, pvv.vote_type, vote_id, bookmark_id, pv.num_of_upvotes,
			pv.num_of_downvotes, pc.num_of_comments, pv.sum_of_votes
			ORDER BY p.title ASC, p.created_date DESC
			LIMIT $5`
			rows, err = h.db.Query(
				ctx,
				SQLStatement,
				userID,
				search,
				d.Created_Date,
				d.Title,
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

	var postsArr []types.PostSumVotesResult
	for rows.Next() {
		var post types.PostSumVotesResult
		var created time.Time

		if err := rows.Scan(&post.Post_ID, &post.Post_URL, &post.User_ID, &post.Username, &post.DisplayName, &post.User_Image, &post.Topic_ID, &post.Topic_User_ID, &post.Topic_Name, &post.Topic_URL, &post.Category_Icon, &post.Tag_Name, &post.Tag_Icon, &post.Tag_Description,
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
		switch sortBy {
		case "alpha":
			c, err := cursor.EncodeAlphaCursor(types.AlphaDateCursor{
				Created_Date: last.Created_Date,
				Title:        last.Title,
			})
			if err == nil {
				nextCursor = &c
			}
		default:
			c, err := cursor.EncodeSumVotesDateCursor(types.SumVotesDateCursor{
				Sum_Votes_Count: last.Sum_Votes,
				Created_Date:    last.Created_Date,
				Comment_Count:   last.Comment_Count,
				Post_ID:         &last.Post_ID,
			})
			if err == nil {
				nextCursor = &c
			}
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

// Get all posts by topicID
func (h *Handler) GetAllPostsByTopicID(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	query := r.URL.Query()
	limit := query.Get("limit")
	cursorParam := query.Get("cursor")
	sortBy := query.Get("sortBy")
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

	topicID := mux.Vars(r)["topic_id"]
	//convert topicID to integer (check if valid integer)
	topicIDInt, err := strconv.Atoi(topicID)
	//check if id is an integer
	if err != nil {
		util.WriteError(w, http.StatusBadRequest, err)
		return
	}

	//check cursor
	var decodedCursor any
	if cursorParam != "" {
		//buzzing - post =  then sum_of_votes then created date first
		//sum of votes over num of upvotes because a post can have a lot of upvotes
		//but the downvotes might contradict whether it is actally the best
		//new -  post =   then created date first then sum_of_votes
		switch sortBy {
		case "alpha":
			decodedCursor, err = cursor.DecodeAlphaCursor(cursorParam)
		default:
			decodedCursor, err = cursor.DecodeSumVotesDateCursor(cursorParam)
		}

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
		p.post_url,
		u.user_id, 
		u.username, 
		u.display_name,
		i.image_name, 
		t.topic_id, 
		t.creator_id, 
		t.topic_name, 
		t.topic_url,
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
		COALESCE(pc.num_of_comments, 0) AS num_of_comments,
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
		LEFT JOIN posts_bookmarks pb ON pb.post_id = p.post_id AND pb.user_id = $1
		WHERE LOWER(p.title) LIKE $2 and t.topic_id = $3
		`
	if cursorParam == "" {
		var orderStatement string
		switch sortBy {
		case "new":
			orderStatement = `  ORDER BY p.created_date DESC, COALESCE(pv.sum_of_votes,0) DESC, COALESCE(pc.num_of_comments, 0) DESC, p.post_id DESC `
		case "alpha":
			orderStatement = ` ORDER BY p.title ASC,  p.created_date DESC`
		default:
			orderStatement = ` ORDER BY COALESCE(pv.sum_of_votes,0) DESC, COALESCE(pc.num_of_comments, 0) DESC, p.created_date DESC, p.post_id DESC  `
		}
		SQLStatement := baseSQLStatement + `
		GROUP BY p.post_id, p.post_url, u.user_id, u.username, u.display_name, i.image_name, t.topic_id, t.creator_id, t.topic_name, t.topic_url, c.icon_name, tags.tag_name, tag_icon, tag_description, p.title, p.content, p.created_date, pb.post_id, pvv.vote_type, vote_id, bookmark_id, pv.num_of_upvotes,
		pv.num_of_downvotes, pc.num_of_comments, pv.sum_of_votes ` + orderStatement + ` LIMIT $4`
		rows, err = h.db.Query(ctx, SQLStatement, userID, search, topicIDInt, limitAddOne)
	} else {
		switch d := decodedCursor.(type) {
		case *types.SumVotesDateCursor:
			var SQLStatement string
			d = decodedCursor.(*types.SumVotesDateCursor)
			switch sortBy {
			case "new":
				SQLStatement = baseSQLStatement + `
				AND (
					p.created_date < $4
					OR (p.created_date = $4 AND COALESCE(pv.sum_of_votes,0) < $5)
					OR (p.created_date = $4 AND COALESCE(pv.sum_of_votes,0) = $5 AND COALESCE(pc.num_of_comments, 0) < $6)
					OR (p.created_date = $4 AND COALESCE(pv.sum_of_votes,0) = $5 AND COALESCE(pc.num_of_comments, 0) = $6 AND p.post_id < $7)
				)
				GROUP BY p.post_id, p.post_url, u.user_id, u.username, u.display_name, i.image_name, t.topic_id, t.creator_id, t.topic_name, t.topic_url, c.icon_name, tags.tag_name, tag_icon, tag_description, p.title, p.content, p.created_date, pb.post_id, pvv.vote_type, vote_id, bookmark_id, pv.num_of_upvotes,
				pv.num_of_downvotes, pc.num_of_comments, pv.sum_of_votes
				ORDER BY p.created_date DESC, COALESCE(pv.sum_of_votes,0) DESC, COALESCE(pc.num_of_comments, 0) DESC, p.post_id DESC LIMIT $8`
				rows, err = h.db.Query(
					ctx,
					SQLStatement,
					userID,
					search,
					topicIDInt,
					d.Created_Date,
					d.Sum_Votes_Count,
					d.Comment_Count,
					d.Post_ID,
					limitAddOne,
				)
			default:
				SQLStatement = baseSQLStatement + `
				AND (
					COALESCE(pv.sum_of_votes,0) < $4
					OR (COALESCE(pv.sum_of_votes,0) = $4 AND COALESCE(pc.num_of_comments, 0) < $5)
					OR (COALESCE(pv.sum_of_votes,0) = $4 AND COALESCE(pc.num_of_comments, 0) = $5 AND p.created_date < $6)
					OR (COALESCE(pv.sum_of_votes,0) = $4 AND COALESCE(pc.num_of_comments, 0) = $5 AND p.created_date = $6 AND p.post_id < $7)
				)
				GROUP BY p.post_id, p.post_url, u.user_id, u.username, u.display_name, i.image_name,t.topic_id, t.creator_id, t.topic_name, t.topic_url, c.icon_name, tags.tag_name, tag_icon, tag_description, p.title, p.content, p.created_date, pb.post_id, pvv.vote_type, vote_id, bookmark_id, pv.num_of_upvotes,
				pv.num_of_downvotes, pc.num_of_comments, pv.sum_of_votes
				ORDER BY COALESCE(pv.sum_of_votes,0) DESC, COALESCE(pc.num_of_comments, 0) DESC, p.created_date DESC, p.post_id DESC
				LIMIT $8
			`
				rows, err = h.db.Query(
					ctx,
					SQLStatement,
					userID,
					search,
					topicIDInt,
					d.Sum_Votes_Count,
					d.Comment_Count,
					d.Created_Date,
					d.Post_ID,
					limitAddOne,
				)
			}
		case *types.AlphaDateCursor:
			d = decodedCursor.(*types.AlphaDateCursor)
			SQLStatement := baseSQLStatement + `
			AND (
				p.title > $4
				OR (p.title = $4 AND p.created_date < $5)
			)
			GROUP BY p.post_id, p.post_url, u.user_id, u.username, u.display_name, i.image_name, t.topic_id, t.creator_id, t.topic_name, t.topic_url, c.icon_name, tags.tag_name, tag_icon, tag_description, p.title, p.content, p.created_date, pb.post_id, pvv.vote_type, vote_id, bookmark_id, pv.num_of_upvotes,
			pv.num_of_downvotes, pc.num_of_comments, pv.sum_of_votes
			ORDER BY p.title ASC, p.created_date DESC
			LIMIT $6`
			rows, err = h.db.Query(
				ctx,
				SQLStatement,
				userID,
				search,
				topicIDInt,
				d.Title,
				d.Created_Date,
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

	var postsArr []types.PostSumVotesResult
	for rows.Next() {
		var post types.PostSumVotesResult
		var created time.Time

		if err := rows.Scan(&post.Post_ID, &post.Post_URL, &post.User_ID, &post.Username, &post.DisplayName, &post.User_Image, &post.Topic_ID, &post.Topic_User_ID, &post.Topic_Name, &post.Topic_URL, &post.Category_Icon, &post.Tag_Name, &post.Tag_Icon, &post.Tag_Description,
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
		switch sortBy {
		case "alpha":
			c, err := cursor.EncodeAlphaCursor(types.AlphaDateCursor{
				Created_Date: last.Created_Date,
				Title:        last.Title,
			})
			if err == nil {
				nextCursor = &c
			}
		default:
			c, err := cursor.EncodeSumVotesDateCursor(types.SumVotesDateCursor{
				Sum_Votes_Count: last.Sum_Votes,
				Created_Date:    last.Created_Date,
				Comment_Count:   last.Comment_Count,
				Post_ID:         &last.Post_ID,
			})
			if err == nil {
				nextCursor = &c
			}
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
		p.post_url,
		u.user_id,
		u.username, 
		u.display_name,
		i.image_name, 
		t.topic_id,
		t.creator_id,
		t.topic_name, 
		t.topic_url,
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
		COALESCE(pc.num_of_comments, 0) AS num_of_comments,
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
		GROUP BY p.post_id, u.username, u.display_name, u.user_id, i.image_name,t.topic_id, t.creator_id, t.topic_name, t.topic_url, tags.tag_name, tag_icon, tag_description, p.title, p.content, p.created_date, pb.post_id, pvv.vote_type, vote_id, bookmark_id, pv.num_of_upvotes,
    pv.num_of_downvotes, pc.num_of_comments
		ORDER BY p.created_date DESC`,
		userIDInt, postIDInt).
		Scan(&post.Post_ID, &post.Post_URL, &post.User_ID, &post.Username, &post.DisplayName, &post.User_Image, &post.Topic_ID, &post.Topic_User_ID, &post.Topic_Name, &post.Topic_URL, &post.Category_Icon, &post.Tag_Name, &post.Tag_Icon, &post.Tag_Description,
			&post.Title, &post.Content, &created, &post.Vote_ID, &post.Upvote_Count, &post.Downvote_Count, &post.Vote_Status, &post.Comment_Count, &post.Bookmark_ID, &post.Is_Bookmarked)

	post.Created_Date = created.Format(time.RFC3339)
	if err != nil {
		util.WriteError(w, http.StatusNotFound, err)
		return
	}

	util.WriteJSON(w, http.StatusOK, post)
}

func (h *Handler) GetPostByURL(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	post := new(types.PostDefaultResult)
	var created time.Time
	//get user_id from params
	userID := mux.Vars(r)["user_id"]
	//convert userID to integer (check if valid integer)
	userIDInt, err := strconv.Atoi(userID)
	//check if id is an integer
	if err != nil {
		util.WriteError(w, http.StatusBadRequest, err)
		return
	}

	//get post_url from params
	postURL := mux.Vars(r)["post_url"]
	if postURL == "" {
		util.WriteError(w, http.StatusBadRequest, errors.New("missing post url"))
		return
	}

	//get data from db
	err = h.db.QueryRow(ctx,
		`SELECT 
		p.post_id, 
		p.post_url,
		u.user_id,
		u.username, 
		u.display_name,
		i.image_name, 
		t.topic_id,
		t.creator_id,
		t.topic_name, 
		t.topic_url,
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
		COALESCE(pc.num_of_comments, 0) AS num_of_comments,
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
		WHERE p.post_url = $2
		GROUP BY p.post_id, u.username, u.display_name, u.user_id, i.image_name, t.topic_id, t.creator_id, t.topic_name, t.topic_url, c.icon_name, tags.tag_name, tag_icon, tag_description, p.title, p.content, p.created_date, pb.post_id, pvv.vote_type, vote_id, bookmark_id, pv.num_of_upvotes,
    pv.num_of_downvotes, pc.num_of_comments
		ORDER BY p.created_date DESC`,
		userIDInt, postURL).
		Scan(&post.Post_ID, &post.Post_URL, &post.User_ID, &post.Username, &post.DisplayName, &post.User_Image, &post.Topic_ID, &post.Topic_User_ID, &post.Topic_Name, &post.Topic_URL, &post.Category_Icon, &post.Tag_Name, &post.Tag_Icon, &post.Tag_Description,
			&post.Title, &post.Content, &created, &post.Vote_ID, &post.Upvote_Count, &post.Downvote_Count, &post.Vote_Status, &post.Comment_Count, &post.Bookmark_ID, &post.Is_Bookmarked)

	// format created date to RFC3339
	post.Created_Date = created.Format(time.RFC3339)

	// check if no rows found
	if errors.Is(err, sql.ErrNoRows) {
		util.WriteError(w, http.StatusBadRequest, errors.New("invalid post url"))
		return
	}

	if err != nil {
		util.WriteError(w, http.StatusInternalServerError, err)
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
	sortBy := query.Get("sortBy")

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
	var decodedCursor any
	if cursorParam != "" {
		switch sortBy {
		case "alpha":
			decodedCursor, err = cursor.DecodeAlphaCursor(cursorParam)
		default:
			decodedCursor, err = cursor.DecodeSumVotesDateCursor(cursorParam)
		}

		if err != nil {
			util.WriteError(w, http.StatusBadRequest, err)
			return
		}
	}

	var (
		rows pgx.Rows
	)
	//get data from db //for main feed
	//first select statement,
	//first select statement - get posts from topics that are under same categories of the topics user follows
	//second select statement - most popular posts
	baseSQLStatement := `SELECT * FROM (
    		SELECT DISTINCT
				p.post_id,
				p.post_url,
				u.user_id,
				u.username, 
				u.display_name,
				i.image_name, 
				t.topic_id,
				t.creator_id,
				t.topic_name, 
				t.topic_url,
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
				COALESCE(pc.num_of_comments, 0) AS num_of_comments,
				pb.post_bookmark_id as bookmark_id,
				CASE WHEN pb.post_id IS NULL THEN FALSE ELSE TRUE END AS is_bookmarked,
				true as is_following
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
				LEFT JOIN posts_bookmarks pb ON pb.post_id = p.post_id AND pb.user_id = $1
				WHERE tf.user_id = $1
				GROUP BY p.post_id, u.user_id, u.username, u.display_name, i.image_name, t.topic_id,  t.creator_id, t.topic_name, t.topic_url, c.icon_name, tags.tag_name, tag_icon, tag_description, p.title, p.content, p.created_date, pb.post_id, pvv.vote_type, vote_id, bookmark_id, pv.num_of_upvotes, pv.num_of_downvotes, pv.sum_of_votes, pc.num_of_comments
    		UNION ALL
			SELECT
				p.post_id,
				p.post_url,
				u.user_id,
				u.username, 
				u.display_name,
				i.image_name, 
				t.topic_id,
				t.creator_id,
				t.topic_name, 
				t.topic_url,
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
				COALESCE(pc.num_of_comments, 0) AS num_of_comments,
				pb.post_bookmark_id as bookmark_id,
				CASE WHEN pb.post_id IS NULL THEN FALSE ELSE TRUE END AS is_bookmarked,
				false as is_following
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
				WHERE t.visibility = 'public' AND p.post_id NOT IN (
					SELECT p2.post_id
					FROM posts p2
					JOIN topics_followers tf2 ON tf2.topic_id = p2.topic_id
					WHERE tf2.user_id = $1
				)
				GROUP BY p.post_id, u.user_id, u.username, u.display_name,t.topic_id, t.creator_id, t.topic_name, t.topic_url, i.image_name,  c.icon_name,tags.tag_name, p.title, p.content, p.created_date, pb.post_id, vote_type, vote_id, bookmark_id, tag_icon, tag_description, num_of_upvotes, num_of_downvotes, num_of_comments, sum_of_votes
		) main_feed_post
		`

	if cursorParam == "" {
		var orderStatement string
		switch sortBy {
		case "new":
			orderStatement = ` ORDER BY is_following DESC, created_date DESC, sum_of_votes DESC, num_of_comments DESC, post_id DESC `
		case "alpha":
			orderStatement = ` ORDER BY title ASC, created_date DESC `
		default:
			orderStatement = ` ORDER BY is_following DESC, sum_of_votes DESC, num_of_comments DESC, created_date DESC, post_id DESC `

		}
		//if ?cursor= gives empty string
		SQLStatement := baseSQLStatement + orderStatement + ` LIMIT $2`
		rows, err = h.db.Query(ctx, SQLStatement, userID, limitAddOne)
	} else {
		switch d := decodedCursor.(type) {
		case *types.SumVotesDateCursor:
			d = decodedCursor.(*types.SumVotesDateCursor)
			switch sortBy {
			case "new":
				SQLStatement := baseSQLStatement + `
				WHERE (
					is_following < $2 OR 
					(
						is_following = $2 AND 
						( 
						created_date < $3
						OR (created_date = $3 AND sum_of_votes < $4)
						OR (created_date = $3 AND sum_of_votes = $4 AND num_of_comments < $5)
						OR (created_date = $3 AND sum_of_votes = $4 AND num_of_comments = $5 AND post_id < $6)
						)
					)
				)	
				ORDER BY is_following DESC, created_date DESC, sum_of_votes DESC, num_of_comments DESC, post_id DESC
				LIMIT $7
				`
				rows, err = h.db.Query(
					ctx,
					SQLStatement,
					userID,
					d.Is_Following,
					d.Created_Date,
					d.Sum_Votes_Count,
					d.Comment_Count,
					d.Post_ID,
					limitAddOne,
				)

			default:
				SQLStatement := baseSQLStatement + `
				WHERE (
					is_following < $2 OR 
					(
						is_following = $2 AND 
						( 
						sum_of_votes < $3
						OR (sum_of_votes = $3 AND num_of_comments < $4)
						OR (sum_of_votes = $3 AND num_of_comments = $4 AND created_date < $5)
						OR (sum_of_votes = $3 AND num_of_comments = $4 AND created_date = $5 AND post_id < $6)
						)
					)
				)
				ORDER BY is_following DESC, sum_of_votes DESC, num_of_comments DESC, created_date DESC, post_id DESC
				LIMIT $7
				`
				rows, err = h.db.Query(
					ctx,
					SQLStatement,
					userID,
					d.Is_Following,
					d.Sum_Votes_Count,
					d.Comment_Count,
					d.Created_Date,
					d.Post_ID,
					limitAddOne,
				)
			}
		case *types.AlphaDateCursor:
			d = decodedCursor.(*types.AlphaDateCursor)
			SQLStatement := baseSQLStatement + `
			WHERE ( title > $2 
			OR (title = $2 AND created_date < $3)
			)
			ORDER BY title ASC, created_date DESC
			LIMIT $4
	`
			rows, err = h.db.Query(
				ctx,
				SQLStatement,
				userID,
				d.Title,
				d.Created_Date,
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

	postsArr := make([]types.PostSumVotesIsFollowingResult, 0)
	for rows.Next() {
		var post types.PostSumVotesIsFollowingResult
		var created time.Time

		if err := rows.Scan(&post.Post_ID, &post.Post_URL, &post.User_ID, &post.Username, &post.DisplayName, &post.User_Image,
			&post.Topic_ID, &post.Topic_User_ID, &post.Topic_Name, &post.Topic_URL, &post.Category_Icon, &post.Tag_Name, &post.Tag_Icon, &post.Tag_Description,
			&post.Title, &post.Content, &created, &post.Vote_ID, &post.Upvote_Count, &post.Downvote_Count, &post.Sum_Votes, &post.Vote_Status, &post.Comment_Count, &post.Bookmark_ID, &post.Is_Bookmarked, &post.Is_Following); err != nil {
			util.WriteError(w, http.StatusInternalServerError, err)
			return
		}

		post.Created_Date = created.Format(time.RFC3339)
		postsArr = append(postsArr, post)
	}

	var nextCursor *string
	if len(postsArr) > limitQuery {
		last := postsArr[limitQuery-1]
		switch sortBy {
		case "alpha":
			c, err := cursor.EncodeAlphaCursor(types.AlphaDateCursor{
				Created_Date: last.Created_Date,
				Title:        last.Title,
			})
			if err == nil {
				nextCursor = &c
			}
		default:
			c, err := cursor.EncodeSumVotesDateCursor(types.SumVotesDateCursor{
				Created_Date:    last.Created_Date,
				Sum_Votes_Count: last.Sum_Votes,
				Comment_Count:   last.Comment_Count,
				Is_Following:    &last.Is_Following,
				Post_ID:         &last.Post_ID,
			})
			if err == nil {
				nextCursor = &c
			}
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
	sortBy := query.Get("sortBy")

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
	var decodedCursor any
	if cursorParam != "" {
		switch sortBy {
		case "alpha":
			decodedCursor, err = cursor.DecodeAlphaCursor(cursorParam)
		default:
			decodedCursor, err = cursor.DecodeSumVotesDateCursor(cursorParam)
		}

		if err != nil {
			util.WriteError(w, http.StatusBadRequest, err)
			return
		}
	}

	var (
		rows pgx.Rows
	)

	//get posts from topics followed by user
	baseSQLStatement := `SELECT DISTINCT
		p.post_id,
		p.post_url,
		u.user_id,
		u.username, 
		u.display_name,
		i.image_name, 
		t.topic_id,
		t.creator_id,
		t.topic_name, 
		t.topic_url,
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
		COALESCE(pc.num_of_comments, 0) AS num_of_comments,
		pb.post_bookmark_id as bookmark_id, 
		CASE WHEN pb.post_id IS NULL THEN FALSE ELSE TRUE END AS is_bookmarked
		FROM posts p
		LEFT JOIN tags ON tags.tag_id = p.tag_id
		INNER JOIN users u ON u.user_id = p.author_id
		INNER JOIN profile_image i ON i.image_id = u.image_id
		INNER JOIN topics t ON t.topic_id = p.topic_id
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
		LEFT JOIN posts_bookmarks pb ON pb.post_id = p.post_id AND pb.user_id = $1
		INNER JOIN topics_followers tf ON tf.topic_id = t.topic_id
		WHERE tf.user_id = $1
		`
	//if no cursor param. first batch
	if cursorParam == "" {
		var orderStatement string
		switch sortBy {
		case "new":
			orderStatement = ` ORDER BY p.created_date, COALESCE(pv.sum_of_votes, 0) DESC, COALESCE(pc.num_of_comments, 0) DESC, p.post_id DESC  `
		case "alpha":
			orderStatement = ` ORDER BY p.title ASC, p.created_date DESC `
		default:
			orderStatement = ` ORDER BY COALESCE(pv.sum_of_votes, 0) DESC,  COALESCE(pc.num_of_comments, 0) DESC, p.created_date DESC, p.post_id DESC `
		}

		SQLStatement := baseSQLStatement + orderStatement + ` LIMIT $2`
		rows, err = h.db.Query(ctx, SQLStatement, userID, limitAddOne)
	} else {
		switch d := decodedCursor.(type) {
		case *types.SumVotesDateCursor:
			d = decodedCursor.(*types.SumVotesDateCursor)
			switch sortBy {
			case "new":
				SQLStatement := baseSQLStatement + `
				AND (
					p.created_date < $2
					OR (p.created_date = $2 AND COALESCE(pv.sum_of_votes,0) < $3)
					OR (p.created_date = $2 AND COALESCE(pv.sum_of_votes,0) = $3,  COALESCE(pc.num_of_comments, 0) < $4 )
					OR (p.created_date = $2 AND COALESCE(pv.sum_of_votes,0) = $3,  COALESCE(pc.num_of_comments, 0) = $4, p.post_id < $5)
				)
				ORDER BY p.created_date, COALESCE(pv.sum_of_votes, 0) DESC, COALESCE(pc.num_of_comments, 0) DESC, p.post_id DESC LIMIT $6`

				rows, err = h.db.Query(
					ctx,
					SQLStatement,
					userID,
					d.Created_Date,
					d.Sum_Votes_Count,
					d.Comment_Count,
					d.Post_ID,
					limitAddOne,
				)

			default:
				SQLStatement := baseSQLStatement + `
				AND (
					COALESCE(pv.sum_of_votes,0) < $2
					OR (COALESCE(pv.sum_of_votes,0) = $2 AND COALESCE(pc.num_of_comments, 0) < $3)
					OR (COALESCE(pv.sum_of_votes,0) = $2 AND COALESCE(pc.num_of_comments, 0) = $3 AND p.created_date < $4)
					OR (COALESCE(pv.sum_of_votes,0) = $2 AND COALESCE(pc.num_of_comments, 0) = $3 AND p.created_date < $4 AND p.post_id = $5)
				)
				ORDER BY COALESCE(pv.sum_of_votes,0) DESC, p.created_date DESC, p.post_id DESC
				LIMIT $6
			`
				rows, err = h.db.Query(
					ctx,
					SQLStatement,
					userID,
					d.Sum_Votes_Count,
					d.Comment_Count,
					d.Created_Date,
					d.Post_ID,
					limitAddOne,
				)
			}
		case *types.AlphaDateCursor:
			d = decodedCursor.(*types.AlphaDateCursor)
			SQLStatement := baseSQLStatement + `
			AND (
				p.title > $2
				OR (p.title = $2 AND p.created_date < $3)
			)
			GROUP BY p.post_id, p.post_url, u.user_id, u.username, u.display_name, i.image_name, t.topic_id, t.creator_id, t.topic_name, t.topic_url, c.icon_name, tags.tag_name, tag_icon, tag_description, p.title, p.content, p.created_date, pb.post_id, pvv.vote_type, vote_id, bookmark_id, pv.num_of_upvotes,
			pv.num_of_downvotes, pc.num_of_comments, pv.sum_of_votes
			ORDER BY p.title ASC, p.created_date DESC
			LIMIT $4`
			rows, err = h.db.Query(
				ctx,
				SQLStatement,
				userID,
				d.Created_Date,
				d.Title,
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

	postsArr := make([]types.PostSumVotesResult, 0)
	for rows.Next() {
		var post types.PostSumVotesResult
		var created time.Time

		if err := rows.Scan(&post.Post_ID, &post.Post_URL, &post.User_ID, &post.Username, &post.DisplayName, &post.User_Image,
			&post.Topic_ID, &post.Topic_User_ID, &post.Topic_Name, &post.Topic_URL, &post.Category_Icon, &post.Tag_Name, &post.Tag_Icon, &post.Tag_Description,
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
		switch sortBy {
		case "alpha":
			c, err := cursor.EncodeAlphaCursor(types.AlphaDateCursor{
				Created_Date: last.Created_Date,
				Title:        last.Title,
			})
			if err == nil {
				nextCursor = &c
			}
		default:
			c, err := cursor.EncodeSumVotesDateCursor(types.SumVotesDateCursor{
				Sum_Votes_Count: last.Sum_Votes,
				Created_Date:    last.Created_Date,
				Post_ID:         &last.Post_ID,
				Comment_Count:   last.Comment_Count,
			})
			if err == nil {
				nextCursor = &c
			}
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

// add post
func (h *Handler) AddPost(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	//only verified users can access the data
	//check token and token header
	authToken := r.Header.Get("Authorization")
	//check if authHeader is empty
	if authToken == "" {
		util.WriteError(w, http.StatusUnauthorized, errors.New("Missing authorization header"))
		return
	}

	//get topic_id from params
	topicID := mux.Vars(r)["topic_id"]
	//convert topicID to integer (check if valid integer)
	topicIDInt, err := strconv.Atoi(topicID)
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
	var payload types.PostAddPayload

	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		util.WriteError(w, http.StatusBadRequest, errors.New("invalid inputs"))
		return
	}

	if payload.Title == "" || payload.Content == "" || payload.Post_URL == "" {
		util.WriteError(w, http.StatusBadRequest, errors.New("invalid inputs"))
		return
	}

	var Post_ID int
	err = h.db.QueryRow(ctx,
		`INSERT INTO posts (topic_id, author_id, tag_id, title, content, post_url)
		VALUES ($1, $2, $3, $4, $5, $6) RETURNING post_id`,
		topicIDInt, userIDInt, payload.Tag_ID, payload.Title, payload.Content, payload.Post_URL,
	).Scan(&Post_ID)

	//server error
	if err != nil {
		util.WriteError(w, http.StatusInternalServerError, err)
		return
	}

	var result types.PostDefaultResult
	var created time.Time

	err = h.db.QueryRow(ctx, `SELECT 
		p.post_id,
		p.post_url,
		u.user_id, 
		u.username, 
		u.display_name,
		i.image_name, 
		t.topic_id, 
		t.creator_id, 
		t.topic_name, 
		t.topic_url,
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
		COALESCE(pc.num_of_comments, 0) AS num_of_comments,
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
		LEFT JOIN posts_bookmarks pb ON pb.post_id = p.post_id AND pb.user_id = $1
		WHERE p.post_id = $2 `,
		userIDInt, Post_ID).
		Scan(&result.Post_ID, &result.Post_URL, &result.User_ID, &result.Username, &result.DisplayName, &result.User_Image,
			&result.Topic_ID, &result.Topic_User_ID, &result.Topic_Name, &result.Topic_URL, &result.Category_Icon, &result.Tag_Name, &result.Tag_Icon, &result.Tag_Description,
			&result.Title, &result.Content, &created, &result.Vote_ID, &result.Upvote_Count, &result.Downvote_Count, &result.Sum_Votes, &result.Vote_Status, &result.Comment_Count, &result.Bookmark_ID, &result.Is_Bookmarked)

	// format created date to RFC3339
	result.Created_Date = created.Format(time.RFC3339)
	//server error
	if err != nil {
		util.WriteError(w, http.StatusInternalServerError, err)
		return
	}

	util.WriteJSON(w, http.StatusOK, result)

}

// Update/edit posts information
func (h *Handler) UpdatePost(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	//only verified users can access the data
	//check token and token header
	authToken := r.Header.Get("Authorization")
	//check if authHeader is empty
	if authToken == "" {
		util.WriteError(w, http.StatusUnauthorized, errors.New("Missing authorization header"))
		return
	}

	//get post_id from params
	postID := mux.Vars(r)["post_id"]
	//convert postID to integer (check if valid integer)
	postIDInt, err := strconv.Atoi(postID)
	//check if id is an integer
	if err != nil {
		util.WriteError(w, http.StatusBadRequest, err)
		return
	}

	var payload types.PostUpdatePayload

	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		util.WriteError(w, http.StatusBadRequest, errors.New("invalid inputs"))
		return
	}

	if payload.Title == "" || payload.Content == "" {
		util.WriteError(w, http.StatusBadRequest, errors.New("invalid inputs"))
		return
	}

	var result types.PostUpdatePayload
	err = h.db.QueryRow(ctx,
		`UPDATE posts SET tag_id = $1, title = $2, content = $3
		WHERE post_id = $4 RETURNING tag_id, title, content`,
		payload.Tag_ID, payload.Title, payload.Content, postIDInt,
	).Scan(&result.Tag_ID, &result.Title, &result.Content)

	//server error
	if err != nil {
		util.WriteError(w, http.StatusInternalServerError, err)
		return
	}

	util.WriteJSON(w, http.StatusOK, result)

}

// delete posts information
func (h *Handler) DeletePost(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	//get post_id from params
	postID := mux.Vars(r)["post_id"]
	//convert postID to integer (check if valid integer)
	postIDInt, err := strconv.Atoi(postID)
	//check if id is an integer
	if err != nil {
		util.WriteError(w, http.StatusBadRequest, err)
		return
	}

	//delete post from db
	response, err := h.db.Exec(ctx,
		`DELETE FROM posts WHERE post_id=$1`,
		postIDInt,
	)

	//server error
	if err != nil {
		util.WriteError(w, http.StatusInternalServerError, err)
		return
	}

	if response.RowsAffected() == 0 {
		util.WriteError(w, http.StatusNotFound, errors.New("post not deleted"))
		return
	}

	util.WriteJSON(w, http.StatusOK, map[string]int{
		"post_id": postIDInt,
	})

}
