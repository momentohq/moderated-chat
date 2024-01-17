import Foundation

struct User: Identifiable {
    let id = UUID()
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
