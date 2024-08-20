{{ ossHeader }}

## Multi-language Moderated Chat Demo

This application uses Momento Webhooks to build a moderated, multi-language chat application. Users across a variety of client applications can chat with each other in multiple languages at the same time with profanity filtered out in real time. 

You can try the chat app using our deployed [web app here](https://moderated-chat.vercel.app/).

You can find the web app implementation, as well as additional client applications, of the moderated chat app in the following locations:

- [Web (React + Vite)](./frontend/)
- [iOS](./ios/)
- [Android](./android/)
- [Flutter](./flutter/)
- [React Native](./react-native/)
- [Unity](https://github.com/momentohq/momento-unity-demo)

## Developing

If you are interested in deploying your own version of a moderated chat app, you will need to deploy your own version of the backend infrastructure which uses Momento and AWS services. Please see the [infrastructure directory](./infrastructure/) for the overview and setup instructions.

{{ ossFooter }}
