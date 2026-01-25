package cursor

import (
	"encoding/base64"
	"encoding/json"

	"github.com/minrui13/backend/types"
)

func EncodeUpvoteCursor(c types.DateUpvotesIDCursor) (string, error) {
	b, err := json.Marshal(c)
	if err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(b), nil
}

func DecodeUpvoteCursor(s string) (*types.DateUpvotesIDCursor, error) {
	b, err := base64.StdEncoding.DecodeString(s)
	if err != nil {
		return nil, err
	}

	var c types.DateUpvotesIDCursor
	if err := json.Unmarshal(b, &c); err != nil {
		return nil, err
	}

	return &c, nil
}

func EncodeSumVotesDateCursor(c types.SumVotesDateCursor) (string, error) {
	b, err := json.Marshal(c)
	if err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(b), nil
}

func DecodeSumVotesDateCursor(s string) (*types.SumVotesDateCursor, error) {
	b, err := base64.StdEncoding.DecodeString(s)
	if err != nil {
		return nil, err
	}

	var c types.SumVotesDateCursor
	if err := json.Unmarshal(b, &c); err != nil {
		return nil, err
	}

	return &c, nil
}

func EncodeDateCursor(c types.DateCursor) (string, error) {
	b, err := json.Marshal(c)
	if err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(b), nil
}

func DecodeDateCursor(s string) (*types.DateCursor, error) {
	b, err := base64.StdEncoding.DecodeString(s)
	if err != nil {
		return nil, err
	}

	var c types.DateCursor
	if err := json.Unmarshal(b, &c); err != nil {
		return nil, err
	}

	return &c, nil
}

func EncodeAlphaCursor(c types.AlphaDateCursor) (string, error) {
	b, err := json.Marshal(c)
	if err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(b), nil
}

func DecodeAlphaCursor(s string) (*types.AlphaDateCursor, error) {
	b, err := base64.StdEncoding.DecodeString(s)
	if err != nil {
		return nil, err
	}

	var c types.AlphaDateCursor
	if err := json.Unmarshal(b, &c); err != nil {
		return nil, err
	}

	return &c, nil
}

func EncodeTopicCursor(c types.TopicDefaultCursor) (string, error) {
	b, err := json.Marshal(c)
	if err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(b), nil
}

func DecodeTopicCursor(s string) (*types.TopicDefaultCursor, error) {
	b, err := base64.StdEncoding.DecodeString(s)
	if err != nil {
		return nil, err
	}

	var c types.TopicDefaultCursor	
	if err := json.Unmarshal(b, &c); err != nil {
		return nil, err
	}

	return &c, nil
}
