package types

type SignUpPayload struct {
	Image_id    int     `json:"image_id"`
	Username    string  `json:"username"`
	DisplayName *string `json:"display_name"`
	Bio         *string `json:"bio"`
}

type LoginPayload struct {
	Username string `json:"username"`
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
}

type User struct {
	User_id      int     `json:"user_id"`
	Username     string  `json:"username"`
	DisplayName  *string `json:"display_name"`
	Bio          *string `json:"bio"`
	Image_id     int     `json:"image_id"`
	Points       int     `json:"points"`
	Created_date string  `json:"created_date"`
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

type CheckUserExists struct {
	Exists bool `json:"exists"`
}
