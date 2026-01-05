// Everything JWT token related
package auth

import (
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

// Creating JWT Token
func CreateJWT(secret []byte, userID types.JWTUserInfo) (string, error) {
	//setting expiration time
	expiration := time.Second * time.Duration(config.Envs.JWTExpirationInSeconds)
	//signing jwt token with user_id and username
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id":   strconv.Itoa(userID.User_id),
		"username":  userID.Username,
		"expiredAt": time.Now().Add(expiration).Unix(),
	})
	tokenString, err := token.SignedString(secret)
	//check for errors
	if err != nil {
		return "", err
	}
	//return token
	return tokenString, nil
}

// Verifying Token
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

	//get user_id and username from jwt
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		http.Error(w, "Invalid token claims", http.StatusForbidden)
		return
	}
	userIDStr, ok := claims["user_id"].(string)
	if !ok {
		http.Error(w, "Invalid user id", http.StatusForbidden)
		return
	}
	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		util.WriteError(w, http.StatusForbidden, errors.New("invalid user id format"))
		return
	}
	username, ok := claims["username"].(string)
	if !ok {
		util.WriteError(w, http.StatusForbidden, errors.New("invalid username claim"))
		return
	}

	//pass back user_id and username
	util.WriteJSON(w, http.StatusOK, map[string]any{
		"user_id":  userID,
		"username": username,
	})

}
