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

// CoopInfoResponse defines the structure for the /api/coop/info endpoint
type CoopInfoResponse struct {
	CoopID     string       `json:"coop_id"`
	Name       string       `json:"name"`
	InviteCode *string      `json:"invite_code,omitempty"` // Made pointer to handle potential absence from schema
	Members    []CoopMember `json:"members"`
}

// CoopMember defines the structure for a member in the CoopInfoResponse
type CoopMember struct {
	UserID   string `json:"user_id"`
	Username string `json:"username"`
}

// SupabaseUserCoopMembership is used to decode the response from coop_members table for a single user
type SupabaseUserCoopMembership struct {
	CoopID string `json:"coop_id"`
}

// SupabaseCoopDetails is used to decode the response from the coops table
type SupabaseCoopDetails struct {
	ID         string  `json:"id"`
	Name       string  `json:"name"`
	InviteCode *string `json:"invite_code,omitempty"` // Attempt to select, handle if null/missing
}

// SupabaseCoopMemberWithUser is used to decode the response from coop_members joined with users
type SupabaseCoopMemberWithUser struct {
	UserID string          `json:"user_id"`
	Users  SupabaseUserRef `json:"users"` // Supabase nests related table data
}

// SupabaseUserRef is used to decode the nested user object from users table
type SupabaseUserRef struct {
	Username string `json:"username"`
}

// GetCoopInfoHandler handles GET /api/coop/info
func GetCoopInfoHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		respondWithError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	supabaseURL := os.Getenv("SUPABASE_URL")
	supabaseServiceKey := os.Getenv("SUPABASE_SERVICE_KEY")
	supabaseJWTSecret := os.Getenv("SUPABASE_JWT_SECRET")

	if supabaseURL == "" || supabaseServiceKey == "" || supabaseJWTSecret == "" {
		log.Println("Error: Missing Supabase environment variables for coop info")
		respondWithError(w, http.StatusInternalServerError, "Server configuration error")
		return
	}

	// 1. Authenticate user and get user_id
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		respondWithError(w, http.StatusUnauthorized, "Authorization header required")
		return
	}
	tokenString := strings.TrimPrefix(authHeader, "Bearer ")
	if tokenString == authHeader {
		respondWithError(w, http.StatusUnauthorized, "Invalid token format")
		return
	}

	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(supabaseJWTSecret), nil
	})

	if err != nil || !token.Valid {
		log.Printf("Error validating JWT for coop info: %v\n", err)
		respondWithError(w, http.StatusUnauthorized, "Invalid or expired token")
		return
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		log.Println("Error parsing JWT claims for coop info")
		respondWithError(w, http.StatusUnauthorized, "Invalid token claims")
		return
	}

	userID, ok := claims["sub"].(string)
	if !ok || userID == "" {
		log.Println("Error: 'sub' claim missing or invalid in JWT for coop info")
		respondWithError(w, http.StatusUnauthorized, "User ID not found in token")
		return
	}

	client := &http.Client{}

	// 2. Look up the user's coop membership in coop_members
	userCoopMemberURL := fmt.Sprintf("%s/rest/v1/coop_members?user_id=eq.%s&select=coop_id&limit=1", supabaseURL, userID)
	req, _ := http.NewRequest("GET", userCoopMemberURL, nil)
	req.Header.Set("apikey", supabaseServiceKey)
	req.Header.Set("Authorization", "Bearer "+supabaseServiceKey)
	req.Header.Set("Accept", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		log.Printf("Error fetching user's coop membership: %v", err)
		respondWithError(w, http.StatusInternalServerError, "Failed to retrieve coop membership")
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("Supabase error fetching user's coop membership. Status: %s", resp.Status)
		respondWithError(w, http.StatusInternalServerError, "Failed to retrieve coop membership data")
		return
	}

	var userCoopMemberships []SupabaseUserCoopMembership
	if err := json.NewDecoder(resp.Body).Decode(&userCoopMemberships); err != nil {
		log.Printf("Error decoding user's coop membership response: %v", err)
		respondWithError(w, http.StatusInternalServerError, "Error processing coop membership data")
		return
	}

	if len(userCoopMemberships) == 0 {
		respondWithError(w, http.StatusNotFound, "User is not a member of any coop")
		return
	}
	coopID := userCoopMemberships[0].CoopID

	// 3. Fetch coop details from the coops table
	coopDetailsURL := fmt.Sprintf("%s/rest/v1/coops?id=eq.%s&select=name,invite_code&limit=1", supabaseURL, coopID)
	req, _ = http.NewRequest("GET", coopDetailsURL, nil)
	req.Header.Set("apikey", supabaseServiceKey)
	req.Header.Set("Authorization", "Bearer "+supabaseServiceKey)
	req.Header.Set("Accept", "application/json")

	resp, err = client.Do(req)
	if err != nil {
		log.Printf("Error fetching coop details for coop_id %s: %v", coopID, err)
		respondWithError(w, http.StatusInternalServerError, "Failed to retrieve coop details")
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("Supabase error fetching coop details for coop_id %s. Status: %s", coopID, resp.Status)
		respondWithError(w, http.StatusInternalServerError, "Failed to retrieve coop details data")
		return
	}

	var coopDetailsList []SupabaseCoopDetails
	if err := json.NewDecoder(resp.Body).Decode(&coopDetailsList); err != nil || len(coopDetailsList) == 0 {
		log.Printf("Error decoding coop details response for coop_id %s: %v", coopID, err)
		respondWithError(w, http.StatusInternalServerError, "Error processing coop details data or coop not found")
		return
	}
	coopDetail := coopDetailsList[0]

	// 4. Fetch coop members and their usernames
	coopMembersURL := fmt.Sprintf("%s/rest/v1/coop_members?coop_id=eq.%s&select=user_id,users(username)", supabaseURL, coopID)
	req, _ = http.NewRequest("GET", coopMembersURL, nil)
	req.Header.Set("apikey", supabaseServiceKey)
	req.Header.Set("Authorization", "Bearer "+supabaseServiceKey)
	req.Header.Set("Accept", "application/json")

	resp, err = client.Do(req)
	if err != nil {
		log.Printf("Error fetching coop members for coop_id %s: %v", coopID, err)
		respondWithError(w, http.StatusInternalServerError, "Failed to retrieve coop members")
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("Supabase error fetching coop members for coop_id %s. Status: %s", coopID, resp.Status)
		respondWithError(w, http.StatusInternalServerError, "Failed to retrieve coop members data")
		return
	}

	var supabaseMembers []SupabaseCoopMemberWithUser
	if err := json.NewDecoder(resp.Body).Decode(&supabaseMembers); err != nil {
		log.Printf("Error decoding coop members response for coop_id %s: %v", coopID, err)
		respondWithError(w, http.StatusInternalServerError, "Error processing coop members data")
		return
	}

	members := make([]CoopMember, 0, len(supabaseMembers))
	for _, sm := range supabaseMembers {
		members = append(members, CoopMember{
			UserID:   sm.UserID,
			Username: sm.Users.Username,
		})
	}

	// 5. Construct and return response
	response := CoopInfoResponse{
		CoopID:     coopID,
		Name:       coopDetail.Name,
		InviteCode: coopDetail.InviteCode,
		Members:    members,
	}

	respondWithJSON(w, http.StatusOK, response)
}
