package auth

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/minrui13/backend/config"
	"github.com/minrui13/backend/types"
	"github.com/minrui13/backend/util"
)

type contextKey string

const UserKey contextKey = "userID"

func CreateJWT(secret []byte, userID types.JWTUserInfo) (string, error) {
	expiration := time.Second * time.Duration(config.Envs.JWTExpirationInSeconds)
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id":   strconv.Itoa(userID.User_id),
		"username":  userID.Username,
		"expiredAt": time.Now().Add(expiration).Unix(),
	})
	tokenString, err := token.SignedString(secret)
	if err != nil {
		return "", err
	}
	return tokenString, nil
}

func VerifyToken(w http.ResponseWriter, r *http.Request) {
	//check token and token header
	authToken := r.Header.Get("Authorization")

	//check if authHeader is empty
	if authToken == "" {
		util.WriteError(w, http.StatusUnauthorized, errors.New("Missing authorization header"))
		return
	}

	//Split token and check for bearer
	tokenHeader := strings.Split(authToken, " ")
	if !strings.HasPrefix(authToken, "Bearer ") {
		util.WriteError(w, http.StatusUnauthorized, errors.New("Invalid token"))
		return
	}

	authToken = tokenHeader[1]

	//verifying jwt token
	token, err := jwt.Parse(authToken, func(authToken *jwt.Token) (any, error) {
		if _, ok := authToken.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", authToken.Header["alg"])
		}
		return []byte(config.Envs.JWTSecret), nil
	})

	if err != nil || !token.Valid {
		util.WriteError(w, http.StatusForbidden, errors.New("Not authorized"))
		return
	}

	//getting user_id from token
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		http.Error(w, "Invalid token claims", http.StatusForbidden)
		return
	}
	//get user_id and username from jwt
	userID, ok := claims["user_id"].(float64)
	if !ok {
		http.Error(w, "Invalid user id", http.StatusForbidden)
		return
	}
	username, ok := claims["username"].(string)
	if !ok {
		util.WriteError(w, http.StatusForbidden, errors.New("invalid username claim"))
		return
	}

	util.WriteJSON(w, http.StatusOK, map[string]any{
		"user_id":  int(userID),
		"username": username,
	})

}

func GetUserIDFromContext(ctx context.Context) int {
	userID, ok := ctx.Value(UserKey).(int)
	if !ok {
		return -1
	}
	return userID
}
