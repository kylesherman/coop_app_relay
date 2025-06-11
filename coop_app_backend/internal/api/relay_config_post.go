package api

import (
	"bytes"
	"encoding/json"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"time"
)

// POST /api/relay/config
func PostRelayConfigHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		RelayID  string `json:"relay_id"`
		Interval string `json:"interval"`
		RTSPUrl  string `json:"rtsp_url"`
	}
	body, err := ioutil.ReadAll(r.Body)
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
	if req.RelayID == "" || req.Interval == "" {
		http.Error(w, "relay_id and interval are required", http.StatusBadRequest)
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
		http.Error(w, "relay not found", http.StatusNotFound)
		return
	}
	var relays []struct {
		ID string `json:"id"`
	}
	if err := json.NewDecoder(relayResp.Body).Decode(&relays); err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		relayResp.Body.Close()
		return
	}
	relayResp.Body.Close()
	if len(relays) == 0 {
		http.Error(w, "relay not found", http.StatusNotFound)
		return
	}

	// Update relay config using PATCH
	updateURL := supabaseURL + "/rest/v1/relays?id=eq." + req.RelayID
	payload := map[string]interface{}{
		"interval": req.Interval,
		"rtsp_url": req.RTSPUrl,
	}
	jsonBody, _ := json.Marshal(payload)
	updateReq, err := http.NewRequest("PATCH", updateURL, ioutil.NopCloser(bytes.NewReader(jsonBody)))
	if err != nil {
		log.Printf("Update request error: %v", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	updateReq.Header.Set("Authorization", "Bearer "+serviceKey)
	updateReq.Header.Set("apikey", serviceKey)
	updateReq.Header.Set("Content-Type", "application/json")
	updateReq.Header.Set("Prefer", "return=representation")
	client = &http.Client{Timeout: 5 * time.Second}
	updateResp, err := client.Do(updateReq)
	if err != nil {
		log.Printf("Relay update failed: %v", err)
		http.Error(w, "could not update relay", http.StatusInternalServerError)
		return
	}
	defer updateResp.Body.Close()
	if updateResp.StatusCode >= 400 {
		body, _ := ioutil.ReadAll(updateResp.Body)
		log.Printf("Supabase error: %s", string(body))
		http.Error(w, "Supabase update failed", http.StatusBadRequest)
		return
	}

	// Read body once
	body, _ = ioutil.ReadAll(updateResp.Body)
	log.Printf("Supabase update response body: %s", string(body))

	// Try decoding it
	var respArr []interface{}
	if err := json.Unmarshal(body, &respArr); err == nil && len(respArr) == 0 {
		log.Printf("PATCH succeeded but no rows were updated.")
		w.WriteHeader(http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
