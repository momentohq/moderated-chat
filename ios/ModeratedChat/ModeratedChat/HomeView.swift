import SwiftUI

struct HomeView: View {
    @Binding var isUsernameSet: Bool
    @State private var username: String = ""
    
    var body: some View {
        VStack {
            HeaderView(displayLanguage: false)
            
            VStack {
                Text("Enter your username:")
                    .foregroundStyle(.white)
                TextField("Username", text: $username)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .foregroundColor(Color(red: 37/255, green: 57/255, blue: 43/255))
                    .padding([.horizontal])
                    .onSubmit {
                        isUsernameSet = true
                        createUser(username: username)
                    }
                // TODO: how to restrict username input length and apply profanity filter on it?
            }
        }
        .frame(
              minWidth: 0,
              maxWidth: .infinity,
              minHeight: 0,
              maxHeight: .infinity,
              alignment: .topLeading
            )
        .background(Color(red: 37/225, green: 57/225, blue: 43/225))
    }
}
