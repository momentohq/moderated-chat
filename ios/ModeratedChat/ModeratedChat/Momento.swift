import Foundation
import Momento
import Alamofire

class TranslationApi: ObservableObject {
    private let baseUrl = "https://57zovcekn0.execute-api.us-west-2.amazonaws.com/prod";
    
    func createToken() async -> MomentoToken {
        do {
            let user = getUser()
            let parameters = try JSONEncoder().encode(user)
            let response = try await AF.request("\(self.baseUrl)/v1/translate/token", method: .post, parameters: parameters, encoder: JSONParameterEncoder.default).serializingDecodable(MomentoToken.self).value
            return response
        } catch {
            fatalError("Unable to get Momento auth token: \(error)")
        }
    }
    
    func getSupportedLanguages() async -> [Language] {
        do {
            let supportedLanguages = try await AF.request("\(self.baseUrl)/v1/translate/languages").serializingDecodable(SupportedLanguages.self).value
            return supportedLanguages.supportedLanguages
        } catch {
            fatalError("Unable to get supported languages: \(error)")
        }
    }
}
