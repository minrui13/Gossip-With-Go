package types

type Topic struct {
	Topic_ID     int    `json:"topic_id"`
	Topic_Name   string `json:"topic_name"`
	Description  string `json:"description"`
	Creator_ID   string `json:"creator_id"`
	Created_Date string `json:"created_date"`
	Visibility   string `json:"visibility"`
	Category_ID  string `json:"category_id"`
}

type FilterTopicResult struct {
	Topic_ID        int    `json:"topic_id"`
	Topic_Name      string `json:"topic_name"`
	Description     string `json:"description"`
	Creator_ID      string `json:"creator_id"`
	Created_Date    string `json:"created_date"`
	Visibility      string `json:"visibility"`
	Category_ID     string `json:"category_id"`
	Followers_Count int    `json:"followers_count"`
}
