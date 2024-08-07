import { CdkCustomResourceEvent, Context } from "aws-lambda";
import {
  GetSecretValueCommand,
  UpdateSecretCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import {
  CacheClient,
  Configurations,
  CredentialProvider,
  TopicClient,
  TopicConfigurations,
  CreateCache,
  PostUrlWebhookDestination,
  PutWebhook,
  ListWebhooks,
} from "@gomomento/sdk";

const cacheName = process.env.MOMENTO_CACHE_NAME;
if (!cacheName) {
  throw new Error("missing required env var MOMENTO_CACHE_NAME");
}
const secretsPath = process.env.SECRETS_PATH;
if (!secretsPath) {
  throw new Error("missing required env var SECRETS_PATH");
}

type TranslationSecrets = {
  momentoApiKey: string;
  momentoSigningSecret: string;
};

export const handler = async (
  event: CdkCustomResourceEvent,
  context: Context,
) => {
  console.log("Beginning lambda execution, resources setup");

  const smClient = new SecretsManagerClient();

  const getSecretRequest = new GetSecretValueCommand({
    SecretId: secretsPath,
  });
  const getSecretResp = await smClient.send(getSecretRequest);
  if (!getSecretResp.SecretString) {
    throw new Error(
      `secret: ${secretsPath} is empty. Must be a valid secret value`,
    );
  }

  let parsedSecret = JSON.parse(
    getSecretResp.SecretString,
  ) as unknown as TranslationSecrets;

  const cacheClient = new CacheClient({
    credentialProvider: CredentialProvider.fromString({
      apiKey: parsedSecret.momentoApiKey,
    }),
    configuration: Configurations.Lambda.latest(),
    defaultTtlSeconds: 60 * 60,
  });

  const topicClient = new TopicClient({
    configuration: TopicConfigurations.Default.latest(),
    credentialProvider: CredentialProvider.fromString({
      apiKey: parsedSecret.momentoApiKey,
    }),
  });

  // Create a cache if it does not already exist
  const createResponse = await cacheClient.createCache(cacheName);
  if (createResponse instanceof CreateCache.Error) {
    console.log("Failed to create cache", { createResponse });
    throw new Error("Failed to create cache");
  } 
  
  // Check if webhook exists
  const listWebhooksResponse = await topicClient.listWebhooks(cacheName);
  if (listWebhooksResponse instanceof CreateCache.Error) {
    console.log("Failed to list webhooks", { listWebhooksResponse });
    throw new Error("Failed to list webhooks");
  }
  const webhooks = (listWebhooksResponse as ListWebhooks.Success).getWebhooks();

  if (webhooks.find((webhook) => webhook.id.cacheName === cacheName)) {
    console.log("Webhook already exists, no need to create new webhook");
    return 200;
  } 
  
  // Create a new webhook to attach to a newly created cache
  console.log("Webhook does not exist, creating new webhook");
  const response = await topicClient.putWebhook(cacheName, "moderator-webhook", {
    topicName: "chat-publish",
    destination: new PostUrlWebhookDestination(event.ResourceProperties.apiGatewayUrl + 'v1/translate'),
  });
  if (response instanceof PutWebhook.Error) {
    throw new Error("Failed to create webhook and update signing secret");
  }

  // Make sure to store signing key as secret
  console.log("Successfully created webhook");
  const webhookSigningKey = (response as PutWebhook.Success).secretString();
  const updateSecretRequest = new UpdateSecretCommand({
    SecretId: secretsPath,
    SecretString: JSON.stringify({
      momentoApiKey: parsedSecret.momentoApiKey,
      momentoSigningSecret: webhookSigningKey,
    }),
  });
  const updateSecretResp = await smClient.send(updateSecretRequest);
  if (!updateSecretResp.ARN) {
    throw new Error(
      `Failed to update webhook signing secret`,
    );
  }
  console.log('Updated signing secret');
  return 200;
};
