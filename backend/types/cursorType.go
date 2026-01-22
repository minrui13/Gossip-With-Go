package types

type UpvotesPostCursor struct {
	Created_Date  string `json:"created_date"`
	Upvotes_Count int    `json:"upvotes_count"`
}

type SumVotesPostCursor struct {
	Created_Date    string `json:"created_date"`
	Sum_Votes_Count int    `json:"sum_of_votes"`
}

type DatePostCursor struct {
	Created_Date string `json:"created_date"`
}
