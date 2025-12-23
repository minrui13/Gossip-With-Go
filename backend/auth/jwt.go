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
	"github.com/minrui13/backend/util"
)

type contextKey string

const UserKey contextKey = "userID"

func CreateJWT(secret []byte, userID int) (string, error) {
	expiration := time.Second * time.Duration(config.Envs.JWTExpirationInSeconds)
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"userID":    strconv.Itoa(userID),
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
		util.WriteError(w, http.StatusUnauthorized, errors.New("missing authorization header"))
		return
	}

	//Split token and check for bearer
	tokenHeader := strings.Split(authToken, " ")
	if !strings.HasPrefix(authToken, "Bearer ") {
		util.WriteError(w, http.StatusUnauthorized, errors.New("invalid authorization format"))
		return
	}

	authToken = tokenHeader[1]

	token, err := jwt.Parse(authToken, func(authToken *jwt.Token) (interface{}, error) {
		if _, ok := authToken.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", authToken.Header["alg"])
		}
		return []byte(config.Envs.JWTSecret), nil
	})

	if err != nil || !token.Valid {
		util.WriteError(w, http.StatusForbidden, errors.New("not authorized"))
		return
	}

	util.WriteJSON(w, http.StatusOK, map[string]any{
		"auth":    true,
		"message": "token is valid",
	})

}

func GetUserIDFromContext(ctx context.Context) int {
	userID, ok := ctx.Value(UserKey).(int)
	if !ok {
		return -1
	}
	return userID
}
