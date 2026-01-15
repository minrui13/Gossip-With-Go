package usersRoute

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gorilla/mux"
	"github.com/jackc/pgx/v5/pgconn"
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
	//Get all user
	r.HandleFunc("/", h.GetAllUsers).Methods("GET")
	//Get user by username
	r.HandleFunc("/checkUserExists", h.CheckUserExists).Methods("POST")
	//Sign Up
	r.HandleFunc("/signup", h.SignUp).Methods("POST")
	//Login
	r.HandleFunc("/login", h.Login).Methods("POST")
	//Update User
	r.HandleFunc("/updateUser", h.UpdateUser).Methods("PUT")
	//Get user by user id
	r.HandleFunc("/{id}", h.GetUserById).Methods("POST")
	return r
}

// Get user all user
func (h *Handler) GetAllUsers(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	rows, err := h.db.Query(ctx, `SELECT u.user_id, u.username, u.display_name, u.bio, u.created_date, pi.image_name FROM users u LEFT JOIN profile_image pi on u.image_id = pi.image_id`)

	//database error 500 status code
	//same as res.send(500)
	if err != nil {
		util.WriteError(w, http.StatusInternalServerError, err)
		return
	}

	var usersArr []types.User
	for rows.Next() {
		var user types.User
		var created time.Time

		if err := rows.Scan(&user.UserId, &user.Username, &user.DisplayName,
			&user.Bio, &created, &user.ImageName); err != nil {
			util.WriteError(w, http.StatusInternalServerError, err)
			return
		}

		user.Created_date = created.Format(time.RFC3339)
		usersArr = append(usersArr, user)
	}

	if err := rows.Err(); err != nil {
		util.WriteError(w, http.StatusInternalServerError, err)
		return
	}

	util.WriteJSON(w, http.StatusOK, usersArr)
}

// Get user by user_id
func (h *Handler) GetUserById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user := new(types.UserIdResult)
	var created time.Time
	//get id from params
	id := mux.Vars(r)["id"]
	//convert userID to integer (check if valid integer)
	userID, err := strconv.Atoi(id)
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
	err = h.db.QueryRow(ctx, `
		SELECT u.user_id, u.username, u.display_name, u.bio, u.created_date, pi.image_name
		FROM users u INNER JOIN profile_image pi on u.image_id = pi.image_id 
		WHERE user_id = $1
	`, userID).Scan(
		&user.UserId,
		&user.Username,
		&user.DisplayName,
		&user.Bio,
		&created,
		&user.ImageName,
	)

	if err != nil {
		util.WriteError(w, http.StatusNotFound, err)
		return
	}

	util.WriteJSON(w, http.StatusOK, user)
}

// check user exists return true false
func (h *Handler) userExists(ctx context.Context, username string) (bool, error) {
	var exists bool
	err := h.db.QueryRow(
		ctx,
		`SELECT EXISTS (SELECT user_id FROM users WHERE username = $1)`,
		username,
	).Scan(&exists)

	return exists, err
}

// Check if user exists by getting user by username
func (h *Handler) CheckUserExists(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var payload types.LoginPayload
	err := json.NewDecoder(r.Body).Decode(&payload)

	//check username
	if err != nil || payload.Username == "" {
		util.WriteError(w, http.StatusBadRequest, errors.New("invalid username"))
		return
	}

	exists, err := h.userExists(ctx, payload.Username)

	if err != nil {
		util.WriteError(w, http.StatusInternalServerError, err)
		return
	}
	util.WriteJSON(w, http.StatusOK, types.CheckUserExists{
		Exists: exists,
	})
}

// Login
func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var result = new(types.LoginResult)
	var created time.Time
	var payload types.LoginPayload
	err := json.NewDecoder(r.Body).Decode(&payload)

	//check username
	if err != nil || payload.Username == "" {
		util.WriteError(w, http.StatusBadRequest, errors.New("invalid username"))
		return
	}

	err = h.db.QueryRow(ctx,
		`SELECT u.user_id, u.username, u.display_name, u.bio, u.created_date, u.password, pi.image_name 
		FROM users u 
		INNER JOIN profile_image pi on u.image_id = pi.image_id 
		WHERE username = $1`, payload.Username,
	).
		Scan(&result.UserId, &result.Username, &result.DisplayName, &result.Bio, &created, &result.Password, &result.ImageName)
	if errors.Is(err, sql.ErrNoRows) || !auth.ComparePasswords(result.Password, []byte(payload.Password)) {
		util.WriteError(w, http.StatusBadRequest, fmt.Errorf("Invalid username or password"))
		return
	}

	if err != nil {
		util.WriteError(w, http.StatusNotFound, err)
		return
	}

	jwtUser := types.JWTUserInfo{
		UserId: result.UserId,
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
		UserId:      result.UserId,
		Username:    result.Username,
		DisplayName: result.DisplayName,
		Bio:         result.Bio,
		ImageName:   result.ImageName,
		CreatedDate: result.CreatedDate,
		Token:       token,
	}

	//pass token to frontend to store in local storage
	util.WriteJSON(w, http.StatusOK, loginInfo)
}

// Add new user
func (h *Handler) SignUp(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var payload types.SignUpPayload
	err := json.NewDecoder(r.Body).Decode(&payload)

	//check username
	if err != nil || payload.Username == "" {
		util.WriteError(w, http.StatusBadRequest, errors.New("invalid username"))
		return
	}

	//hash password via bcrypt
	hashedPassword, err := auth.HashPasword(payload.Password)
	if err != nil {
		util.WriteError(w, http.StatusInternalServerError, err)
		return
	}

	var userID int

	err = h.db.QueryRow(ctx,
		`INSERT INTO users (image_id, username, display_name, bio, password) VALUES ($1, $2, $3, $4, $5) RETURNING  user_id;`,
		payload.ImageId, payload.Username, payload.DisplayName, payload.Bio, hashedPassword,
	).Scan(&userID)

	if pgErr, ok := err.(*pgconn.PgError); ok && pgErr.Code == "23505" {
		util.WriteError(w, http.StatusConflict, errors.New("username already taken"))
		return
	}

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
	var payload types.UpdateUser

	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		util.WriteError(w, http.StatusBadRequest, errors.New("invalid inputs"))
		return
	}

	var (
		hashedPassword *string
	)

	if payload.Password != "" {
		//hash password via bcrypt
		hash, err := auth.HashPasword(payload.Password)
		if err != nil {
			util.WriteError(w, http.StatusInternalServerError, err)
			return
		}
		hashedPassword = &hash
	}

	var result types.UpdateUser
	err := h.db.QueryRow(ctx,
		`UPDATE users SET username = $1, display_name = $2, bio = $3, image_id = $4, password = $5
		WHERE user_id = $6 RETURNING user_id, username, display_name, bio, image_id;`,
		payload.Username, payload.DisplayName, payload.Bio, payload.ImageId, hashedPassword, payload.UserId,
	).Scan(&result.UserId, &result.Username, &result.DisplayName, &result.Bio, &result.ImageId)

	if err != nil {
		// username duplicate
		if pgErr, ok := err.(*pgconn.PgError); ok && pgErr.Code == "23505" {
			util.WriteError(w, http.StatusConflict, errors.New("username already taken"))
			return
		}

		//server error
		util.WriteError(w, http.StatusInternalServerError, err)
		return
	}

	util.WriteJSON(w, http.StatusOK, result)

}
