# Moderated Chat

This application uses Momento Webhooks to build a moderated, multi-language chat application. Users can chat with each other in multiple languages at the same time, using a variety of client applications, with profanity filtered out. This repository is structured as a mono repo, with our main frontend, backend, and infrastructure code separated by folders. The folder structure is as follows

```
├── backend
│   ├── LICENSE
│   ├── README.md
│   ├── esbuild.ts
│   ├── package-lock.json
│   ├── package.json
│   ├── postbuild.ts
│   ├── serverless.yaml
│   ├── src
│   └── tsconfig.json
├── frontend
│   ├── README.md
│   ├── index.html
│   ├── package.json
│   ├── public
│   ├── src
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   └── vite.config.ts
└── infrastructure
    ├── README.md
    ├── bin
    ├── cdk.json
    ├── jest.config.js
    ├── lib
    ├── package-lock.json
    ├── package.json
    ├── test
    └── tsconfig.json
```

Additional client applications of the moderated chat app can be found in the following locations:

- [iOS](./ios/)
- [Android](./android/)
- [Flutter](./flutter/)
- [Unity](https://github.com/momentohq/momento-unity-demo)

## Backend

Contains apis for the moderated chat application. There are a few apis that we are using

`POST /v1/translate` - webhook listener for momento topic events
`GET /v1/translate/latestMessages/<lang>` - returns the last 100 messages from the chat in the requested language
`GET /v1/translate/supportedLanguages` - returns the languages that the application currently supports
`GET /v1/translate/token/<username>` - returns a short lived token that allows <username> to publish to the `chat-publish` topic

In order to run these apis, there needs to be a secret stored in aws secrets manager with the path `moderated-chat/demo/secrets`. This secret should be key value pairs in the format

```
{
  momentoApiKey: "",
  webhookSigningSecret: "",
}
```
- the `momentoApiKey` is a token, which can be created via the [Momento Console](https://console.gomomento.com/api-keys), with super user permissions. This token will be used to vend short lived publish/subscribe api keys to the frontend
- the `webhookSigningSecret` is the signing secret associated with the Momento Webhook. It is used to validate that requests are coming from Momento


## Frontend

Contains the web browser frontend code for our chat application. To run

1. `npm install`
2. `npm run dev`
3. open `localhost:5173` in a browser

## Infrastructure

This application uses [cdk](https://github.com/aws/aws-cdk) to deploy the infrastructure to aws. To deploy

1. `npm install`
2. `npm run build`
3. `AWS_PROFILE=<my profile> AWS_REGION=<my region> npx cdk deploy`
