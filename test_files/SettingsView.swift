import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var authViewModel: AuthViewModel

    var body: some View {
        NavigationStack {
            ZStack {
                Color(hex: "#FAF9F6").ignoresSafeArea() // Eggshell background

                VStack(spacing: 20) {
                    // Placeholder for other settings content
                    Text("App Settings")
                        .font(.system(size: 22, weight: .semibold, design: .rounded))
                        .padding(.top, 30)
                    
                    Text("RTSP URL, Snapshot Interval, Push Notifications, etc. will go here.")
                        .font(.system(size: 16, design: .rounded))
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)

                    Spacer() // Pushes the button to the bottom

                    // MARK: - Log Out Button
                    Button(action: {
                        Task {
                            await authViewModel.signOut()
                            // Navigation back to SignInView is handled by ContentView's observation of authViewModel.isAuthenticated
                        }
                    }) {
                        HStack {
                            Image(systemName: "arrow.backward.circle")
                            Text("Log Out")
                        }
                        .font(.system(size: 18, weight: .medium, design: .rounded))
                        .foregroundColor(.white)
                        .padding()
                        .frame(maxWidth: .infinity)
                        .background(Color.red) // Red background for logout
                        .cornerRadius(15) // Consistent with onboarding buttons
                        .shadow(color: Color.red.opacity(0.3), radius: 5, x: 0, y: 3) // Subtle shadow
                    }
                    .padding(.horizontal, 30)
                    .padding(.bottom, 30) // Padding from the bottom edge or tab bar
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.large)
        }
    }
}

struct SettingsView_Previews: PreviewProvider {
    static var previews: some View {
        SettingsView()
            .environmentObject(AuthViewModel()) // Initialize directly for preview
    }
}
