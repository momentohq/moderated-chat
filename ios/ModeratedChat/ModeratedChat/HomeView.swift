import SwiftUI

struct HomeView: View {
    @State var isUsernameSet: Bool = false
    @State private var username: String = ""
    
    var body: some View {
        VStack {
            HeaderView(displayLanguage: false)
            
            VStack {
                Text("Enter your username:")
                    .foregroundStyle(.white)
                
                // TODO: how to apply profanity filter on it?
                HStack{
                    TextField("Username", text: $username)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                        .foregroundColor(Color(red: 37/255, green: 57/255, blue: 43/255))
                        .padding([.horizontal])
                        .disableAutocorrection(true)
                        .onSubmit {
                            setUsername()
                        }
                    Button(action: setUsername) {
                        Image("send-icon")
                            .resizable()
                            .frame(width: 30.0, height: 30.0, alignment: .leading)
                    }
                    .padding([.trailing], 12)
                }
                
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
    
    func setUsername() {
        isUsernameSet = true
        createUser(username: username)
    }
}
