import Foundation

struct OnboardingStatus: Decodable, Equatable {
    let has_profile: Bool
    let has_coop: Bool
    let username: String?
    let coop_id: String?
    // user_id is in the example response but not in the struct requirement, adding it for completeness if needed later.
    // let user_id: String? 
}
