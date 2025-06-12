package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"
)

func main() {
	// 1. Define and parse CLI flags
	relayID := flag.String("relay-id", "", "Relay ID (UUID)")
	imagePath := flag.String("image-path", "", "Path to the .jpg image file")
	flag.Parse()

	if *relayID == "" {
		log.Println("Error: --relay-id flag is required")
		os.Exit(1)
	}
	if *imagePath == "" {
		log.Println("Error: --image-path flag is required")
		os.Exit(1)
	}

	log.Printf("Starting upload process for Relay ID: %s, Image: %s", *relayID, *imagePath)

	// 2. Read environment variables
	supabaseURL := os.Getenv("SUPABASE_URL")
	supabaseServiceKey := os.Getenv("SUPABASE_SERVICE_KEY")
	coopBackendURL := os.Getenv("COOP_BACKEND_URL")

	if supabaseURL == "" || supabaseServiceKey == "" || coopBackendURL == "" {
		log.Println("Error: SUPABASE_URL, SUPABASE_SERVICE_KEY, and COOP_BACKEND_URL environment variables must be set")
		os.Exit(1)
	}

	// Ensure Supabase URL does not end with a slash for proper joining later
	supabaseURL = strings.TrimSuffix(supabaseURL, "/")
	coopBackendURL = strings.TrimSuffix(coopBackendURL, "/")

	// 3. Generate object key
	timestamp := time.Now().UTC().Format("2006-01-02-15-04-05")
	objectKey := fmt.Sprintf("%s/%s.jpg", *relayID, timestamp)
	log.Printf("Generated Supabase object key: %s", objectKey)

	// 4. Upload image to Supabase
	log.Println("Reading image file...")
	imageBytes, err := os.ReadFile(*imagePath)
	if err != nil {
		log.Printf("Error reading image file %s: %v", *imagePath, err)
		os.Exit(1)
	}

	supabaseUploadURL := fmt.Sprintf("%s/storage/v1/object/snapshots/%s", supabaseURL, objectKey)
	log.Printf("Uploading to Supabase: %s", supabaseUploadURL)

	req, err := http.NewRequest(http.MethodPut, supabaseUploadURL, bytes.NewReader(imageBytes))
	if err != nil {
		log.Printf("Error creating Supabase upload request: %v", err)
		os.Exit(1)
	}

	req.Header.Set("Authorization", "Bearer "+supabaseServiceKey)
	req.Header.Set("Content-Type", "image/jpeg")
	// Supabase might also require x-upsert for overwriting, though PUT usually implies it.
	// req.Header.Set("x-upsert", "true") // Add if uploads fail for existing paths and you want to overwrite

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("Error executing Supabase upload request: %v", err)
		os.Exit(1)
	}
	defer resp.Body.Close()

	bodyBytes, _ := io.ReadAll(resp.Body)
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		log.Printf("Error uploading to Supabase. Status: %s, Body: %s", resp.Status, string(bodyBytes))
		os.Exit(1)
	}
	log.Printf("Successfully uploaded image to Supabase. Status: %s", resp.Status)

	// 5. Notify the backend
	log.Println("Notifying Coop backend...")
	notificationPayload := map[string]string{
		"relay_id":       *relayID,
		"image_filename": objectKey, // Send the full object key
	}
	payloadBytes, err := json.Marshal(notificationPayload)
	if err != nil {
		log.Printf("Error marshalling notification payload: %v", err)
		os.Exit(1)
	}

	backendNotifyURL := fmt.Sprintf("%s/api/snapshots", coopBackendURL)
	log.Printf("Sending notification to: %s", backendNotifyURL)

	notifyReq, err := http.NewRequest(http.MethodPost, backendNotifyURL, bytes.NewReader(payloadBytes))
	if err != nil {
		log.Printf("Error creating backend notification request: %v", err)
		os.Exit(1)
	}
	notifyReq.Header.Set("Content-Type", "application/json")

	notifyResp, err := client.Do(notifyReq) // Reuse client
	if err != nil {
		log.Printf("Error executing backend notification request: %v", err)
		os.Exit(1)
	}
	defer notifyResp.Body.Close()

	notifyBodyBytes, _ := io.ReadAll(notifyResp.Body)
	if notifyResp.StatusCode < 200 || notifyResp.StatusCode >= 300 {
		log.Printf("Error notifying backend. Status: %s, Body: %s", notifyResp.Status, string(notifyBodyBytes))
		os.Exit(1)
	}

	log.Printf("Successfully notified backend. Status: %s, Response: %s", notifyResp.Status, string(notifyBodyBytes))
	
	// Output the final image path for the React app to parse
	fmt.Printf("UPLOADED_IMAGE_PATH:%s\n", objectKey)
	log.Println("Process completed successfully.")
}
