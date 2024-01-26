import Foundation

class MessageStore: ObservableObject {
    let momentoClients = MomentoClients.shared
    let translationApi = TranslationApi.shared
    
    @Published var chatMessageEvents: [ChatMessageEvent] = []
    
    @MainActor
    func fetchMessageHistory() async {
        self.chatMessageEvents = await translationApi.getLatestChats()
    }
    
    @MainActor
    func receiveMessages() async {
        while (true) {
            while (momentoClients.subscription == nil) {
                print("Waiting for non-nil subscription")
            }
            if let nonNilSubscription = momentoClients.subscription {
                for try await item in nonNilSubscription.stream {
                    switch item {
                    case .itemText(let textItem):
                        print("Subscriber recieved text message: \(textItem.value)")
                        let response: ChatMessageEvent = try! JSONDecoder().decode(ChatMessageEvent.self, from: textItem.value.data(using: .utf8)!)
                        chatMessageEvents.append(response)
                    case .itemBinary(let binaryItem):
                        let value = String(decoding: binaryItem.value, as: UTF8.self)
                        print("Subscriber unexpectedly recieved binary message: \(value)")
                    case .error(let err):
                        print("Subscriber received error: \(err)")
                    }
                }
            }
        }
    }
}
