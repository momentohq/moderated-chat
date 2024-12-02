# iOS Moderated Chat App

This directory contains an iOS client of the Moderated Chat demo.

## Prerequisites

- [Xcode](https://developer.apple.com/xcode/)

## Running the demo

1. Create an environment variable to specify the base URL for your API endpoints. 

    To create an environment variable in Xcode, navigate to "Product" > "Scheme" > "Edit Scheme".
    Select "Run" from the menu on the left, then "Arguments" along the top of that page.

    ```bash
    API_BASE_URL="https://your-api-endpoint.com"
    ```

2. To run the app using a simulator, simply open the `ios/moderated_chat` directory as an Xcode project and click "Run". 

Note: You may also need to specify a variable to enable logging output in order to avoid a `LoggingError` in the output console.

```bash
IDEPreferLogStreaming=YES
```

Note: if you run into an error saying "principal class is nil because all fallbacks have failed", you can try turning off API validation in the settings as mentioned in this [github issue comment](https://github.com/flutter/flutter/issues/150227#issuecomment-2423291527).