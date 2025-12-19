package types

type User struct {
	User_id      int    `json:"user_id"`
	Username     string `json:"username"`
	Image_id     int    `json:"image_id"`
	Points       int    `json:"points"`
	Created_date string `json:"created_date"`
}

type NewUser struct {
	Username string `json:"username"`
}
