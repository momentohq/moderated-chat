import SwiftUI

struct ContentView: View {
    @State private var isUsernameSet: Bool = (UserDefaults.standard.array(forKey: "users") != nil) ? true : false
    @StateObject var translationApi = TranslationApi()
    
    var body: some View {
        if self.isUsernameSet {
            ChatView()
                .environmentObject(translationApi)
        } else {
            HomeView(isUsernameSet: $isUsernameSet)
                .environmentObject(translationApi)
        }
    }
}

//#Preview {
//    ContentView()
//}
