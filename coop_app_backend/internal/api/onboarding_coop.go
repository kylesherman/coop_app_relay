package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

// CoopOnboardingRequest defines the structure for the coop onboarding request payload.
type CoopOnboardingRequest struct {
	Mode  string `json:"mode"`  // "create_new_coop" or "join_a_flock"
	Value string `json:"value"` // Coop name (if creating) or invite code (if joining)
}

// CoopCreateResponse defines the structure for a successful coop creation response.
type CoopCreateResponse struct {
	Message    string `json:"message"`
	CoopID     string `json:"coop_id"`
	InviteCode string `json:"invite_code"`
}

// CoopJoinResponse defines the structure for a successful coop join response.
type CoopJoinResponse struct {
	Message string `json:"message"`
	CoopID  string `json:"coop_id,omitempty"` // omitempty for "Already a member" case where it might be redundant
}

// SupabaseCoop represents the structure of a coop record from Supabase.
type SupabaseCoop struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	CreatedBy  string `json:"created_by"`
	InviteCode string `json:"invite_code"`
}

// SupabaseCoopMember represents the structure of a coop member record from Supabase.
// Only UserID is strictly needed for the existence check, but others are good for context.
type SupabaseCoopMember struct {
	UserID string `json:"user_id"`
	CoopID string `json:"coop_id"`
	Role   string `json:"role"`
}

// PostCoopOnboardingHandler handles requests to create or join a coop.
func PostCoopOnboardingHandler(w http.ResponseWriter, r *http.Request) {
	supabaseURL := os.Getenv("SUPABASE_URL")
	supabaseServiceKey := os.Getenv("SUPABASE_SERVICE_KEY")
	supabaseJWTSecret := os.Getenv("SUPABASE_JWT_SECRET")

	if supabaseURL == "" || supabaseServiceKey == "" || supabaseJWTSecret == "" {
		log.Println("Error: Missing Supabase environment variables")
		respondWithError(w, http.StatusInternalServerError, "Server configuration error")
		return
	}

	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		respondWithError(w, http.StatusUnauthorized, "Authorization header required")
		return
	}
	tokenString := strings.TrimPrefix(authHeader, "Bearer ")
	if tokenString == authHeader { // No "Bearer " prefix
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
		log.Printf("Error validating JWT: %v\n", err)
		respondWithError(w, http.StatusUnauthorized, "Invalid or expired token") // Changed from 403 to 401
		return
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		log.Println("Error parsing JWT claims")
		respondWithError(w, http.StatusUnauthorized, "Invalid token claims")
		return
	}

	userID, ok := claims["sub"].(string)
	if !ok || userID == "" {
		log.Println("Error: 'sub' claim missing or invalid in JWT")
		respondWithError(w, http.StatusUnauthorized, "User ID not found in token")
		return
	}

	var req CoopOnboardingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.Mode == "" || req.Value == "" {
		respondWithError(w, http.StatusBadRequest, "Missing mode or value")
		return
	}

	client := &http.Client{}

	switch req.Mode {
	case "create_new_coop":
		// 1. Check if coop name already exists
		checkNameURL := fmt.Sprintf("%s/rest/v1/coops?name=eq.%s&select=id", supabaseURL, req.Value)
		nameReq, _ := http.NewRequest("GET", checkNameURL, nil)
		nameReq.Header.Set("apikey", supabaseServiceKey)
		nameReq.Header.Set("Authorization", "Bearer "+supabaseServiceKey)
		nameResp, err := client.Do(nameReq)
		if err != nil {
			log.Printf("Error checking coop name: %v\n", err)
			respondWithError(w, http.StatusInternalServerError, "Failed to check coop name")
			return
		}
		defer nameResp.Body.Close()

		if nameResp.StatusCode == http.StatusOK {
			var existingCoops []SupabaseCoop
			if err := json.NewDecoder(nameResp.Body).Decode(&existingCoops); err == nil && len(existingCoops) > 0 {
				respondWithError(w, http.StatusConflict, "Coop name already exists")
				return
			}
		} else if nameResp.StatusCode != http.StatusOK { // Catches other errors from Supabase like 401 if key is wrong
			log.Printf("Supabase error checking coop name. Status: %s\n", nameResp.Status)
			respondWithError(w, http.StatusInternalServerError, "Error checking coop name uniqueness")
			return
		}

		// 2. Insert new row into coops
		createCoopURL := fmt.Sprintf("%s/rest/v1/coops", supabaseURL)
		coopPayload := map[string]interface{}{"name": req.Value, "created_by": userID}
		coopJSON, _ := json.Marshal(coopPayload)
		createReq, _ := http.NewRequest("POST", createCoopURL, bytes.NewBuffer(coopJSON))
		createReq.Header.Set("apikey", supabaseServiceKey)
		createReq.Header.Set("Authorization", "Bearer "+supabaseServiceKey)
		createReq.Header.Set("Content-Type", "application/json")
		createReq.Header.Set("Prefer", "return=representation") // Important to get the created row back

		createResp, err := client.Do(createReq)
		if err != nil {
			log.Printf("Error creating coop: %v\n", err)
			respondWithError(w, http.StatusInternalServerError, "Failed to create coop")
			return
		}
		defer createResp.Body.Close()

		if createResp.StatusCode == http.StatusConflict {
			respondWithError(w, http.StatusConflict, "Coop name already exists") // Race condition or DB constraint
			return
		}
		if createResp.StatusCode != http.StatusCreated {
			log.Printf("Supabase error creating coop. Status: %s\n", createResp.Status)
			// TODO: Parse error from Supabase body for more details
			respondWithError(w, http.StatusInternalServerError, "Failed to create coop in database")
			return
		}

		var createdCoops []SupabaseCoop // Supabase returns an array even for single insert with representation
		if err := json.NewDecoder(createResp.Body).Decode(&createdCoops); err != nil || len(createdCoops) == 0 {
			log.Printf("Error decoding created coop response or empty response: %v\n", err)
			respondWithError(w, http.StatusInternalServerError, "Failed to parse coop creation response")
			return
		}
		newCoop := createdCoops[0]

		// 3. Insert into coop_members
		memberPayload := map[string]interface{}{"user_id": userID, "coop_id": newCoop.ID, "role": "owner"}
		memberJSON, _ := json.Marshal(memberPayload)
		addMemberURL := fmt.Sprintf("%s/rest/v1/coop_members", supabaseURL)
		addMemberReq, _ := http.NewRequest("POST", addMemberURL, bytes.NewBuffer(memberJSON))
		addMemberReq.Header.Set("apikey", supabaseServiceKey)
		addMemberReq.Header.Set("Authorization", "Bearer "+supabaseServiceKey)
		addMemberReq.Header.Set("Content-Type", "application/json")
		// Prefer=representation not strictly needed here unless we want to confirm the member add

		addMemberResp, err := client.Do(addMemberReq)
		if err != nil {
			log.Printf("Error adding owner to coop_members: %v\n", err)
			// Potentially roll back coop creation or mark as orphaned? For now, log and error out.
			respondWithError(w, http.StatusInternalServerError, "Failed to add owner to coop")
			return
		}
		defer addMemberResp.Body.Close()

		if addMemberResp.StatusCode != http.StatusCreated {
			log.Printf("Supabase error adding owner to coop_members. Status: %s\n", addMemberResp.Status)
			// TODO: Parse error from Supabase body
			respondWithError(w, http.StatusInternalServerError, "Failed to record coop ownership")
			return
		}

		// 4. Return response
		respondWithJSON(w, http.StatusCreated, CoopCreateResponse{
			Message:    "Coop created and joined",
			CoopID:     newCoop.ID,
			InviteCode: newCoop.InviteCode,
		})

	case "join_a_flock":
		// 1. Find coop by invite_code
		findCoopURL := fmt.Sprintf("%s/rest/v1/coops?invite_code=eq.%s&select=id,name,invite_code", supabaseURL, req.Value)
		findReq, _ := http.NewRequest("GET", findCoopURL, nil)
		findReq.Header.Set("apikey", supabaseServiceKey)
		findReq.Header.Set("Authorization", "Bearer "+supabaseServiceKey)

		findResp, err := client.Do(findReq)
		if err != nil {
			log.Printf("Error finding coop by invite code: %v\n", err)
			respondWithError(w, http.StatusInternalServerError, "Failed to search for coop")
			return
		}
		defer findResp.Body.Close()

		var foundCoops []SupabaseCoop
		if findResp.StatusCode == http.StatusOK {
			if err := json.NewDecoder(findResp.Body).Decode(&foundCoops); err != nil || len(foundCoops) == 0 {
				respondWithError(w, http.StatusNotFound, "Invite code not found")
				return
			}
		} else {
			log.Printf("Supabase error finding coop by invite code. Status: %s\n", findResp.Status)
			respondWithError(w, http.StatusInternalServerError, "Error validating invite code")
			return
		}
		targetCoop := foundCoops[0]

		// 2. Check if user already a member
		checkMemberURL := fmt.Sprintf("%s/rest/v1/coop_members?user_id=eq.%s&coop_id=eq.%s&select=user_id", supabaseURL, userID, targetCoop.ID)
		checkMemberReq, _ := http.NewRequest("GET", checkMemberURL, nil)
		checkMemberReq.Header.Set("apikey", supabaseServiceKey)
		checkMemberReq.Header.Set("Authorization", "Bearer "+supabaseServiceKey)

		checkMemberResp, err := client.Do(checkMemberReq)
		if err != nil {
			log.Printf("Error checking coop membership: %v\n", err)
			respondWithError(w, http.StatusInternalServerError, "Failed to check membership status")
			return
		}
		defer checkMemberResp.Body.Close()

		if checkMemberResp.StatusCode == http.StatusOK {
			var existingMembers []SupabaseCoopMember
			if json.NewDecoder(checkMemberResp.Body).Decode(&existingMembers) == nil && len(existingMembers) > 0 {
				respondWithJSON(w, http.StatusOK, CoopJoinResponse{Message: "Already a member", CoopID: targetCoop.ID})
				return
			}
		} // If not OK or empty, proceed to add

		// 3. Else insert into coop_members
		joinMemberPayload := map[string]interface{}{"user_id": userID, "coop_id": targetCoop.ID, "role": "member"}
		joinMemberJSON, _ := json.Marshal(joinMemberPayload)
		joinMemberURL := fmt.Sprintf("%s/rest/v1/coop_members", supabaseURL)
		joinMemberReq, _ := http.NewRequest("POST", joinMemberURL, bytes.NewBuffer(joinMemberJSON))
		joinMemberReq.Header.Set("apikey", supabaseServiceKey)
		joinMemberReq.Header.Set("Authorization", "Bearer "+supabaseServiceKey)
		joinMemberReq.Header.Set("Content-Type", "application/json")
		// Prefer=representation not strictly needed here

		joinMemberResp, err := client.Do(joinMemberReq)
		if err != nil {
			log.Printf("Error joining coop: %v\n", err)
			respondWithError(w, http.StatusInternalServerError, "Failed to join coop")
			return
		}
		defer joinMemberResp.Body.Close()

		if joinMemberResp.StatusCode == http.StatusConflict { // Primary key violation implies already a member (race condition)
			log.Println("Conflict joining coop, likely already a member (race condition).")
			respondWithJSON(w, http.StatusOK, CoopJoinResponse{Message: "Already a member", CoopID: targetCoop.ID})
			return
		}
		if joinMemberResp.StatusCode != http.StatusCreated {
			log.Printf("Supabase error joining coop_members. Status: %s\n", joinMemberResp.Status)
			// TODO: Parse error from Supabase body
			respondWithError(w, http.StatusInternalServerError, "Failed to record coop membership for join")
			return
		}

		// 4. Return response
		respondWithJSON(w, http.StatusOK, CoopJoinResponse{
			Message: "Joined existing coop",
			CoopID:  targetCoop.ID,
		})

	default:
		respondWithError(w, http.StatusBadRequest, "Invalid mode specified")
	}
}

// respondWithError is a helper to send JSON error responses (copied from onboarding_profile.go, consider refactoring to a common util)
func respondWithError(w http.ResponseWriter, code int, message string) {
	respondWithJSON(w, code, map[string]string{"error": message})
}

// respondWithJSON is a helper to send JSON responses (copied from onboarding_profile.go, consider refactoring to a common util)
func respondWithJSON(w http.ResponseWriter, code int, payload interface{}) {
	response, _ := json.Marshal(payload)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	w.Write(response)
}
