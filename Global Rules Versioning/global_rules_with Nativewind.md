🐣 Coop 2 Overview

Coop 2 is a modern, real-time egg tracking app designed for families and small farm owners to monitor egg production using AI and cameras. It’s a complete rebuild of the original prototype, designed from scratch with clean architecture, scalable backend, and a refined onboarding and data model.

⸻

🧩 Core Features (MVP)
	1.	User Onboarding & Shared Coops
	•	Users sign up via Supabase Auth (email magic link).
	•	Each user provides their username, first name, and last name.
	•	Users can either:
	•	Create a new coop, or
	•	Join an existing one via invite code (“Join a flock”).
	2.	Multi-User Coop Access
	•	Coops are shared spaces for egg tracking.
	•	All members can see snapshot history, egg detections, and aggregate data.
	•	Each user controls their own push notification settings (frequency + device-specific).
	3.	Camera Snapshot Integration
	•	A separate Relay App (Electron) listens to RTSP streams (e.g., UniFi cameras).
	•	Periodically captures and uploads snapshots to Supabase Storage.
	•	Snapshots are analyzed by AI for egg detection.
	4.	Egg Detection & History
	•	AI detects eggs in snapshots.
	•	Only snapshots with eggs are stored and visible in the Nest Cam gallery.
	•	Snapshots are grouped by date, with lazy loading/pagination.
	•	When eggs disappear in a future snapshot, Coop assumes they’ve been collected.
	5.	Lifetime Egg Tracking
	•	Coop tracks total eggs laid over time (accrued at the coop level).
	•	Snapshot metadata includes egg count, confidence, and model version.

⸻

⚙️ Architecture Highlights

Frontend
	•	Built in React Native (mobile app).
	•	Styling via Tailwind (NativeWind).
	•	Clean Apple-style UI with emojis, rounded components, and soft colors.

Backend
	•	Hosted on Supabase with full RLS policies.
	•	REST API usage instead of SDK (for better React Native compatibility).
	•	Postgres with clearly defined tables for users, coops, snapshots, detections, etc.

Relay App
	•	Electron desktop app for local image processing and upload.
	•	Handles RTSP stream connection, snapshot timing, and upload via Supabase REST.

⸻

🔐 RLS & Simplicity
	•	Row-Level Security is enabled across all key tables to restrict data access.
	•	While snapshots are private, RLS ensures each user only sees what belongs to their coop.
	•	Focus is on simplicity, speed, and dumb frontends—logic is centralized in backend services.

Here the details of the database schema (this is what we've already run in supabase):

-- Enable pgcrypto for UUID generation
create extension if not exists "pgcrypto";

-- 👤 users
create table users (
  id uuid primary key default gen_random_uuid(),
  first_name text,
  last_name text,
  username text unique,
  created_at timestamptz default now()
);

-- 🐔 coops
create table coops (
  id uuid primary key default gen_random_uuid(),
  name text,
  created_by uuid references users(id),
  total_eggs_laid int default 0,
  created_at timestamptz default now()
);

-- 🤝 coop_members
create table coop_members (
  user_id uuid references users(id),
  coop_id uuid references coops(id),
  role text check (role in ('owner', 'member')),
  joined_at timestamptz default now(),
  primary key (user_id, coop_id)
);

-- 📦 relays
create table relays (
  id uuid primary key default gen_random_uuid(),
  coop_id uuid references coops(id),
  pairing_code text,
  status text check (status in ('pending', 'claimed', 'inactive')),
  paired_at timestamptz,
  last_seen_at timestamptz
);

-- 🖼 snapshots
create table snapshots (
  id uuid primary key default gen_random_uuid(),
  coop_id uuid references coops(id),
  relay_id uuid references relays(id),
  image_path text,
  created_at timestamptz default now()
);

-- 🥚 egg_detections
create table egg_detections (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid references snapshots(id),
  egg_count int,
  newly_detected int,
  model_used text,
  confidence float,
  detected_at timestamptz default now()
);

-- 🔔 user_settings
create table user_settings (
  user_id uuid primary key references users(id),
  push_enabled boolean default true,
  frequency text check (frequency in ('real_time', 'daily_summary', 'off')),
  created_at timestamptz default now()
);

-- 🔐 Enable RLS on all user/data tables
alter table users enable row level security;
alter table coops enable row level security;
alter table coop_members enable row level security;
alter table relays enable row level security;
alter table snapshots enable row level security;
alter table egg_detections enable row level security;
alter table user_settings enable row level security;

-- 🔐 RLS Policies

-- USERS
create policy "Users can read/update themselves" on users
  for all using (auth.uid() = id);

-- COOPS
create policy "Users can access their coops" on coops
  for select using (
    exists (
      select 1 from coop_members
      where coop_members.coop_id = coops.id
        and coop_members.user_id = auth.uid()
    )
  );

-- COOP MEMBERS
create policy "Users can see their coop memberships" on coop_members
  for select using (user_id = auth.uid());

-- RELAYS
create policy "Users can access relays for their coops" on relays
  for select using (
    exists (
      select 1 from coop_members
      where coop_members.coop_id = relays.coop_id
        and coop_members.user_id = auth.uid()
    )
  );

-- SNAPSHOTS
create policy "Users can access snapshots for their coops" on snapshots
  for select using (
    exists (
      select 1 from coop_members
      where coop_members.coop_id = snapshots.coop_id
        and coop_members.user_id = auth.uid()
    )
  );

-- EGG DETECTIONS
create policy "Users can access detections via snapshots" on egg_detections
  for select using (
    exists (
      select 1 from snapshots
      join coop_members on coop_members.coop_id = snapshots.coop_id
      where snapshots.id = egg_detections.snapshot_id
        and coop_members.user_id = auth.uid()
    )
  );

-- USER SETTINGS
create policy "Users can read/update their settings" on user_settings
  for all using (auth.uid() = user_id);

Here is the frontend overview: 

🐔 Coop 2 – Frontend UI Design Framework (MVP++)

⸻

🔐 Sign-In Screen

Purpose: Secure login via email or Google.
	•	Header: "Welcome to Coop 🐔"
	•	Inputs: Email field
	•	Buttons:
	•	“Send Magic Link”
	•	“Continue with Google” (optional)
	•	Feedback:
	•	Spinner after submit
	•	“Check your inbox to continue”

⸻

🐣 Onboarding Flow (First-Time Only)

Step 1: Profile Setup
	•	First Name
	•	Last Name
	•	Username

Step 2: Coop Setup
	•	🔘 Create New Coop – Coop Name input
	•	🔘 Join a Flock – Invite Code input
	•	Hint: “Ask your family for the code”

CTA:

“Let’s Hatch This Thing”

⸻

🏠 1. Home Screen – “Today’s Nest”

Purpose: Display live egg count + snapshot preview.
	•	Header: App name with 🥚 emoji + current date
	•	Egg Summary Card:
	•	🥚 Total eggs today
	•	📈 Delta since last snapshot
	•	⏱ Last Snapshot Time (local)
	•	Snapshot Preview:
	•	Latest image
	•	Tap to expand
	•	🔄 Refresh icon
	•	Quick Actions:
	•	🔁 Force Snapshot
	•	🛎 Test Notification

⸻

📊 2. History Screen – “Egg Timeline”

Purpose: Show trends over time.
	•	Chart View:
	•	Toggle: 7 / 30 / All Time
	•	Line or bar chart
	•	Daily Summary List:
	•	“July 10 – 6 eggs”
	•	Tap a day to open filtered Nest Cam (future)

⸻

🖼 3. Nest Cam – Image Review Screen

Purpose: Let users browse historical snapshots with egg detections.

📷 Grouped Gallery
	•	Title: Nest Cam Gallery
	•	Subtitle: Last updated: [10:56 PM]
	•	Grouped by Date:
	•	Section header: e.g., “May 29”
	•	Font: bold, padding between groups

🧩 Snapshot Cards
	•	Rounded image preview
	•	Time: e.g., “6:44 PM”
	•	Egg Count Badge:
	•	Green pill (e.g., 2)
	•	bg-green-100 text-green-700 rounded-full
	•	Spacing: gap-2 p-2
	•	2-column grid
	•	Tap to expand (future)

🔄 Data Behavior
	•	Lazy loading or pagination per day
	•	API design: GET /api/egg-detections?date=&limit=20
	•	Infinite scroll experience preferred for MVP

⸻

⚙️ 4. Settings Screen

Purpose: Control camera, notifications, and coop identity.

📷 Relay Management
	•	Status: 🟢/🔴
	•	Pair New Relay (8-char code input)
	•	Unlink Relay (with modal)

⏱ Snapshot Timing
	•	Selector: 5 / 10 / 15 / 30 min
	•	Synced with backend
	•	Relay pulls interval config periodically

📣 Notifications (Per User)
	•	Push Toggle
	•	Frequency:
	•	“Every new egg”
	•	“Daily summary”
	•	“Send Test” button

🧑‍🌾 Coop Info
	•	Coop Name
	•	Username
	•	Coop Code (tap to copy)
	•	Member list (read-only)

🛠 System Info
	•	Backend sync status
	•	Relay IP (if available)
	•	“Run Diagnostics” button

🚪 Log Out
	•	Red text at bottom
	•	Confirmation modal (optional)
	•	Clears session → returns to Sign-In

⸻

🔔 Notification Preview Modal
	•	Example:

🥚 3 new eggs since your last check-in!
Total now: 7 eggs


	•	Buttons: “Send Test”, “View History” (future)

⸻

👩‍💻 Hidden Debug Panel
	•	Access: Tap logo 5x
	•	Logs:
	•	Snapshot upload
	•	Vision API call
	•	Manual egg count override
	•	Reset / clear cache

⸻

🧬 Data Model Summary

Table	Notes
users	Personal login + settings
coops	Shared group unit
coop_members	Maps users to coops
relays	RTSP-connected agents
snapshots	JPEG uploads w/ timestamp
egg_detections	Detected egg counts + confidence

	•	Users can belong to the same coop
	•	Notifications and settings are per-user
	•	Relay is paired to a coop (not to a user)

⸻

🎨 Tailwind + NativeWind Design System

theme.ts Design Tokens

export const colors = {
  background: '#FAF9F6',
  primary: '#4CAF50',
  accent: '#FFEB3B',
  text: '#222',
  muted: '#999',
}

Custom Tailwind Utilities
	•	bg-eggshell, text-muted, rounded-xl, shadow-md, gap-2, aspect-[4/3]

Reusable Components
	•	Button.tsx
	•	SnapshotCard.tsx
	•	EggSummary.tsx
	•	RelayPairingForm.tsx
	•	SettingsCard.tsx

⸻

UX Guidelines
	•	Typography: SF Pro / system default
	•	Colors:
	•	Eggshell background
	•	Green accent (#4CAF50)
	•	Yolk yellow for highlights
	•	Touch Areas: Minimum 44px height
	•	Navigation: Bottom tabs: Home / History / Nest Cam / Settings

⸻

This is our frontend architecture: 

Here’s a high-level description of the Coop 2 front end architecture, tailored for writing global rules for your Windsurf agent:

⸻

🧱 Coop 2 – Frontend Architecture Overview

Framework & Tooling
	•	React Native + Expo Router v5: Used for building the mobile app (iOS & Android) with tab-based navigation.
	•	TypeScript: Strongly typed components and service layers.
	•	Supabase Auth: For user authentication via REST API (not the JS SDK).
	•	API Calls: Use fetch with Authorization: Bearer <JWT> header to hit the backend hosted on Fly.io.

⸻

🗂️ Project Structure

/app
  _layout.tsx         # Handles auth loading state, redirects
  (auth)/login.tsx    # Email login screen
  (tabs)/             # Tab navigator with the 4 main screens
    home.tsx
    history.tsx
    nest-cam.tsx
    settings.tsx
  onboarding.tsx      # Captures first name, last name, username, coop name or join code
  callback.tsx        # Handles deep linking via magic link (e.g. coopapp://callback)

 /components           # Reusable UI components
 /services             # API service layer (e.g. eggDetectionService.ts)
 /hooks                # Custom React hooks
 /config               # Theme, constants, API base URL
 /utils                # Utility functions (e.g. date formatting, caching)


⸻

🧭 Navigation
	•	Expo Router v5 structure with segmented routes
	•	Main Tabs: Home, History, Nest Cam, Settings
	•	Hidden Routes: /callback, /onboarding, admin/debug screen
	•	Navigation decisions (e.g. redirect to onboarding) are centralized in _layout.tsx using global auth context

⸻

📱 Screens

Screen	Purpose
Home	Live egg count, latest snapshot preview, force snapshot, test push
History	Graph of egg production (daily/weekly/monthly/all time), egg list
Nest Cam	Snapshot gallery (only images with eggs), grouped by date
Settings	RTSP camera URL, snapshot interval, notification prefs, logout
Onboarding	User profile setup, coop creation or join via code


⸻

🎨 Styling
	•	Clean, Apple-style UI: SF Pro typography, white/eggshell backgrounds (#FAF9F6), green accents (#4CAF50)
	•	Soft shadows, rounded corners, large touch targets
	•	Future: likely migrate to NativeWind (Tailwind for RN) for consistency

⸻

📡 API Integration
	•	All API requests go to https://coop-backend.fly.dev or equivalent
	•	Authenticated requests use Supabase JWT in Authorization header
	•	REST endpoints are called via service files like:
	•	eggDetectionService.ts
	•	settingsService.ts
	•	snapshotService.ts

⸻

🧠 Global App State
	•	Global auth state stored in context
	•	Coop selection and user profile info cached locally with fallback to fetch
	•	Image fetching uses prebuilt URLs or signed URLs from backend

⸻

🔒 Authentication Flow
	•	Uses Supabase email + magic link
	•	Deep link redirects to /callback which stores tokens and routes to /onboarding or main app
	•	No SDK; REST-based auth only

⸻


This is our backend architecture:

Absolutely — here’s the full, clean Windsurf AI Agent Rule Dump for the new Coop 2 backend, including everything we’ve discussed and optimized for ingestion into your tooling or documentation systems:

⸻

🧭 Windsurf Rules — Coop 2 Backend (MVP v1.0)

This document defines the core backend architecture, design principles, and implementation rules for Coop 2 — a rebuilt-from-scratch smart chicken coop egg detection system. It replaces all logic, tech choices, and architectural complexity from any previous prototype.

⸻

📦 Architecture Overview
	•	Backend: Go (Golang)
	•	Database: Supabase Postgres
	•	Auth: Supabase Auth with Row-Level Security (RLS)
	•	Storage: Supabase Storage, public bucket for snapshots
	•	Frontend: React Native, designed to be dumb and data-driven
	•	Relay: Electron app that captures RTSP camera snapshots and sends them to the backend
	•	Hosting: Fly.io (for backend) + Supabase + Vercel (for edge redirector)

⸻

🧱 Database Schema Summary

Table	Description
users	Auth-linked user profile (UUID matches Supabase Auth ID)
coops	Shared chicken coop data; tracks total lifetime eggs
coop_members	Join table between users and coops
relays	Desktop devices used to upload snapshots
snapshots	Image metadata for each relay upload
egg_detections	AI-derived egg counts from snapshots
user_settings	Notification preferences (push/frequency) per user

All tables have RLS enabled with strict access based on auth.uid() and coop_id membership.

⸻

🧠 Data Model Rules
	•	Users can belong to multiple coops
	•	Each coop can have multiple users
	•	A relay belongs to one coop, and uploads JPEGs
	•	Snapshots are analyzed for egg count, which is:
	•	Stored as egg_count
	•	Compared against previous to get newly_detected
	•	coops.total_eggs_laid is incremented by newly_detected
	•	Each user can configure push notifications and delivery frequency independently

⸻

📸 Snapshot Storage Rules
	•	Snapshots are saved to the snapshots Supabase bucket
	•	The bucket is public to simplify MVP delivery
	•	The backend stores only the image_path in the database
	•	Backend generates full image URLs (not the frontend)
	•	URL pattern:

https://<project-ref>.supabase.co/storage/v1/object/public/snapshots/<image_path>


	•	Frontend simply renders the image_url returned in API responses
	•	If privacy becomes a concern later, we can:
	•	Switch the bucket to private
	•	Enable signed URL generation from the backend

⸻

🔔 Notification System
	•	Users can choose:
	•	real_time: send push alerts when eggs are detected
	•	daily_summary: aggregate and deliver daily count
	•	off: no notifications
	•	Notification logic will be server-side
	•	Config stored in user_settings table, keyed by user_id

⸻

🔐 Access Control (RLS)
	•	All data is protected using Supabase RLS:
	•	Users can only see their own users record and user_settings
	•	Users can only access:
	•	Coops they belong to
	•	Relays in their coops
	•	Snapshots and detections tied to their coops
	•	Storage bucket is public, but metadata is secured

⸻

🌐 Supabase API Access
	•	Use Supabase REST APIs, not client SDKs like @supabase/supabase-js
	•	Reason:
	•	Previous React Native project had issues with SDK deep linking, token handling, and mobile platform inconsistencies
	•	The backend and frontend will manually call Supabase’s:
	•	Auth endpoints (magic link sign-in, refresh token)
	•	REST endpoints (rest/v1 schema-based routes)
	•	Storage endpoints (upload via presigned POST or direct PUT)
	•	This gives us:
	•	Better debugging
	•	Full control
	•	Easier migration to other auth/storage later if needed

⸻

🔄 Data Flow Summary
	1.	User signs in via Supabase Auth (magic link flow)
	2.	User creates or joins a coop
	3.	Coop generates pairing code for desktop relay
	4.	Relay pairs and starts uploading snapshots
	5.	Each snapshot is:
	•	Saved to public storage
	•	Metadata written to snapshots
	•	Analyzed for egg count → result saved to egg_detections
	6.	Coop’s total_eggs_laid is incremented by newly_detected
	7.	API returns:
	•	Full image_url
	•	egg_count, newly_detected
	•	detected_at, model metadata
	8.	Frontend displays everything via dumb rendering

⸻

✅ Implementation Notes
	•	CoopRelay never constructs URLs, just uploads + sends metadata
	•	CoopMobile never builds URLs — just renders those returned
	•	All tokens are handled using Supabase REST Auth
	•	RLS is enforced from day one
	•	No staging/prod split yet — use one Supabase project until needed
	•	Image review screen (Nest Cam view) is included in MVP and filters only on newly_detected > 0
	•	Log Out button is shown at bottom of settings screen

⸻

🧪 Testing
	•	Manual DB inserts for users, coops, etc. can be done using static UUIDs for auth.uid() simulation
	•	API test suite should verify:
	•	Snapshot upload
	•	Detection creation
	•	Authorization logic (fail if not a coop member)
	•	Public image URL generation
	•	Seed data should include:
	•	2 users, 1 coop, 1 relay, 3 snapshots, 3 egg detections

⸻


Here’s a concise and clear AI Agent Rule Set: Relay Architecture section you can drop into your agent instructions for the Coop 2 project:

⸻

🤖 Agent Rules – Relay Architecture

🎯 Purpose of Relay
	•	The Relay app is a desktop application (Electron) that runs on a user’s local machine.
	•	Its sole purpose is to connect to a local RTSP stream, capture JPEG snapshots at a configured interval, and upload them to the Coop backend for egg detection.
	•	No auth or login is required inside the Relay app.

⸻

🔗 Pairing & Coop Association
	•	Relay pairing is handled using an 8-character code generated by the Relay on startup (pairing_code).
	•	The user enters this code into their CoopMobile Settings screen to bind the Relay to a coop_id.
	•	Once claimed, the backend sets the Relay status to claimed and associates it with the coop.

⸻

🧠 Architectural Principles
	•	Relay does not authenticate via Supabase and never stores user credentials.
	•	Instead, it:
	1.	Calls POST /api/relay/pair → receives relay_id + pairing_code
	2.	Polls GET /api/relay/status?relay_id= until status == claimed
	3.	Pulls snapshot interval config from backend (/api/relay/config)
	4.	Starts uploading snapshots to /api/relay/snapshot

⸻

🖼 Snapshot Behavior
	•	Snapshots are captured using RTSP (via FFmpeg or similar).
	•	Uploads include:
	•	relay_id
	•	timestamp
	•	image (as multipart/form-data or pre-uploaded to Supabase Storage)
	•	Snapshot metadata is stored in the snapshots table
	•	After upload, AI (e.g. GPT-4o) processes the image to count eggs → stored in egg_detections

⸻

🛑 Constraints
	•	Relay must not upload any snapshots until it is successfully paired
	•	Only one Relay per Coop is supported in MVP
	•	If a Relay becomes unpaired (status == inactive), it must stop uploading and show a new pairing code

⸻

💡 Future Considerations (v2+)
	•	Multiple Relays per Coop (optional)
	•	Push pairing code to mobile via QR or auto-detect on LAN
	•	Support for cloud camera APIs (Nest, Arlo, Wyze) via modular adapter layer

⸻

RULES
Great call — setting up clear, consistent code style and formatting rules upfront will make collaboration between agents and humans seamless across the Coop 2 ecosystem (mobile app, relay app, backend). Here’s a descriptive, unified guideline doc you can distribute to all Windsurf agents:

⸻



🧠 Coop 2 Code Style & Formatting Guidelines (Global)

🔧 General Philosophy

Coop 2 is built for clarity, maintainability, and simplicity. We favor convention over configuration, and we strive for a human-friendly, boringly consistent codebase. Code should be easy to read, debug, and extend by any team member or AI agent.

⸻

🧪 Language + Tools Stack

Layer	Stack
Mobile App	React Native + TypeScript + NativeWind
Backend	Supabase (Postgres, RLS, REST)
Relay App	Electron (Node.js + TypeScript)


⸻

🎨 Formatting Rules (Applies Globally)

✅ Use Prettier with These Settings:

{
  "semi": true,
  "singleQuote": true,
  "printWidth": 100,
  "trailingComma": "es5",
  "tabWidth": 2,
  "bracketSpacing": true,
  "arrowParens": "always"
}

✅ Use ESLint for Code Quality:

Each codebase should include .eslintrc.js with base rules:
	•	eslint:recommended
	•	plugin:react/recommended
	•	plugin:@typescript-eslint/recommended
	•	Add prettier as final override to avoid conflicts.

⸻

🧑‍🎨 Styling (React Native / NativeWind)

✅ Design Tokens
	•	Background: #FAF9F6 (eggshell)
	•	Primary: #4CAF50 (green)
	•	Typography: system font stack, no custom fonts for now.
	•	Radius: use rounded-2xl for cards, rounded-md for buttons/inputs.
	•	Shadow: soft shadows (shadow-md or shadow-lg) for primary elements.

✅ Tailwind Rules
	•	Use NativeWind classes for layout and spacing.
	•	Group related styles on one line when under 80 characters.
	•	Don’t inline long class lists. Break across lines for readability.

<View className="bg-white rounded-2xl p-4 shadow-md">
  <Text className="text-base font-medium text-gray-900">Eggs detected</Text>
</View>


⸻

🧼 Code Organization

🗂 Folder Structure (per app)

/src
  /components     # Reusable UI components
  /screens        # Full screen views (React Native)
  /hooks          # Custom hooks
  /lib            # Utility functions, constants, etc.
  /api            # REST API helpers
  /types          # Shared TypeScript types
  /styles         # Tailwind config, global styles

🔄 Component Rules
	•	Function components only.
	•	Type all props explicitly (FC<Props> discouraged — use regular function + interface).
	•	Keep components under 100 LOC when possible. Break up if larger.

⸻

📡 API Rules
	•	REST-first (no Supabase SDKs).
	•	All API requests must include access_token in headers (bearer).
	•	Always validate response shape before use.

const res = await fetch('/api/snapshots', {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});


⸻

📌 Naming Conventions

Item	Style	Example
Variables	camelCase	eggCount, coopId
Types	PascalCase	Snapshot, UserData
Filenames	kebab-case	egg-history.tsx
Folders	kebab-case	image-utils/
Components	PascalCase	EggCard, RelayStatus


⸻

🚫 What to Avoid
	•	Don’t use Supabase JS client in frontend.
	•	Don’t inline complex logic in JSX.
	•	Don’t use any — always prefer strict typing.
	•	Don’t use external CSS files — all styles via Tailwind.
	•	Don’t use async functions in useEffect directly.

⸻

🤖 Agent-Specific Notes
	•	Always validate inputs and outputs.
	•	Document any assumptions in comments.
	•	If unsure, favor readability and ask for human review.
	•	Don’t attempt to be clever; aim to be obvious.

⸻
