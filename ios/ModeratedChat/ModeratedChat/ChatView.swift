import SwiftUI

struct ChatView: View {
    @State private var input: String = ""
//    var publishEvent: PostMessageEvent
    
    var chatMessageEvents: [ChatMessageEvent] = [
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
                    }
                // TODO: add submit button
                // TODO: add image upload button
            }
        }
        .background(Color(red: 37/225, green: 57/225, blue: 43/225))
    }
}

struct ChatItemView: View {
    let chatMessageEvent: ChatMessageEvent
    var body: some View {
        Section {
            Text(self.chatMessageEvent.message)
                .listRowBackground(Rectangle().fill(Color.white).padding(2))
                .fixedSize(horizontal: false, vertical: true)
        } header: {
            Text("\(self.chatMessageEvent.user.username) - \(self.chatMessageEvent.timestamp.formatted(date: .abbreviated, time: .shortened))")
                .foregroundColor(.white)
            // TODO: change username color based on user
        }
    }
}

#Preview {
    ChatView()
}
