package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// ProfileUpdateRequest defines the expected JSON body for the profile update.
type ProfileUpdateRequest struct {
	FirstName string `json:"first_name,omitempty"`
	LastName  string `json:"last_name,omitempty"`
	Username  string `json:"username"`
}

// SupabaseErrorDetail provides structure for Supabase's specific error messages.
type SupabaseErrorDetail struct {
	Code    string `json:"code"`
	Details string `json:"details"`
	Hint    string `json:"hint"`
	Message string `json:"message"`
}

// PostProfileHandler handles the POST /api/onboarding/profile endpoint.
// It allows a new user to create their profile (first_name, last_name, username)
// after authenticating via JWT.
func PostProfileHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Only POST method is allowed", http.StatusMethodNotAllowed)
		return
	}

	// 1. Extract and Validate JWT to get User ID
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		http.Error(w, "Authorization header required", http.StatusUnauthorized)
		return
	}
	splitToken := strings.Split(authHeader, "Bearer ")
	if len(splitToken) != 2 {
		http.Error(w, "Invalid Authorization header format", http.StatusUnauthorized)
		return
	}
	tokenString := splitToken[1]

	supabaseJWTSecret := os.Getenv("SUPABASE_JWT_SECRET")
	if supabaseJWTSecret == "" {
		log.Println("Critical Error: SUPABASE_JWT_SECRET environment variable not set.")
		http.Error(w, "Server configuration error: JWT secret missing", http.StatusInternalServerError)
		return
	}

	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(supabaseJWTSecret), nil
	})

	if err != nil {
		log.Printf("Error parsing JWT: %v", err)
		http.Error(w, "Invalid token", http.StatusUnauthorized)
		return
	}

	var userID string
	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		if sub, ok := claims["sub"].(string); ok {
			userID = sub
		} else {
			log.Println("Error: 'sub' claim missing or not a string in JWT")
			http.Error(w, "Invalid token claims", http.StatusUnauthorized)
			return
		}
	} else {
		log.Printf("Error validating JWT or extracting claims: %v", err)
		http.Error(w, "Invalid token", http.StatusUnauthorized)
		return
	}
	if userID == "" {
		log.Println("Error: User ID could not be extracted from token.")
		http.Error(w, "Invalid token: User ID missing", http.StatusUnauthorized)
		return
	}

	// 2. Parse and Validate Input JSON Body
	var reqBody ProfileUpdateRequest
	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil {
		log.Printf("Error reading request body: %v", err)
		http.Error(w, "Failed to read request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	if err := json.Unmarshal(bodyBytes, &reqBody); err != nil {
		log.Printf("Error unmarshalling JSON: %v. Body: %s", err, string(bodyBytes))
		http.Error(w, "Invalid JSON format", http.StatusBadRequest)
		return
	}

	// Validate non-empty fields (Bonus)
	if reqBody.Username == "" || reqBody.FirstName == "" || reqBody.LastName == "" {
		http.Error(w, "Username, first_name, and last_name are required", http.StatusBadRequest)
		return
	}

	// 3. Ensure Supabase Env Vars are Set for Backend Operations
	supabaseURL := os.Getenv("SUPABASE_URL")
	if supabaseURL == "" {
		log.Println("Critical Error: SUPABASE_URL environment variable not set.")
		http.Error(w, "Server configuration error: Supabase URL missing", http.StatusInternalServerError)
		return
	}
	supabaseServiceKey := os.Getenv("SUPABASE_SERVICE_KEY")
	if supabaseServiceKey == "" {
		log.Println("Critical Error: SUPABASE_SERVICE_KEY environment variable not set.")
		http.Error(w, "Server configuration error: Supabase service key missing", http.StatusInternalServerError)
		return
	}

	client := &http.Client{Timeout: 10 * time.Second}

	// 4. Check if User Already Exists by UserID
	checkUserURLExists := fmt.Sprintf("%s/rest/v1/users?id=eq.%s&select=id", supabaseURL, userID)
	httpReqUserExists, err := http.NewRequest(http.MethodGet, checkUserURLExists, nil)
	if err != nil {
		log.Printf("Error creating user existence check request: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	httpReqUserExists.Header.Set("apikey", supabaseServiceKey)
	httpReqUserExists.Header.Set("Authorization", "Bearer "+supabaseServiceKey)

	respUserExists, err := client.Do(httpReqUserExists)
	if err != nil {
		log.Printf("Error checking user existence in Supabase: %v", err)
		http.Error(w, "Failed to connect to database service (user check)", http.StatusInternalServerError)
		return
	}
	defer respUserExists.Body.Close()

	bodyUserExists, _ := io.ReadAll(respUserExists.Body)
	if respUserExists.StatusCode == http.StatusOK {
		var usersFound []map[string]interface{}
		if err := json.Unmarshal(bodyUserExists, &usersFound); err == nil && len(usersFound) > 0 {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(map[string]string{"message": "User already exists"})
			return
		} else if err != nil {
		    log.Printf("Error unmarshalling user existence response: %s - %v", string(bodyUserExists), err)
		    // Proceed, assuming user not found if unmarshal fails or array is empty
		}
	} else {
		log.Printf("Supabase error checking user existence. Status: %d, Body: %s", respUserExists.StatusCode, string(bodyUserExists))
		http.Error(w, "Error checking user profile", http.StatusInternalServerError)
		return
	}

	// 5. Check if Username is Already Taken
	checkUsernameURLExists := fmt.Sprintf("%s/rest/v1/users?username=eq.%s&select=id", supabaseURL, reqBody.Username)
	httpReqUsernameExists, err := http.NewRequest(http.MethodGet, checkUsernameURLExists, nil)
	if err != nil {
		log.Printf("Error creating username existence check request: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	httpReqUsernameExists.Header.Set("apikey", supabaseServiceKey)
	httpReqUsernameExists.Header.Set("Authorization", "Bearer "+supabaseServiceKey)

	respUsernameExists, err := client.Do(httpReqUsernameExists)
	if err != nil {
		log.Printf("Error checking username existence in Supabase: %v", err)
		http.Error(w, "Failed to connect to database service (username check)", http.StatusInternalServerError)
		return
	}
	defer respUsernameExists.Body.Close()

	bodyUsernameExists, _ := io.ReadAll(respUsernameExists.Body)
	if respUsernameExists.StatusCode == http.StatusOK {
		var usersFound []map[string]interface{}
		if err := json.Unmarshal(bodyUsernameExists, &usersFound); err == nil && len(usersFound) > 0 {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusConflict)
			json.NewEncoder(w).Encode(map[string]string{"error": "Username already in use"})
			return
		} else if err != nil {
            log.Printf("Error unmarshalling username existence response: %s - %v", string(bodyUsernameExists), err)
            // Proceed, assuming username not taken if unmarshal fails or array is empty
        }
	} else {
		log.Printf("Supabase error checking username existence. Status: %d, Body: %s", respUsernameExists.StatusCode, string(bodyUsernameExists))
		http.Error(w, "Error checking username availability", http.StatusInternalServerError)
		return
	}

	// 6. Insert New User Profile
	insertURL := fmt.Sprintf("%s/rest/v1/users", supabaseURL)
	insertPayload := map[string]string{
		"id":         userID, // Set the user's auth ID as the primary key
		"first_name": reqBody.FirstName,
		"last_name":  reqBody.LastName,
		"username":   reqBody.Username,
	}
	jsonInsertPayload, err := json.Marshal(insertPayload)
	if err != nil {
		log.Printf("Error marshalling insert payload: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	httpReqInsert, err := http.NewRequest(http.MethodPost, insertURL, bytes.NewBuffer(jsonInsertPayload))
	if err != nil {
		log.Printf("Error creating POST request for insert: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	httpReqInsert.Header.Set("apikey", supabaseServiceKey)
	httpReqInsert.Header.Set("Authorization", "Bearer "+supabaseServiceKey)
	httpReqInsert.Header.Set("Content-Type", "application/json")
	httpReqInsert.Header.Set("Prefer", "return=representation")

	supabaseRespInsert, err := client.Do(httpReqInsert)
	if err != nil {
		log.Printf("Error sending insert request to Supabase: %v", err)
		http.Error(w, "Failed to connect to database service (insert)", http.StatusInternalServerError)
		return
	}
	defer supabaseRespInsert.Body.Close()

	supabaseBodyBytesInsert, _ := io.ReadAll(supabaseRespInsert.Body)

	switch supabaseRespInsert.StatusCode {
	case http.StatusCreated:
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(map[string]string{"message": "Profile created successfully"})
	case http.StatusConflict:
		var errDetail SupabaseErrorDetail
		json.Unmarshal(supabaseBodyBytesInsert, &errDetail)
		log.Printf("Supabase conflict on insert (Code: %s): %s. Details: %s", errDetail.Code, errDetail.Message, string(supabaseBodyBytesInsert))
		// Check if it's a unique constraint violation on 'username' or 'id'
		if strings.Contains(errDetail.Message, "users_username_key") || (errDetail.Code == "23505" && strings.Contains(errDetail.Details, "username")) {
			http.Error(w, "Username already in use", http.StatusConflict)
		} else if strings.Contains(errDetail.Message, "users_pkey") || (errDetail.Code == "23505" && strings.Contains(errDetail.Details, "id")) {
			// This case should ideally be caught by the initial user existence check
			http.Error(w, "User already exists", http.StatusOK) // Or StatusConflict, but User already exists is more accurate
		} else {
			http.Error(w, "Conflict creating profile: "+errDetail.Message, http.StatusConflict)
		}
	default:
		log.Printf("Supabase error on insert. Status: %d, Body: %s", supabaseRespInsert.StatusCode, string(supabaseBodyBytesInsert))
		http.Error(w, fmt.Sprintf("Error from database service during insert: %s", supabaseRespInsert.Status), http.StatusInternalServerError)
	}
}

