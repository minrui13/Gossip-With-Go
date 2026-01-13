package types

import "time"

type SignUpPayload struct {
	Image_id    int     `json:"image_id"`
	Username    string  `json:"username"`
	DisplayName *string `json:"display_name"`
	Bio         *string `json:"bio"`
	Password    string  `json:"password"`
}

type LoginPayload struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type JWTUserInfo struct {
	User_id int `json:"user_id"`
}

type UpdateUser struct {
	User_id     int     `json:"user_id"`
	Username    string  `json:"username"`
	DisplayName *string `json:"display_name"`
	Bio         *string `json:"bio"`
	Image_id    int     `json:"image_id"`
	Password    string  `json:"password"`
}

type User struct {
	User_id      int     `json:"user_id"`
	Username     string  `json:"username"`
	DisplayName  *string `json:"display_name"`
	Bio          *string `json:"bio"`
	Image_id     int     `json:"image_id"`
	Points       int     `json:"points"`
	Created_date string  `json:"created_date"`
	Password     string  `json:"password"`
}

type UserIdResult struct {
	User_id      int       `json:"user_id"`
	Username     string    `json:"username"`
	DisplayName  *string   `json:"display_name"`
	Bio          *string   `json:"bio"`
	Image_id     int       `json:"image_id"`
	Points       int       `json:"points"`
	Created_date time.Time `json:"created_date"`
	Password     string    `json:"password"`
}

type LoginInfo struct {
	User_id      int     `json:"user_id"`
	Username     string  `json:"username"`
	DisplayName  *string `json:"display_name"`
	Bio          *string `json:"bio"`
	Image_id     int     `json:"image_id"`
	Points       int     `json:"points"`
	Created_date string  `json:"created_date"`
	Token        string  `json:"token"`
}

type LoginResult struct {
	User_id      int     `json:"user_id"`
	Username     string  `json:"username"`
	DisplayName  *string `json:"display_name"`
	Bio          *string `json:"bio"`
	Image_id     int     `json:"image_id"`
	Points       int     `json:"points"`
	Created_date string  `json:"created_date"`
	Password     string  `json:"password"`
}

type CheckUserExists struct {
	Exists bool `json:"exists"`
}
