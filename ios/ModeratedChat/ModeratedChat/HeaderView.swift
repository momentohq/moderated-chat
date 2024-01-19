//
import SwiftUI

struct HeaderView: View {
    let displayLanguage: Bool
    @State var selectedLanguage = "en"
    @State var supportedLanguages: [Language] = []
    @EnvironmentObject var translationApi: TranslationApi
    
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
                        ForEach(self.supportedLanguages, id: \.value) {
                            Text($0.label)
                        }
                    }
                    .accentColor(.white)
                    .frame(maxWidth: 150.0, alignment: .trailing)
                }
            }
        }
        .onAppear {
            Task {
                self.supportedLanguages = await translationApi.getSupportedLanguages()
            }
        }
    }
}

//#Preview {
//    VStack {
//        HeaderView(displayLanguage: true)
//        HeaderView(displayLanguage: false)
//    }
//}
