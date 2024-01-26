import Foundation
import Momento

class MomentoClients: ObservableObject {
    static let shared = MomentoClients()
    
    let translationApi = TranslationApi.shared
    let cacheName = "moderator"
    let publishTopicName = "chat-publish"
    var subscribeTopicName = "chat-en"
    
    @Published var topicClient: TopicClient? = nil
    @Published var cacheClient: CacheClient? = nil
    @Published var subscription: TopicSubscription? = nil
    
    @MainActor
    func getMomentoClients() async {
        do {
            let momentoToken: MomentoToken = await translationApi.createToken()
            let creds = try CredentialProvider.fromString(apiKey: momentoToken.token)
            self.topicClient?.close()
            self.topicClient = TopicClient(
                configuration: TopicClientConfigurations.iOS.latest(),
                credentialProvider: creds
            )
            // TODO: close cache client?
            self.cacheClient = CacheClient(
                configuration: CacheClientConfigurations.iOS.latest(),
                credentialProvider: creds,
                defaultTtlSeconds: 24*60*60
            )
        } catch {
            fatalError("Unable to establish Momento clients: \(error)")
        }
        await subscribeToTopic()
    }
    
    @MainActor
    func subscribeToTopic() async {
        if let nonNilSubscription = self.subscription {
            nonNilSubscription.unsubscribe()
            self.subscription = nil
            print("Unsubscribed from previous topic")
        }
        if let nonNilTopicClient = self.topicClient {
            print("Subscribing to topic: chat-\(translationApi.selectedLanguageCode)")
            let response = await nonNilTopicClient.subscribe(
                cacheName: self.cacheName,
                topicName: "chat-\(translationApi.selectedLanguageCode)"
            )
            switch response {
            case .subscription(let sub):
                self.subscription = sub
            case .error(let err):
                fatalError("Unable to subscribe to Momento chat topic: \(err)")
            }
        } else {
            fatalError("Unable to subscribe to Momento chat topic, topic client was nil")
        }
    }
    
    func publishMessage(message: String) async {
        let formattedMessage = await PostMessageEvent(
            messageType: MessageType.text.rawValue,
            message: message,
            sourceLanguage: translationApi.selectedLanguageCode,
            timestamp: Int(Date.now.timeIntervalSince1970 * 1000) // milliseconds
        )
        if let nonNilTopicClient = self.topicClient {
            let jsonData = try! JSONEncoder().encode(formattedMessage)
            let jsonString = String(data: jsonData, encoding: .utf8)!
            let response = await nonNilTopicClient.publish(
                cacheName: self.cacheName,
                topicName: "chat-publish",
                value: jsonString
            )
            switch (response) {
            case .success(_):
                print("Successfully published message")
            case .error(let err):
                if err.errorCode == MomentoErrorCode.AUTHENTICATION_ERROR {
                    print("token has expired, refreshing subscription and retrying publish")
                    await getMomentoClients()
                    await publishMessage(message: message)
                } else {
                    print("Unable to publish: \(err)")
                }
            }
        } else {
            print("Unable to publish message, topic client was nil")
        }
    }
}
