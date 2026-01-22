package cursor

import (
	"encoding/base64"
	"encoding/json"

	"github.com/minrui13/backend/types"
)

func EncodeUpvoteCursor(c types.UpvotesPostCursor) (string, error) {
	b, err := json.Marshal(c)
	if err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(b), nil
}

func DecodeUpvoteCursor(s string) (*types.UpvotesPostCursor, error) {
	b, err := base64.StdEncoding.DecodeString(s)
	if err != nil {
		return nil, err
	}

	var c types.UpvotesPostCursor
	if err := json.Unmarshal(b, &c); err != nil {
		return nil, err
	}

	return &c, nil
}

func EncodeSumVotesCursor(c types.SumVotesPostCursor) (string, error) {
	b, err := json.Marshal(c)
	if err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(b), nil
}

func DecodeSumVotesCursor(s string) (*types.SumVotesPostCursor, error) {
	b, err := base64.StdEncoding.DecodeString(s)
	if err != nil {
		return nil, err
	}

	var c types.SumVotesPostCursor
	if err := json.Unmarshal(b, &c); err != nil {
		return nil, err
	}

	return &c, nil
}

func EncodeDateCursor(c types.DatePostCursor) (string, error) {
	b, err := json.Marshal(c)
	if err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(b), nil
}

func DecodeDateCursor(s string) (*types.DatePostCursor, error) {
	b, err := base64.StdEncoding.DecodeString(s)
	if err != nil {
		return nil, err
	}

	var c types.DatePostCursor
	if err := json.Unmarshal(b, &c); err != nil {
		return nil, err
	}

	return &c, nil
}
