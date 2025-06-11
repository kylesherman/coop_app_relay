# Coop 2 MVP – Project Summary (June 2025)

## 🧩 System Components

| Layer                 | Status             | Notes                                                       |
|----------------------|--------------------|-------------------------------------------------------------|
| Backend (Go)         | ✅ LIVE on Fly.io   | Fully working, REST endpoints functional                    |
| Database (Supabase)  | ✅ All tables + RLS | Postgres + Supabase RLS, tested manually and via API        |
| Relay App (Electron) | ✅ Fully functional | Paired, polls for config, uploads snapshots, health pings   |
| iOS App (SwiftUI)    | 🚧 In development   | Magic link auth, onboarding flows live, Home screen UI live |
| Frontend API Wiring  | 🚧 Next             | Home, Nest Cam, Settings not yet connected to backend       |

---

## 📡 Backend API Endpoints

Base URL: `https://coop-app-backend.fly.dev`

### 🔓 Auth-less Endpoints (Relay)

| Method | Endpoint                                | Purpose                                 |
|--------|-----------------------------------------|-----------------------------------------|
| POST   | `/api/relay/pairing`                    | Create a relay + pairing code           |
| GET    | `/api/relay/pairing?code=...`           | Poll for pairing status                 |
| GET    | `/api/relay/config?relay_id=...`        | Get config (interval, RTSP override)    |
| POST   | `/api/relay/config/update`              | Update relay config                     |
| POST   | `/api/relay/status`                     | Health ping (sets `last_seen_at`)       |
| GET    | `/api/relay/status/read?relay_id=...`   | Read relay status                       |
| GET    | `/api/relay/snapshots?relay_id=...`     | Fetch all snapshots for a relay         |
| POST   | `/api/snapshots`                        | Submit snapshot metadata                |

### 🔐 Authenticated User Endpoints (Mobile App)

| Method | Endpoint                           | Purpose                                 |
|--------|------------------------------------|-----------------------------------------|
| POST   | `/api/onboarding/profile`          | Save first name, last name, username    |
| POST   | `/api/onboarding/coop`             | Create or join a coop                   |
| GET    | `/api/home/today`                  | Get today’s egg count + snapshot info   |
| GET    | `/api/history`                     | Egg history (for chart)                 |
| GET    | `/api/nest-cam?date=...&limit=...`| Gallery of egg snapshots by date        |
| PATCH  | `/api/settings/relay`              | Set RTSP override + snapshot interval   |
| PATCH  | `/api/settings/notifications`      | Set push settings / send test push      |
| GET    | `/api/settings/status`             | Fetch user/coop/relay state             |

---

## 🖥️ CoopRelay Electron App

- **Pairing Flow**: Displays code → backend marks paired
- **Config Polling**: Every 30–60s from `/api/relay/config`
  - `interval` (e.g. `"1m"`)
  - `rtsp_url` (optional override)
- **Snapshot Logic**:
  - Uses `ffmpeg` to capture frame → saves to `/tmp/snapshot.jpg`
  - Uploads to Supabase → `snapshots/{relay_id}/{timestamp}.jpg`
  - POSTs metadata to `/api/snapshots`
- **Health Ping**: POST `/api/relay/status` every 2m or after snapshot
- **Tray Menu**:
  - “Force Snapshot” ✅
  - “Show App” ✅
  - Edit RTSP ✅
  - Resets if pairing lost ✅

---

## 📱 CoopTrackingApp (SwiftUI iOS)

### ✅ Implemented

- **Auth**: Magic link via `coopapp://callback`
- **Onboarding**:
  - Step 1: `ProfileSetupView.swift`
  - Step 2: `CoopSetupView.swift`
- **Routing**: Full flow from login → onboarding → home
- **Home UI**: Egg count card + latest snapshot
- **Tab Bar**: SF Symbol-based: Home, History, Nest Cam, Settings
- **Token Storage**: `access_token` in `UserDefaults`

### 🔜 Upcoming Work

- Wire POSTs for onboarding profile/coop
- Connect `/api/home/today` to Home screen
- Implement Nest Cam gallery via `/api/nest-cam`
- Fetch snapshot images (public bucket)
- Settings: RTSP, interval, push prefs
- Test push call integration

---

## 🎨 Design & UI

- **Font**: SF Pro Rounded
- **Design Tokens**:
  - Background: `#FAF9F6`
  - Primary: `#4CAF50`
  - Muted: `#6B7280`
- **Style**:
  - `rounded-xl`, `shadow-md`
  - Large tap targets
  - Apple-style UX
- **Icons**: SF Symbols: `camera`, `bell`, `home`, `gear`

---

## 🧠 Notes for Agents

- **REST-only Auth**: No Supabase JS SDK — use Supabase REST APIs
- **Tokens**: `access_token` must be sent in headers
- **Relay is Dumb**: Mobile is the control center
- **Environments**: All endpoints currently point to **production**
- **Images**: URLs are returned by backend — **do not construct in frontend**
- **RLS Enabled**: All tables protected, but snapshot bucket is public for now

---

## 📌 Open Tasks (optional section)

Consider adding these if you want a full backlog.
