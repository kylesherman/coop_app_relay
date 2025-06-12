package api

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"fmt"
	"strings"
	"net/url"
	"time"
)

// POST /api/internal/snapshot-created
func PostSnapshotCreatedHandler(w http.ResponseWriter, r *http.Request) {
	log.Println("🔥 HIT /api/internal/snapshot-created")
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		w.Write([]byte(`{"error": "Method not allowed"}`))
		return
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error": "Could not read request body"}`))
		return
	}
	defer r.Body.Close()

	// Support both Supabase and Relay payloads
	type supabasePayload struct {
		Event  string `json:"event"`
		Type   string `json:"type"`
		Record struct {
			Name      string                 `json:"name"`
			BucketID  string                 `json:"bucket_id"`
			Metadata  map[string]interface{} `json:"metadata"`
			CreatedAt string                 `json:"created_at"`
		} `json:"record"`
	}
	type relayPayload struct {
		ImagePath string `json:"image_path"`
	}
	var (
		supa supabasePayload
		relay relayPayload
	)
	json.Unmarshal(body, &supa)
	json.Unmarshal(body, &relay)

	var imagePath string
	if relay.ImagePath != "" {
		imagePath = relay.ImagePath
	} else if supa.Record.Name != "" {
		imagePath = supa.Record.Name
	} else {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error": "Missing image path in payload"}`))
		return
	}

	supabaseURL := os.Getenv("SUPABASE_URL")
	serviceKey := os.Getenv("SUPABASE_SERVICE_KEY")
	client := &http.Client{}

	var snapshots []struct {
		ID string `json:"id"`
	}
	var snapshotID string
	found := false
	for i := 1; i <= 3; i++ {
		log.Printf("[snapshot-created] Attempt %d: looking up image_path=%s", i, imagePath)
		// No need to wrap image_path in quotes, just encode dashes
		encoded := url.QueryEscape(imagePath)
		queryURL := fmt.Sprintf("%s/rest/v1/snapshots?image_path=eq.%s", supabaseURL, encoded)
		log.Printf("[snapshot-created] Encoded image_path query: %s", queryURL)
		req, err := http.NewRequest("GET", queryURL, nil)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte(`{"error": "Could not build Supabase request"}`))
			return
		}
		req.Header.Set("Authorization", "Bearer "+serviceKey)
		req.Header.Set("apikey", serviceKey)
		req.Header.Set("Accept", "application/json")

		resp, err := client.Do(req)
		if err != nil {
			if i == 3 {
				w.WriteHeader(http.StatusBadGateway)
				w.Write([]byte(`{"error": "Could not reach Supabase"}`))
				return
			}
			time.Sleep(500 * time.Millisecond)
			continue
		}
		respBody, _ := io.ReadAll(resp.Body)
		if resp.StatusCode != http.StatusOK {
			log.Printf("[snapshot-created] Supabase query failed: status=%d body=%s", resp.StatusCode, string(respBody))
			resp.Body.Close()
			if i == 3 {
				w.WriteHeader(http.StatusBadGateway)
				w.Write([]byte(`{"error": "Supabase query failed"}`))
				return
			}
			time.Sleep(500 * time.Millisecond)
			continue
		}
		resp.Body.Close()

		json.Unmarshal(respBody, &snapshots)
		if len(snapshots) > 0 {
			snapshotID = snapshots[0].ID
			found = true
			break
		}
		time.Sleep(500 * time.Millisecond)
	}
	if !found {
		w.WriteHeader(http.StatusNotFound)
		w.Write([]byte(`{"error": "snapshot not found for image_path"}`))
		return
	}

	log.Printf("[snapshot-created] Found snapshot for image_path=%s: snapshot_id=%s", imagePath, snapshotID)

	// Step 2: Trigger detection by calling /api/egg-detections/run internally
	detectURL := os.Getenv("SELF_INTERNAL_URL")
	if detectURL == "" {
		detectURL = "http://localhost:8080" // fallback for local dev
	}
	detectEndpoint := fmt.Sprintf("%s/api/egg-detections/run", detectURL)
	detectBody, _ := json.Marshal(map[string]string{"snapshot_id": snapshotID})
	detectReq, err := http.NewRequest("POST", detectEndpoint, strings.NewReader(string(detectBody)))
	if err == nil {
		serviceKey := os.Getenv("SUPABASE_SERVICE_KEY")
		detectReq.Header.Set("Authorization", "Bearer "+serviceKey)
		detectReq.Header.Set("Content-Type", "application/json")
		client := &http.Client{}
		resp, err := client.Do(detectReq)
		if err != nil {
			log.Printf("[snapshot-created] Detection trigger error: %v", err)
		} else {
			respBody, _ := io.ReadAll(resp.Body)
			log.Printf("[snapshot-created] Detection response: %s", string(respBody))
			resp.Body.Close()
		}
	} else {
		log.Printf("[snapshot-created] Could not build detection request: %v", err)
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(fmt.Sprintf(`{"status": "ok", "snapshot_id": "%s"}`, snapshotID)))
}
