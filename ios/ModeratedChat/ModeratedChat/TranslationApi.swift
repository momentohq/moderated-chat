import Foundation
import Momento
import Alamofire

@MainActor
class TranslationApi: ObservableObject {
    static let shared = TranslationApi()
    private let baseUrl = "https://57zovcekn0.execute-api.us-west-2.amazonaws.com/prod";
    @Published var selectedLanguageCode: String = "en"
    @Published var supportedLanguages: [Language] = []
    @Published var currentUsername: String = ""
    
    init() {
        Task {
            await self.getSupportedLanguages()
        }
    }
    
    func createToken() async -> MomentoToken {
        do {
            let user = getUser()
            currentUsername = user.username
            let response = try await AF.request(
                "\(self.baseUrl)/v1/translate/token",
                method: .post,
                parameters: user,
                encoder: JSONParameterEncoder.default
            ).serializingDecodable(MomentoToken.self).value
            return response
        } catch {
            fatalError("Unable to get Momento auth token: \(error)")
        }
    }
    
    func getSupportedLanguages() async {
        do {
            let response = try await AF.request("\(self.baseUrl)/v1/translate/languages").serializingDecodable(SupportedLanguages.self).value
            self.supportedLanguages = response.supportedLanguages
        } catch {
            fatalError("Unable to get supported languages: \(error)")
        }
    }
    
    func updateSelectedLanguage(language: Language?) {
        if let nonNilLanguage = language {
            self.selectedLanguageCode = nonNilLanguage.value
            print("New language selected: \(nonNilLanguage)")
        } else {
            print("Nil language selected")
        }
    }
    
    func getLatestChats() async -> Array<ChatMessageEvent> {
        do {
            print("Fetching message history using language \(String(describing: self.selectedLanguageCode))")
            let response = try await AF.request(
                "\(self.baseUrl)/v1/translate/latestMessages/\(self.selectedLanguageCode)"
            ).serializingDecodable(MessageHistory.self).value
            return response.messages
        } catch {
            fatalError("Unable to fetch message history: \(error)")
        }
    }
}
