import SwiftUI
import Momento
import Foundation

struct ChatView: View {
    @State private var input: String = ""
    let momentoClients = MomentoClients.shared
    @StateObject var store = MessageStore()
    
    var body: some View {
        VStack {
            HeaderView(displayLanguage: true)
            Spacer()
            
            List(self.store.chatMessageEvents) {event in
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
                            await momentoClients.publishMessage(message: input)
                            input = ""
                        }
                    }
                // TODO: add submit button
                // TODO: add image upload button
            }
        }
        .background(Color(red: 37/225, green: 57/225, blue: 43/225))
        .onAppear {
            Task {
                await momentoClients.getMomentoClients()
                await store.receiveMessages()
            }
        }
    }
}

struct ChatItemView: View {
    let chatMessageEvent: ChatMessageEvent
    let formattedTime: String
    
    init(chatMessageEvent: ChatMessageEvent) {
        self.chatMessageEvent = chatMessageEvent
        let timestampInSeconds = TimeInterval(chatMessageEvent.timestamp / 1000)
        self.formattedTime = Date(timeIntervalSince1970: timestampInSeconds).formatted(date: .abbreviated, time: .shortened)
    }
    
    var body: some View {
        Section {
            // Translation API currently returns full base64 encoded image
            if chatMessageEvent.messageType == .image {
                Image(uiImage: UIImage(data: Data(base64Encoded: chatMessageEvent.message)!)!)
                    .listRowBackground(Rectangle().fill(Color.white))
                    .fixedSize(horizontal: false, vertical: true)
            } else {
                Text(self.chatMessageEvent.message)
                    .listRowBackground(Rectangle().fill(Color.white))
                    .fixedSize(horizontal: false, vertical: true)
            }
        } header: {
            HStack {
                Text("\(self.chatMessageEvent.user.username)")
                    .foregroundColor(getUsernameColor(username: chatMessageEvent.user.username))
                // TODO: change username color based on user
                Text(" - \(self.formattedTime)")
                    .foregroundColor(.white)
            }
            
        }
    }
}
