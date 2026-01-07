package imagesRoute

import (
	"net/http"
	"strconv"

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
	r.HandleFunc("/", h.GetAllImages).Methods("GET")
	r.HandleFunc("/{id}", h.GetImageById).Methods("GET")

	return r
}

// Get all images
func (h *Handler) GetAllImages(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	rows, err := h.db.Query(ctx, `SELECT image_id, image_name FROM profile_image`)

	//database error 500 status code
	//same as res.send(500)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	var images []types.Image
	for rows.Next() {
		var u types.Image

		if err := rows.Scan(&u.Image_ID, &u.Image_Name); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		images = append(images, u)
	}

	if err := rows.Err(); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	util.WriteJSON(w, http.StatusOK, images)
}

// Get image by image_id
func (h *Handler) GetImageById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	image := new(types.Image)
	//convert imageID to integer (check if valid integer)
	id := mux.Vars(r)["id"]
	imageID, err := strconv.Atoi(id)

	if err != nil {
		util.WriteError(w, http.StatusBadRequest, err)
		return
	}
	err = h.db.QueryRow(ctx, `SELECT image_id, image_name FROM profile_image WHERE image_id = $1`, imageID).
		Scan(&image.Image_ID, &image.Image_Name)

	if err != nil {
		util.WriteError(w, http.StatusNotFound, err)
		return
	}

	util.WriteJSON(w, http.StatusOK, image)
}
