package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"time"
)

type SnapshotRequest struct {
	RelayID       string `json:"relay_id"`
	ImageFilename string `json:"image_filename"`
}

type SnapshotResponse struct {
	SnapshotID string `json:"snapshot_id"`
	ImageURL   string `json:"image_url"`
}

type relayRecord struct {
	ID      string  `json:"id"`
	CoopID  *string `json:"coop_id"`
	Status  string  `json:"status"`
}

type snapshotInsertResponse struct {
	ID string `json:"id"`
}

func PostSnapshotHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var req SnapshotRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("Invalid JSON: %v", err)
		http.Error(w, "invalid JSON body", http.StatusBadRequest)
		return
	}
	if req.RelayID == "" || req.ImageFilename == "" {
		http.Error(w, "relay_id and image_filename are required", http.StatusBadRequest)
		return
	}

	supabaseURL := os.Getenv("SUPABASE_URL")
	serviceKey := os.Getenv("SUPABASE_SERVICE_KEY")
	log.Printf("SUPABASE_URL: %s", supabaseURL)
	log.Printf("SUPABASE_SERVICE_KEY length: %d", len(serviceKey))
	if supabaseURL == "" || serviceKey == "" {
		log.Printf("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY env vars")
		http.Error(w, "server config error", http.StatusInternalServerError)
		return
	}

	// 1. Validate relay
	relay, err := getRelay(supabaseURL, serviceKey, req.RelayID)
	if err != nil {
		log.Printf("Relay validation error: %v", err)
		http.Error(w, "relay not found or invalid", http.StatusBadRequest)
		return
	}
	if relay.Status != "claimed" || relay.CoopID == nil || *relay.CoopID == "" {
		http.Error(w, "relay unclaimed or missing coop_id", http.StatusBadRequest)
		return
	}

	// 2. Insert snapshot
	snapshotID, err := insertSnapshot(supabaseURL, serviceKey, *relay.CoopID, req.RelayID, req.ImageFilename)
	if err != nil {
		log.Printf("Snapshot insert error: %v", err)
		http.Error(w, "could not insert snapshot", http.StatusInternalServerError)
		return
	}

	// 3. Respond with snapshot_id and image_url
	imageURL := fmt.Sprintf("%s/storage/v1/object/public/snapshots/%s", supabaseURL, req.ImageFilename)
	resp := SnapshotResponse{
		SnapshotID: snapshotID,
		ImageURL:   imageURL,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func getRelay(supabaseURL, serviceKey, relayID string) (*relayRecord, error) {
	url := fmt.Sprintf("%s/rest/v1/relays?id=eq.%s", supabaseURL, relayID)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("apikey", serviceKey)
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", serviceKey))
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("relay lookup failed: %s", resp.Status)
	}
	var relays []relayRecord
	if err := json.NewDecoder(resp.Body).Decode(&relays); err != nil {
		return nil, err
	}
	if len(relays) != 1 {
		return nil, fmt.Errorf("relay not found")
	}
	return &relays[0], nil
}

func insertSnapshot(supabaseURL, serviceKey, coopID, relayID, imagePath string) (string, error) {
	url := fmt.Sprintf("%s/rest/v1/snapshots", supabaseURL)
	payload := map[string]interface{}{
		"coop_id":    coopID,
		"relay_id":   relayID,
		"image_path": imagePath,
		// created_at will default to now() in DB
	}
	body, _ := json.Marshal(payload)
	req, err := http.NewRequest("POST", url, bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("apikey", serviceKey)
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", serviceKey))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Prefer", "return=representation")
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 201 {
		b, _ := ioutil.ReadAll(resp.Body)
		return "", fmt.Errorf("insert failed: %s: %s", resp.Status, string(b))
	}
	var inserted []snapshotInsertResponse
	if err := json.NewDecoder(resp.Body).Decode(&inserted); err != nil {
		return "", err
	}
	if len(inserted) < 1 {
		return "", fmt.Errorf("no snapshot returned")
	}
	return inserted[0].ID, nil
}
