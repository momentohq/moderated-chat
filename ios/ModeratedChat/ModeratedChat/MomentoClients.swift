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
        
        let response = await self.topicClient?.subscribe(cacheName: self.cacheName, topicName: "chat-en")
        switch response {
        case .subscription(let sub):
            self.subscription = sub
        case .error(let err):
            fatalError("Unable to subscribe to Momento chat topic: \(err)")
        default:
            fatalError("Unable to subscribe to Momento chat topic")
        }
    }
    
    func publishMessage(message: String) async {
        // TODO: source language shouldn't be hardcoded
        let formattedMessage = PostMessageEvent(
            messageType: MessageType.text.rawValue,
            message: message,
            sourceLanguage: "en",
            timestamp: Int(Date.now.timeIntervalSince1970 * 1000)
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
