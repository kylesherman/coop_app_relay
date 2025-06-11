package api

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"time"
)

// GET /api/relay/status?relay_id=...
func GetRelayStatusHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	relayID := r.URL.Query().Get("relay_id")
	if relayID == "" {
		http.Error(w, `{"error": "Missing relay_id"}\n`, http.StatusBadRequest)
		return
	}

	supabaseURL := os.Getenv("SUPABASE_URL")
	serviceKey := os.Getenv("SUPABASE_SERVICE_KEY")
	if supabaseURL == "" || serviceKey == "" {
		log.Printf("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY env vars")
		http.Error(w, `{"error": "Server config error"}\n`, http.StatusInternalServerError)
		return
	}

	// Look up relay
	relayURL := supabaseURL + "/rest/v1/relays?id=eq." + relayID
	reqRelay, err := http.NewRequest("GET", relayURL, nil)
	if err != nil {
		log.Printf("Relay lookup error: %v", err)
		http.Error(w, `{"error": "Internal error"}\n`, http.StatusInternalServerError)
		return
	}
	reqRelay.Header.Set("apikey", serviceKey)
	reqRelay.Header.Set("Authorization", "Bearer "+serviceKey)
	client := &http.Client{Timeout: 5 * time.Second}
	relayResp, err := client.Do(reqRelay)
	if err != nil || relayResp.StatusCode != 200 {
		log.Printf("Relay lookup failed: %v, status: %v", err, relayResp.StatusCode)
		http.Error(w, `{"error": "Relay not found"}\n`, http.StatusNotFound)
		return
	}
	var relays []struct {
		ID         string  `json:"id"`
		PairedAt   *string `json:"paired_at"`
		LastSeenAt *string `json:"last_seen_at"`
	}
	if err := json.NewDecoder(relayResp.Body).Decode(&relays); err != nil {
		http.Error(w, `{"error": "Internal error"}\n`, http.StatusInternalServerError)
		relayResp.Body.Close()
		return
	}
	relayResp.Body.Close()
	if len(relays) == 0 {
		http.Error(w, `{"error": "Relay not found"}\n`, http.StatusNotFound)
		return
	}
	relay := relays[0]

	// Look up latest snapshot for this relay
	snapshotURL := supabaseURL + "/rest/v1/snapshots?relay_id=eq." + relayID + "&order=created_at.desc&limit=1"
	reqSnap, err := http.NewRequest("GET", snapshotURL, nil)
	if err != nil {
		log.Printf("Snapshot lookup error: %v", err)
		http.Error(w, `{"error": "Internal error"}\n`, http.StatusInternalServerError)
		return
	}
	reqSnap.Header.Set("apikey", serviceKey)
	reqSnap.Header.Set("Authorization", "Bearer "+serviceKey)
	snapResp, err := client.Do(reqSnap)
	if err != nil || snapResp.StatusCode != 200 {
		log.Printf("Snapshot lookup failed: %v, status: %v", err, snapResp.StatusCode)
		http.Error(w, `{"error": "Internal error"}\n`, http.StatusInternalServerError)
		return
	}
	var snaps []struct {
		ImagePath *string `json:"image_path"`
	}
	if err := json.NewDecoder(snapResp.Body).Decode(&snaps); err != nil {
		snapResp.Body.Close()
		http.Error(w, `{"error": "Internal error"}\n`, http.StatusInternalServerError)
		return
	}
	snapResp.Body.Close()
	var latestSnapshot *string
	if len(snaps) > 0 {
		latestSnapshot = snaps[0].ImagePath
	}

	// Compose response
	resp := map[string]interface{}{
		"relay_id":       relay.ID,
		"paired_at":      relay.PairedAt,
		"last_seen_at":   relay.LastSeenAt,
		"interval":       "1m", // can be hardcoded or pulled from config
		"latest_snapshot": latestSnapshot,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}
