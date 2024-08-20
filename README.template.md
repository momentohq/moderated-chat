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

If you are interested in deploying your own version of a moderated chat app, you will need to deploy your own version of the backend infrastructure which uses Momento and AWS services. 

### Backend Infrastructure

The [backend](./backend/) directory contains the Lambda functions used for initializing a Momento [cache](https://docs.momentohq.com/cache) and [webhook](https://docs.momentohq.com/topics/webhooks/overview), creating a [token vending machine](https://github.com/momentohq/client-sdk-javascript/tree/main/examples/nodejs/token-vending-machine), and serving API requests for the moderated chat application.

The [infrastructure](./infrastructure/) directory contains the [AWS CDK](https://github.com/aws/aws-cdk) stack to deploy AWS resources.

The main APIs used in this application are:

- `POST /v1/translate` - webhook listener for momento topic events
- `GET /v1/translate/latestMessages/<lang>` - returns the last 100 messages from the chat in the requested language
- `GET /v1/translate/supportedLanguages` - returns the languages that the application currently supports
- `GET /v1/translate/token/<username>` - returns a short lived token that allows <username> to publish to the `chat-publish` topic

In order to run these apis, you will first need to create a secret stored in AWS Secrets Manager with the path `moderated-chat/demo/secrets`. You can use the [setup-secrets.sh script](./infrastructure/setup-secrets.sh) to deploy this secret to your AWS account.

In the AWS console, you should verify that the secret contains key-value pairs in the format:

```text
{
  momentoApiKey: "",
  webhookSigningSecret: "",
}
```

- `momentoApiKey` - your Momento API key with superuser permissions. This can be created via the [Momento Console](https://console.gomomento.com/api-keys). This api key will be used to vend short lived publish/subscribe api keys to the frontend.
- `webhookSigningSecret` - the signing secret associated with the Momento Webhook. It is used to validate that requests are coming from Momento. This secret is updated by the custom resource lambda function when you deploy the backend infrastructure CDK stack.

To deploy the CDK stack, you can edit and run the [build-and-deploy script](./infrastructure/build-and-deploy.sh).
Or you can manually run each of these steps:

1. Build the Lambda function code.

    ```bash
    cd backend
    npm install
    npm run build
    ```

2. Build the CDK code.

    ```bash
    cd infrastructure
    npm install
    npm run build
    ```

3. Specify the API_DOMAIN environment variable.

    ```bash
    # The default is to use the API gateway URL that is provided when you deploy the backend stack.
    export API_DOMAIN="default"

    # Specifying your own domain name will direct your CDK stack to find an existing AWS Route53 
    # hosted zone in your account and create a 'chat-api' subdomain for it.
    export API_DOMAIN=${API_DOMAIN:-your-chosen-domain-name.com}
    ```

4. Deploy your backend stack.

    ```bash
    AWS_PROFILE=<my profile> AWS_REGION=<my region> npx cdk deploy
    ```

Once deployed, you can test your application using any of the client applications.

If you used the `API_DOMAIN="default"` option, you'll want to save the API gateway URL that was printed out.
This will be the base API URL you'll provide to the client applications.

```bash
Outputs:
moderated-chat-translation-api-stack.moderatedchatrestapiEndpoint23439914 = https://something.something.something.amazonaws.com/prod/
```

If you used your own API domain name, you'll provide something like `https://chat-api.your-domain-name.com` to the client applications.

{{ ossFooter }}
