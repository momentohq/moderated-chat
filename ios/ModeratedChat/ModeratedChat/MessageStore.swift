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
                    case .itemText(_):
                        // We used to process new events individually, but since we supported
                        // topics sequence page, we're more likely to receive duplicate messages
                        // when switching between languages very soon after sending new messages,
                        // probably because the sequence page is still the same.
                        // Let's grab the authoritative list of messages each time we subscribe and
                        // when we get a new item instead.
                        self.chatMessageEvents = await translationApi.getLatestChats()
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
