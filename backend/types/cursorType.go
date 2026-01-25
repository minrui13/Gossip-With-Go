package types

type DateUpvotesIDCursor struct {
	Upvotes_Count int    `json:"upvotes_count"`
	Created_Date  string `json:"created_date"`
	Post_ID       int    `json:"post_id"`
}

type SumVotesDateCursor struct {
	Sum_Votes_Count int    `json:"sum_of_votes"`
	Created_Date    string `json:"created_date"`
	Post_ID         *int   `json:"post_id"`
	Comment_ID      *int   `json:"comment_id"`
	Comment_Count   int    `json:"comment_count"`
	Is_Following    *bool   `json:"is_following"`
}

type DateCursor struct {
	Created_Date string `json:"created_date"`
}

type AlphaDateCursor struct {
	Title        string `json:"title"`
	Created_Date string `json:"created_date"`
}
