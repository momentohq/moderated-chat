import Foundation

func createUser(username: String) {
    let newUser = User(username: username)
    if let encodedUser = try? JSONEncoder().encode(newUser) {
        UserDefaults.standard.set(encodedUser, forKey: "momentoUser")
    }
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


