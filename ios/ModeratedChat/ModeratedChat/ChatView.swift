import SwiftUI
import Momento
import Foundation
import PhotosUI

struct ChatView: View {
    let momentoClients = MomentoClients.shared
    @StateObject var store = MessageStore()
    @State private var textInput: String = ""
    @State private var selectedImage: PhotosPickerItem? = nil
    @State private var imageInput: Image? = nil
    @State private var base64ImageInput: String? = nil

    var body: some View {
        VStack {
            HeaderView(displayLanguage: true)
            Spacer()

            List(self.store.chatMessageEvents) {event in
                ChatItemView(chatMessageEvent: event)
            }
            .scrollContentBackground(.hidden)
            .background(Color(red: 37/225, green: 57/225, blue: 43/225))
            .overlay(PreviewImageOverlay)

            HStack {
                TextField("Enter your message here", text: $textInput)
                    .padding([.leading], 12)
                    .frame(alignment: .leading)
                    .border(.secondary)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .onSubmit {
                        print("Received: \(textInput)")
                        sendTextMessage()
                    }
                
                PhotosPicker(selection: $selectedImage, matching: .images) {
                    Image("attachment-icon")
                        .resizable()
                        .frame(width: 30.0, height: 30.0, alignment: .leading)
                }
                .onChange(of: selectedImage) {
                    Task {
                        if let loaded = try? await selectedImage?.loadTransferable(type: Image.self) {
                            self.imageInput = loaded
                        }
                        if let loadedBase64 = try? await selectedImage?.loadTransferable(type: Data.self) {
                            self.base64ImageInput = loadedBase64.base64EncodedString()
                        }
                    }
                }
                
                Button(action: sendTextMessage) {
                    Image("send-icon")
                        .resizable()
                        .frame(width: 30.0, height: 30.0, alignment: .leading)
                }
                .padding([.trailing], 12)
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
    
    @ViewBuilder private var PreviewImageOverlay: some View {
        if let nonNilImage = self.imageInput {
            ZStack {
                Rectangle()
                    .fill(.black.opacity(0.6))
                
                RoundedRectangle(cornerRadius: 10)
                    .fill(Color(red: 37/225, green: 57/225, blue: 43/225))
                    .frame(width: 400, height: 400)
                
                VStack {
                    nonNilImage
                        .resizable()
                        .frame(width: 300.0, height: 300.0)
                    
                    HStack {
                        Button(action: sendImageMessage) {
                            Text("Send")
                        }
                        .padding()
                        .background(Color(red: 196/255, green: 241/255, blue: 53/255))
                        .foregroundStyle(.black)
                        .clipShape(Capsule())
                        
                        Button(action: cancelImageMessage) {
                            Text("Cancel")
                        }
                        .padding()
                        .background(Color(red: 196/255, green: 241/255, blue: 53/255))
                        .foregroundStyle(.black)
                        .clipShape(Capsule())
                    }
                }
            }
        }
    }
    
    func sendTextMessage() {
        if (self.textInput.isEmpty) {
            return
        }
        Task {
            await momentoClients.publishMessage(message: self.textInput, messageType: MessageType.text)
            self.textInput = ""
        }
    }
    
    // TODO: test with different image sizes, compress images that are too large
    func sendImageMessage() {
        if let nonNilImage = self.base64ImageInput, let nonNilCacheClient = momentoClients.cacheClient {
            Task {
                let imageId = "image-\(UUID().uuidString)"
                let setResponse = await nonNilCacheClient.set(
                    cacheName: momentoClients.cacheName,
                    key: imageId,
                    value: nonNilImage
                )
                switch (setResponse) {
                case .success(_):
                    print("Successfully stored image in cache with id \(imageId)")
                case .error(let err):
                    print("Failed to store image in cache: \(err)")
                }
                await momentoClients.publishMessage(message: imageId, messageType: MessageType.image)
                self.imageInput = nil
                self.base64ImageInput = nil
                self.selectedImage = nil
            }
        }
    }
    
    func cancelImageMessage() {
        print("Canceling sending image")
        self.imageInput = nil
        self.base64ImageInput = nil
        self.selectedImage = nil
    }
}

struct ChatItemView: View {
    let momentoClients = MomentoClients.shared
    let chatMessageEvent: ChatMessageEvent
    let formattedTime: String
    var image: Image? = nil
    
    init(chatMessageEvent: ChatMessageEvent) {
        self.chatMessageEvent = chatMessageEvent
        let timestampInSeconds = TimeInterval(chatMessageEvent.timestamp / 1000)
        self.formattedTime = Date(timeIntervalSince1970: timestampInSeconds).formatted(date: .abbreviated, time: .shortened)
        
        // If image message received, convert from base64 encoded string to SwiftUI Image
        if chatMessageEvent.messageType == MessageType.image {
            self.image = Image(uiImage: UIImage(data: Data(base64Encoded: chatMessageEvent.message)!)!)
        }
    }
    
    var body: some View {
        Section {
            if chatMessageEvent.messageType == .image, let nonNilImage = self.image {
                nonNilImage
                    .listRowBackground(Rectangle().fill(Color.white))
                    .fixedSize(horizontal: false, vertical: true)
            }
            if chatMessageEvent.messageType == .text {
                Text(self.chatMessageEvent.message)
                    .listRowBackground(Rectangle().fill(Color.white))
                    .fixedSize(horizontal: false, vertical: true)
            }
        } header: {
            HStack {
                Text("\(self.chatMessageEvent.user.username)")
                    .foregroundColor(getUsernameColor(username: chatMessageEvent.user.username))
                Text(" - \(self.formattedTime)")
                    .foregroundColor(.white)
            }
            
        }
    }
}
