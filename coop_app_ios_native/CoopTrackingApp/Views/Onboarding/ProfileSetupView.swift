import SwiftUI

struct ProfileSetupView: View {
    // MARK: - Environment
    @EnvironmentObject var authViewModel: AuthViewModel // Added

    // MARK: - State Variables
    @State private var firstName: String = ""
    @State private var lastName: String = ""
    @State private var username: String = ""
    
    // Error Handling State (New)
    @State private var showErrorBanner: Bool = false
    @Namespace private var errorBannerNamespace

    // Removed: @Binding var usernameError: String? 

    // MARK: - Focus State
    enum Field: Hashable {
        case firstName, lastName, username
    }
    @FocusState private var focusedField: Field?

    // MARK: - Callback
    var onContinue: (String, String, String) -> Void

    // MARK: - Computed Properties
    private var isFormValidAndNoError: Bool { // Updated
        !firstName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
        !lastName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
        !username.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
        authViewModel.profileSetupError == nil // Check for ViewModel error
    }

    // MARK: - Body
    var body: some View {
        ZStack(alignment: .top) { // Added alignment for error banner
            // Background Color
            Theme.background.ignoresSafeArea()

            VStack(spacing: 20) {
                // Error Banner (New)
                if let error = authViewModel.profileSetupError, showErrorBanner {
                    errorBannerView(for: error)
                }
                
                Spacer() // Push content down

                Text("🐣")
                    .font(.system(size: 80))
                    .padding(.bottom, 10)

                Text("Who's roosting here?")
                    .font(.system(size: 28, weight: .bold, design: .rounded))
                    .multilineTextAlignment(.center)
                    .padding(.bottom, 30)

                VStack(spacing: 15) {
                    LabeledTextField(label: "First Name", text: $firstName, field: .firstName, focusedField: $focusedField)
                    LabeledTextField(label: "Last Name", text: $lastName, field: .lastName, focusedField: $focusedField)
                    LabeledTextField(label: "Username", text: $username, field: .username, focusedField: $focusedField, isLastField: true)
                        .onChange(of: username) {
            if authViewModel.profileSetupError != nil {
                authViewModel.clearProfileSetupError()
            }

                        }
                    // Removed inline username error Text
                }
                .padding(.horizontal)

                Spacer(minLength: 150)

                Button(action: {
                    if isFormValidAndNoError { // Updated condition
                        onContinue(firstName, lastName, username)
                    }
                }) {
                    Text("Continue")
                        .font(.system(size: 18, weight: .semibold, design: .rounded))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(isFormValidAndNoError ? Color(hex: "#4CAF50") : Color.gray.opacity(0.5)) // Updated condition
                        .cornerRadius(12)
                }
                .disabled(!isFormValidAndNoError) // Updated condition
                .padding(.horizontal)
                .padding(.bottom, 30)
            }
            .padding(.top, (authViewModel.profileSetupError != nil && showErrorBanner) ? 10 : 20) // Dynamic top padding
        }
        .toolbar {
            ToolbarItemGroup(placement: .keyboard) {
                Spacer()
                Button("Done") {
                    focusedField = nil
                }
            }
        }
        .onReceive(authViewModel.$profileSetupError) { errorMessage in // New
            if errorMessage != nil {
                withAnimation(.spring()) {
                    showErrorBanner = true
                }
            } else {
                withAnimation(.spring()) {
                    showErrorBanner = false
                }
            }
        }
        .preferredColorScheme(.light) // Enforce light mode
        .onTapGesture { // Dismiss keyboard when tapping outside
            focusedField = nil
        }
    }

    // MARK: - Helper Error Banner View (New)
    @ViewBuilder
    private func errorBannerView(for errorText: String) -> some View {
        HStack(spacing: 10) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundColor(.red)
                .font(.system(size: 18))
            Text(errorText)
                .font(.system(size: 15, weight: .medium, design: .rounded))
                .foregroundColor(Color.red.opacity(0.9))
                .multilineTextAlignment(.leading)
                .lineLimit(nil)
            Spacer()
        }
        .padding(EdgeInsets(top: 12, leading: 15, bottom: 12, trailing: 15))
        .background(Color.red.opacity(0.12))
        .cornerRadius(10)
        .padding(.horizontal, 32) 
        .matchedGeometryEffect(id: "profileErrorBanner", in: errorBannerNamespace) // Unique ID
        .transition(.move(edge: .top).combined(with: .opacity))
    }
}

// MARK: - Helper LabeledTextField View (ensure ProfileSetupView.Field is accessible)
struct LabeledTextField: View {
    let label: String
    @Binding var text: String
    let field: ProfileSetupView.Field // Ensure ProfileSetupView.Field is accessible
    @FocusState.Binding var focusedField: ProfileSetupView.Field?
    var isLastField: Bool = false

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            Text(label)
                .font(.system(size: 14, weight: .medium, design: .rounded))
                .foregroundColor(.gray)
            
            TextField("Enter your \(label.lowercased())", text: $text)
                .font(.system(size: 16, design: .rounded))
                .padding(12)
                .background(Color.white)
                .cornerRadius(8)
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(focusedField == field ? Color(hex: "#4CAF50").opacity(0.7) : Color.gray.opacity(0.3), lineWidth: 1)
                )
                .focused($focusedField, equals: field)
                .submitLabel(isLastField ? .done : .next)
                .onSubmit {
                    if isLastField {
                        focusedField = nil
                    } else {
                        switch field {
                        case .firstName: focusedField = .lastName
                        case .lastName: focusedField = .username
                        default: break
                        }
                    }
                }
        }
    }
}

// MARK: - Preview
struct ProfileSetupView_Previews: PreviewProvider {
    static var previews: some View {
        // Mock AuthViewModel for preview
        let authViewModel = AuthViewModel()
        // Example of setting an error for preview:
        // authViewModel.profileSetupError = "Username 'testuser' is already taken."
        
        // Example of no error:
        // authViewModel.profileSetupError = nil

        return NavigationView {
            ProfileSetupView { _,_,_ in 
                print("Continue Tapped")
            }
            .environmentObject(authViewModel) // Provide AuthViewModel
        }
    }
}

// Dummy Color extension if not globally available
/*
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:(a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(.sRGB, red: Double(r) / 255, green: Double(g) / 255, blue: Double(b) / 255, opacity: Double(a) / 255)
    }
}
*/
