import Foundation

// For simplicity, using UserDefaults as requested for initial scaffolding.
// For a production app, Keychain is STRONGLY recommended for storing sensitive tokens.

struct AuthTokens: Codable { // Made Codable for potential future storage as a single object
    let access: String
    let refresh: String
}

class TokenManager {
    static let shared = TokenManager()
    private let accessTokenKey = "coopAppV1AccessToken" // Added V1 to namespace, good practice
    private let refreshTokenKey = "coopAppV1RefreshToken"

    func saveTokens(access: String, refresh: String) {
        UserDefaults.standard.set(access, forKey: accessTokenKey)
        UserDefaults.standard.set(refresh, forKey: refreshTokenKey)
        #if DEBUG
        print("TokenManager: Tokens saved to UserDefaults. Access: \(access.prefix(10))..., Refresh: \(refresh.prefix(10))...")
        #endif
    }

    func getTokens() -> AuthTokens? {
        guard let accessToken = UserDefaults.standard.string(forKey: accessTokenKey),
              let refreshToken = UserDefaults.standard.string(forKey: refreshTokenKey) else {
            #if DEBUG
            print("TokenManager: No tokens found in UserDefaults for keys \(accessTokenKey), \(refreshTokenKey).")
            #endif
            return nil
        }
        #if DEBUG
        print("TokenManager: Tokens retrieved from UserDefaults.")
        #endif
        return AuthTokens(access: accessToken, refresh: refreshToken)
    }

    func clearTokens() {
        UserDefaults.standard.removeObject(forKey: accessTokenKey)
        UserDefaults.standard.removeObject(forKey: refreshTokenKey)
        #if DEBUG
        print("TokenManager: Tokens cleared from UserDefaults.")
        #endif
    }

    // MARK: - Keychain Implementation (Placeholder - Recommended for Production)
    /*
    private let keychainServiceIdentifier = "com.yourbundleid.coopapp.authtokens" // Replace with your app's bundle ID

    func saveTokensKeychain(access: String, refresh: String) {
        saveToKeychain(account: accessTokenKey, value: access)
        saveToKeychain(account: refreshTokenKey, value: refresh)
        print("TokenManager: Tokens saved to Keychain.")
    }

    func getTokensKeychain() -> AuthTokens? {
        guard let accessToken = getFromKeychain(account: accessTokenKey),
              let refreshToken = getFromKeychain(account: refreshTokenKey) else {
            print("TokenManager: No tokens found in Keychain.")
            return nil
        }
        print("TokenManager: Tokens retrieved from Keychain.")
        return AuthTokens(access: accessToken, refresh: refreshToken)
    }

    func clearTokensKeychain() {
        deleteFromKeychain(account: accessTokenKey)
        deleteFromKeychain(account: refreshTokenKey)
        print("TokenManager: Tokens cleared from Keychain.")
    }

    private func saveToKeychain(account: String, value: String) {
        guard let data = value.data(using: .utf8) else {
            print("TokenManager: Failed to encode token string to data for Keychain.")
            return
        }
        
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainServiceIdentifier,
            kSecAttrAccount as String: account,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly // Good default
        ]
        
        // Delete existing item before adding, to prevent errSecDuplicateItem
        SecItemDelete(query as CFDictionary)
        
        let status = SecItemAdd(query as CFDictionary, nil)
        if status != errSecSuccess {
            print("TokenManager: Error saving to Keychain for account \(account). Status: \(status)")
        }
    }

    private func getFromKeychain(account: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainServiceIdentifier,
            kSecAttrAccount as String: account,
            kSecReturnData as String: kCFBooleanTrue!,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        
        var dataTypeRef: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &dataTypeRef)
        
        if status == errSecSuccess {
            if let retrievedData = dataTypeRef as? Data,
               let value = String(data: retrievedData, encoding: .utf8) {
                return value
            } else {
                print("TokenManager: Failed to decode token data from Keychain for account \(account).")
                return nil
            }
        } else if status != errSecItemNotFound {
            // Don't print error if item simply not found, that's an expected case.
            print("TokenManager: Error retrieving from Keychain for account \(account). Status: \(status)")
        }
        return nil
    }

    private func deleteFromKeychain(account: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainServiceIdentifier,
            kSecAttrAccount as String: account
        ]
        
        let status = SecItemDelete(query as CFDictionary)
        if status != errSecSuccess && status != errSecItemNotFound {
            print("TokenManager: Error deleting from Keychain for account \(account). Status: \(status)")
        }
    }
    */
}
