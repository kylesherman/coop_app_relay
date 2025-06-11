import SwiftUI
import Combine

struct CoopSetupView: View {
    // MARK: - Enums
    enum SetupMode: String, CaseIterable, Identifiable {
        case create = "Create New Coop"
        case join = "Join a Flock"
        var id: String { self.rawValue }
    }

    private enum FocusableField: Hashable {
        case coopName, inviteCode
    }

    // MARK: - State Variables
    @State private var selectedMode: SetupMode = .create
    @State private var coopName: String = ""
    @State private var inviteCode: String = ""
    @FocusState private var focusedField: FocusableField?

    // MARK: - Callback
    var onContinue: (_ mode: String, _ value: String) -> Void

    // MARK: - Environment & Error Handling
    @EnvironmentObject var authViewModel: AuthViewModel
    @State private var showErrorBanner: Bool = false
    @Namespace private var errorBannerNamespace
    // @Namespace private var formElementNamespace // For matchedGeometryEffect on picker/inputs if restored

    // MARK: - Computed Properties
    private var isInputValid: Bool {
        switch selectedMode {
        case .create:
            return !coopName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        case .join:
            return !inviteCode.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        }
    }

    private var buttonText: String {
        // Assuming this was the intended button text, adjust if needed.
        return "Let’s Hatch This Thing 🐣"
    }
    
    private var shouldHighlightCoopName: Bool {
        if let err = authViewModel.coopSetupError, selectedMode == .create {
            // Ensure your error messages are consistent for this check
            return err.localizedCaseInsensitiveContains("coop name") || err.localizedCaseInsensitiveContains("name for your coop")
        }
        return false
    }

    private var shouldHighlightInviteCode: Bool {
        if let err = authViewModel.coopSetupError, selectedMode == .join {
            // Ensure your error messages are consistent for this check
            return err.localizedCaseInsensitiveContains("invite code") || err.localizedCaseInsensitiveContains("code to join")
        }
        return false
    }

    // MARK: - Body
    var body: some View {
        ZStack(alignment: .top) {
            Theme.background.ignoresSafeArea()

            VStack(spacing: 20) { // Adjusted spacing slightly for overall balance
                // Error Banner
                // Only show banner if there's an error AND showErrorBanner is true
                if let error = authViewModel.coopSetupError, showErrorBanner {
                    errorBannerView(for: error)
                        // .animation(.spring(), value: showErrorBanner) // Animation is handled by .onReceive
                }

                Text("Set Up Your Coop")
                    .font(.system(size: 28, weight: .bold, design: .rounded))
                    .padding(.bottom, 5) // Adjusted padding

                Text("Choose how you'd like to get started.")
                    .font(.system(size: 16, weight: .medium, design: .rounded))
                    .foregroundColor(.gray)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 40)
                    .padding(.bottom, 15) // Adjusted padding

                modePickerView()
                
                inputFieldsView()
                    .animation(.easeInOut(duration: 0.2), value: selectedMode)

                Spacer() // Pushes content up, minLength can be adjusted if needed

                actionButton()
            }
            // Add some top padding to the VStack to prevent content from sticking to the error banner or top edge.
            // This padding can be conditional based on whether the error banner is visible.
            .padding(.top, (authViewModel.coopSetupError != nil && showErrorBanner) ? 10 : 30)
            .padding(.bottom, 10) // Ensure some bottom padding
            .toolbar { // Consolidated Toolbar for keyboard
                ToolbarItemGroup(placement: .keyboard) {
                    Spacer()
                    Button("Done") {
                        focusedField = nil
                    }
                }
            }
        }
        .onReceive(authViewModel.$coopSetupError) { errorMessage in
            if errorMessage != nil {
                withAnimation(.spring()) { // Added spring animation
                    showErrorBanner = true
                }
            } else {
                withAnimation(.spring()) { // Added spring animation
                    showErrorBanner = false
                }
            }
        }
        .onTapGesture { // Dismiss keyboard when tapping outside text fields
            focusedField = nil
        }
        .preferredColorScheme(.light)
    }

    // MARK: - Helper Views

    @ViewBuilder
    private func errorBannerView(for errorText: String) -> some View {
        HStack(spacing: 10) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundColor(.red)
                .font(.system(size: 18)) // Matched original size
            Text(errorText)
                .font(.system(size: 15, weight: .medium, design: .rounded)) // Matched original
                .foregroundColor(Color.red.opacity(0.9)) // Slightly adjusted for readability
                .multilineTextAlignment(.leading)
                .lineLimit(nil) // Allow multiple lines
            Spacer()
        }
        .padding(EdgeInsets(top: 12, leading: 15, bottom: 12, trailing: 15)) // Fine-tuned padding
        .background(Color.red.opacity(0.12)) // Matched original
        .cornerRadius(10) // Matched original
        .padding(.horizontal, 32) // Matched original
        .matchedGeometryEffect(id: "errorBanner", in: errorBannerNamespace)
        .transition(.move(edge: .top).combined(with: .opacity)) // Matched original
    }
    
    private func pickerOptionsContent() -> some View {
        ForEach(SetupMode.allCases) { mode in
            Text(mode.rawValue).tag(mode)
        }
    }

    @ViewBuilder
    private func modePickerView() -> some View {
        Picker("Setup Mode", selection: $selectedMode) {
            pickerOptionsContent()
        }
        .pickerStyle(SegmentedPickerStyle())
        .padding(.horizontal, 32) // Matched original
        .padding(.bottom, 20)     // Matched original
        // .matchedGeometryEffect(id: "picker", in: formElementNamespace) // Keep commented for stability
    }

    @ViewBuilder
    private func inputFieldsView() -> some View {
        VStack(spacing: 15) { // Matched original spacing
            if selectedMode == .create {
                TextField("Enter Coop Name", text: $coopName)
                    .font(.system(size: 16, design: .rounded)) // Matched original
                    .padding(12) // Matched original
                    .background(Color.white) // Matched original
                    .cornerRadius(8) // Matched original
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(shouldHighlightCoopName ? Color.red : (focusedField == .coopName ? Color(hex: "#4CAF50").opacity(0.7) : Color.gray.opacity(0.3)), lineWidth: 1.5) // Matched original
                    )
                    .focused($focusedField, equals: .coopName)
                    .submitLabel(.done) // Matched original
                    .onSubmit { focusedField = nil } // Matched original
                    .padding(.horizontal, 40) // Matched original
                    .transition(.asymmetric(insertion: .scale(scale: 0.9).combined(with: .opacity), removal: .scale(scale: 0.9).combined(with: .opacity))) // Matched original
            }

            if selectedMode == .join {
                TextField("Enter Invite Code", text: $inviteCode)
                    .font(.system(size: 16, design: .rounded)) // Matched original
                    .padding(12) // Matched original
                    .background(Color.white) // Matched original
                    .cornerRadius(8) // Matched original
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(shouldHighlightInviteCode ? Color.red : (focusedField == .inviteCode ? Color(hex: "#4CAF50").opacity(0.7) : Color.gray.opacity(0.3)), lineWidth: 1.5) // Matched original
                    )
                    .focused($focusedField, equals: .inviteCode)
                    .submitLabel(.done) // Matched original
                    .onSubmit { focusedField = nil } // Matched original
                    .padding(.horizontal, 40) // Matched original
                    .transition(.asymmetric(insertion: .scale(scale: 0.9).combined(with: .opacity), removal: .scale(scale: 0.9).combined(with: .opacity))) // Matched original
            }
        }
    }

    @ViewBuilder
    private func actionButton() -> some View {
        Button(action: {
            if isInputValid {
                let value = selectedMode == .create ? coopName : inviteCode
                onContinue(selectedMode.rawValue.lowercased().replacingOccurrences(of: " ", with: "_"), value)
            }
        }) {
            Text(buttonText)
                .font(.system(size: 18, weight: .semibold, design: .rounded)) // Matched original
                .foregroundColor(.white) // Matched original
                .frame(maxWidth: .infinity)
                .padding() // Matched original
                .background(isInputValid ? Color(hex: "#4CAF50") : Color.gray.opacity(0.5)) // Matched original
                .cornerRadius(12) // Matched original
        }
        .disabled(!isInputValid) // Matched original
        .padding(.horizontal, 40) // Matched original
        .padding(.bottom, 20) // Adjusted from 30 for better balance with Spacer
    }
}

// MARK: - Preview
struct CoopSetupView_Previews: PreviewProvider {
    static var previews: some View {
        // Mock AuthViewModel for preview
        let authViewModel = AuthViewModel()
        // Example of setting an error for preview
        // authViewModel.coopSetupError = "This is a sample error message for the preview."
        
        return CoopSetupView(onContinue: { mode, value in
            print("Continue tapped. Mode: \(mode), Value: \(value)")
        })
        .environmentObject(authViewModel)
    }
}

// Ensure your Color(hex:) extension is available globally or defined here if not.
// Example:
// extension Color {
//     init(hex: String) {
//         let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
//         var int: UInt64 = 0
//         Scanner(string: hex).scanHexInt64(&int)
//         let a, r, g, b: UInt64
//         switch hex.count {
//         case 3: // RGB (12-bit)
//             (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
//         case 6: // RGB (24-bit)
//             (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
//         case 8: // ARGB (32-bit)
//             (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
//         default:
//             (a, r, g, b) = (255, 0, 0, 0)
//         }
//         self.init(
//             .sRGB,
//             red: Double(r) / 255,
//             green: Double(g) / 255,
//             blue: Double(b) / 255,
//             opacity: Double(a) / 255
//         )
//     }
// }
