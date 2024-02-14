# Example expo app using Momento Web SDK
This is a demo application which shows how the momento web sdk can be used inside a react native application. [Here](https://www.notion.so/momentohq/React-Native-Testing-Notes-b00832e0d87642e2ae51d5f54704f705?pvs=4) is a notion doc that dives into more detail on how we got it working

## Getting Started

You will need the expo application installed on your phone

- [ios](https://apps.apple.com/us/app/expo-go/id982107779)
- [android](https://play.google.com/store/apps/details?id=host.exp.exponent&hl=en_US&gl=US&pli=1)

run 
- npm install
- In the `app.js` file, add your authentication token. TODO this token should be gotten from a token vending machine
- Make sure a cache named `test` is created that this above token has access to
- open the file `node_modules/@gomomento/sdk-web/dist/src/index.js`
- Add the following lines to the start of the file
```javascript
const TextEncodingPolyfill = require('text-encoding');
Object.assign(global, {
    TextEncoder: TextEncodingPolyfill.TextEncoder,
    TextDecoder: TextEncodingPolyfill.TextDecoder,
});
import {decode, encode} from 'base-64'

if (!global.btoa) {
    global.btoa = encode;
}

if (!global.atob) {
    global.atob = decode;
}
```
- npx expo start
- scan QR Code with your phone, it will open the expo application
- Logs for the application can be seen in the terminal 
