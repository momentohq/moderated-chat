import SwiftUI

struct HeaderView: View {
    let displayLanguage: Bool
    @State var selectedLanguage = "en"
    @StateObject var translationApi = TranslationApi.shared
    @StateObject var momentoClients = MomentoClients.shared
    
    var body: some View {
        ZStack {
            Rectangle()
                .fill(Color(red: 37/225, green: 57/225, blue: 43/225))
                .frame(maxWidth: .infinity, maxHeight: 50)
            HStack {
                Image("mochat-mo-peek-up")
                    .resizable()
                    .frame(width: 45.0, height: 45.0, alignment: .leading)
                Text("Welcome to MoChat")
                    .foregroundStyle(.white)
                    .font(.title3)
                    .fontWeight(/*@START_MENU_TOKEN@*/.bold/*@END_MENU_TOKEN@*/)
                    .frame(maxWidth: .infinity, alignment: .center)
                if displayLanguage {
                    Picker("Select Language", selection: $selectedLanguage) {
                        ForEach(self.translationApi.supportedLanguages, id: \.value) {
                            Text($0.label)
                        }
                    }
                    .onChange(of: selectedLanguage) {
                        let languageWithMatchingLabel = self.translationApi.supportedLanguages.first(where: { $0.value == selectedLanguage })
                        self.translationApi.updateSelectedLanguage(language: languageWithMatchingLabel!)
                        Task {
                            await momentoClients.subscribeToTopic()
                        }
                    }
                    .accentColor(.white)
                    .frame(maxWidth: 150.0, alignment: .trailing)
                }
            }
        }
    }
}
