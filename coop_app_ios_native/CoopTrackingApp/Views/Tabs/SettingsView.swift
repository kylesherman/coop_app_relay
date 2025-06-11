import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var authViewModel: AuthViewModel // Added for logout
    // Color Scheme Preference
    @AppStorage("preferred_color_scheme") private var preferredColorScheme: String = "system"
    // Relay Management
    @State private var pairingCode: String = ""
    @State private var isPairing: Bool = false
    @State private var pairingMessage: String? = nil
    @State private var pairingSuccess: Bool = false
    @State private var showUnlinkAlert = false
    @State private var showPairingAlert = false
    // RTSP Link
    @State private var rtspURL: String = ""
    // Snapshot Interval
    @State private var snapshotIntervals = ["5 min", "10 min", "15 min", "30 min"]
    @State private var selectedInterval = 0
    // Relay ID (persisted after pairing)
    @AppStorage("relay_id") var relayID: String?
    @State private var relayStatus: String? = nil
    @State private var relaySummaryRTSP: String = ""
    @State private var relaySummaryInterval: String = ""

    // Config Update Alert State
    @State private var showConfigAlert = false
    @State private var configMessage: String = ""
    @State private var configSuccess: Bool = false

    // Notifications
    @State private var pushEnabled = true
    @State private var notificationFrequencies = ["real-time", "daily summary", "off"]
    @State private var selectedFrequency = 0
    
    // Coop Info (from /api/coop/info endpoint)
    @AppStorage("my_username") var myUsername: String = ""
    @AppStorage("coop_name") var coopName: String = ""
    @AppStorage("invite_code") var inviteCode: String = ""
    @AppStorage("raw_coop_members") var rawCoopMembers: String = ""
    @State private var coopMembers: [String] = []
    
    // System Info
    @State private var backendSynced = true
    let relayIP = "192.168.1.100"
    @State private var showDiagnostics = false

    var body: some View {
        NavigationView {
            ScrollView {
                Group {
                    VStack(spacing: 20) {
                    // Your Coop
                    SettingsSectionCard(title: "Your Coop") {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Username: \(myUsername)")
                                .font(.custom("SF Pro Rounded", size: 17))
                            Text("Coop Name: \(coopName)")
                                .font(.custom("SF Pro Rounded", size: 17))
                            Text("Members:")
                                .font(.custom("SF Pro Rounded", size: 16).weight(.semibold))
                            ForEach(coopMembers, id: \.self) { member in
                                Text(member)
                                    .font(.custom("SF Pro Rounded", size: 16))
                                    .foregroundColor(.gray)
                            }
                            HStack {
                                Text("Invite Code: \(inviteCode)")
                                    .font(.custom("SF Pro Rounded", size: 17))
                                Spacer()
                                Button(action: {
                                    UIPasteboard.general.string = inviteCode
                                }) {
                                    Image(systemName: "doc.on.doc")
                                        .foregroundColor(.blue)
                                }
                            }
                        }
                    }
                    
                    // Mood Lighting
                    SettingsSectionCard(title: "Mood Lighting 🌤️") {
                        Picker("Appearance", selection: $preferredColorScheme) {
                            Text("System").tag("system")
                            Text("Light").tag("light")
                            Text("Dark").tag("dark")
                        }
                        .pickerStyle(SegmentedPickerStyle())
                        .padding(.top, 4)
                    }
                    
                    // Notifications
                    SettingsSectionCard(title: "Notifications") {
                        Toggle(isOn: $pushEnabled) {
                            Label("Push Notifications Enabled", systemImage: "bell.fill")
                        }
                        .font(.custom("SF Pro Rounded", size: 18))
                        Picker("Frequency", selection: $selectedFrequency) {
                            ForEach(0..<notificationFrequencies.count, id: \.self) { idx in
                                Text(notificationFrequencies[idx]).tag(idx)
                            }
                        }
                        .pickerStyle(SegmentedPickerStyle())
                        Button(action: { /* Send test notification */ }) {
                            Label("Send Test Notification", systemImage: "bell.badge.fill")
                                .font(.custom("SF Pro Rounded", size: 17).weight(.semibold))
                                .frame(maxWidth: .infinity, minHeight: 44)
                        }
                        .background(Color.blue.opacity(0.15))
                        .foregroundColor(.blue)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                    
                    // Relay Management
                    SettingsSectionCard(title: "Relay Management") {
                        if let relayID = relayID, relayStatus == "claimed" {
                            // Show relay status information
                            VStack(alignment: .leading, spacing: 6) {
                                Text("Relay ID: \(relayID)").font(.custom("SF Pro Rounded", size: 17))
                                
                                Button(action: { showUnlinkAlert = true }) {
                                    Label("Unlink Relay", systemImage: "xmark.circle.fill")
                                        .font(.custom("SF Pro Rounded", size: 17).weight(.semibold))
                                        .frame(maxWidth: .infinity, minHeight: 44)
                                }
                                .background(Color.red.opacity(0.15))
                                .foregroundColor(.red)
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                                .padding(.top, 8)
                                .alert(isPresented: $showUnlinkAlert) {
                                    Alert(title: Text("Unlink Relay?"), message: Text("Are you sure you want to unlink this relay?"), primaryButton: .destructive(Text("Unlink")), secondaryButton: .cancel())
                                }
                            }
                        } else {
                            // Show pairing interface
                            VStack(alignment: .leading, spacing: 12) {
                                TextField("8-digit Pairing Code", text: $pairingCode)
                                    .textFieldStyle(RoundedBorderTextFieldStyle())
                                    .keyboardType(.asciiCapable)
                                    .font(.custom("SF Pro Rounded", size: 18))
                                    .autocapitalization(.allCharacters)
                                
                                Button(action: {
                                    print("[Relay] Pair Relay button tapped")
                                    pairRelay()
                                }) {
                                    Label(isPairing ? "Pairing..." : "Pair Relay", systemImage: isPairing ? "arrow.2.circlepath" : "link.circle.fill")
                                        .font(.custom("SF Pro Rounded", size: 17).weight(.semibold))
                                        .frame(maxWidth: .infinity, minHeight: 44)
                                }
                                .background(Color.blue.opacity(0.15))
                                .foregroundColor(.blue)
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                                .disabled(isPairing || pairingCode.count != 8 || !pairingCode.allSatisfy({ $0.isNumber }))
                                .opacity((pairingCode.count == 8 && pairingCode.allSatisfy({ $0.isNumber })) ? 1.0 : 0.5)
                                .alert(isPresented: $showPairingAlert) {
                                    Alert(
                                        title: Text(pairingSuccess ? "Success" : "Error"),
                                        message: Text(pairingMessage ?? ""),
                                        dismissButton: .default(Text("OK"), action: {
                                            if pairingSuccess {
                                                pairingCode = ""
                                            }
                                            pairingSuccess = false
                                            pairingMessage = nil
                                        })
                                    )
                                }
                            }
                        }
                    }
                    
                    // RTSP Link
                    SettingsSectionCard(title: "RTSP Link") {
                        TextField("rtsp://camera/stream", text: $rtspURL)
                            .textFieldStyle(RoundedBorderTextFieldStyle())
                            .keyboardType(.URL)
                            .autocapitalization(.none)
                            .font(.custom("SF Pro Rounded", size: 17))
                    }
                    // Snapshot Interval
                    SettingsSectionCard(title: "Snapshot Interval") {
                        Picker("Snapshot Interval", selection: $selectedInterval) {
                            ForEach(0..<snapshotIntervals.count, id: \.self) { idx in
                                Text(snapshotIntervals[idx]).tag(idx)
                            }
                        }
                        .pickerStyle(SegmentedPickerStyle())
                    }
                    Button(action: {
                        log("Save Config button tapped")
                        relayConfigUpdate()
                    }) {
                        Label("Save Config", systemImage: "arrow.down.circle.fill")
                            .font(.custom("SF Pro Rounded", size: 17).weight(.semibold))
                            .frame(maxWidth: .infinity, minHeight: 44)
                    }
                    .background(Color.blue.opacity(0.15))
                    .foregroundColor(.blue)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .padding(.top, 4)
                    
                    .alert(isPresented: $showConfigAlert) {
                        Alert(title: Text(configSuccess ? "Config Saved" : "Error"), message: Text(configMessage), dismissButton: .default(Text("OK")))
                    }
                    
                    Button(action: {
                        authViewModel.signOut() // Call signOut on the AuthViewModel
                    }) {
                        Label("Log Out", systemImage: "rectangle.portrait.and.arrow.right")
                            .font(.custom("SF Pro Rounded", size: 17).weight(.semibold))
                            .frame(maxWidth: .infinity, minHeight: 44)
                    }
                    .background(Color.red.opacity(0.15))
                    .foregroundColor(.red)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .padding(.top, 10) // Add some spacing above the button
                    } // Close VStack
                } // Close Group
                .padding(.vertical, 20)
                .padding(.horizontal, 12)
            }
            .refreshable {
                fetchClaimedRelay()
                fetchCoopInfo()
            }
            .background(Theme.background.ignoresSafeArea())
            .navigationTitle("Settings")
        }
        .onAppear {
            log("SettingsView appeared")
            // Set a default status if none exists
            if relayID != nil && relayStatus == nil {
                relayStatus = "claimed" // Assume claimed if we have an ID but no status
            }
            // Restore relay config if we have a relay ID
            if relayID != nil {
                fetchClaimedRelay()
            }
            // Restore coop members from AppStorage if available
            if rawCoopMembers.isEmpty == false && coopMembers.isEmpty {
                coopMembers = rawCoopMembers.split(separator: ",").map { String($0) }
            }
            // Fetch coop info
            fetchCoopInfo()
        }
    }

    private func relayConfigUpdate() {
        log("Preparing to send relay config update")
        guard let token = authViewModel.accessToken else {
            configMessage = "Missing authentication token. Please sign in."
            configSuccess = false
            showConfigAlert = true
            log("No Supabase access token for config update")
            return
        }
        guard let currentRelayID = relayID, !currentRelayID.isEmpty else {
            configMessage = "No relay paired."
            configSuccess = false
            showConfigAlert = true
            log("No relayID for config update")
            return
        }
        let intervalMap = ["5m", "10m", "15m", "30m"]
        let selected = intervalMap[selectedInterval]
        log("relay_id: \(relayID ?? "nil")")
        log("interval: \(selected)")
        log("rtsp_url: \(rtspURL)")
        log("accessToken: \(token.prefix(8))... (truncated)")
        let url = URL(string: "https://coop-app-backend.fly.dev/api/relay/config")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        let body: [String: Any] = [
            "relay_id": currentRelayID,
            "interval": selected,
            "rtsp_url": rtspURL
        ]
        log("Sending POST to /api/relay/config...")
        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        } catch {
            configMessage = "Failed to encode config data."
            configSuccess = false
            showConfigAlert = true
            log("JSON encoding error: \(error.localizedDescription)")
            return
        }
        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                log("Config update failed: \(error.localizedDescription)")
                DispatchQueue.main.async {
                    configMessage = "Network error: \(error.localizedDescription)"
                    configSuccess = false
                    showConfigAlert = true
                }
                return
            }
            guard let httpResponse = response as? HTTPURLResponse else {
                log("No HTTP response")
                DispatchQueue.main.async {
                    configMessage = "No response from server."
                    configSuccess = false
                    showConfigAlert = true
                }
                return
            }
            log("Config update response status: \(httpResponse.statusCode)")
            if let data = data, let responseBody = String(data: data, encoding: .utf8) {
                log("Response body: \(responseBody)")
            }
            DispatchQueue.main.async {
                if (200...299).contains(httpResponse.statusCode) {
                    configMessage = "Relay configuration updated successfully."
                    configSuccess = true
                } else {
                    configMessage = "Failed to update config. (Status: \(httpResponse.statusCode))"
                    configSuccess = false
                }
                showConfigAlert = true
            }
        }.resume()
    }

    // MARK: - Relay Restoration Logic
    private func fetchClaimedRelay() {
        log("Fetching claimed relay for restoration...")
        guard let token = authViewModel.accessToken else {
            log("No access token for relay fetch")
            return
        }
        // Get relay by relay_id instead of coop_id since we have it stored
        guard let currentRelayID = relayID, !currentRelayID.isEmpty else {
            log("No relay_id available for relay fetch")
            return
        }
        let urlString = "https://coop-app-backend.fly.dev/api/relay/config?relay_id=\(currentRelayID)"
        guard let url = URL(string: urlString) else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                log("Relay fetch error: \(error.localizedDescription)")
                return
            }

            guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
                log("Relay fetch failed with non-200 status or no HTTP response.")
                if let httpResponse = response as? HTTPURLResponse {
                    log("Status code: \(httpResponse.statusCode)")
                }
                if let data = data, let responseBody = String(data: data, encoding: .utf8) {
                    log("Response body: \(responseBody)")
                }
                return
            }

            guard let data = data else {
                log("No data received from relay fetch.")
                return
            }
            
            do {
                if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] {
                    // First try to parse the simplified response format from /api/relay/config
                    if let rtsp = json["rtsp_url"] as? String,
                       let interval = json["interval"] as? String {
                        log("Fetched relay config: rtsp=\(rtsp), interval=\(interval)")
                        DispatchQueue.main.async {
                            // Use the existing relayID since we already have it
                            self.relayStatus = "claimed" // Assume claimed since we have a config
                            self.relaySummaryRTSP = rtsp
                            self.relaySummaryInterval = interval
                            self.rtspURL = rtsp // Pre-fill the input field
                            let intervalMap = ["5m": 0, "10m": 1, "15m": 2, "30m": 3]
                            self.selectedInterval = intervalMap[interval] ?? 0 // Pre-select the interval
                        }
                    } 
                    // Fall back to the more detailed format from /api/relay/by_coop if available
                    else if let status = json["status"] as? String,
                            let relay_id = json["relay_id"] as? String,
                            let rtsp = json["rtsp_url"] as? String,
                            let interval = json["interval"] as? String {
                        log("Fetched relay: id=\(relay_id), status=\(status), rtsp=\(rtsp), interval=\(interval)")
                        DispatchQueue.main.async {
                            if status == "claimed" {
                                self.relayID = relay_id
                                self.relayStatus = status
                                self.relaySummaryRTSP = rtsp
                                self.relaySummaryInterval = interval
                                self.rtspURL = rtsp // Pre-fill the input field
                                let intervalMap = ["5m": 0, "10m": 1, "15m": 2, "30m": 3]
                                self.selectedInterval = intervalMap[interval] ?? 0 // Pre-select the interval
                            } else {
                                log("Fetched relay is not in 'claimed' state: \(status)")
                            }
                        }
                    }
                } else {
                    // Print the raw JSON for debugging
                    if let jsonString = String(data: data, encoding: .utf8) {
                        log("Unable to extract rtsp_url and interval fields from response. JSON: \(jsonString)")
                    } else {
                        log("Failed to parse response and couldn't convert data to string.")  
                    }
                }
            } catch {
                log("JSON parsing error during relay fetch: \(error.localizedDescription). Data: \(String(data: data, encoding: .utf8) ?? "Invalid data")")
            }
        }.resume()
    }

    // MARK: - Relay Pairing Logic
    private func log(_ message: String) {
        print("[Relay] \(message)")
    }

    private func pairRelay() {
        // ... existing code ...
        log("Pairing attempt started with code: \(pairingCode)")
        log("About to validate pairing code: \(pairingCode.count) digits")
        if !(pairingCode.count == 8 && pairingCode.allSatisfy({ $0.isNumber })) {
            log("Invalid code — must be 8 digits numeric")
            pairingMessage = "Please enter a valid 8-digit code."
            pairingSuccess = false
            showPairingAlert = true
            log("Returning after invalid code check")
            return
        }
        log("Checking for access token...")
        log("authViewModel.accessToken is: \(authViewModel.accessToken ?? "nil")")
        guard let token = authViewModel.accessToken else {
            log("No Supabase access token found. User is not authenticated.")
            pairingMessage = "You must be signed in to pair a relay."
            pairingSuccess = false
            showPairingAlert = true
            log("Returning after missing token check")
            return
        }
        log("Found access token: \(token.prefix(8))... (truncated)")
        isPairing = true
        let url = URL(string: "https://coop-app-backend.fly.dev/api/relay/claim")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        let body = ["pairing_code": pairingCode]
        log("Sending pairing request to backend...")
        log("Request body: \(body)")
        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        } catch {
            log("Failed to encode JSON: \(error.localizedDescription)")
            return
        }
        log("Reached end of pairRelay() — request about to fire")
        URLSession.shared.dataTask(with: request) { data, response, error in
            // Ensure isPairing is set to false when the task completes
            DispatchQueue.main.async {
                isPairing = false
            }

            // 1. Handle network errors
            if let error = error {
                log("Network error: \(error.localizedDescription)")
                DispatchQueue.main.async {
                    pairingMessage = "Network error: \(error.localizedDescription)"
                    pairingSuccess = false
                    showPairingAlert = true
                }
                return
            }

            // 2. Ensure we have a valid HTTP response
            guard let httpResponse = response as? HTTPURLResponse else {
                log("Invalid response from server.")
                DispatchQueue.main.async {
                    pairingMessage = "Invalid response from server."
                    pairingSuccess = false
                    showPairingAlert = true
                }
                return
            }
            
            log("Pairing response status code: \(httpResponse.statusCode)")

            // 3. Handle different status codes
            switch httpResponse.statusCode {
            case 200:
                // Success case
                if let data = data,
                   let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let id = json["relay_id"] as? String {
                    DispatchQueue.main.async {
                        self.relayID = id
                        log("Relay successfully claimed. Relay ID: \(id) saved to @AppStorage.")
                        pairingMessage = "Relay successfully connected ✅"
                        pairingSuccess = true
                        showPairingAlert = true
                    }
                } else {
                    log("Relay claim successful (HTTP 200), but 'relay_id' missing or invalid in response.")
                    DispatchQueue.main.async {
                        pairingMessage = "Relay connected, but configuration details are missing."
                        pairingSuccess = false
                        showPairingAlert = true
                    }
                }
            case 400:
                log("Pairing failed with 400.")
                DispatchQueue.main.async {
                    pairingMessage = "Invalid pairing code or the code has already been claimed."
                    pairingSuccess = false
                    showPairingAlert = true
                }
            case 404:
                log("Pairing failed with 404 - pairing code not found.")
                DispatchQueue.main.async {
                    pairingMessage = "The pairing code entered does not exist."
                    pairingSuccess = false
                    showPairingAlert = true
                }
            default:
                log("Pairing failed with unexpected status code: \(httpResponse.statusCode)")
                DispatchQueue.main.async {
                    pairingMessage = "An unexpected error occurred (Code: \(httpResponse.statusCode))."
                    pairingSuccess = false
                    showPairingAlert = true
                }
            }
        }.resume()
    }

    // MARK: - Coop Info Fetching
    private func fetchCoopInfo() {
        log("Fetching coop info...")
        guard let token = authViewModel.accessToken else {
            print("[Coop] No access token for coop info fetch")
            return
        }
        
        let url = URL(string: "https://coop-app-backend.fly.dev/api/coop/info")!
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                print("[Coop] Failed to load coop info: \(error.localizedDescription)")
                return
            }
            
            guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
                print("[Coop] Coop info fetch failed with non-200 status")
                if let httpResponse = response as? HTTPURLResponse {
                    print("[Coop] Status code: \(httpResponse.statusCode)")
                }
                return
            }
            
            guard let data = data else {
                print("[Coop] No data received from coop info fetch")
                return
            }
            
            do {
                if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] {
                    log("Coop info response: \(json)")
                    
                    // Extract coop data
                    let coopName = json["name"] as? String ?? ""
                    let inviteCode = json["invite_code"] as? String ?? ""
                    let members = json["members"] as? [[String: Any]] ?? []
                    
                    // Extract usernames from members array
                    let memberUsernames = members.compactMap { $0["username"] as? String }
                    
                    // Find current user's username by matching user_id with JWT
                    var currentUsername = ""
                    if let payload = extractUserIdFromJWT(token: token) {
                        for member in members {
                            if let userId = member["user_id"] as? String,
                               userId == payload {
                                currentUsername = member["username"] as? String ?? ""
                                break
                            }
                        }
                    }
                    
                    DispatchQueue.main.async {
                        self.myUsername = currentUsername
                        self.coopName = coopName
                        self.inviteCode = inviteCode
                        self.rawCoopMembers = memberUsernames.joined(separator: ",")
                        self.coopMembers = memberUsernames
                        log("Updated coop info - Name: \(coopName), Username: \(currentUsername), Members: \(memberUsernames)")
                    }
                } else {
                    print("[Coop] Failed to parse coop info JSON response")
                }
            } catch {
                print("[Coop] JSON parsing error during coop info fetch: \(error.localizedDescription)")
            }
        }.resume()
    }
    
    // Helper function to extract user_id from JWT token
    private func extractUserIdFromJWT(token: String) -> String? {
        let parts = token.components(separatedBy: ".")
        guard parts.count == 3 else { return nil }
        
        let payload = parts[1]
        // Add padding if needed for base64 decoding
        var paddedPayload = payload
        let remainder = paddedPayload.count % 4
        if remainder > 0 {
            paddedPayload += String(repeating: "=", count: 4 - remainder)
        }
        
        guard let data = Data(base64Encoded: paddedPayload),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let sub = json["sub"] as? String else {
            return nil
        }
        
        return sub
    }
}

struct SettingsSectionCard<Content: View>: View {
    let title: String
    let content: () -> Content
    init(title: String, @ViewBuilder content: @escaping () -> Content) {
        self.title = title
        self.content = content
    }
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text(title)
                .font(.system(size: 18, weight: .semibold, design: .rounded)) // Matched HomeView style
            content()
        }
        .padding()
        .background(Theme.card)
        .cornerRadius(18)
        .shadow(color: Color.primary.opacity(0.05), radius: 6, x: 0, y: 2)
    }
}

struct SettingsView_Previews: PreviewProvider {
    static var previews: some View {
        SettingsView()
            .environmentObject(AuthViewModel()) // Add AuthViewModel for preview
    }
}
