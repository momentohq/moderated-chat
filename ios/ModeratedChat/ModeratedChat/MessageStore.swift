import Foundation
import SwiftUI

class MessageStore: ObservableObject {
    let momentoClients = MomentoClients.shared
    let translationApi = TranslationApi.shared
    
    @Published var chatMessageEvents: [ChatMessageEvent] = []
    
    @MainActor
    func receiveMessages() async {
        while (true) {
            while (momentoClients.subscription == nil) {
                print("Waiting for non-nil subscription")
                try! await Task.sleep(for: .milliseconds(100))
            }
            
            self.chatMessageEvents = await translationApi.getLatestChats()

            if let nonNilSubscription = momentoClients.subscription {
                for try await item in nonNilSubscription.stream {
                    switch item {
                    case .itemText(let textItem):
                        let response: ChatMessageEvent = try! JSONDecoder().decode(ChatMessageEvent.self, from: textItem.value.data(using: .utf8)!)
                        
                        if response.messageType == MessageType.image {
                            if let image = await getImageMessage(message: response.message) {
                                let imageResponse = ChatMessageEvent(
                                    user: response.user,
                                    messageType: response.messageType,
                                    message: image,
                                    sourceLanguage: response.sourceLanguage,
                                    timestamp: response.timestamp
                                )
                                self.chatMessageEvents.append(imageResponse)
                            }
                        } else {
                            self.chatMessageEvents.append(response)
                        }
                    case .itemBinary(let binaryItem):
                        let value = String(decoding: binaryItem.value, as: UTF8.self)
                        print("Subscriber unexpectedly recieved binary message: \(value)")
                    case .error(let err):
                        print("Subscriber received error: \(err)")
                    }
                }
            } else {
                print("Subscription was nil")
            }
        }
    }
    
    @MainActor
    func getImageMessage(message: String) async -> String? {
        if message.contains("image-") {
            // Received a message ID, must fetch message from cache
            if let nonNilCacheClient = momentoClients.cacheClient {
                let getImage = await nonNilCacheClient.get(
                    cacheName: momentoClients.cacheName,
                    key: message
                )
                switch (getImage) {
                case .hit(let hit):
                    return  hit.valueString
                case .miss(_):
                    print("Image ID not found in cache: \(message)")
                case .error(_):
                    print("Error retrieving image from cache using image id \(message)")
                }
            } else {
                print("Unable to fetch image, cache client was nil")
            }
        } else if !message.isEmpty {
            // Received entire image as base64 string
            return message
        } else {
            print("Unknown image message content: \(message)")
        }
        return nil
    }
}
