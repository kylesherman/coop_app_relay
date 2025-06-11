//
//  CoopTrackingAppApp.swift
//  CoopTrackingApp
//
//  Created by Kyle Sherman on 6/8/25.
//

import SwiftUI

@main
struct CoopTrackingAppApp: App {
    @StateObject private var authViewModel = AuthViewModel()
    @State private var isShowingLaunchAnimation: Bool = true
    @AppStorage("preferred_color_scheme") private var preferredColorScheme: String = "system"

    var body: some Scene {
        WindowGroup {
            Group {
                ZStack {
                    if isShowingLaunchAnimation {
                        LaunchScreenView()
                    } else {
                        ContentView()
                            .environmentObject(authViewModel)
                            .onOpenURL { url in // Handle deep links for magic link auth
                                // Ensure your scheme and host match your setup
                                if url.scheme == "coopapp" && url.host == "callback" {
                                    authViewModel.handleDeepLink(url: url)
                                }
                            }
                    }
                }
                .onAppear {
                    // Hide the launch animation after a short delay
                    // This delay ensures the LaunchScreenView gets a render cycle and is visible for a short period.
                    DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { // Increased to 1.5 seconds
                        withAnimation {
                            self.isShowingLaunchAnimation = false
                        }
                    }
                }
            }
            .preferredColorScheme(resolveColorScheme(preferredColorScheme))
        }
    }
    
    func resolveColorScheme(_ preference: String) -> ColorScheme? {
        switch preference {
        case "light": return .light
        case "dark": return .dark
        default: return nil // follow system
        }
    }
}
