package api

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"
	
	_ "github.com/lib/pq"
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
	var foundPriorDetection bool
	{
		// Connect to Supabase PostgreSQL database
		// Supabase connection string format: postgres://postgres:[password]@[host]:5432/postgres
		supabaseDBURL := os.Getenv("SUPABASE_DB_URL")
		if supabaseDBURL == "" {
			log.Printf("[egg-detection] SUPABASE_DB_URL not set, falling back to REST API approach")
			// Fallback to previous REST approach would go here, but for now we'll error
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte(`{"error": "Database connection not configured"}`))
			return
		}
		
		db, err := sql.Open("postgres", supabaseDBURL)
		if err != nil {
			log.Printf("[egg-detection] Failed to connect to database: %v", err)
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte(`{"error": "Database connection failed"}`))
			return
		}
		defer db.Close()

		// Direct SQL query with JOIN to get most recent prior detection
		sqlQuery := `
			SELECT ed.egg_count
			FROM egg_detections ed
			JOIN snapshots s ON ed.snapshot_id = s.id
			WHERE s.coop_id = $1
			  AND s.created_at < $2
			ORDER BY s.created_at DESC
			LIMIT 1;
		`
		
		log.Printf("[egg-detection] Querying for prior detection: coop_id=%s, before=%s", snapshot.CoopID, snapshot.CreatedAt)
		
		var priorEggCount int
		err = db.QueryRow(sqlQuery, snapshot.CoopID, snapshot.CreatedAt).Scan(&priorEggCount)
		if err == nil {
			previousEggCount = priorEggCount
			foundPriorDetection = true
			log.Printf("[egg-detection] Found prior detection: egg_count=%d", previousEggCount)
		} else if err == sql.ErrNoRows {
			log.Printf("[egg-detection] No prior detection records found")
		} else {
			log.Printf("[egg-detection] Database query error: %v", err)
		}
	}
	if previousEggCount < 0 {
		previousEggCount = 0
	}
	
	// Calculate newly_detected using max(currentEggCount - previousEggCount, 0)
	var newlyDetected int
	if foundPriorDetection {
		newlyDetected = aiResp.EggCount - previousEggCount
		if newlyDetected < 0 {
			newlyDetected = 0
		}
	} else {
		newlyDetected = aiResp.EggCount
	}
	
	// Log the comparison results with simplified format
	log.Printf("[egg-detection] Coop %s: last=%d → current=%d → new=%d", snapshot.CoopID, previousEggCount, aiResp.EggCount, newlyDetected)
	
	// 6. Insert new row into egg_detections
	detectedAt := time.Now().UTC()
	insertBody := map[string]interface{}{
		"snapshot_id":     snapshot.ID,
		"egg_count":       aiResp.EggCount,
		"confidence":      aiResp.Confidence,
		"newly_detected":  newlyDetected,
		"model_used":      "gpt-4o",
		"detected_at":     detectedAt.Format(time.RFC3339Nano),
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
		log.Printf("Egg detection insert failed: %v", err)
		w.WriteHeader(http.StatusBadGateway)
		w.Write([]byte(`{"error": "Failed to insert detection"}`))
		return
	}
	defer insertResp.Body.Close()

	if insertResp.StatusCode != http.StatusCreated && insertResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(insertResp.Body)
		log.Printf("Egg detection insert failed: %s", string(body))
		w.WriteHeader(http.StatusBadGateway)
		w.Write([]byte(`{"error": "Failed to insert detection"}`))
		return
	}

	log.Printf("[egg-detection] Inserted detection with detected_at=%s", detectedAt.Format(time.RFC3339Nano))

	// 7. Respond with detection result
	w.Header().Set("Content-Type", "application/json")
	result := map[string]interface{}{
		"snapshot_id":    snapshot.ID,
		"egg_count":      aiResp.EggCount,
		"confidence":     aiResp.Confidence,
		"newly_detected": newlyDetected,
		"model_used":     "gpt-4o",
		"detected_at":    detectedAt.Format(time.RFC3339Nano),
	}
	json.NewEncoder(w).Encode(result)
}
