package tagsRoute

import (
	"net/http"

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
	//Get all tags
	r.HandleFunc("/", h.GetAllTags).Methods("Get")

	return r
}

// Get all tags
func (h *Handler) GetAllTags(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	rows, err := h.db.Query(ctx, `SELECT tag_id, tag_name, description, icon_name FROM tags`)

	//database error 500 status code
	//same as res.send(500)
	if err != nil {
		util.WriteError(w, http.StatusInternalServerError, err)
		return
	}

	var tagArr []types.TagDefaultType

	for rows.Next() {
		var tag types.TagDefaultType

		if err := rows.Scan(&tag.Tag_ID, &tag.Tag_Name, &tag.Description,
			&tag.Tag_Icon); err != nil {
			util.WriteError(w, http.StatusInternalServerError, err)
			return
		}

		tagArr = append(tagArr, tag)
	}

	if err := rows.Err(); err != nil {
		util.WriteError(w, http.StatusInternalServerError, err)
		return
	}

	util.WriteJSON(w, http.StatusOK, tagArr)
}
