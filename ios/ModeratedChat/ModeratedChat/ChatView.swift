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
                await store.fetchMessageHistory()
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
            Text(self.chatMessageEvent.message)
                .listRowBackground(Rectangle().fill(Color.white))
                .fixedSize(horizontal: false, vertical: true)
        } header: {
            Text("\(self.chatMessageEvent.user.username) - \(self.formattedTime)")
                .foregroundColor(.white)
            // TODO: change username color based on user
        }
    }
}
