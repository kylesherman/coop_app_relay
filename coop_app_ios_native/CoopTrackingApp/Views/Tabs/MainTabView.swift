import SwiftUI

struct MainTabView: View {
    var body: some View {
        TabView {
            // Tab 1: Home
            HomeView()
                .tabItem {
                    Label("Home", systemImage: "house.fill")
                }
                .tag(0)

            // Tab 2: History (Placeholder)
            PlaceholderTabView(title: "History", icon: "chart.bar.doc.horizontal.fill")
                .tabItem {
                    Label("History", systemImage: "chart.bar.doc.horizontal.fill")
                }
                .tag(1)

            // Tab 3: Nest Cam (Placeholder)
            PlaceholderTabView(title: "Nest Cam", icon: "photo.stack.fill")
                .tabItem {
                    Label("Nest Cam", systemImage: "photo.stack.fill")
                }
                .tag(2)

            // Tab 4: Settings
            SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gearshape.fill")
                }
                .tag(3)
        }
        .accentColor(Color(hex: "#4CAF50")) // Primary color for selected tab icon
    }
}

// Helper view for placeholder tabs
struct PlaceholderTabView: View {
    let title: String
    let icon: String
    
    var body: some View {
        NavigationView {
            ZStack {
                Theme.background.ignoresSafeArea()
                VStack {
                    Image(systemName: icon)
                        .font(.system(size: 50, weight: .light, design: .rounded))
                        .foregroundColor(.gray.opacity(0.5))
                        .padding()
                    Text(title)
                        .font(.system(size: 24, weight: .bold, design: .rounded))
                    Text("Coming Soon")
                        .font(.system(size: 16, design: .rounded))
                        .foregroundColor(.secondary)
                }
            }
            .navigationTitle(title)
        }
    }
}

struct MainTabView_Previews: PreviewProvider {
    static var previews: some View {
        MainTabView()
            .environmentObject(AuthViewModel()) // For HomeView if it needs auth state later
    }
}
