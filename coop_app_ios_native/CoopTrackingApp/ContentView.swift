import SwiftUI

struct ContentView: View {
    @EnvironmentObject var viewModel: AuthViewModel

    @ViewBuilder
    var body: some View {
        if viewModel.isLoadingAuthState || viewModel.isLoadingOnboardingStatus {
            LaunchScreenView()
        } else if !viewModel.isAuthenticated {
            SignInView()
        } else if let status = viewModel.onboardingStatus {
            if !status.has_profile {
                ProfileSetupView { first, last, username in
                    viewModel.submitProfile(firstName: first, lastName: last, username: username)
                }
            } else if !status.has_coop {
                CoopSetupView { mode, value in
                    viewModel.submitCoopSetup(mode: mode, value: value)
                }
            } else {
                MainTabView()
            }
        } else {
            VStack(spacing: 12) {
                ProgressView()
                Text("Checking your account status...")
                    .font(.footnote)
                    .foregroundColor(.gray)
            }
            .onAppear {
                viewModel.fetchOnboardingStatus()
            }
        }
    }
}
