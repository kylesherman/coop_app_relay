import Foundation

// MARK: - Request Body
struct ProfileRequestBody: Encodable {
    let first_name: String
    let last_name: String
    let username: String
}

// MARK: - Success Response (200 or 201)
struct ProfileSuccessResponse: Decodable {
    let message: String
}

// MARK: - Error Response (e.g., 409 Conflict or other API errors)
struct APIErrorDetail: Decodable {
    let error: String
    let message: String?
}
