package topicsRouter

import (
	"errors"
	"net/http"
	"strconv"
	"time"

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
	//Get all topics
	r.HandleFunc("/", h.GetAllTopics).Methods("GET")
	//Get topic by id
	r.HandleFunc("/{:id}", h.GetTopicById).Methods("Post")
	//Get most popular topic
	r.HandleFunc("/getPopularTopics", h.FilterTopicsByPopularityAndName).Methods("Get")

	return r
}

// Get all topics
func (h *Handler) GetAllTopics(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	rows, err := h.db.Query(ctx, `SELECT topic_id, topic_name, description, creator_id, created_date, viewership, category_id FROM topics`)

	//database error 500 status code
	//same as res.send(500)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	var topicsArr []types.Topic
	for rows.Next() {
		var topic types.Topic
		var created time.Time

		if err := rows.Scan(&topic.Topic_ID, &topic.Topic_Name, &topic.Description,
			&topic.Creator_ID, &topic.Created_Date, &topic.Visibility, &topic.Category_ID); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		topic.Created_Date = created.Format(time.RFC3339)
		topicsArr = append(topicsArr, topic)
	}

	if err := rows.Err(); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	util.WriteJSON(w, http.StatusOK, topicsArr)
}

// Get topics by topic id
func (h *Handler) GetTopicById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	topic := new(types.Topic)
	var created time.Time
	//get id from params
	id := mux.Vars(r)["id"]
	//convert userID to integer (check if valid integer)
	topicID, err := strconv.Atoi(id)
	//check if id is an integer
	if err != nil {
		util.WriteError(w, http.StatusBadRequest, err)
		return
	}

	//only verified users can access the data
	//check token and token header
	authToken := r.Header.Get("Authorization")
	//check if authHeader is empty
	if authToken == "" {
		util.WriteError(w, http.StatusUnauthorized, errors.New("Missing authorization header"))
		return
	}

	//get data from db
	err = h.db.QueryRow(ctx, `SELECT topic_id, topic_name, description, creator_id, created_date, viewership, category_id FROM topics WHERE topic_id = $1`, topicID).
		Scan(&topic.Topic_ID, &topic.Topic_Name, &topic.Description, &topic.Creator_ID, &created, &topic.Visibility, &topic.Category_ID)
	if err != nil {
		util.WriteError(w, http.StatusNotFound, err)
		return
	}

	util.WriteJSON(w, http.StatusOK, topic)
}

// Get filtered topics by popularity and topics name
func (h *Handler) FilterTopicsByPopularityAndName(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	query := r.URL.Query()
	limit := query.Get("limit")
	offset := query.Get("offset")
	search := "%" + query.Get("search") + "%"

	//convert limitQuery to integer (check if valid integer)
	limitQuery, err := strconv.Atoi(limit)
	//check if limit is an integer
	if err != nil {
		util.WriteError(w, http.StatusBadRequest, err)
		return
	}

	//convert offsetQuery to integer (check if valid integer)
	offsetQuery, err := strconv.Atoi(offset)
	//check if limit is an integer
	if err != nil {
		util.WriteError(w, http.StatusBadRequest, err)
		return
	}

	//get data from db
	rows, err := h.db.Query(
		ctx,
		`SELECT t.topic_id, t.topic_name, t.description, COUNT(tu.user_id) AS num_followers , t.creator_id, t.created_date, t.visibility, t.category_id 
		FROM topics t LEFT JOIN topics_followers tu ON t.topic_id = tu.topic_id WHERE t.topic_name LIKE $1 GROUP BY t.topic_id 
		ORDER BY num_followers DESC LIMIT $2 OFFSET $3`,
		search, limitQuery, offsetQuery,
	)

	if err != nil {
		util.WriteError(w, http.StatusNotFound, err)
		return
	}

	var topicsArr []types.FilterTopicResult
	for rows.Next() {
		var topic types.FilterTopicResult
		var created time.Time

		if err := rows.Scan(&topic.Topic_ID, &topic.Topic_Name, &topic.Description, &topic.Followers_Count, &topic.Creator_ID, &created, &topic.Visibility, &topic.Category_ID); err != nil {
			util.WriteError(w, http.StatusInternalServerError, err)
			return
		}

		topic.Created_Date = created.Format(time.RFC3339)
		topicsArr = append(topicsArr, topic)
	}

	util.WriteJSON(w, http.StatusOK, topicsArr)
}
