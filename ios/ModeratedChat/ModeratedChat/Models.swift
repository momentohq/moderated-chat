import Foundation

struct User: Identifiable, Codable {
    var id = UUID()
    let username: String
}

enum MessageType {
    case text
    case image
}

struct ChatMessageEvent: Identifiable {
    let id = UUID()
    let user: User
    let messageType: MessageType
    let message: String
    let sourceLanguage: String
    let timestamp: Date
}

struct PostMessageEvent {
    let messageType: MessageType
    let message: String
    let sourceLanguage: String
    let timestamp: Date
}

struct MomentoToken: Decodable {
    let token: String
    let expiresAtEpoch: Date
}

struct Language: Decodable {
    let label: String
    let value: String
}

struct SupportedLanguages: Decodable {
    var supportedLanguages: [Language]
}
