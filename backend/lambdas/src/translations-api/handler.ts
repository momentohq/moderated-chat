import {APIGatewayProxyEventV2, Context} from 'aws-lambda';
import createAPI, {API, NextFunction, Request, Response} from 'lambda-api';
import { TranslateClient } from "@aws-sdk/client-translate";
import {GetSecretValueCommand, SecretsManagerClient} from "@aws-sdk/client-secrets-manager";
import log, {initLogger} from '../common/logger';
import {TranslationRoute} from "./routes/v1/translation";
import {AuthClient, CredentialProvider, TopicClient, TopicConfigurations} from "@gomomento/sdk";

const cacheName = process.env.MOMENTO_CACHE_NAME;
if (!cacheName) {
    throw new Error('missing required env var MOMENTO_CACHE_NAME');
}
const secretsPath = process.env.SECRETS_PATH;
if (!secretsPath) {
    throw new Error('missing required env var SECRETS_PATH');
}
/******* Global scoped variables for reuse across lambda invocations *******/
let api: API;
/******* End Globally Scoped Variables *******/

type TranslationSecrets = {
    momentoApiKey: string;
}

export const createTranslationsApi = async (
): Promise<API> => {
    const api = createAPI({
        logger: true,
    });
    const translationClient = new TranslateClient();
    const smClient = new SecretsManagerClient();
    const getSecretRequest = new GetSecretValueCommand({
        SecretId: secretsPath,
    });
    const getSecretResp = await smClient.send(getSecretRequest);
    if (!getSecretResp.SecretString) {
        throw new Error(`secret: ${secretsPath} is empty. Must be a valid secret value`);
    }

    const parsedSecret = JSON.parse(getSecretResp.SecretString) as unknown as TranslationSecrets
    const topicClient = new TopicClient({
        configuration: TopicConfigurations.Default.latest(),
        credentialProvider: CredentialProvider.fromString({
            apiKey: parsedSecret.momentoApiKey
        })
    });
    const authClient = new AuthClient({
        credentialProvider: CredentialProvider.fromString({
            apiKey: parsedSecret.momentoApiKey
        })
    });

    api.use((req: Request, res: Response, next: NextFunction) => {
        res.cors({});
        next();
    });

    const errorHandler = (
        error: Error,
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        // send back cors even when there are errors
        res.cors({});
        next();
    };

    api.use(errorHandler);

    const translationRoute = new TranslationRoute({
        translateClient: translationClient,
        topicClient,
        baseTopicName: 'chat',
        cache: cacheName,
        authClient,
    });
    api.register(translationRoute.routes(), {
        prefix: '/v1/translate',
    });
    return api;
};



export const handler = async (
    event: APIGatewayProxyEventV2,
    context: Context
) => {
    initLogger({
        lambdaContext: context,
        additionalContext: {},
    });
    log.info('Beginning lambda execution');

    if (!api) {
        api = await createTranslationsApi();
    }

    try {
        const resp: unknown = await api.run(event, context);
        return resp;
    } catch (e) {
        log.error('failed to process request', { error: e });
        throw e
    }
};
