import SwiftUI
import Momento

struct ChatView: View {
    @State private var input: String = ""
    @EnvironmentObject var translationApi: TranslationApi
    
    @State var topicClient: TopicClient? = nil
    @State var cacheClient: CacheClient? = nil
    @State var subscription: TopicSubscription? = nil
    private let cacheName = "moderator"
    
    @State var chatMessageEvents: [ChatMessageEvent] = [
        ChatMessageEvent(
            user: User(username: "Mo"),
            messageType: .text,
            message: "Hello World how is it going what's up dog how are you doing",
            sourceLanguage: "English",
            timestamp: Date.now
        ),
        ChatMessageEvent(
            user: User(username: "Mo"),
            messageType: .text,
            message: "Momento Topics",
            sourceLanguage: "English",
            timestamp: Date.now
        ),
        ChatMessageEvent(
            user: User(username: "Mo"),
            messageType: .text,
            message: "Momento Cache",
            sourceLanguage: "English",
            timestamp: Date.now
        )
    ]
    
    var body: some View {
        VStack {
            HeaderView(displayLanguage: true)
            Spacer()
            
            List(self.chatMessageEvents) {event in
                ChatItemView(chatMessageEvent: event)
            }
            .scrollContentBackground(.hidden)
            .background(Color(red: 37/225, green: 57/225, blue: 43/225))
            
            HStack {
                TextField("Enter your message here", text: $input)
                    .padding()
                    .frame(alignment: .leading)
                    .border(.secondary)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .onSubmit {
                        print("Received: \(input)")
                        Task {
                            await publishMessage(message: input)
                            input = ""
                        }
                    }
                // TODO: add submit button
                // TODO: add image upload button
            }
        }
        .background(Color(red: 37/225, green: 57/225, blue: 43/225))
//        .task {
//            await messages here probably
//        }
        .onAppear {
            Task {
                await getMomentoClients()
            }
        }
    }
    
    func getMomentoClients() async {
        do {
            let momentoToken: MomentoToken = await translationApi.createToken()
            let creds = try CredentialProvider.fromString(apiKey: momentoToken.token)
            self.topicClient = TopicClient(
                configuration: TopicClientConfigurations.iOS.latest(),
                credentialProvider: creds
            )
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
        let response = await self.topicClient?.publish(
            cacheName: self.cacheName,
            topicName: "chat-publish",
            value: message
        )
        switch (response) {
        case .success(_):
            print("Successfully published message")
        case .error(let err):
            if err.errorCode == MomentoErrorCode.AUTHENTICATION_ERROR {
                print("token has expired, refreshing subscription and retrying publish")
                // clear subscription
                await getMomentoClients()
                await publishMessage(message: message)
            } else {
                print("Unable to publish: \(err)")
            }
        default:
            print("Unable to publish message")
        }
    }
}

struct ChatItemView: View {
    let chatMessageEvent: ChatMessageEvent
    var body: some View {
        Section {
            Text(self.chatMessageEvent.message)
                .listRowBackground(Rectangle().fill(Color.white))
                .fixedSize(horizontal: false, vertical: true)
        } header: {
            Text("\(self.chatMessageEvent.user.username) - \(self.chatMessageEvent.timestamp.formatted(date: .abbreviated, time: .shortened))")
                .foregroundColor(.white)
            // TODO: change username color based on user
        }
    }
}

//#Preview {
//    ChatView()
//}
