import SwiftUI

struct LaunchScreenView: View {
    var body: some View {
        ZStack {
            Theme.background.ignoresSafeArea()

            VStack {
                Spacer()
                Text("🥚")
                    .font(.system(size: 120)) // Large emoji
                    .padding(.bottom, 20)
                
                Text("Coop")
                    .font(.system(size: 55, weight: .bold, design: .default)) // SF Pro Rounded
                    .foregroundColor(.primary.opacity(0.8))
                
                Spacer()
                Spacer() // Add more space at the bottom to push content up a bit more
            }
        }
    }
}

#Preview {
    LaunchScreenView()
}
