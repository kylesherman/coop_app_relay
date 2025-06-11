package api

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
)

// PostEggDetectionsRunHandler handles POST /api/egg-detections/run with GPT-4o Vision integration
func PostEggDetectionsRunHandler(w http.ResponseWriter, r *http.Request) {

	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		SnapshotID string `json:"snapshot_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.SnapshotID == "" {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error": "Missing or invalid snapshot_id"}`))
		return
	}

	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		w.WriteHeader(http.StatusUnauthorized)
		w.Write([]byte(`{"error": "Missing Authorization header"}`))
		return
	}
	tokenString := strings.TrimPrefix(authHeader, "Bearer ")
	if tokenString == authHeader || tokenString == "" {
		w.WriteHeader(http.StatusUnauthorized)
		w.Write([]byte(`{"error": "Invalid Authorization header format"}`))
		return
	}

	supabaseURL := os.Getenv("SUPABASE_URL")
	openaiKey := os.Getenv("OPENAI_API_KEY")

	// Query snapshots with user JWT (RLS enforced)
	snapshotsURL := supabaseURL + "/rest/v1/snapshots?id=eq." + req.SnapshotID + "&select=id,coop_id,relay_id,image_path,created_at&limit=1"
	reqSnap, err := http.NewRequest("GET", snapshotsURL, nil)
	if err != nil {
		log.Printf("Failed to create snapshot GET request: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	// --- ENSURE: All Supabase queries use the user's JWT (never the service key) ---
	reqSnap.Header.Set("Authorization", "Bearer "+tokenString)
	reqSnap.Header.Set("apikey", os.Getenv("SUPABASE_ANON_KEY"))
	reqSnap.Header.Set("Accept", "application/json")


	client := &http.Client{}
	respSnap, err := client.Do(reqSnap)
	if err != nil {
		log.Printf("Snapshot GET request failed: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	defer respSnap.Body.Close()

	if respSnap.StatusCode == http.StatusUnauthorized || respSnap.StatusCode == http.StatusForbidden {
		w.WriteHeader(http.StatusUnauthorized)
		w.Write([]byte(`{"error": "Unauthorized"}`))
		return
	}
	if respSnap.StatusCode != http.StatusOK {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	body, readErr := io.ReadAll(respSnap.Body)
	var snapshots []struct {
		ID        string  `json:"id"`
		CoopID    string  `json:"coop_id"`
		RelayID   string  `json:"relay_id"`
		ImagePath string  `json:"image_path"`
		CreatedAt string  `json:"created_at"`
	}
	unmarshalErr := json.Unmarshal(body, &snapshots)
	if (readErr != nil || unmarshalErr != nil || len(snapshots) == 0) {
		w.WriteHeader(http.StatusUnauthorized)
		w.Write([]byte(`{"error": "Unauthorized"}`))
		return
	}
	snapshot := snapshots[0]

	// 1. Build the full public image URL
	imageURL := fmt.Sprintf("%s/storage/v1/object/public/snapshots/%s", supabaseURL, snapshot.ImagePath)

	// 2. Call OpenAI GPT-4o Vision API
	openaiURL := "https://api.openai.com/v1/chat/completions"
	aiPrompt := `You are a vision model analyzing images of chicken coops. Count the number of visible chicken eggs in this image.

Only respond with a JSON object in this format:

{ "egg_count": number, "confidence": float }

DO NOT say anything else. Do not explain. Do not apologize.`
	openaiReqBody := map[string]interface{}{
		"model": "gpt-4o",
		"messages": []interface{}{
			map[string]interface{}{
				"role": "system",
				"content": aiPrompt,
			},
			map[string]interface{}{
				"role": "user",
				"content": []interface{}{
					map[string]interface{}{
						"type": "image_url",
						"image_url": map[string]interface{}{"url": imageURL},
					},
				},
			},
		},
	}
	openaiReqJSON, _ := json.Marshal(openaiReqBody)
	openaiReq, err := http.NewRequest("POST", openaiURL, strings.NewReader(string(openaiReqJSON)))
	if err != nil {
		w.WriteHeader(http.StatusBadGateway)
		w.Write([]byte(`{"error": "AI model error", "details": "Failed to build OpenAI request"}`))
		return
	}
	openaiReq.Header.Set("Authorization", "Bearer "+openaiKey)
	openaiReq.Header.Set("Content-Type", "application/json")

	openaiResp, err := client.Do(openaiReq)
	if err != nil {
		w.WriteHeader(http.StatusBadGateway)
		w.Write([]byte(`{"error": "AI model error", "details": "OpenAI request failed"}`))
		return
	}
	defer openaiResp.Body.Close()

	if openaiResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(openaiResp.Body)
		w.WriteHeader(http.StatusBadGateway)
		w.Write([]byte(`{"error": "AI model error", "details": "` + strings.ReplaceAll(string(body), "\"", "'") + `"}`))
		return
	}

	respBody, _ := io.ReadAll(openaiResp.Body)
	var openaiResult struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.Unmarshal(respBody, &openaiResult); err != nil || len(openaiResult.Choices) == 0 {
		w.WriteHeader(http.StatusBadGateway)
		w.Write([]byte(`{"error": "AI model error", "details": "Invalid OpenAI response format"}`))
		return
	}

	// 4. Parse the JSON returned by GPT-4o
	var aiResp struct {
		EggCount   int     `json:"egg_count"`
		Confidence float64 `json:"confidence"`
	}
	aiText := openaiResult.Choices[0].Message.Content
	err = json.Unmarshal([]byte(aiText), &aiResp)
	if err != nil {
		log.Printf("GPT-4o response parse error: %v", err)
		w.WriteHeader(http.StatusBadGateway)
		w.Write([]byte(fmt.Sprintf(`{"error": "AI model error", "details": "Could not parse AI JSON: %s"}`, aiText)))
		return
	}

	// 5. Fetch most recent egg_detections for this coop_id before this snapshot
	var previousEggCount int
	{
		query := fmt.Sprintf("%s/rest/v1/egg_detections?coop_id=eq.%s&detected_at=lt.%s&order=detected_at.desc&limit=1", supabaseURL, snapshot.CoopID, snapshot.CreatedAt)
		reqPrev, err := http.NewRequest("GET", query, nil)
		if err == nil {
			reqPrev.Header.Set("Authorization", "Bearer "+tokenString)
			reqPrev.Header.Set("apikey", os.Getenv("SUPABASE_ANON_KEY"))
			reqPrev.Header.Set("Accept", "application/json")
			respPrev, err := client.Do(reqPrev)
			if err == nil && respPrev.StatusCode == http.StatusOK {
				bodyPrev, _ := io.ReadAll(respPrev.Body)
				var prevs []struct{ EggCount int `json:"egg_count"` }
				if err := json.Unmarshal(bodyPrev, &prevs); err == nil && len(prevs) > 0 {
					previousEggCount = prevs[0].EggCount
				}
			}
			if respPrev != nil {
				respPrev.Body.Close()
			}
		}
	}
	if previousEggCount < 0 {
		previousEggCount = 0
	}
	newlyDetected := aiResp.EggCount - previousEggCount
	if newlyDetected < 0 {
		newlyDetected = 0
	}

	// 6. Insert new row into egg_detections
	insertBody := map[string]interface{}{
		"snapshot_id":     snapshot.ID,
		"egg_count":       aiResp.EggCount,
		"confidence":      aiResp.Confidence,
		"newly_detected":  newlyDetected,
		"model_used":      "gpt-4o",
		"detected_at":     nil, // let DB default to now()
	}
	insertJSON, _ := json.Marshal(insertBody)
	insertURL := fmt.Sprintf("%s/rest/v1/egg_detections?select=snapshot_id,egg_count,confidence,newly_detected,model_used,detected_at", supabaseURL)
	insertReq, err := http.NewRequest("POST", insertURL, strings.NewReader(string(insertJSON)))
	if err != nil {
		w.WriteHeader(http.StatusBadGateway)
		w.Write([]byte(`{"error": "Insert error", "details": "Could not build insert request"}`))
		return
	}
	insertReq.Header.Set("Authorization", "Bearer "+tokenString)
	insertReq.Header.Set("apikey", os.Getenv("SUPABASE_ANON_KEY"))
	insertReq.Header.Set("Content-Type", "application/json")
	insertReq.Header.Set("Prefer", "return=representation")
	insertResp, err := client.Do(insertReq)
	if err != nil {
		log.Printf("Failed to insert egg detection: %v", err)
		w.WriteHeader(http.StatusBadGateway)
		w.Write([]byte(`{"error": "Insert error", "details": "Could not reach Supabase"}`))
		return
	}
	defer insertResp.Body.Close()
	if insertResp.StatusCode != http.StatusCreated && insertResp.StatusCode != http.StatusOK {
		log.Printf("Failed to insert egg detection, status: %v", insertResp.StatusCode)
		w.WriteHeader(http.StatusBadGateway)
		w.Write([]byte(`{"error": "Insert error", "details": "Supabase insert failed"}`))
		return
	}
	bodyInsert, _ := io.ReadAll(insertResp.Body)
	var inserted []struct {
		SnapshotID    string  `json:"snapshot_id"`
		EggCount      int     `json:"egg_count"`
		Confidence    float64 `json:"confidence"`
		NewlyDetected int     `json:"newly_detected"`
		ModelUsed     string  `json:"model_used"`
		DetectedAt    string  `json:"detected_at"`
	}
	if err := json.Unmarshal(bodyInsert, &inserted); err != nil || len(inserted) == 0 {
		log.Printf("Failed to parse Supabase insert response: %v", err)
		w.WriteHeader(http.StatusBadGateway)
		w.Write([]byte(`{"error": "Insert error", "details": "Could not parse Supabase response"}`))
		return
	}
	result := inserted[0]
	resp := map[string]interface{}{
		"snapshot_id":    result.SnapshotID,
		"egg_count":      aiResp.EggCount,
		"confidence":     aiResp.Confidence,
		"newly_detected": result.NewlyDetected,
		"model_used":     result.ModelUsed,
		"detected_at":    result.DetectedAt,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}
