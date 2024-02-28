# Moderated Chat Using React Native Client

## Getting Started

This project uses [Expo Go](https://docs.expo.dev/get-started/expo-go/), a free open-source sandbox that makes it quick and easy to experiment with React Native on Android and iOS devices. You will need the [expo application](https://expo.dev/client) installed on your phone, or you can also use device emulators for [Android](https://docs.expo.dev/workflow/android-studio-emulator/) and [iOS](https://docs.expo.dev/workflow/ios-simulator/).


## Running the example using Expo Go

In the `react-native/ModeratedChat` directory:

- run `npm install`
- run `npx expo start`
- run the app on your phone:
  - scan QR Code with your phone to open it in the Expo Go app
- or run the app on an emulator:
  - launch one of the device emulators as described in the instructions displayed after you start the Expo server

## Android Notes

If you are using an Android device or emulator, you may encounter problems receiving incoming chat messages caused by a known networking issue in Android development builds. To resolve the issue you can produce an [Expo Application Services](https://docs.expo.dev/eas/) build of the app and run it on your device or an emulator.

Using EAS requires an [Expo account](https://docs.expo.dev/build/setup/#an-expo-user-account) and EAS offers a free tier, so you can build and test your app free of charge. Once you have an account, follow the instructions to [install the EAS CLI](https://docs.expo.dev/build/setup/#install-the-latest-eas-cli), [log in to your Expo account](https://docs.expo.dev/build/setup/#log-in-to-your-expo-account), and [configure your project](https://docs.expo.dev/build/setup/#configure-the-project).

The following command will build the app using the preview profile defined in the `eas.json` provided in the project directory:

```
eas build --platform android --profile preview
```

At the end of the build process, you'll be prompted to open the build in the Expo Go app on an emulator. You can also download the APK file from the `Builds` section of the `ModeratedChat` project page and install it manually [on your Android device](https://www.lifewire.com/install-apk-on-android-4177185#toc-transfer-the-apk-installer-via-usb) or [on an emulator](https://developer.android.com/studio/run/emulator-install-add-files).
