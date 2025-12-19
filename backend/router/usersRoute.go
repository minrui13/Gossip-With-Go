package router

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/gorilla/mux"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/minrui13/backend/auth"
	"github.com/minrui13/backend/config"
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

	r.HandleFunc("/", h.GetAllUsers).Methods("GET")
	r.HandleFunc("/getByUsername", h.GetUserByUsername).Methods("POST")
	r.HandleFunc("/{id}", h.GetUserById).Methods("GET")

	return r
}

// Get user all user
func (h *Handler) GetAllUsers(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	rows, err := h.db.Query(ctx, `SELECT * FROM users`)

	//database error 500 status code
	//same as res.send(500)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	var users []types.User
	for rows.Next() {
		var u types.User
		var created time.Time

		if err := rows.Scan(&u.User_id, &u.Username, &u.Image_id, &u.Points, &created); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		u.Created_date = created.Format(time.RFC3339)
		users = append(users, u)
	}

	if err := rows.Err(); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	util.WriteJSON(w, http.StatusOK, users)
}

// Get user by user_id
func (h *Handler) GetUserById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user := new(types.User)
	var created time.Time
	//convert userID to integer (check if valid integer)
	id := mux.Vars(r)["id"]
	userID, err := strconv.Atoi(id)

	if err != nil {
		util.WriteError(w, http.StatusBadRequest, err)
		return
	}
	err = h.db.QueryRow(ctx, `SELECT * FROM users WHERE user_id = $1`, userID).
		Scan(&user.User_id, &user.Username, &user.Image_id, &user.Points, &created)

	if err != nil {
		util.WriteError(w, http.StatusNotFound, err)
		return
	}

	util.WriteJSON(w, http.StatusOK, user)
}

// Get user by username
func (h *Handler) GetUserByUsername(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user := new(types.User)
	var created time.Time
	var payload types.NewUser
	err := json.NewDecoder(r.Body).Decode(&payload)

	//check username
	if err != nil || payload.Username == "" {
		util.WriteError(w, http.StatusBadRequest, errors.New("invalid username"))
		return
	}

	err = h.db.QueryRow(ctx, `SELECT * FROM users WHERE username = $1`, payload.Username).
		Scan(&user.User_id, &user.Username, &user.Image_id, &user.Points, &created)

	if err != nil {
		util.WriteError(w, http.StatusNotFound, err)
		return
	}

	secret := []byte(config.Envs.JWTSecret)
	token, err := auth.CreateJWT(secret, user.User_id)

	if err != nil {
		util.WriteError(w, http.StatusInternalServerError, err)
		return
	}

	util.WriteJSON(w, http.StatusOK, map[string]string{"token": token})
}
