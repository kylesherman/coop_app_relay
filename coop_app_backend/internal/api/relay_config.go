package api

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
)

// SupabaseRelayRecord defines the structure for a relay record from Supabase,
// supporting nullable fields for coop_id, interval, and rtsp_url.
type SupabaseRelayRecord struct {
	ID         string  `json:"id"`
	Status     string  `json:"status"`
	CoopID     *string `json:"coop_id"`
	Interval   *string `json:"interval"`
	RTSPUrl    *string `json:"rtsp_url"`
	PairingCode *string `json:"pairing_code,omitempty"` // Only needed if querying by it, but good for full model
}

// RelayConfigResponseByPairingCode defines the JSON response structure when querying by pairing_code.
type RelayConfigResponseByPairingCode struct {
	RelayID  string  `json:"relay_id"`
	Status   string  `json:"status"`
	CoopID   *string `json:"coop_id,omitempty"`
	Interval *string `json:"interval,omitempty"`
	RTSPUrl  *string `json:"rtsp_url,omitempty"`
}

// GET /api/relay/config?relay_id=<uuid> OR /api/relay/config?pairing_code=<string>
func GetRelayConfigHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		respondWithError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	relayID := r.URL.Query().Get("relay_id")
	pairingCode := r.URL.Query().Get("pairing_code")

	supabaseURL := os.Getenv("SUPABASE_URL")
	serviceKey := os.Getenv("SUPABASE_SERVICE_KEY")
	if supabaseURL == "" || serviceKey == "" {
		log.Printf("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY env vars")
		respondWithError(w, http.StatusInternalServerError, "Server configuration error: Missing Supabase credentials.")
		return
	}

	client := &http.Client{}

	if relayID != "" {
		// Logic for handling request by relay_id (existing behavior)
		relayURL := supabaseURL + "/rest/v1/relays?id=eq." + relayID + "&select=id,status,coop_id,interval,rtsp_url"
		req, err := http.NewRequest("GET", relayURL, nil)
		if err != nil {
			log.Printf("Error creating request for relay_id %s: %v", relayID, err)
			respondWithError(w, http.StatusInternalServerError, "Error preparing request to fetch relay details.")
			return
		}
		req.Header.Set("apikey", serviceKey)
		req.Header.Set("Authorization", "Bearer "+serviceKey)
		req.Header.Set("Accept", "application/json")

		relayResp, err := client.Do(req)
		if err != nil {
			log.Printf("Error fetching relay by relay_id %s: %v", relayID, err)
			respondWithError(w, http.StatusInternalServerError, "Failed to communicate with database.")
			return
		}
		defer relayResp.Body.Close()

		if relayResp.StatusCode == http.StatusOK {
			var relays []SupabaseRelayRecord
			if err := json.NewDecoder(relayResp.Body).Decode(&relays); err != nil {
				log.Printf("Error decoding Supabase response for relay_id %s: %v", relayID, err)
				respondWithError(w, http.StatusInternalServerError, "Error processing relay data.")
				return
			}

			if len(relays) > 0 {
				row := relays[0]
				if row.Status == "claimed" && row.CoopID != nil && *row.CoopID != "" {
					// If interval or rtsp_url are null in DB, they will be null in JSON
					respondWithJSON(w, http.StatusOK, map[string]interface{}{
						"interval": row.Interval,
						"rtsp_url": row.RTSPUrl,
					})
					return
				}
			}
		}
		// Fallback default for relay_id not found, not claimed, or other Supabase errors for this path
		respondWithJSON(w, http.StatusOK, map[string]interface{}{
			"interval": "30s",
			"rtsp_url": nil,
		})
		return

	} else if pairingCode != "" {
		// Logic for handling request by pairing_code (new behavior)
		relayURL := supabaseURL + "/rest/v1/relays?pairing_code=eq." + pairingCode + "&select=id,status,coop_id,interval,rtsp_url"
		req, err := http.NewRequest("GET", relayURL, nil)
		if err != nil {
			log.Printf("Error creating request for pairing_code %s: %v", pairingCode, err)
			respondWithError(w, http.StatusInternalServerError, "Error preparing request to fetch relay details by pairing code.")
			return
		}
		req.Header.Set("apikey", serviceKey)
		req.Header.Set("Authorization", "Bearer "+serviceKey)
		req.Header.Set("Accept", "application/json")

		relayResp, err := client.Do(req)
		if err != nil {
			log.Printf("Error fetching relay by pairing_code %s: %v", pairingCode, err)
			respondWithError(w, http.StatusInternalServerError, "Failed to communicate with database.")
			return
		}
		defer relayResp.Body.Close()

		if relayResp.StatusCode == http.StatusOK {
			var relays []SupabaseRelayRecord
			if err := json.NewDecoder(relayResp.Body).Decode(&relays); err != nil {
				log.Printf("Error decoding Supabase response for pairing_code %s: %v", pairingCode, err)
				respondWithError(w, http.StatusInternalServerError, "Error processing relay data.")
				return
			}

			if len(relays) == 0 {
				respondWithError(w, http.StatusNotFound, "No relay found with the provided pairing code.")
				return
			}

			relay := relays[0]
			response := RelayConfigResponseByPairingCode{
				RelayID: relay.ID,
				Status:  relay.Status,
			}

			if relay.Status == "claimed" {
				response.CoopID = relay.CoopID // Will be null if DB coop_id is null
				response.RTSPUrl = relay.RTSPUrl // Will be null if DB rtsp_url is null
				
				// Default interval to "10m" if null in DB for a claimed relay by pairing code
				if relay.Interval != nil {
					response.Interval = relay.Interval
				} else {
					defaultInterval := "10m"
					response.Interval = &defaultInterval
				}
			}
			respondWithJSON(w, http.StatusOK, response)
			return
		} else if relayResp.StatusCode == http.StatusNotFound { // Should be caught by len(relays) == 0 if Supabase returns 200 with empty array
			respondWithError(w, http.StatusNotFound, "No relay found with the provided pairing code.")
			return
		} else {
			bodyBytes, _ := io.ReadAll(relayResp.Body)
			log.Printf("Supabase error fetching relay by pairing_code %s. Status: %s, Body: %s", pairingCode, relayResp.Status, string(bodyBytes))
			respondWithError(w, http.StatusInternalServerError, fmt.Sprintf("Failed to retrieve relay details by pairing code. Supabase status: %s", relayResp.Status))
			return
		}
	} else {
		// Neither relay_id nor pairing_code was provided
		respondWithError(w, http.StatusBadRequest, "Missing relay_id or pairing_code parameter.")
		return
	}
}

