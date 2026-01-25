package topicsRouter

import (
	"database/sql"
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
	//Get all topics
	r.HandleFunc("/GetAllTopics/{user_id}", h.GetAllTopicsByFilter).Methods("POST")
	//Get topic by id
	r.HandleFunc("/GetTopicByID/{topic_id}/{user_id}", h.GetTopicById).Methods("POST")
	//Get topic by url
	r.HandleFunc("/GetTopicByURL/{user_id}/{topic_url}", h.GetTopicByURL).Methods("POST")
	//Get most popular topic
	//r.HandleFunc("/getPopularTopics/{user_id}", h.FilterTopicsByPopularityAndName).Methods("GET")

	return r
}

// Get all topics
func (h *Handler) GetAllTopicsByFilter(w http.ResponseWriter, r *http.Request) {
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

	//check cursor
	var decodedCursor any
	if cursorParam != "" {
		//buzz -  topics with the highest followers count and recent created date
		//new -  topics with recent created date
		switch sortBy {
		case "alpha":
			decodedCursor, err = cursor.DecodeAlphaCursor(cursorParam)
		default:
			decodedCursor, err = cursor.DecodeTopicCursor(cursorParam)
		}
		if err != nil {
			util.WriteError(w, http.StatusBadRequest, err)
			return
		}
	}

	var (
		rows pgx.Rows
	)

	//get all topics with followers count with search feature
	baseSQLStatement := `
		SELECT t.topic_id, t.creator_id,  u.username, u.display_name, i.image_name, t.topic_name, t.topic_url, t.description,t.visibility,  t.created_date, c.category_name, c.icon_name, 
		COALESCE(tff.followers_count, 0) AS followers_count,
		COALESCE(p.posts_count, 0) AS posts_count,
		CASE WHEN tf.user_id IS NULL THEN FALSE ELSE TRUE END AS is_following
		FROM topics t 
		INNER JOIN categories c ON t.category_id = c.category_id 
		INNER JOIN users u ON u.user_id = t.creator_id
		LEFT JOIN (
		SELECT topic_id, COUNT(user_id) AS followers_count
		FROM topics_followers
		GROUP BY topic_id
		) AS tff ON t.topic_id = tff.topic_id
		LEFT JOIN (
		SELECT topic_id, COUNT(post_id) AS posts_count
		FROM posts
		GROUP BY topic_id
		) AS p ON t.topic_id = p.topic_id
		LEFT JOIN topics_followers tf ON t.topic_id = tf.topic_id AND tf.user_id = $1
		INNER JOIN profile_image i ON u.image_id = i.image_id
		WHERE LOWER(t.topic_name) LIKE $2 AND t.visibility = 'public'
		`

	if cursorParam == "" {
		var orderStatement string
		switch sortBy {
		case "new":
			orderStatement = `  ORDER BY t.created_date DESC, COALESCE(tff.followers_count,0) DESC, COALESCE(p.posts_count, 0) DESC, t.topic_id DESC `
		case "alpha":
			orderStatement = ` ORDER BY t.topic_name ASC,  t.created_date DESC`
		default:
			orderStatement = ` ORDER BY COALESCE(tff.followers_count,0) DESC, COALESCE(p.posts_count, 0) DESC, t.created_date DESC, t.topic_id DESC  `
		}
		SQLStatement := baseSQLStatement + `
		GROUP BY t.topic_id, t.topic_name, t.topic_url, t.creator_id, c.category_name, c.icon_name, t.description, t.visibility, t.created_date, u.username, u.display_name, i.image_name, followers_count, posts_count, tf.user_id ` +
			orderStatement + ` LIMIT $3 `
		rows, err = h.db.Query(ctx, SQLStatement, userID, search, limitAddOne)
	} else {
		switch d := decodedCursor.(type) {
		case *types.TopicDefaultCursor:
			var SQLStatement string
			d = decodedCursor.(*types.TopicDefaultCursor)
			switch sortBy {
			case "new":
				SQLStatement = baseSQLStatement + `
				AND (
					t.created_date < $3
					OR (t.created_date = $3 AND COALESCE(tff.followers_count,0) < $4)
					OR (t.created_date = $3 AND COALESCE(tff.followers_count,0) = $4 AND COALESCE(p.posts_count, 0) < $5)
					OR (t.created_date = $3 AND COALESCE(tff.followers_count,0) = $4 AND COALESCE(p.posts_count, 0) = $5 AND t.topic_id < $6)
				)
				GROUP BY t.topic_id, t.topic_name, t.topic_url, t.creator_id, c.category_name, c.icon_name, t.description, t.visibility, t.created_date, u.username, u.display_name, i.image_name, followers_count, posts_count, tf.user_id
				ORDER BY t.created_date DESC, COALESCE(tff.followers_count,0) DESC, COALESCE(p.posts_count, 0) DESC, t.topic_id DESC LIMIT $7`
				rows, err = h.db.Query(
					ctx,
					SQLStatement,
					userID,
					search,
					d.Created_Date,
					d.Followers_Count,
					d.Posts_Count,
					d.Topic_ID,
					limitAddOne,
				)
			default:
				SQLStatement = baseSQLStatement + `
				AND (
					COALESCE(tff.followers_count,0) < $3
					OR (COALESCE(tff.followers_count,0) = $3 AND COALESCE(p.posts_count, 0) < $4)
					OR (COALESCE(tff.followers_count,0) = $3 AND COALESCE(p.posts_count, 0) = $4 AND t.created_date < $5)
					OR (COALESCE(tff.followers_count,0) = $3 AND COALESCE(p.posts_count, 0) = $4 AND t.created_date = $5 AND t.topic_id < $6)
				)
				GROUP BY t.topic_id, t.topic_name, t.topic_url, t.creator_id, c.category_name, c.icon_name, t.description, t.visibility, t.created_date, u.username, u.display_name, i.image_name, followers_count, posts_count, tf.user_id
				ORDER BY COALESCE(tff.followers_count,0) DESC, COALESCE(p.posts_count, 0) DESC, t.created_date DESC, t.topic_id DESC
				LIMIT $7
			`
				rows, err = h.db.Query(
					ctx,
					SQLStatement,
					userID,
					search,
					d.Followers_Count,
					d.Posts_Count,
					d.Created_Date,
					d.Topic_ID,
					limitAddOne,
				)
			}
		case *types.AlphaDateCursor:
			d = decodedCursor.(*types.AlphaDateCursor)
			SQLStatement := baseSQLStatement + `
			AND (
				t.topic_name > $4
				OR (t.topic_name = $4 AND t.created_date < $3)
			)
			GROUP BY t.topic_id, t.topic_name, t.topic_url, t.creator_id, c.category_name, c.icon_name, t.description, t.visibility, t.created_date, u.username
			ORDER BY t.topic_name ASC, t.created_date DESC
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

	var topicsArr []types.TopicDefaultResult
	for rows.Next() {
		var topic types.TopicDefaultResult
		var created time.Time

		if err := rows.Scan(&topic.Topic_ID, &topic.Topic_User_ID, &topic.Username, &topic.Display_Name, &topic.Image_Name, &topic.Topic_Name,
			&topic.Topic_URL, &topic.Description, &topic.Visibility, &created, &topic.Category_Name, &topic.Category_Icon,
			&topic.Followers_Count, &topic.Posts_Count, &topic.Is_Following); err != nil {
			util.WriteError(w, http.StatusInternalServerError, err)
			return
		}

		topic.Created_Date = created.Format(time.RFC3339)
		topicsArr = append(topicsArr, topic)
	}

	var nextCursor *string
	if len(topicsArr) > limitQuery {
		last := topicsArr[limitQuery-1]
		switch sortBy {
		case "alpha":
			c, err := cursor.EncodeAlphaCursor(types.AlphaDateCursor{
				Created_Date: last.Created_Date,
				Title:        last.Topic_Name,
			})
			if err == nil {
				nextCursor = &c
			}
		default:
			c, err := cursor.EncodeTopicCursor(types.TopicDefaultCursor{
				Followers_Count: last.Followers_Count,
				Created_Date:    last.Created_Date,
				Posts_Count:     last.Posts_Count,
				Topic_ID:        &last.Topic_ID,
			})
			if err == nil {
				nextCursor = &c
			}
		}
		topicsArr = topicsArr[:limitQuery]
	} else {
		nextCursor = nil
	}

	util.WriteJSON(w, http.StatusOK, map[string]any{
		"result": topicsArr,
		"cursor": nextCursor,
	})
}

// Get topics by topic id
func (h *Handler) GetTopicById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	topic := new(types.TopicDefaultResult)
	var created time.Time
	//get id from params
	topicID := mux.Vars(r)["id"]
	//convert userID to integer (check if valid integer)
	topicIDInt, err := strconv.Atoi(topicID)
	//check if id is an integer
	if err != nil {
		util.WriteError(w, http.StatusBadRequest, err)
		return
	}

	//get id from params
	//pass in 0 if non signup or login users
	userID := mux.Vars(r)["user_id"]
	//convert userID to integer (check if valid integer)
	userIDInt, err := strconv.Atoi(userID)
	//check if id is an integer
	if err != nil {
		util.WriteError(w, http.StatusBadRequest, err)
		return
	}

	//get data from db
	err = h.db.QueryRow(ctx, `
		SELECT t.topic_id, t.creator_id,  u.username, u.display_name, i.image_name, t.topic_name, t.topic_url, t.description,t.visibility,  t.created_date, c.category_name, c.icon_name, 
		COALESCE(tff.followers_count, 0) AS followers_count,
		COALESCE(p.posts_count, 0) AS posts_count,
		CASE WHEN tf.user_id IS NULL THEN FALSE ELSE TRUE END AS is_following
		FROM topics t 
		INNER JOIN categories c ON t.category_id = c.category_id 
		INNER JOIN users u ON u.user_id = t.creator_id
		LEFT JOIN (
		SELECT topic_id, COUNT(user_id) AS followers_count
		FROM topics_followers
		GROUP BY topic_id
		) AS tff ON t.topic_id = tff.topic_id
		LEFT JOIN (
		SELECT topic_id, COUNT(post_id) AS posts_count
		FROM posts
		GROUP BY topic_id
		) AS p ON t.topic_id = p.topic_id
		LEFT JOIN topics_followers tf ON t.topic_id = tf.topic_id AND tf.user_id = $1
		INNER JOIN profile_image i ON u.image_id = i.image_id
		WHERE t.topic_id=$2`, userIDInt, topicIDInt).
		Scan(&topic.Topic_ID, &topic.Topic_User_ID, &topic.Username, &topic.Display_Name, &topic.Image_Name, &topic.Topic_Name, &topic.Topic_URL, &topic.Description, &topic.Visibility, &created, &topic.Category_Name, &topic.Category_Icon, &topic.Followers_Count, &topic.Posts_Count, &topic.Is_Following)

	topic.Created_Date = created.Format(time.RFC3339)

	//check if no rows found
	if errors.Is(err, sql.ErrNoRows) {
		util.WriteError(w, http.StatusBadRequest, errors.New("invalid topic id"))
		return
	}

	//database error 500 status code
	//same as res.send(500)
	if err != nil {
		util.WriteError(w, http.StatusNotFound, err)
		return
	}

	util.WriteJSON(w, http.StatusOK, topic)
}

func (h *Handler) GetTopicByURL(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	topic := new(types.TopicDefaultResult)
	var created time.Time

	//get id from params
	//pass in 0 if non signup or login users
	userID := mux.Vars(r)["user_id"]
	//convert userID to integer (check if valid integer)
	userIDInt, err := strconv.Atoi(userID)
	//check if id is an integer
	if err != nil {
		util.WriteError(w, http.StatusBadRequest, err)
		return
	}

	//get topic url from params
	topicURL := mux.Vars(r)["topic_url"]
	if topicURL == "" {
		util.WriteError(w, http.StatusBadRequest, errors.New("missing topic url"))
		return
	}

	//get data from db
	err = h.db.QueryRow(ctx, `
	SELECT t.topic_id, t.creator_id,  u.username, u.display_name, i.image_name, t.topic_name, t.topic_url, t.description,t.visibility,  t.created_date, c.category_name, c.icon_name, 
		COALESCE(tff.followers_count, 0) AS followers_count,
		COALESCE(p.posts_count, 0) AS posts_count,
		CASE WHEN tf.user_id IS NULL THEN FALSE ELSE TRUE END AS is_following
		FROM topics t 
		INNER JOIN categories c ON t.category_id = c.category_id 
		INNER JOIN users u ON u.user_id = t.creator_id
		LEFT JOIN (
		SELECT topic_id, COUNT(user_id) AS followers_count
		FROM topics_followers
		GROUP BY topic_id
		) AS tff ON t.topic_id = tff.topic_id
		LEFT JOIN (
		SELECT topic_id, COUNT(post_id) AS posts_count
		FROM posts
		GROUP BY topic_id
		) AS p ON t.topic_id = p.topic_id
		LEFT JOIN topics_followers tf ON t.topic_id = tf.topic_id AND tf.user_id = $1
		INNER JOIN profile_image i ON u.image_id = i.image_id
		WHERE t.topic_url=$2`, userIDInt, topicURL).
		Scan(&topic.Topic_ID, &topic.Topic_User_ID, &topic.Username, &topic.Display_Name, &topic.Image_Name, &topic.Topic_Name, &topic.Topic_URL, &topic.Description, &topic.Visibility, &created, &topic.Category_Name, &topic.Category_Icon, &topic.Followers_Count, &topic.Posts_Count, &topic.Is_Following)

	topic.Created_Date = created.Format(time.RFC3339)

	//check if no rows found
	if errors.Is(err, sql.ErrNoRows) {
		util.WriteError(w, http.StatusBadRequest, errors.New("invalid topic url"))
		return
	}

	//database error 500 status code
	//same as res.send(500)
	if err != nil {
		util.WriteError(w, http.StatusInternalServerError, err)
		return
	}

	util.WriteJSON(w, http.StatusOK, topic)
}

// // Get filtered topics by popularity and topics name
// func (h *Handler) FilterTopicsByPopularityAndName(w http.ResponseWriter, r *http.Request) {
// 	ctx := r.Context()
// 	query := r.URL.Query()
// 	limit := query.Get("limit")
// 	offset := query.Get("offset")
// 	search := "%" + query.Get("search") + "%"

// 	//convert limitQuery to integer (check if valid integer)
// 	limitQuery, err := strconv.Atoi(limit)
// 	//check if limit is an integer
// 	if err != nil {
// 		util.WriteError(w, http.StatusBadRequest, err)
// 		return
// 	}

// 	//convert offsetQuery to integer (check if valid integer)
// 	offsetQuery, err := strconv.Atoi(offset)
// 	//check if limit is an integer
// 	if err != nil {
// 		util.WriteError(w, http.StatusBadRequest, err)
// 		return
// 	}

// 	//get data from db
// 	rows, err := h.db.Query(
// 		ctx,
// 		`SELECT t.topic_id, t.topic_name, t.topic_url, t.description, u.username, t.visibility, c.category_name,  COUNT(tu.user_id) AS num_followers , t.created_date
// 		FROM topics t
// 		INNER JOIN categories c ON t.category_id = c.category_id
// 		INNER JOIN users u ON u.user_id = t.creator_id
// 		LEFT JOIN topics_followers tu ON t.topic_id = tu.topic_id
// 		WHERE LOWER(t.topic_name) LIKE $1 and t.visibility = 'public'
// 		GROUP BY t.topic_id, t.topic_name, t.topic_url, t.description, u.username, t.visibility, c.category_name, t.created_date
// 		ORDER BY num_followers DESC LIMIT $2 OFFSET $3`,
// 		search, limitQuery, offsetQuery,
// 	)

// 	if err != nil {
// 		util.WriteError(w, http.StatusNotFound, err)
// 		return
// 	}

// 	topicsArr := make([]types.TopicByPopularitySearchResult, 0)
// 	for rows.Next() {
// 		var topic types.TopicByPopularitySearchResult
// 		var created time.Time

// 		if err := rows.Scan(&topic.Topic_ID, &topic.Topic_Name, &topic.Topic_URL, &topic.Description, &topic.Username, &topic.Visibility, &topic.Category_Name, &topic.Followers_Count, &created); err != nil {
// 			util.WriteError(w, http.StatusInternalServerError, err)
// 			return
// 		}

// 		topic.Created_Date = created.Format(time.RFC3339)
// 		topicsArr = append(topicsArr, topic)
// 	}

// 	util.WriteJSON(w, http.StatusOK, topicsArr)
// }
