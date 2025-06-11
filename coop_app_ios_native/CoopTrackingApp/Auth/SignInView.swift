import SwiftUI

struct SignInView: View {
    @EnvironmentObject var authViewModel: AuthViewModel

    var body: some View {
        // Using GeometryReader to help with layout adaptability, especially for keyboard
        GeometryReader { geometry in 
            NavigationView { // Keep NavigationView for potential future title or bar items
                ScrollView { // Use ScrollView to prevent content being pushed off by keyboard
                    VStack(spacing: 20) {
                        
                        Spacer(minLength: geometry.size.height * 0.1) // Pushes content down a bit
                        
                        // App Logo (Egg Emoji)
                        Text("🥚")
                            .font(.system(size: 60)) // Adjust size as needed
                            .padding(.bottom, 5)
                        
                        Text("Coop") // App Title
                            .font(.system(size: 36, weight: .bold, design: .rounded)) // SF Pro Rounded
                            .foregroundColor(Color.primary)
                            .padding(.bottom, 20)

                        Text("Track your flock's egg production effortlessly.")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 40)
                            .padding(.bottom, 25)

                        TextField("Enter your email", text: $authViewModel.email)
                            .keyboardType(.emailAddress)
                            .autocapitalization(.none)
                            .disableAutocorrection(true)
                            .padding()
                            .background(Color(.systemGray6))
                            .cornerRadius(10)
                            .overlay(
                                RoundedRectangle(cornerRadius: 10)
                                    .stroke(authViewModel.email.isEmpty ? Color.gray.opacity(0.3) : Color.accentColor.opacity(0.6) , lineWidth: 1.5)
                            )
                            .padding(.horizontal)
                            .submitLabel(.done) // Improves keyboard behavior

                        if authViewModel.isLoading {
                            ProgressView()
                                .padding()
                                .frame(height: 50) // Maintain consistent height
                        } else {
                            Button(action: {
                                // Dismiss keyboard before action
                                UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
                                authViewModel.sendMagicLink()
                            }) {
                                Text("Send Magic Link")
                                    .fontWeight(.semibold)
                                    .frame(maxWidth: .infinity)
                                    .padding()
                                    .foregroundColor(.white)
                                    .background(Color.accentColor) // Use accent color
                                    .cornerRadius(10)
                            }
                            .padding(.horizontal)
                            .disabled(authViewModel.email.isEmpty || !authViewModel.isValidEmail(authViewModel.email))
                            .frame(height: 50) // Maintain consistent height
                        }

                        // Group messages to ensure only one is shown at a time, or manage layout better
                        if let message = authViewModel.errorMessage ?? authViewModel.infoMessage {
                             Text(message)
                                .foregroundColor(authViewModel.errorMessage != nil ? .red : .green)
                                .font(.caption)
                                .multilineTextAlignment(.center)
                                .padding(.top, 5)
                                .padding(.horizontal)
                        }
                        
                        Spacer() // Pushes the footer text down
                        
                        Text("We'll send a magic link to your email. Click the link to sign in instantly – no password needed.")
                            .font(.footnote)
                            .foregroundColor(.gray)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 20)
                            .padding(.bottom, 20)

                    }
                    .frame(minHeight: geometry.size.height) // Ensure VStack takes at least full screen height
                    .padding()
                }
                .navigationBarHidden(true) // Hide navigation bar for a cleaner sign-in screen
                .onTapGesture {
                    // Dismiss keyboard when tapping outside of TextField
                    UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
                }
            }
            .navigationViewStyle(StackNavigationViewStyle()) // Recommended for new apps
            .accentColor(.blue) // Set a global accent color (e.g., blue or a custom app color)
            .onAppear {
                // Clear messages when view appears or re-appears
                // This might be too aggressive if user comes back to see a success message
                // authViewModel.errorMessage = nil
                // authViewModel.infoMessage = nil 
            }
        }
    }
}

#Preview {
    SignInView()
        .environmentObject(AuthViewModel()) // Ensure AuthViewModel is provided for preview
}
