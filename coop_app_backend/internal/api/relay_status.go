package api

import (
	"bytes"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"time"
)

// POST /api/relay/status
func PostRelayStatusHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		RelayID string  `json:"relay_id"`
		SeenAt *string `json:"seen_at,omitempty"`
	}
	body, err := io.ReadAll(r.Body)
	if err != nil {
		log.Printf("Error reading body: %v", err)
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	if err := json.Unmarshal(body, &req); err != nil {
		log.Printf("Invalid JSON: %v", err)
		http.Error(w, "invalid JSON body", http.StatusBadRequest)
		return
	}
	if req.RelayID == "" {
		http.Error(w, "relay_id is required", http.StatusBadRequest)
		return
	}

	supabaseURL := os.Getenv("SUPABASE_URL")
	serviceKey := os.Getenv("SUPABASE_SERVICE_KEY")
	if supabaseURL == "" || serviceKey == "" {
		log.Printf("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY env vars")
		http.Error(w, "server config error", http.StatusInternalServerError)
		return
	}

	// Validate relay exists
	relayURL := supabaseURL + "/rest/v1/relays?id=eq." + req.RelayID
	relayReq, err := http.NewRequest("GET", relayURL, nil)
	if err != nil {
		log.Printf("Relay lookup error: %v", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	relayReq.Header.Set("apikey", serviceKey)
	relayReq.Header.Set("Authorization", "Bearer "+serviceKey)
	client := &http.Client{Timeout: 5 * time.Second}
	relayResp, err := client.Do(relayReq)
	if err != nil || relayResp.StatusCode != 200 {
		log.Printf("Relay lookup failed: %v, status: %v", err, relayResp.StatusCode)
		http.Error(w, "relay not found", http.StatusBadRequest)
		return
	}
	var relays []struct{ ID string `json:"id"` }
	if err := json.NewDecoder(relayResp.Body).Decode(&relays); err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		relayResp.Body.Close()
		return
	}
	relayResp.Body.Close()
	if len(relays) == 0 {
		http.Error(w, "relay not found", http.StatusBadRequest)
		return
	}

	// Determine last_seen_at
	var seenAt string
	if req.SeenAt != nil && *req.SeenAt != "" {
		seenAt = *req.SeenAt
	} else {
		seenAt = time.Now().UTC().Format(time.RFC3339Nano)
	}

	// Update last_seen_at for relay
	updateURL := supabaseURL + "/rest/v1/relays?id=eq." + req.RelayID
	payload := map[string]interface{}{
		"last_seen_at": seenAt,
	}
	jsonBody, _ := json.Marshal(payload)
	updateReq, err := http.NewRequest("PATCH", updateURL, io.NopCloser(bytes.NewReader(jsonBody)))
	if err != nil {
		log.Printf("Update request error: %v", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	updateReq.Header.Set("apikey", serviceKey)
	updateReq.Header.Set("Authorization", "Bearer "+serviceKey)
	updateReq.Header.Set("Content-Type", "application/json")
	client = &http.Client{Timeout: 5 * time.Second}
	updateResp, err := client.Do(updateReq)
	if err != nil || (updateResp.StatusCode != 200 && updateResp.StatusCode != 204) {
		log.Printf("Relay update failed: %v, status: %v", err, updateResp.StatusCode)
		http.Error(w, "could not update relay", http.StatusInternalServerError)
		return
	}
	updateResp.Body.Close()

	w.WriteHeader(http.StatusNoContent)
}
