package types

type VoteTypePayload struct {
	VoteType int `json:"vote_type"`
}

type VoteDefault struct {
	Vote_ID     int `json:"vote_id"`
	User_ID     int `json:"user_id"`
	Post_ID     int `json:"post_id"`
	Vote_Type   int `json:"vote_type"`
	Edited_Date int `json:"edited_date"`
}

type VoteIDPayload struct {
	Vote_ID int `json:"vote_id"`
}

type Vote struct {
	Vote_ID int `json:"vote_id"`
}

type VoteCountResult struct {
	Upvote_Count   int `json:"upvote_count"`
	Downvote_Count int `json:"downvote_count"`
}
