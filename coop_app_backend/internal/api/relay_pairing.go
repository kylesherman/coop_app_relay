package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math/rand"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// GET /api/relay/pairing?code=<pairing_code>
func GetRelayPairingStatusHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	// Get pairing_code from query
	code := r.URL.Query().Get("code")
	if code == "" {
		http.Error(w, `{"error": "Missing pairing code"}\n`, http.StatusBadRequest)
		return
	}

	supabaseURL := os.Getenv("SUPABASE_URL")
	serviceKey := os.Getenv("SUPABASE_SERVICE_KEY")
	if supabaseURL == "" || serviceKey == "" {
		log.Printf("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY env vars")
		http.Error(w, `{"error": "Server config error"}\n`, http.StatusInternalServerError)
		return
	}

	// Query relay by pairing_code
	relayURL := supabaseURL + "/rest/v1/relays?pairing_code=eq." + code
	req, err := http.NewRequest("GET", relayURL, nil)
	if err != nil {
		log.Printf("Relay pairing lookup error: %v", err)
		http.Error(w, `{"error": "Internal error"}\n`, http.StatusInternalServerError)
		return
	}
	req.Header.Set("apikey", serviceKey)
	req.Header.Set("Authorization", "Bearer "+serviceKey)
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil || resp.StatusCode != 200 {
		log.Printf("Relay pairing lookup error: %v, status: %v", err, resp.StatusCode)
		http.Error(w, `{"error": "Internal error"}\n`, http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	var relays []struct {
		ID       string  `json:"id"`
		Status   string  `json:"status"`
		PairedAt *string `json:"paired_at"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&relays); err != nil {
		log.Printf("Relay pairing decode error: %v", err)
		http.Error(w, `{"error": "Internal error"}\n`, http.StatusInternalServerError)
		return
	}
	if len(relays) == 0 {
		w.WriteHeader(http.StatusNotFound)
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"error": "Pairing code not found"}\n`))
		return
	}
	relay := relays[0]
	if relay.Status != "claimed" {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status": "pending"}\n`))
		return
	}

	respObj := map[string]interface{}{
		"status":   "claimed",
		"relay_id": relay.ID,
		"paired_at": relay.PairedAt,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(respObj)
}

// RelayRecord defines the structure for a relay record from Supabase.
// Used for both the request pairing code response and when Supabase returns a representation.
type RelayRecord struct {
	ID           string `json:"id"`
	PairingCode  string `json:"pairing_code"`
	Status       string `json:"status"`
	CoopID       string `json:"coop_id,omitempty"` // omitempty as it's not set on initial request
	CreatedAt    string `json:"created_at,omitempty"`
	PairedAt     string `json:"paired_at,omitempty"`
	LastSeenAt   string `json:"last_seen_at,omitempty"`
}

// RequestRelayPairingCodeRequest defines the optional relay_id for pairing requests.
type RequestRelayPairingCodeRequest struct {
	RelayID *string `json:"relay_id"`
}

// RequestRelayPairingCodeResponse defines the specific fields for the response of this endpoint.
type RequestRelayPairingCodeResponse struct {
	RelayID     string `json:"relay_id"`
	PairingCode string `json:"pairing_code"`
	Status      string `json:"status"`
}

// POST /api/relay/request_pairing_code
func RequestRelayPairingCodeHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respondWithError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	// Parse request body for optional relay_id
	var reqBody RequestRelayPairingCodeRequest
	if r.Body != nil && r.ContentLength > 0 {
		if err := json.NewDecoder(r.Body).Decode(&reqBody); err != nil && err != io.EOF {
			respondWithError(w, http.StatusBadRequest, "Invalid request body")
			return
		}
		defer r.Body.Close()
	}

	supabaseURL := os.Getenv("SUPABASE_URL")
	supabaseServiceKey := os.Getenv("SUPABASE_SERVICE_KEY")
	if supabaseURL == "" || supabaseServiceKey == "" {
		log.Println("Error: Missing Supabase environment variables")
		respondWithError(w, http.StatusInternalServerError, "Server configuration error")
		return
	}

	localRand := rand.New(rand.NewSource(time.Now().UnixNano()))
	client := &http.Client{}
	maxRetries := 5

	for i := 0; i < maxRetries; i++ {
		pairingCode := fmt.Sprintf("%08d", localRand.Intn(100000000))

		// --- Logic for Existing Relay (Reset) ---
		if reqBody.RelayID != nil && *reqBody.RelayID != "" {
			log.Printf("Processing pairing code request for existing relay_id: %s", *reqBody.RelayID)

			updatePayload := map[string]interface{}{
				"pairing_code": pairingCode,
				"status":       "pending",
				"coop_id":      nil, // Explicitly reset coop_id
			}
			jsonPayload, _ := json.Marshal(updatePayload)

			updateURL := fmt.Sprintf("%s/rest/v1/relays?id=eq.%s", supabaseURL, *reqBody.RelayID)
			req, err := http.NewRequest("PATCH", updateURL, bytes.NewBuffer(jsonPayload))
			if err != nil {
				log.Printf("Error creating PATCH request for relay %s: %v", *reqBody.RelayID, err)
				respondWithError(w, http.StatusInternalServerError, "Internal server error")
				return
			}

			req.Header.Set("apikey", supabaseServiceKey)
			req.Header.Set("Authorization", "Bearer "+supabaseServiceKey)
			req.Header.Set("Content-Type", "application/json")
			req.Header.Set("Prefer", "return=representation")

			resp, err := client.Do(req)
			if err != nil {
				log.Printf("Error updating relay %s: %v", *reqBody.RelayID, err)
				respondWithError(w, http.StatusInternalServerError, "Failed to communicate with database")
				return
			}
			defer resp.Body.Close()

			if resp.StatusCode == http.StatusOK {
				var updatedRelays []RelayRecord
				if err := json.NewDecoder(resp.Body).Decode(&updatedRelays); err != nil || len(updatedRelays) == 0 {
					log.Printf("Error decoding Supabase PATCH response for relay %s: %v", *reqBody.RelayID, err)
					respondWithError(w, http.StatusNotFound, "Relay not found or failed to process update response")
					return
				}
				updatedRelay := updatedRelays[0]
				responsePayload := RequestRelayPairingCodeResponse{
					RelayID:     updatedRelay.ID,
					PairingCode: updatedRelay.PairingCode,
					Status:      updatedRelay.Status,
				}
				respondWithJSON(w, http.StatusOK, responsePayload)
				return
			} else if resp.StatusCode == http.StatusConflict {
				log.Printf("Pairing code '%s' conflicted on update for relay %s. Retrying...", pairingCode, *reqBody.RelayID)
				continue // Try a new code
			} else {
				bodyBytes, _ := io.ReadAll(resp.Body)
				log.Printf("Supabase error updating relay %s. Status: %s, Body: %s", *reqBody.RelayID, resp.Status, string(bodyBytes))
				respondWithError(w, http.StatusInternalServerError, "Failed to update relay")
				return
			}

			// --- Logic for New Relay ---
		} else {
			log.Println("Processing pairing code request for a new relay.")

			insertPayload := map[string]string{
				"pairing_code": pairingCode,
				"status":       "pending",
			}
			jsonPayload, err := json.Marshal(insertPayload)
			if err != nil {
				log.Printf("Error marshalling pairing code payload: %v\n", err)
				respondWithError(w, http.StatusInternalServerError, "Internal server error")
				return
			}

			insertURL := fmt.Sprintf("%s/rest/v1/relays", supabaseURL)
			req, err := http.NewRequest("POST", insertURL, bytes.NewBuffer(jsonPayload))
			if err != nil {
				log.Printf("Error creating request to insert pairing code: %v\n", err)
				respondWithError(w, http.StatusInternalServerError, "Internal server error")
				return
			}

			req.Header.Set("apikey", supabaseServiceKey)
			req.Header.Set("Authorization", "Bearer "+supabaseServiceKey)
			req.Header.Set("Content-Type", "application/json")
			req.Header.Set("Prefer", "return=representation")

			resp, err := client.Do(req)
			if err != nil {
				log.Printf("Error inserting pairing code '%s' (attempt %d): %v\n", pairingCode, i+1, err)
				continue // Try next code
			}
			defer resp.Body.Close()

			if resp.StatusCode == http.StatusCreated {
				var createdRelays []RelayRecord
				if err := json.NewDecoder(resp.Body).Decode(&createdRelays); err != nil || len(createdRelays) == 0 {
					log.Printf("Error decoding Supabase response for pairing code '%s': %v\n", pairingCode, err)
					respondWithError(w, http.StatusInternalServerError, "Failed to process pairing code creation response")
					return
				}
				createdRelay := createdRelays[0]
				responsePayload := RequestRelayPairingCodeResponse{
					RelayID:     createdRelay.ID,
					PairingCode: createdRelay.PairingCode,
					Status:      createdRelay.Status,
				}
				respondWithJSON(w, http.StatusCreated, responsePayload)
				return
			} else if resp.StatusCode == http.StatusConflict {
				log.Printf("Pairing code '%s' conflicted (attempt %d/%d). Retrying...\n", pairingCode, i+1, maxRetries)
				continue
			} else {
				bodyBytes, _ := io.ReadAll(resp.Body)
				log.Printf("Supabase error inserting pairing code '%s' (attempt %d). Status: %s, Body: %s\n", pairingCode, i+1, resp.Status, string(bodyBytes))
				respondWithError(w, http.StatusInternalServerError, fmt.Sprintf("Failed to create pairing code after attempt %d: Supabase status %s", i+1, resp.Status))
				return
			}
		}
	}

	log.Printf("Failed to generate and insert a unique pairing code after %d attempts.\n", maxRetries)
	respondWithError(w, http.StatusServiceUnavailable, "Failed to generate a unique pairing code. Please try again later.")
}

// ClaimRelayRequest defines the structure for the relay claim request body.
type ClaimRelayRequest struct {
	PairingCode string `json:"pairing_code"`
}

// ClaimRelayResponse defines the structure for the relay claim success response.
type ClaimRelayResponse struct {
	RelayID string `json:"relay_id"`
	Status  string `json:"status"`
}

// CoopMemberRecord is used to decode the response from coop_members table.
type CoopMemberRecord struct {
	UserID string `json:"user_id"`
	CoopID string `json:"coop_id"`
	// Other fields like role, joined_at can be added if needed
}

// POST /api/relay/claim
func ClaimRelayHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respondWithError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	supabaseURL := os.Getenv("SUPABASE_URL")
	supabaseServiceKey := os.Getenv("SUPABASE_SERVICE_KEY")
	supabaseJWTSecret := os.Getenv("SUPABASE_JWT_SECRET")

	if supabaseURL == "" || supabaseServiceKey == "" || supabaseJWTSecret == "" {
		log.Println("Error: Missing Supabase environment variables for claiming relay")
		respondWithError(w, http.StatusInternalServerError, "Server configuration error")
		return
	}

	// 1. Authenticate user and get user_id
	authHeader := r.Header.Get("Authorization")
	log.Printf("[ClaimRelay] Received Authorization header: '%s'", authHeader) // New Log
	if authHeader == "" {
		respondWithError(w, http.StatusUnauthorized, "Authorization header required")
		return
	}
	tokenString := strings.TrimPrefix(authHeader, "Bearer ")
	log.Printf("[ClaimRelay] Token string after stripping 'Bearer ': '%s'", tokenString) // New Log
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

	if err != nil {
		log.Printf("[ClaimRelay] Error parsing JWT: %v", err) // Modified Log for more detail
		respondWithError(w, http.StatusUnauthorized, "Invalid or expired token")
		return
	}
	if !token.Valid {
		log.Printf("[ClaimRelay] JWT is not valid. Token: %+v", token) // New Log
		respondWithError(w, http.StatusUnauthorized, "Invalid or expired token")
		return
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	log.Printf("[ClaimRelay] Parsed JWT claims: %+v", claims) // New Log
	if !ok {
		log.Println("Error parsing JWT claims for relay claim")
		respondWithError(w, http.StatusUnauthorized, "Invalid token claims")
		return
	}

	userID, ok := claims["sub"].(string)
	log.Printf("[ClaimRelay] Extracted userID (sub): '%s', ok: %t", userID, ok) // New Log
	if !ok || userID == "" {
		log.Println("Error: 'sub' claim missing or invalid in JWT for relay claim")
		respondWithError(w, http.StatusUnauthorized, "User ID not found in token")
		return
	}

	// 2. Parse request body for pairing_code
	var reqBody ClaimRelayRequest
	if err := json.NewDecoder(r.Body).Decode(&reqBody); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	defer r.Body.Close()

	if reqBody.PairingCode == "" {
		respondWithError(w, http.StatusBadRequest, "Missing pairing_code in request")
		return
	}

	client := &http.Client{}

	// 3. Get user's coop_id
	coopMemberURL := fmt.Sprintf("%s/rest/v1/coop_members?user_id=eq.%s&select=coop_id&limit=1", supabaseURL, userID)
	coopReq, _ := http.NewRequest("GET", coopMemberURL, nil)
	coopReq.Header.Set("apikey", supabaseServiceKey)
	coopReq.Header.Set("Authorization", "Bearer "+supabaseServiceKey)

	coopResp, err := client.Do(coopReq)
	if err != nil {
		log.Printf("Error fetching coop membership for user %s: %v\n", userID, err)
		respondWithError(w, http.StatusInternalServerError, "Failed to retrieve user coop information")
		return
	}
	defer coopResp.Body.Close()

	if coopResp.StatusCode != http.StatusOK {
		log.Printf("Supabase error fetching coop membership for user %s. Status: %s\n", userID, coopResp.Status)
		respondWithError(w, http.StatusInternalServerError, "Failed to retrieve user coop information due to Supabase error")
		return
	}

	var coopMembers []CoopMemberRecord
	if err := json.NewDecoder(coopResp.Body).Decode(&coopMembers); err != nil || len(coopMembers) == 0 {
		if err != nil {
			log.Printf("Error decoding coop membership for user %s: %v\n", userID, err)
		} else {
			log.Printf("User %s has no coop membership.\n", userID)
		}
		respondWithError(w, http.StatusBadRequest, "User is not part of any coop or coop information is unavailable.")
		return
	}
	userCoopID := coopMembers[0].CoopID

	// 4. Find and update the relay
	patchPayload := map[string]interface{}{
		"status":    "claimed",
		"coop_id":   userCoopID,
		"paired_at": "now()", // Supabase will interpret this as the current timestamp
	}
	jsonPatchPayload, err := json.Marshal(patchPayload)
	if err != nil {
		log.Printf("Error marshalling relay claim PATCH payload: %v\n", err)
		respondWithError(w, http.StatusInternalServerError, "Internal server error during claim preparation")
		return
	}

	updateRelayURL := fmt.Sprintf("%s/rest/v1/relays?pairing_code=eq.%s&status=eq.pending", supabaseURL, reqBody.PairingCode)
	updateReq, err := http.NewRequest("PATCH", updateRelayURL, bytes.NewBuffer(jsonPatchPayload))
	if err != nil {
		log.Printf("Error creating PATCH request to claim relay: %v\n", err)
		respondWithError(w, http.StatusInternalServerError, "Internal server error during claim request creation")
		return
	}

	updateReq.Header.Set("apikey", supabaseServiceKey)
	updateReq.Header.Set("Authorization", "Bearer "+supabaseServiceKey)
	updateReq.Header.Set("Content-Type", "application/json")
	updateReq.Header.Set("Prefer", "return=representation")

	updateResp, err := client.Do(updateReq)
	if err != nil {
		log.Printf("Error sending PATCH request to claim relay with code %s: %v\n", reqBody.PairingCode, err)
		respondWithError(w, http.StatusInternalServerError, "Failed to claim relay due to network or Supabase error")
		return
	}
	defer updateResp.Body.Close()

	if updateResp.StatusCode == http.StatusOK { // PATCH with Prefer=representation returns 200 OK
		var updatedRelays []RelayRecord // Supabase returns an array
		if err := json.NewDecoder(updateResp.Body).Decode(&updatedRelays); err != nil {
			log.Printf("Error decoding PATCH response for relay claim (code %s): %v\n", reqBody.PairingCode, err)
			respondWithError(w, http.StatusInternalServerError, "Failed to process relay claim confirmation")
			return
		}

		if len(updatedRelays) == 0 {
			// This means no record matched pairing_code=X AND status=pending
			log.Printf("No pending relay found with pairing code %s to claim.\n", reqBody.PairingCode)
			respondWithError(w, http.StatusNotFound, "No pending relay found with the provided pairing code.")
			return
		}

		claimedRelay := updatedRelays[0]
		responsePayload := ClaimRelayResponse{
			RelayID: claimedRelay.ID,
			Status:  claimedRelay.Status, // Should be "claimed"
		}
		respondWithJSON(w, http.StatusOK, responsePayload)
	} else {
		bodyBytes, _ := io.ReadAll(updateResp.Body)
		log.Printf("Supabase error during PATCH relay claim (code %s). Status: %s, Body: %s\n", reqBody.PairingCode, updateResp.Status, string(bodyBytes))
		respondWithError(w, http.StatusInternalServerError, fmt.Sprintf("Failed to claim relay. Supabase responded with status %s.", updateResp.Status))
	}
}
