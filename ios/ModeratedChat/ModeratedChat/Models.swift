import Foundation

struct User: Identifiable, Codable {
    let id: String
    let username: String
}

enum MessageType: String, Codable {
    case text = "text"
    case image = "image"
}

struct ChatMessageEvent: Identifiable, Decodable {
    let id = UUID()
    let user: User
    let messageType: MessageType
    let message: String
    let sourceLanguage: String
    let timestamp: Int
}

struct PostMessageEvent: Codable {
    let messageType: String
    let message: String
    let sourceLanguage: String
    let timestamp: Int
}

struct MomentoToken: Decodable {
    let token: String
    let expiresAtEpoch: Int
}

struct Language: Decodable {
    let label: String
    let value: String
}

struct SupportedLanguages: Decodable {
    var supportedLanguages: [Language]
}

struct MessageHistory: Decodable {
    var messages: [ChatMessageEvent]
}
