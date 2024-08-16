# Flutter Momento Moderated Chat App

A Flutter version of the Momento Moderated Chat demo. It currently only has a macOS implementation, but more are coming soon.

## Prerequisites

- [Flutter is installed](https://docs.flutter.dev/get-started/install).

### macOS prerequisites

- [Xcode](https://developer.apple.com/xcode/)
- [CocoaPods](https://guides.cocoapods.org/using/getting-started.html#installation).

## Running the Demo

In the [lib/config.dart file](./lib/config.dart), specify the base URL for your API endpoints.

```dart
class Config {
  static const baseUrl = "https://chat-api.your-chosen-domain-name.com";
}
```

From the flutter moderated_chat directory, call `flutter run` to start the app:

```bash
cd flutter/moderated_chat
flutter run -d macos
```

Alternatively, you can open the project in VSCode or IntelliJ with the Flutter plugin and run the app from there.
