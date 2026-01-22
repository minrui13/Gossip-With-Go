package types

type DateUpvotesIDCursor struct {
	Upvotes_Count int    `json:"upvotes_count"`
	Created_Date  string `json:"created_date"`
	Post_ID       int    `json:"post_id"`
}

type DateSumVotesCursor struct {
	Created_Date    string `json:"created_date"`
	Sum_Votes_Count int    `json:"sum_of_votes"`
}

type SumVotesDateCursor struct {
	Sum_Votes_Count int    `json:"sum_of_votes"`
	Created_Date    string `json:"created_date"`
	Post_ID         *int   `json:"post_id"`
	Comment_ID      *int   `json:"comment_id"`
}

type DateCursor struct {
	Created_Date string `json:"created_date"`
}

type AlphaDateCursor struct {
	Title        string `json:"title"`
	Created_Date string `json:"created_date"`
}
