package usersRoute

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gorilla/mux"
	"github.com/jackc/pgx/v5"
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
	r.HandleFunc("/signup", h.SignUp).Methods("POST")
	r.HandleFunc("/login", h.Login).Methods("POST")
	r.HandleFunc("/updateUser", h.UpdateUser).Methods("PUT")
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

		if err := rows.Scan(&u.User_id, &u.Username, &u.DisplayName,
			&u.Bio, &u.Image_id, &u.Points, &created); err != nil {
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
	//get id from params
	id := mux.Vars(r)["id"]
	//convert userID to integer (check if valid integer)
	userID, err := strconv.Atoi(id)

	if err != nil {
		util.WriteError(w, http.StatusBadRequest, err)
		return
	}
	err = h.db.QueryRow(ctx, `SELECT * FROM users WHERE user_id = $1`, userID).
		Scan(&user.User_id, &user.Username, &user.Username,
			&user.DisplayName, &user.Image_id, &user.Points, &created)

	if err != nil {
		util.WriteError(w, http.StatusNotFound, err)
		return
	}

	util.WriteJSON(w, http.StatusOK, user)
}

// Get user by username (Login)
func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var user = new(types.User)
	var created time.Time
	var payload types.NewUser
	err := json.NewDecoder(r.Body).Decode(&payload)

	//check username
	if err != nil || payload.Username == "" {
		util.WriteError(w, http.StatusBadRequest, errors.New("invalid username"))
		return
	}

	err = h.db.QueryRow(ctx, `SELECT * FROM users WHERE username = $1`, payload.Username).
		Scan(&user.User_id, &user.Username, &user.DisplayName, &user.Bio, &user.Image_id, &user.Points, &created)

	if err != nil {
		util.WriteError(w, http.StatusNotFound, err)
		return
	}

	jwtUser := types.JWTUserInfo{
		User_id:  user.User_id,
		Username: user.Username,
	}
	//get JWT secret from .env
	secret := []byte(config.Envs.JWTSecret)
	//create JWT token
	token, err := auth.CreateJWT(secret, jwtUser)

	if err != nil {
		util.WriteError(w, http.StatusInternalServerError, err)
		return
	}

	loginInfo := types.LoginInfo{
		User_id:      user.User_id,
		Username:     user.Username,
		DisplayName:  user.DisplayName,
		Bio:          user.Bio,
		Image_id:     user.Image_id,
		Points:       user.Points,
		Created_date: user.Created_date,
		Token:        token,
	}

	//pass token to frontend to store in local storage
	util.WriteJSON(w, http.StatusOK, loginInfo)
}

// Add new user
func (h *Handler) SignUp(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var payload types.NewUser
	err := json.NewDecoder(r.Body).Decode(&payload)

	//check username
	if err != nil || payload.Username == "" {
		util.WriteError(w, http.StatusBadRequest, errors.New("invalid username"))
		return
	}

	var userID int
	err = h.db.QueryRow(ctx, `SELECT user_id FROM users WHERE username = $1`, payload.Username).Scan(&userID)

	//check for duplicate
	if err == nil {
		util.WriteError(w, http.StatusConflict, errors.New("username already taken"))
		return
	}

	//For internal server error, 500
	if err != pgx.ErrNoRows {
		util.WriteError(w, http.StatusInternalServerError, err)
		return
	}

	err = h.db.QueryRow(ctx,
		`INSERT INTO users (username) VALUES ($1) RETURNING  user_id;`,
		payload.Username,
	).Scan(&userID)

	//For internal server error, 500
	if err != nil {
		util.WriteError(w, http.StatusInternalServerError, err)
		return
	}

	util.WriteJSON(w, http.StatusOK, userID)

}

// Update user information
func (h *Handler) UpdateUser(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user := new(types.UpdateUser)
	var payload types.UpdateUser
	err := json.NewDecoder(r.Body).Decode(&payload)

	if err != nil {
		fmt.Println(err)
		util.WriteError(w, http.StatusBadRequest, errors.New("invalid inputs"))
		return
	}

	err = h.db.QueryRow(ctx,
		`UPDATE users SET username = $1, display_name = $2, bio = $3, image_id = $4 
		WHERE user_id = $5 RETURNING user_id, username, display_name, bio, image_id;`,
		payload.Username, payload.DisplayName, payload.Bio, payload.Image_id, payload.User_id,
	).Scan(&user.User_id, &user.Username, &user.DisplayName, &user.Bio, &user.Image_id)

	//user_id wrong
	if err == pgx.ErrNoRows {
		util.WriteError(w, http.StatusNotFound, errors.New("user not found"))
		return
	}

	//For internal server error, 500
	if err != nil {
		util.WriteError(w, http.StatusInternalServerError, err)
		return
	}

	util.WriteJSON(w, http.StatusOK, user)

}
