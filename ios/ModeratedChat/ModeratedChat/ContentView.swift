import SwiftUI

struct ContentView: View {
    @State private var isUsernameSet: Bool = doesUserExist()
    
    var body: some View {
        if self.isUsernameSet {
            ChatView()
        } else {
            HomeView()
        }
    }
}
