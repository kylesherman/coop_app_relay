package main

import (
	"log"
	"net/http"
	"os"

	"coop_app_backend/internal/api"

	"github.com/go-chi/chi/v5"
)

func main() {
	supabaseURL := os.Getenv("SUPABASE_URL")
	serviceKey := os.Getenv("SUPABASE_SERVICE_KEY")
	if supabaseURL == "" || serviceKey == "" {
		log.Fatal("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY env vars")
	}

	r := chi.NewRouter()

	r.Post("/api/snapshots", api.PostSnapshotHandler)

	r.Post("/api/egg-detections/run", api.PostEggDetectionsRunHandler)
	r.Post("/api/internal/snapshot-created", api.PostSnapshotCreatedHandler)

	r.Route("/api/relay", func(r chi.Router) {
		r.Get("/config", api.GetRelayConfigHandler)       // GET /api/relay/config?relay_id=xxx
		r.Post("/config", api.PostRelayConfigHandler)    // POST /api/relay/config
		r.Post("/status", api.PostRelayStatusHandler)    // POST /api/relay/status
		r.Get("/status/read", api.GetRelayStatusHandler) // GET /api/relay/status/read?relay_id=xxx
		r.Get("/snapshots", api.GetRelaySnapshotsHandler) // GET /api/relay/snapshots?relay_id=xxx (placeholder)
		r.Post("/request_pairing_code", api.RequestRelayPairingCodeHandler)
		r.Post("/claim", api.ClaimRelayHandler) // POST /api/relay/claim
		// r.Get("/pairing", api.GetRelayPairingStatusHandler) // GET /api/relay/pairing?code=xxxx - Activate if needed
	})

	r.Route("/api/onboarding", func(apiRouter chi.Router) {
		apiRouter.Post("/profile", api.PostProfileHandler)
		apiRouter.Post("/coop", api.PostCoopOnboardingHandler) // New route for coop onboarding
		apiRouter.Get("/status", api.GetOnboardingStatusHandler)
	})

	r.Route("/api/coop", func(coopRouter chi.Router) {
		// coopRouter.Use(AuthMiddleware) // Example: if you add a JWT middleware for this group
		coopRouter.Get("/info", api.GetCoopInfoHandler) // GET /api/coop/info
	})

	log.Println("🚀 Coop backend listening on :8080")
	err := http.ListenAndServe(":8080", r)
	if err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
