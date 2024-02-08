import SwiftUI
import Profanity_Filter

struct HomeView: View {
    @State var isUsernameSet: Bool = false
    @State private var username: String = ""
    @State private var showWarning: Bool = false
    @State private var profaneUsernameWarning: String = "Username contains profanity, please enter a different username"
    
    var body: some View {
        VStack {
            HeaderView(displayLanguage: false)
            
            VStack {
                Text("Enter your username:")
                    .foregroundStyle(.white)
                
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
                
                if showWarning {
                    Text(profaneUsernameWarning)
                        .foregroundStyle(.red)
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
        let result = ProfanityFilter().containsProfanity(text: username)
        if result.containsProfanity == true {
            username = ""
            showWarning = true
        } else {
            isUsernameSet = true
            createUser(username: username)
        }
    }
}
