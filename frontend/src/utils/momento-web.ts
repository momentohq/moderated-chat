import {
  Configurations,
  CredentialProvider,
  MomentoErrorCode,
  TopicClient,
  CacheClient,
  type TopicItem,
  TopicPublish,
  TopicSubscribe,
  CacheGet,
} from "@gomomento/sdk-web";
import TranslationApi from "../api/translation";
import imageCompression from "browser-image-compression";
import { MessageType, type PostMessageEvent } from "../shared/models";
import { v4 } from "uuid";
import { getUser } from "./user";

let webTopicClient: TopicClient | undefined = undefined;
let webCacheClient: CacheClient | undefined = undefined;
let subscription: TopicSubscribe.Subscription | undefined = undefined;
let onItemCb: (item: TopicItem) => void;
let onErrorCb: (
  error: TopicSubscribe.Error,
  subscription: TopicSubscribe.Subscription,
) => Promise<void>;

type MomentoClients = {
  topicClient: TopicClient;
  cacheClient: CacheClient;
};

const cacheName = "moderator";
const topicName = "chat-publish";

async function getNewWebClients(): Promise<MomentoClients> {
  const user = getUser();
  webTopicClient = undefined;

  const tokenResp = await TranslationApi.createToken(user);
  const topicClient = new TopicClient({
    configuration: Configurations.Browser.v1(),
    credentialProvider: CredentialProvider.fromString({
      authToken: tokenResp.token,
    }),
  });
  const cacheClient = new CacheClient({
    defaultTtlSeconds: 24 * 60 * 60,
    configuration: Configurations.Browser.v1(),
    credentialProvider: CredentialProvider.fromString({
      authToken: tokenResp.token,
    }),
  });
  webTopicClient = topicClient;
  webCacheClient = cacheClient;
  return {
    topicClient,
    cacheClient,
  };
}

const clearCurrentClient = () => {
  subscription?.unsubscribe();
  subscription = undefined;
  webTopicClient = undefined;
};

async function getWebTopicClient(): Promise<TopicClient> {
  if (webTopicClient) {
    return webTopicClient;
  }

  const clients = await getNewWebClients();
  return clients.topicClient;
}

async function getWebCacheClient(): Promise<CacheClient> {
  if (webCacheClient) {
    return webCacheClient;
  }

  const clients = await getNewWebClients();
  return clients.cacheClient;
}

export async function subscribeToTopic(
  languageCode: string,
  onItem: (item: TopicItem) => void,
  onError: (
    error: TopicSubscribe.Error,
    subscription: TopicSubscribe.Subscription,
  ) => Promise<void>,
) {
  const topic = `chat-${languageCode}`;
  clearCurrentClient();
  onErrorCb = onError;
  onItemCb = onItem;
  const topicClient = await getWebTopicClient();
  const resp = await topicClient.subscribe(cacheName, topic, {
    onItem: onItemCb,
    onError: onErrorCb,
  });
  if (resp instanceof TopicSubscribe.Subscription) {
    subscription = resp;
    return subscription;
  }

  throw new Error(`unable to subscribe to topic: ${resp}`);
}

async function publish(targetLanguage: string, message: string) {
  const topicClient = await getWebTopicClient();
  const resp = await topicClient.publish(cacheName, topicName, message);
  if (resp instanceof TopicPublish.Error) {
    if (resp.errorCode() === MomentoErrorCode.AUTHENTICATION_ERROR) {
      console.log(
        "token has expired, going to refresh subscription and retry publish",
      );
      clearCurrentClient();
      await subscribeToTopic(targetLanguage, onItemCb, onErrorCb);
      await publish(targetLanguage, message);
    } else {
      console.error("failed to publish to topic", resp);
    }
  }
}

type SendMessageProps = {
  messageType: MessageType;
  message: string;
  sourceLanguage: string;
};

export async function sendTextMessage(props: SendMessageProps) {
  const chatMessage: PostMessageEvent = {
    messageType: props.messageType,
    message:
      props.messageType === MessageType.IMAGE ? props.message : props.message,
    sourceLanguage: props.sourceLanguage,
    timestamp: Date.now(),
  };
  await publish(props.sourceLanguage, JSON.stringify(chatMessage));
}

export async function sendImageMessage({
  base64Image,
  sourceLanguage,
}: {
  base64Image: string;
  sourceLanguage: string;
}) {
  const imageId = `image-${v4()}`;
  const client = await getWebCacheClient();
  await client.set(cacheName, imageId, base64Image);
  await sendTextMessage({
    messageType: MessageType.IMAGE,
    message: imageId,
    sourceLanguage,
  });
}

export async function getImageMessage({
  imageId,
}: {
  imageId: string;
}): Promise<string> {
  const client = await getWebCacheClient();
  const resp = await client.get(cacheName, imageId);
  if (resp instanceof CacheGet.Error) {
    if (resp.errorCode() === MomentoErrorCode.AUTHENTICATION_ERROR) {
      console.log(
        "token has expired, going to refresh subscription and retry publish",
      );
      clearCurrentClient();
      return await getImageMessage({ imageId });
    }
  }
  return resp.value() ?? "";
}

export const compressImage = async (imageFile: File): Promise<File> => {
  try {
    const options = {
      maxSizeMB: 0.07,
      maxWidthOrHeight: 800,
      useWebWorker: true,
    };

    return await imageCompression(imageFile, options);
  } catch (error) {
    console.error("Error compressing image:", error);
    throw error;
  }
};
