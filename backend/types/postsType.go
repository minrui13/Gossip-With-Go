package types

import "time"

type PostDefaultResult struct {
	Post_ID         int     `json:"post_id"`
	User_ID         int     `json:"user_id"`
	Username        string  `json:"username"`
	User_Image      string  `json:"user_image"`
	Topic_Name      string  `json:"topic_name"`
	Category_Icon   string  `json:"category_icon"`
	Tag_Name        *string `json:"tag_name"`
	Tag_Icon        *string `json:"tag_icon"`
	Tag_Description *string `json:"tag_description"`
	Title           string  `json:"title"`
	Content         string  `json:"content"`
	Created_Date    string  `json:"created_date"`
	Vote_ID         *int    `json:"vote_id"`
	Upvote_Count    int     `json:"upvote_count"`
	Downvote_Count  int     `json:"downvote_count"`
	Vote_Status     int     `json:"vote_status"`
	Comment_Count   int     `json:"comment_count"`
	Bookmark_ID     *int    `json:"bookmark_id"`
	Is_Bookmarked   bool    `json:"is_bookmarked"`
}

type PostByFollowPopularityResult struct {
	Post_ID         int     `json:"post_id"`
	User_ID         int     `json:"user_id"`
	Username        string  `json:"username"`
	User_Image      string  `json:"user_image"`
	Topic_Name      string  `json:"topic_name"`
	Category_Icon   string  `json:"category_icon"`
	Tag_Name        *string `json:"tag_name"`
	Tag_Icon        *string `json:"tag_icon"`
	Tag_Description *string `json:"tag_description"`
	Title           string  `json:"title"`
	Content         string  `json:"content"`
	Created_Date    string  `json:"created_date"`
	Vote_ID         *int    `json:"vote_id"`
	Upvote_Count    int     `json:"upvote_count"`
	Downvote_Count  int     `json:"downvote_count"`
	Sum_Votes       int     `json:"sum_votes"`
	Vote_Status     int     `json:"vote_status"`
	Comment_Count   int     `json:"comment_count"`
	Bookmark_ID     *int    `json:"bookmark_id"`
	Is_Bookmarked   bool    `json:"is_bookmarked"`
}

type PostByFollowPayload struct {
	From_Date time.Time `json:"from_date"`
	To_Date   time.Time `json:"to_date"`
}
