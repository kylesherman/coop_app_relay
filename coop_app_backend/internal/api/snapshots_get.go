package api

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"
)

// GET /api/relay/snapshots?relay_id=...&limit=10
func GetRelaySnapshotsHandler(w http.ResponseWriter, r *http.Request) {
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

	// Validate relay exists
	relayURL := supabaseURL + "/rest/v1/relays?id=eq." + relayID
	relayReq, err := http.NewRequest("GET", relayURL, nil)
	if err != nil {
		log.Printf("Relay lookup error: %v", err)
		http.Error(w, `{"error": "Internal error"}\n`, http.StatusInternalServerError)
		return
	}
	relayReq.Header.Set("apikey", serviceKey)
	relayReq.Header.Set("Authorization", "Bearer "+serviceKey)
	client := &http.Client{Timeout: 5 * time.Second}
	relayResp, err := client.Do(relayReq)
	if err != nil || relayResp.StatusCode != 200 {
		log.Printf("Relay lookup failed: %v, status: %v", err, relayResp.StatusCode)
		http.Error(w, `{"error": "Relay not found"}\n`, http.StatusNotFound)
		return
	}
	var relays []struct{ ID string `json:"id"` }
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

	// Parse limit param
	limit := 20
	if l := r.URL.Query().Get("limit"); l != "" {
		if v, err := strconv.Atoi(l); err == nil {
			if v > 0 && v <= 100 {
				limit = v
			} else if v > 100 {
				limit = 100
			}
		}
	}

	// Query snapshots for this relay
	snapshotsURL := supabaseURL + "/rest/v1/snapshots?relay_id=eq." + relayID + "&order=created_at.desc&limit=" + strconv.Itoa(limit)
	snapReq, err := http.NewRequest("GET", snapshotsURL, nil)
	if err != nil {
		log.Printf("Snapshot query error: %v", err)
		http.Error(w, `{"error": "Internal error"}\n`, http.StatusInternalServerError)
		return
	}
	snapReq.Header.Set("apikey", serviceKey)
	snapReq.Header.Set("Authorization", "Bearer "+serviceKey)
	snapResp, err := client.Do(snapReq)
	if err != nil || snapResp.StatusCode != 200 {
		log.Printf("Snapshot query failed: %v, status: %v", err, snapResp.StatusCode)
		http.Error(w, `{"error": "Internal error"}\n`, http.StatusInternalServerError)
		return
	}
	var snaps []struct {
		ID        string  `json:"id"`
		CreatedAt string  `json:"created_at"`
		ImagePath *string `json:"image_path"`
	}
	if err := json.NewDecoder(snapResp.Body).Decode(&snaps); err != nil {
		snapResp.Body.Close()
		http.Error(w, `{"error": "Internal error"}\n`, http.StatusInternalServerError)
		return
	}
	snapResp.Body.Close()

	// Build response array
	resp := make([]map[string]interface{}, 0, len(snaps))
	for _, s := range snaps {
		resp = append(resp, map[string]interface{}{
			"id":         s.ID,
			"created_at": s.CreatedAt,
			"image_path": s.ImagePath,
		})
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}
