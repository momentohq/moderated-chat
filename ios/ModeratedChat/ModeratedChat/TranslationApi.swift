import Foundation
import Momento
import Alamofire

@MainActor
class TranslationApi: ObservableObject {
    static let shared = TranslationApi()
    
    private let baseUrl = "https://57zovcekn0.execute-api.us-west-2.amazonaws.com/prod";
    @Published var selectedLanguage: Language? = nil
    @Published var supportedLanguages: [Language] = []
    
    init() {
        Task {
            await self.getSupportedLanguages()
        }
    }
    
    func createToken() async -> MomentoToken {
        do {
            let user = getUser()
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
            self.selectedLanguage = self.supportedLanguages.first
        } catch {
            fatalError("Unable to get supported languages: \(error)")
        }
    }
    
    func updateSelectedLanguage(language: Language?) {
        if let nonNilLanguage = language {
            self.selectedLanguage = nonNilLanguage
            print("New language selected: \(nonNilLanguage)")
        } else {
            print("Nil language selected")
        }
    }
}
