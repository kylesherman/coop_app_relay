import SwiftUI

struct HomeView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @AppStorage("relay_id") var relayID: String?
    @State private var latestSnapshotUrl: String?
    @State private var isLoadingSnapshot: Bool = false
    @State private var currentSnapshotId: String?
    @State private var pollingTimer: Timer?
    @State private var lastUpdated: Date?
    
    // Placeholder data
    private let eggsToday: Int = 7
    private let deltaSinceLast: Int = 2
    private let lastSnapshotTime: String = "9:45 AM"

    private var currentDateString: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEEE, MMMM d"
        return formatter.string(from: Date())
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.background.ignoresSafeArea() // Eggshell background

                ScrollView {
                    VStack(alignment: .leading, spacing: 25) {
                        // MARK: - Header
                        headerView
                            .padding(.horizontal)

                        // MARK: - Egg Summary Card
                        eggSummaryCard
                            .padding(.horizontal)

                        // MARK: - Snapshot Card
                        snapshotCard // Renamed from snapshotPreview
                            .padding(.horizontal)

                        // MARK: - Quick Actions
                        quickActionsView
                            .padding(.horizontal)
                        
                        Spacer() // Pushes content up if ScrollView has extra space
                    }
                    .padding(.top, 20)
                    .padding(.bottom, 30) // Bottom padding for content before tab bar
                }
            }
            // .navigationTitle("Coop 🥚") // Can be set here or in headerView
            // .navigationBarTitleDisplayMode(.automatic) // Or .large
        }
        .onAppear {
            fetchLatestSnapshot()
            startPollingTimer()
        }
        .onDisappear {
            stopPollingTimer()
        }
    }

    // MARK: - Subviews
    private var headerView: some View {
        VStack(alignment: .leading) {
            Text("Coop 🥚") // Or use .toolbar for a more standard nav bar title
                .font(.system(size: 34, weight: .bold, design: .rounded))
            Text(currentDateString)
                .font(.system(size: 17, weight: .medium, design: .rounded))
                .foregroundColor(.secondary)
        }
    }

    private var eggSummaryCard: some View {
        VStack(alignment: .leading, spacing: 15) {
            HStack {
                Image(systemName: "egg.fill") // Using egg.fill as requested
                    .font(.system(size: 20, weight: .medium, design: .rounded))
                    .foregroundColor(Color(hex: "#4CAF50"))
                Text("Eggs Today")
                    .font(.system(size: 18, weight: .semibold, design: .rounded))
                Spacer()
            }

            Text("\(eggsToday)")
                .font(.system(size: 48, weight: .bold, design: .rounded))
                .padding(.leading, 5)

            HStack(spacing: 15) {
                StatItem(icon: "chart.line.uptrend.xyaxis", value: "+\(deltaSinceLast) eggs", label: "Since last")
                StatItem(icon: "clock.fill", value: lastSnapshotTime, label: "Last snapshot")
            }
        }
        .padding(20)
        .background(Theme.card)
        .cornerRadius(20)
        .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2) // Updated shadow style
    }

    private var snapshotCard: some View {
        VStack(alignment: .leading, spacing: 12) { // Outer card Vstack
            HStack {
                Text("Latest Snapshot")
                    .font(.system(size: 18, weight: .semibold, design: .rounded))
                Spacer()
                Button(action: { 
                    fetchLatestSnapshot()
                }) {
                    HStack(spacing: 4) {
                        if isLoadingSnapshot {
                            ProgressView()
                                .scaleEffect(0.8)
                                .frame(width: 16, height: 16)
                        } else {
                            Image(systemName: "arrow.clockwise")
                                .font(.system(size: 16, weight: .medium, design: .rounded))
                        }
                    }
                    .foregroundColor(Color(hex: "#4CAF50")) // Primary color for icon
                }
                .disabled(isLoadingSnapshot)
            }

            // Display image or placeholder based on snapshot availability
            if let snapshotUrl = latestSnapshotUrl {
                VStack(spacing: 8) {
                    AsyncImage(url: URL(string: snapshotUrl)) { image in
                        image
                            .resizable()
                            .scaledToFill()
                            .frame(height: 180)
                            .clipped()
                            .cornerRadius(12)
                    } placeholder: {
                        ProgressView()
                            .frame(height: 180)
                            .background(Color.gray.opacity(0.05))
                            .cornerRadius(12)
                    }
                    
                    // Last updated timestamp
                    if let lastUpdated = lastUpdated {
                        HStack {
                            Image(systemName: "clock")
                                .font(.system(size: 12))
                                .foregroundColor(.gray)
                            Text("Updated \(timeAgoString(from: lastUpdated))")
                                .font(.system(size: 12, design: .rounded))
                                .foregroundColor(.gray)
                            Spacer()
                        }
                    }
                }
            } else {
                // Show placeholder when no snapshot is available
                VStack {
                    Image(systemName: "photo")
                        .resizable()
                        .scaledToFit()
                        .frame(height: 120)
                        .foregroundColor(.gray.opacity(0.3))
                    Text("No snapshots yet.")
                        .foregroundColor(.gray)
                        .italic()
                }
                .frame(height: 180)
                .background(Color.gray.opacity(0.05))
                .cornerRadius(12)
            }
        }
        .padding(20)
        .background(Theme.card)
        .cornerRadius(20)
        .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
    }

    private var quickActionsView: some View {
        HStack(spacing: 15) {
            QuickActionButton(title: "Force Snapshot", icon: "camera.fill", action: { /* TODO */ })
            QuickActionButton(title: "Test Notification", icon: "bell.fill", action: { /* TODO */ })
        }
    }
    
    // MARK: - API Functions
    private func fetchLatestSnapshot() {
        guard let relayID = relayID,
              let token = authViewModel.accessToken else {
            print("[Snapshot] No relay ID or access token available")
            return
        }
        
        isLoadingSnapshot = true
        let url = URL(string: "https://coop-app-backend.fly.dev/api/relay/snapshots?relay_id=\(relayID)&limit=1")!
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            DispatchQueue.main.async {
                self.isLoadingSnapshot = false
            }
            
            if let error = error {
                print("[Snapshot] Failed to fetch latest snapshot: \(error.localizedDescription)")
                return
            }
            
            guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
                print("[Snapshot] HTTP error: \(response.debugDescription)")
                return
            }
            
            guard let data = data else {
                print("[Snapshot] No data received")
                return
            }
            
            do {
                if let jsonArray = try JSONSerialization.jsonObject(with: data) as? [[String: Any]] {
                    print("[Snapshot] Received \(jsonArray.count) snapshots")
                    
                    if let firstSnapshot = jsonArray.first,
                       let snapshotId = firstSnapshot["id"] as? String,
                       let imagePath = firstSnapshot["image_path"] as? String {
                        
                        // Only update if this is a new snapshot
                        if snapshotId != self.currentSnapshotId {
                            // Construct the full Supabase Storage URL
                            let imageUrl = "https://lhycuglgaripgtqcqyhb.supabase.co/storage/v1/object/public/snapshots/\(imagePath)"
                            DispatchQueue.main.async {
                                self.latestSnapshotUrl = imageUrl
                                self.currentSnapshotId = snapshotId
                                self.lastUpdated = Date()
                                print("[Snapshot] Updated to new snapshot: \(snapshotId)")
                            }
                        } else {
                            print("[Snapshot] No new snapshot available (current: \(snapshotId))")
                        }
                    } else {
                        DispatchQueue.main.async {
                            self.latestSnapshotUrl = nil
                            self.currentSnapshotId = nil
                            print("[Snapshot] No snapshots available")
                        }
                    }
                } else {
                    print("[Snapshot] Failed to parse JSON response")
                }
            } catch {
                print("[Snapshot] JSON parsing error: \(error.localizedDescription)")
            }
        }.resume()
    }
    
    private func startPollingTimer() {
        pollingTimer = Timer.scheduledTimer(withTimeInterval: 300, repeats: true) { _ in
            fetchLatestSnapshot()
        }
    }
    
    private func stopPollingTimer() {
        pollingTimer?.invalidate()
        pollingTimer = nil
    }

    private func timeAgoString(from date: Date) -> String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .full
        return formatter.localizedString(for: date, relativeTo: Date())
    }

}

// MARK: - Helper Components for HomeView
private struct StatItem: View {
    let icon: String
    let value: String
    let label: String

    var body: some View {
        HStack {
            Image(systemName: icon)
                .font(.system(size: 15, design: .rounded))
                .foregroundColor(Color(hex: "#4CAF50"))
                .frame(width: 20) // Align icons
            VStack(alignment: .leading) {
                Text(value)
                    .font(.system(size: 15, weight: .medium, design: .rounded))
                Text(label)
                    .font(.system(size: 13, design: .rounded))
                    .foregroundColor(.gray)
            }
        }
    }
}

private struct QuickActionButton: View {
    let title: String
    let icon: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack {
                Image(systemName: icon)
                Text(title)
            }
            .font(.system(size: 15, weight: .medium, design: .rounded))
            .foregroundColor(.white)
            .padding(.horizontal, 15)
            .padding(.vertical, 10)
            .frame(maxWidth: .infinity)
            .background(Color(hex: "#4CAF50"))
            .clipShape(Capsule())
        }
    }
}

// MARK: - Preview
struct HomeView_Previews: PreviewProvider {
    static var previews: some View {
        HomeView()
            .environmentObject(AuthViewModel()) // If HomeView needs it, for now it doesn't
    }
}
