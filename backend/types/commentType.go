package types

type CommentDefaultType struct {
	Comment_ID        int    `json:"comment_id"`
	User_ID           int    `json:"user_id"`
	Username          string `json:"username"`
	DisplayName       string `json:"display_name"`
	Image_Name        string `json:"image_name"`
	Post_ID           int    `json:"post_id"`
	Parent_Comment_ID *int   `json:"parent_comment_id"`
	Content           string `json:"content"`
	Created_Date      string `json:"created_date"`
	Vote_ID           *int   `json:"vote_id"`
	Upvote_Count      int    `json:"upvote_count"`
	Downvote_Count    int    `json:"downvote_count"`
	Sum_Votes         int    `json:"sum_votes"`
	Vote_Status       int    `json:"vote_status"`
	Reply_Count       int    `json:"reply_count"`
}

type CommentContent struct {
	Content string `json:"content"`
}

type CommentUserId struct {
	Comment_ID int `json:"comment_id"`
	User_ID    int `json:"user_id"`
}
