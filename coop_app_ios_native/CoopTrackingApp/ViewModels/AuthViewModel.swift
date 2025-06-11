import SwiftUI
import Combine

class AuthViewModel: ObservableObject {
    // MARK: - Published State
    @Published var hasCompletedProfile: Bool = false
    @Published var hasCompletedCoopSetup: Bool = false
    @Published var coopSetupError: String? = nil
    @Published var profileSetupError: String? = nil
    @Published var email: String = ""
    @Published var isLoading: Bool = false
    @Published var errorMessage: String? = nil
    @Published var infoMessage: String? = nil
    @Published var isAuthenticated: Bool = false
    @Published var accessToken: String? = nil
    @Published var refreshToken: String? = nil
    @Published var isLoadingAuthState: Bool = true
    @Published var onboardingStatus: OnboardingStatus? = nil
    @Published var isLoadingOnboardingStatus: Bool = false

    private let tokenManager = TokenManager()

    // MARK: - Init
    init() {
        if let storedTokens = tokenManager.getTokens() {
            self.accessToken = storedTokens.access
            self.refreshToken = storedTokens.refresh
            self.isAuthenticated = true
            print("AuthViewModel initialized. User is authenticated from stored tokens.")
            fetchOnboardingStatus()
        } else {
            print("AuthViewModel initialized. No stored tokens found.")
            self.isLoadingAuthState = false
        }

        if supabaseURL == nil || supabaseAnonKey == nil {
            print("WARNING: Supabase URL or Anon Key is not properly configured.")
        }
    }

    // MARK: - Onboarding Check
    func fetchOnboardingStatus() {
        print("[DEBUG] fetchOnboardingStatus called")

        guard let token = accessToken else {
            DispatchQueue.main.async {
                self.errorMessage = "Session error. Please sign in again."
                self.isLoadingOnboardingStatus = false
                self.isLoadingAuthState = false
            }
            return
        }

        guard let url = URL(string: "https://coop-app-backend.fly.dev/api/onboarding/status") else {
            DispatchQueue.main.async {
                self.errorMessage = "Internal configuration error."
                self.isLoadingOnboardingStatus = false
                self.isLoadingAuthState = false
            }
            return
        }

        self.isLoadingOnboardingStatus = true
        self.errorMessage = nil

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        URLSession.shared.dataTask(with: request) { data, response, error in
            DispatchQueue.main.async {
                self.isLoadingOnboardingStatus = false
            }

            if let error = error {
                DispatchQueue.main.async {
                    self.errorMessage = "Network error: \(error.localizedDescription)"
                    self.isLoadingAuthState = false
                }
                return
            }

            guard let httpResponse = response as? HTTPURLResponse,
                  let responseData = data else {
                DispatchQueue.main.async {
                    self.errorMessage = "Invalid response from server."
                    self.isLoadingAuthState = false
                }
                return
            }

            print("[DEBUG] fetchOnboardingStatus response: \(httpResponse.statusCode)")
            if let body = String(data: responseData, encoding: .utf8) {
                print("[DEBUG] response body: \(body)")
            }

            if httpResponse.statusCode == 200 {
                do {
                    let status = try JSONDecoder().decode(OnboardingStatus.self, from: responseData)
                    DispatchQueue.main.async {
                        self.onboardingStatus = status
                        self.hasCompletedProfile = status.has_profile
                        self.hasCompletedCoopSetup = status.has_coop
                        print("[INFO] Onboarding status: profile=\(status.has_profile), coop=\(status.has_coop)")
                        self.isLoadingAuthState = false
                    }
                } catch {
                    DispatchQueue.main.async {
                        self.errorMessage = "Failed to parse onboarding status: \(error.localizedDescription)"
                        self.isLoadingAuthState = false
                    }
                }
            } else if httpResponse.statusCode == 401 {
                DispatchQueue.main.async {
                    self.errorMessage = "Session expired. Please sign in again."
                    self.isLoadingAuthState = false
                    self.performLocalSignOut()
                }
            } else {
                DispatchQueue.main.async {
                    if let error = try? JSONDecoder().decode(SupabaseError.self, from: responseData) {
                        self.errorMessage = error.message ?? error.error ?? "Server error \(httpResponse.statusCode)"
                    } else {
                        self.errorMessage = "Server error \(httpResponse.statusCode)"
                    }
                    self.isLoadingAuthState = false
                }
            }
        }.resume()
    }

    // MARK: - Profile Submission
    func submitProfile(firstName: String, lastName: String, username: String) {
        print("[DEBUG] submitProfile called with: \(firstName) \(lastName), username: \(username)")

        guard let token = accessToken else {
            self.profileSetupError = "You are not authenticated."
            return
        }

        guard let url = URL(string: "https://coop-app-backend.fly.dev/api/onboarding/profile") else {
            self.profileSetupError = "Invalid backend URL."
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")

        let payload: [String: String] = [
            "first_name": firstName,
            "last_name": lastName,
            "username": username
        ]

        request.httpBody = try? JSONEncoder().encode(payload)

        isLoading = true
        profileSetupError = nil

        URLSession.shared.dataTask(with: request) { data, response, error in
            DispatchQueue.main.async {
                self.isLoading = false
            }

            if let error = error {
                DispatchQueue.main.async {
                    self.profileSetupError = "Network error: \(error.localizedDescription)"
                }
                return
            }

            guard let httpResponse = response as? HTTPURLResponse else {
                DispatchQueue.main.async {
                    self.profileSetupError = "Invalid response from server."
                }
                return
            }

            if httpResponse.statusCode == 201 || httpResponse.statusCode == 200 {
                DispatchQueue.main.async {
                    self.hasCompletedProfile = true
                    self.profileSetupError = nil
                    self.fetchOnboardingStatus()
                }
            } else {
                if let data = data,
                   let responseBody = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let message = responseBody["error"] as? String ?? responseBody["message"] as? String {
                    DispatchQueue.main.async {
                        self.profileSetupError = message
                    }
                } else {
                    DispatchQueue.main.async {
                        self.profileSetupError = "Unknown error (code \(httpResponse.statusCode))"
                    }
                }
            }
        }.resume()
    }

    // MARK: - Coop Submission
    func submitCoopSetup(mode: String, value: String) {
        print("[DEBUG] submitCoopSetup called with mode: \(mode), value: \(value)")

        guard let token = accessToken else {
            self.coopSetupError = "You are not authenticated."
            return
        }

        guard let url = URL(string: "https://coop-app-backend.fly.dev/api/onboarding/coop") else {
            self.coopSetupError = "Invalid backend URL."
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")

        let payload: [String: String] = [
            "mode": mode,
            "value": value
        ]

        request.httpBody = try? JSONEncoder().encode(payload)

        isLoading = true
        coopSetupError = nil

        URLSession.shared.dataTask(with: request) { data, response, error in
            DispatchQueue.main.async {
                self.isLoading = false
            }

            if let error = error {
                DispatchQueue.main.async {
                    self.coopSetupError = "Network error: \(error.localizedDescription)"
                }
                return
            }

            guard let httpResponse = response as? HTTPURLResponse else {
                DispatchQueue.main.async {
                    self.coopSetupError = "Invalid response from server."
                }
                return
            }

            if httpResponse.statusCode == 201 || httpResponse.statusCode == 200 {
                DispatchQueue.main.async {
                    self.hasCompletedCoopSetup = true
                    self.coopSetupError = nil
                    self.fetchOnboardingStatus()
                }
            } else {
                if let data = data,
                   let responseBody = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let message = responseBody["error"] as? String ?? responseBody["message"] as? String {
                    DispatchQueue.main.async {
                        self.coopSetupError = message
                    }
                } else {
                    DispatchQueue.main.async {
                        self.coopSetupError = "Unknown error (code \(httpResponse.statusCode))"
                    }
                }
            }
        }.resume()
    }

    // MARK: - Sign Out
    func signOut() {
        print("[DEBUG] signOut called")

        guard let currentAccessToken = tokenManager.getTokens()?.access,
              let key = supabaseAnonKey,
              let logoutUrl = supabaseURL?.appendingPathComponent("auth/v1/logout")
        else {
            performLocalSignOut()
            return
        }

        var request = URLRequest(url: logoutUrl)
        request.httpMethod = "POST"
        request.setValue("Bearer \(currentAccessToken)", forHTTPHeaderField: "Authorization")
        request.setValue(key, forHTTPHeaderField: "apikey")

        URLSession.shared.dataTask(with: request) { _, _, _ in
            self.performLocalSignOut()
        }.resume()
    }

    private func performLocalSignOut() {
        DispatchQueue.main.async {
            self.tokenManager.clearTokens()
            self.isAuthenticated = false
            self.hasCompletedProfile = false
            self.hasCompletedCoopSetup = false
            self.email = ""
            self.errorMessage = nil
            self.profileSetupError = nil
            self.coopSetupError = nil
            self.infoMessage = nil
            self.onboardingStatus = nil
            print("[DEBUG] Local sign-out complete. State reset.")
        }
    }

    // MARK: - Email & Magic Link
    func sendMagicLink() {
        guard let supabaseAPIUrl = supabaseURL,
              let anonKey = supabaseAnonKey,
              isValidEmail(email)
        else {
            self.errorMessage = "Invalid configuration or email."
            return
        }

        self.isLoading = true
        self.errorMessage = nil
        self.infoMessage = nil

        let magicLinkUrl = supabaseAPIUrl.appendingPathComponent("/auth/v1/magiclink")
        var request = URLRequest(url: magicLinkUrl)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.httpBody = try? JSONEncoder().encode(["email": email])

        URLSession.shared.dataTask(with: request) { data, response, _ in
            DispatchQueue.main.async {
                self.isLoading = false
                if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 {
                    self.infoMessage = "Magic link sent!"
                    self.email = ""
                } else if let data = data,
                          let supabaseError = try? JSONDecoder().decode(SupabaseError.self, from: data) {
                    self.errorMessage = supabaseError.message ?? supabaseError.error_description ?? "Error sending magic link."
                } else {
                    self.errorMessage = "Unexpected error sending magic link."
                }
            }
        }.resume()
    }

    func handleDeepLink(url: URL) {
        guard let fragment = url.fragment else {
            self.errorMessage = "Invalid magic link."
            return
        }

        let params = fragment.split(separator: "&").reduce(into: [String: String]()) { result, param in
            let parts = param.split(separator: "=")
            if parts.count == 2 {
                result[String(parts[0])] = String(parts[1])
            }
        }

        if let access = params["access_token"], let refresh = params["refresh_token"] {
            tokenManager.saveTokens(access: access, refresh: refresh)
            self.accessToken = access
            self.refreshToken = refresh
            self.isAuthenticated = true
            self.fetchOnboardingStatus()
        } else {
            self.errorMessage = "Unable to extract tokens from magic link."
        }
    }

    // MARK: - Helpers
    func clearProfileSetupError() {
        profileSetupError = nil
    }

    func isValidEmail(_ email: String) -> Bool {
        let regex = "^[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,64}$"
        return NSPredicate(format: "SELF MATCHES %@", regex).evaluate(with: email)
    }

    private var supabaseUrlString: String? {
        Bundle.main.object(forInfoDictionaryKey: "SUPABASE_URL") as? String
    }

    private var supabaseAnonKey: String? {
        Bundle.main.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as? String
    }

    private var supabaseURL: URL? {
        guard let urlStr = supabaseUrlString, !urlStr.isEmpty else { return nil }
        return URL(string: urlStr)
    }
}

// MARK: - Supabase Error Model
struct SupabaseError: Codable {
    let message: String?
    let error: String?
    let error_description: String?
    let code: Int?
}
