package router

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/gorilla/mux"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/minrui13/backend/types"
)

type Handler struct {
	db *pgxpool.Pool
}

func NewHandler(db *pgxpool.Pool) *Handler {
	return &Handler{db: db}
}

func (h *Handler) Router(r *mux.Router) *mux.Router {

	r.HandleFunc("/getAllUsers", h.GetAllUsers).Methods("GET")

	return r
}

func (h *Handler) GetAllUsers(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	query := `SELECT * FROM users`

	rows, err := h.db.Query(ctx, query)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var users []types.User

	for rows.Next() {
		var u types.User
		var created time.Time

		if err := rows.Scan(&u.User_id, &u.Username, &created); err != nil {
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

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}
