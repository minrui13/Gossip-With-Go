package types

import "database/sql"

type User struct {
	User_id      int            `json:"user_id"`
	Username     string         `json:"username"`
	DisplayName  string         `json:"display_name"`
	Bio          sql.NullString `json:"bio"`
	Image_id     int            `json:"image_id"`
	Points       int            `json:"points"`
	Created_date string         `json:"created_date"`
}

type NewUser struct {
	Username string `json:"username"`
}

type UpdateUser struct {
	User_id     int            `json:"user_id"`
	Username    string         `json:"username"`
	DisplayName string         `json:"display_name"`
	Bio         sql.NullString `json:"bio"`
	Image_id    int            `json:"image_id"`
}
