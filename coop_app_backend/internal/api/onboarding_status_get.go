package api

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

// OnboardingStatusResponse defines the structure for the onboarding status response.
type OnboardingStatusResponse struct {
	UserID     string `json:"user_id"`
	HasProfile bool   `json:"has_profile"`
	HasCoop    bool   `json:"has_coop"`
	Username   string `json:"username,omitempty"`
	CoopID     string `json:"coop_id,omitempty"`
}

// SupabaseUserForStatus is a minimal struct for decoding the user check.
type SupabaseUserForStatus struct {
	ID       string `json:"id"`
	Username string `json:"username"`
}

// SupabaseCoopMemberForStatus is a minimal struct for decoding the coop member check.
type SupabaseCoopMemberForStatus struct {
	UserID string `json:"user_id"`
	CoopID string `json:"coop_id"`
}

// GetOnboardingStatusHandler checks and returns the user's onboarding status.
func GetOnboardingStatusHandler(w http.ResponseWriter, r *http.Request) {
	supabaseURL := os.Getenv("SUPABASE_URL")
	supabaseServiceKey := os.Getenv("SUPABASE_SERVICE_KEY")
	supabaseJWTSecret := os.Getenv("SUPABASE_JWT_SECRET")

	if supabaseURL == "" || supabaseServiceKey == "" || supabaseJWTSecret == "" {
		log.Println("Error: Missing Supabase environment variables for onboarding status")
		respondWithError(w, http.StatusInternalServerError, "Server configuration error") // Uses standard helper
		return
	}

	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		respondWithError(w, http.StatusUnauthorized, "Authorization header required") // Uses standard helper
		return
	}
	tokenString := strings.TrimPrefix(authHeader, "Bearer ")
	if tokenString == authHeader { // No "Bearer " prefix
		respondWithError(w, http.StatusUnauthorized, "Invalid token format") // Uses standard helper
		return
	}

	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(supabaseJWTSecret), nil
	})

	if err != nil || !token.Valid {
		log.Printf("Error validating JWT for onboarding status: %v\n", err)
		respondWithError(w, http.StatusUnauthorized, "Invalid or expired token") // Uses standard helper
		return
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		log.Println("Error parsing JWT claims for onboarding status")
		respondWithError(w, http.StatusUnauthorized, "Invalid token claims") // Uses standard helper
		return
	}

	userID, ok := claims["sub"].(string)
	if !ok || userID == "" {
		log.Println("Error: 'sub' claim missing or invalid in JWT for onboarding status")
		respondWithError(w, http.StatusUnauthorized, "User ID not found in token") // Uses standard helper
		return
	}

	response := OnboardingStatusResponse{UserID: userID}
	client := &http.Client{}

	// 1. Check Profile
	profileURL := fmt.Sprintf("%s/rest/v1/users?id=eq.%s&select=id,username", supabaseURL, userID)
	profileReq, _ := http.NewRequest("GET", profileURL, nil)
	profileReq.Header.Set("apikey", supabaseServiceKey)
	profileReq.Header.Set("Authorization", "Bearer "+supabaseServiceKey)

	profileResp, err := client.Do(profileReq)
	if err != nil {
		log.Printf("Error checking user profile for %s: %v\n", userID, err)
		respondWithError(w, http.StatusInternalServerError, "Failed to check user profile") // Uses standard helper
		return
	}
	defer profileResp.Body.Close()

	if profileResp.StatusCode == http.StatusOK {
		var users []SupabaseUserForStatus
		if err := json.NewDecoder(profileResp.Body).Decode(&users); err == nil && len(users) > 0 {
			response.HasProfile = true
			response.Username = users[0].Username
		} else if err != nil {
			log.Printf("Error decoding user profile response for %s: %v\n", userID, err)
		}
	} else {
		log.Printf("Supabase error checking user profile for %s. Status: %s\n", userID, profileResp.Status)
	}

	// 2. Check Coop Membership
	coopMemberURL := fmt.Sprintf("%s/rest/v1/coop_members?user_id=eq.%s&select=coop_id&order=joined_at.desc&limit=1", supabaseURL, userID)
	coopMemberReq, _ := http.NewRequest("GET", coopMemberURL, nil)
	coopMemberReq.Header.Set("apikey", supabaseServiceKey)
	coopMemberReq.Header.Set("Authorization", "Bearer "+supabaseServiceKey)

	coopMemberResp, err := client.Do(coopMemberReq)
	if err != nil {
		log.Printf("Error checking coop membership for %s: %v\n", userID, err)
		respondWithError(w, http.StatusInternalServerError, "Failed to check coop membership") // Uses standard helper
		return
	}
	defer coopMemberResp.Body.Close()

	if coopMemberResp.StatusCode == http.StatusOK {
		var members []SupabaseCoopMemberForStatus
		if err := json.NewDecoder(coopMemberResp.Body).Decode(&members); err == nil && len(members) > 0 {
			response.HasCoop = true
			response.CoopID = members[0].CoopID
		} else if err != nil {
			log.Printf("Error decoding coop membership response for %s: %v\n", userID, err)
		}
	} else {
		log.Printf("Supabase error checking coop membership for %s. Status: %s\n", userID, coopMemberResp.Status)
	}

	respondWithJSON(w, http.StatusOK, response) // Uses standard helper
}
