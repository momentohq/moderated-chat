import Foundation
import SwiftUI
import CryptoKit

let usernameColors = [
    "#C2B2A9": Color(red: 194/225, green: 178/225, blue: 169/225),
    "#E1D9D5": Color(red: 225/225, green: 217/225, blue: 213/225),
    "#EAF8B6": Color(red: 234/225, green: 248/225, blue: 182/225),
    "#ABE7D2": Color(red: 171/225, green: 231/225, blue: 210/225)
]

func createUser(username: String) {
    let newUser = User(id: UUID().uuidString, username: username)
    if let encodedUser = try? JSONEncoder().encode(newUser) {
        UserDefaults.standard.set(encodedUser, forKey: "momentoUser")
    }
    _ = setUsernameColor(username: username)
}

func getUser() -> User {
    if let data = UserDefaults.standard.object(forKey: "momentoUser") as? Data,
       let storedUser = try? JSONDecoder().decode(User.self, from: data) {
        return storedUser
    }
    fatalError("Momento user has not been set, cannot retrieve")
}

func doesUserExist() -> Bool {
    if let data = UserDefaults.standard.object(forKey: "momentoUser") as? Data,
       let storedUser = try? JSONDecoder().decode(User.self, from: data) {
        print("User exists: \(storedUser)")
        return true
    }
    return false
}

func setUsernameColor(username: String) -> String {
    let usernameData = username.data(using:.utf8)!
    let hash = Insecure.MD5.hash(data: usernameData).description.replacingOccurrences(of: "MD5 digest: ", with: "")
    let firstElement = hash.first!.asciiValue!
    let index = Int(firstElement) % usernameColors.count
    let usernameColorKey = Array(usernameColors.keys)[index]
    if let encodedUsernameColor = try? JSONEncoder().encode(usernameColorKey) {
        UserDefaults.standard.set(encodedUsernameColor, forKey: "\(username)_color")
    }
    return usernameColorKey
}

func getUsernameColor(username: String) -> Color {
    if let data = UserDefaults.standard.object(forKey: "\(username)_color") as? Data,
       let colorKey = try? JSONDecoder().decode(String.self, from: data) {
        return usernameColors[colorKey]!
    } else {
        let color = setUsernameColor(username: username)
        return usernameColors[color]!
    }
    
}


