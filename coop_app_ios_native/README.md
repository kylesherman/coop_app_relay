# Coop App - iOS Native (SwiftUI)

This is the iOS application for Coop 2, designed to help track egg production using camera snapshots and AI.

## ⚙️ Setup & Configuration

To run this project, you need to configure your Supabase credentials.

1.  **Supabase Account**: Ensure you have a Supabase project set up.
2.  **Create `Info.plist` Entries**:
    You need to add your Supabase URL and Anon Key to the project's `Info.plist` file. This is a common way to store configuration that shouldn't be hardcoded directly into source files that are committed to version control (though for true secrets, environment variables or a build phase script that generates a config file are better).

    *   Open your Xcode project.
    *   Select your project in the Project Navigator.
    *   Select your app target.
    *   Go to the "Info" tab.
    *   Under "Custom iOS Target Properties" (or just "Custom Target Properties"), add two new rows:
        *   **Key**: `SUPABASE_URL`
            *   **Type**: `String`
            *   **Value**: `YOUR_SUPABASE_URL_HERE` (e.g., `https://your-project-ref.supabase.co`)
        *   **Key**: `SUPABASE_ANON_KEY`
            *   **Type**: `String`
            *   **Value**: `YOUR_SUPABASE_ANON_KEY_HERE` (This is the public anonymous key)

    Replace `YOUR_SUPABASE_URL_HERE` and `YOUR_SUPABASE_ANON_KEY_HERE` with your actual Supabase project URL and public anonymous key, which can be found in your Supabase project's API settings.

3.  **Deep Link / URL Scheme Configuration**:
    For the magic link callback to work, you need to register a URL scheme for the app.
    *   In Xcode, go to your Target's "Info" tab.
    *   Expand "URL Types" (if it's not there, click "+" to add it).
    *   Click "+" under "URL Types" to add a new one.
    *   **Identifier**: `com.yourbundleid.coopapp` (or your app's bundle ID)
    *   **URL Schemes**: `coopapp`
    *   This will allow the app to open when a URL like `coopapp://callback?...` is triggered.

## 🚀 Running the App

1.  Open `YourProjectName.xcodeproj` (or `YourProjectName.xcworkspace` if you add dependencies like CocoaPods later) in Xcode.
2.  Select a simulator or a connected device.
3.  Click the "Run" button (or `Cmd+R`).

## ✨ Features (MVP)

*   Email Sign-In with Supabase Magic Link
*   Deep Link Handling for Authentication
*   User Onboarding (Name, Coop Creation/Joining)
*   Home Screen (Egg Count, Snapshot Preview)
*   Nest Cam Gallery
*   Settings

## 🧪 Testing

*   Builds target iOS 17+.
*   Magic link flow should be tested via email and deep linking.
*   SwiftUI Previews are used for component development.

## 🔑 Token Storage

Currently uses `UserDefaults` for storing authentication tokens for simplicity during initial scaffolding. **For a production app, these should be stored in the Keychain for better security.** The `TokenManager.swift` file includes commented-out placeholders for a Keychain implementation.
