package types

type TopicDefaultResult struct {
	Topic_ID        int    `json:"topic_id"`
	Topic_User_ID   int    `json:"topic_user_id"`
	Username        string `json:"username"`
	Display_Name    string `json:"display_name"`
	Image_Name      string `json:"image_name"`
	Topic_Name      string `json:"topic_name"`
	Topic_URL       string `json:"topic_url"`
	Description     string `json:"description"`
	Visibility      string `json:"visibility"`
	Created_Date    string `json:"created_date"`
	Category_Name   string `json:"category_name"`
	Category_Icon   string `json:"category_icon"`
	Followers_Count int    `json:"followers_count"`
	Posts_Count     int    `json:"posts_count"`
	Is_Following    bool   `json:"is_following"`
}

type TopicByPopularitySearchResult struct {
	Topic_ID        int    `json:"topic_id"`
	Topic_User_ID   int    `json:"topic_user_id"`
	Username        string `json:"username"`
	Display_Name    string `json:"display_name"`
	Image_Name      string `json:"image_name"`
	Topic_Name      string `json:"topic_name"`
	Topic_URL       string `json:"topic_url"`
	Description     string `json:"description"`
	Visibility      string `json:"visibility"`
	Created_Date    string `json:"created_date"`
	Category_Name   string `json:"category_name"`
	Category_Icon   string `json:"category_icon"`
	Followers_Count int    `json:"followers_count"`
	Posts_Count     int    `json:"posts_count"`
	Is_Following    bool   `json:"is_following"`
}
