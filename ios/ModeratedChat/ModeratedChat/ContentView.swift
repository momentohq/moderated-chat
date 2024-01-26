import SwiftUI

struct ContentView: View {
    @State private var isUsernameSet: Bool = false
    
    var body: some View {
        if self.isUsernameSet {
            ChatView()
        } else {
            HomeView(isUsernameSet: $isUsernameSet)
        }
    }
}
