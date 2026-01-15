package types

import "time"

type SignUpPayload struct {
	ImageId     int     `json:"image_id"`
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
	UserId int `json:"user_id"`
}

type UpdateUser struct {
	UserId      int     `json:"user_id"`
	Username    string  `json:"username"`
	DisplayName *string `json:"display_name"`
	Bio         *string `json:"bio"`
	ImageId     int     `json:"image_id"`
	Password    string  `json:"password"`
}

type User struct {
	UserId       int     `json:"user_id"`
	Username     string  `json:"username"`
	DisplayName  *string `json:"display_name"`
	Bio          *string `json:"bio"`
	ImageName    string  `json:"image_name"`
	Created_date string  `json:"created_date"`
	Password     string  `json:"password"`
}

type UserIdResult struct {
	UserId      int       `json:"user_id"`
	Username    string    `json:"username"`
	DisplayName *string   `json:"display_name"`
	Bio         *string   `json:"bio"`
	ImageName   string    `json:"image_name"`
	CreatedDate time.Time `json:"created_date"`
	Password    string    `json:"password"`
}

type LoginInfo struct {
	UserId      int     `json:"user_id"`
	Username    string  `json:"username"`
	DisplayName *string `json:"display_name"`
	Bio         *string `json:"bio"`
	ImageName   string  `json:"image_name"`
	CreatedDate string  `json:"created_date"`
	Token       string  `json:"token"`
}

type LoginResult struct {
	UserId      int     `json:"user_id"`
	Username    string  `json:"username"`
	DisplayName *string `json:"display_name"`
	Bio         *string `json:"bio"`
	ImageName   string  `json:"image_name"`
	CreatedDate string  `json:"created_date"`
	Password    string  `json:"password"`
}

type CheckUserExists struct {
	Exists bool `json:"exists"`
}
