import {
  Configurations,
  CredentialProvider,
  MomentoErrorCode,
  TopicClient,
  type TopicItem,
  TopicPublish,
  TopicSubscribe,
} from "@gomomento/sdk-web";
import TranslationApi from "../api/translation";
import imageCompression from "browser-image-compression";

export type User = {
  username: string;
  id: string;
};

export enum MessageType {
  TEXT = "text",
  IMAGE = "image",
}

export type ChatMessageEvent = {
  user: User;
  messageType: MessageType;
  message: string;
  sourceLanguage: string;
  timestamp: number;
};

let webTopicClient: TopicClient | undefined = undefined;
let subscription: TopicSubscribe.Subscription | undefined = undefined;
let onItemCb: (item: TopicItem) => void;
let onErrorCb: (
  error: TopicSubscribe.Error,
  subscription: TopicSubscribe.Subscription,
) => Promise<void>;

type MomentoClients = {
  topicClient: TopicClient;
};

const cacheName = "moderator";
const topicName = "chat-publish";

async function getNewWebClients(user: User): Promise<MomentoClients> {
  webTopicClient = undefined;
  // we don't want to cache the token, since it will expire in 5 min
  // await fetch(window.location.origin + "/api/momento/token", {
  //   cache: "no-store",
  // });

  const tokenResp = await TranslationApi.createToken(user);
  const topicClient = new TopicClient({
    configuration: Configurations.Browser.v1(),
    credentialProvider: CredentialProvider.fromString({
      authToken: tokenResp.token,
    }),
  });
  webTopicClient = topicClient;
  return {
    topicClient,
  };
}

const clearCurrentClient = () => {
  subscription?.unsubscribe();
  subscription = undefined;
  webTopicClient = undefined;
};

async function getWebTopicClient(user: User): Promise<TopicClient> {
  if (webTopicClient) {
    return webTopicClient;
  }

  const clients = await getNewWebClients(user);
  return clients.topicClient;
}

export async function subscribeToTopic(
  user: User,
  languageCode: string,
  onItem: (item: TopicItem) => void,
  onError: (
    error: TopicSubscribe.Error,
    subscription: TopicSubscribe.Subscription,
  ) => Promise<void>,
) {
  const topic = `chat-${languageCode}`;
  console.log(`subscribing to topic: ${topic}`);
  clearCurrentClient();
  onErrorCb = onError;
  onItemCb = onItem;
  const topicClient = await getWebTopicClient(user);
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

async function publish(user: User, targetLanguage: string, message: string) {
  const topicClient = await getWebTopicClient(user);
  const resp = await topicClient.publish(cacheName, topicName, message);
  if (resp instanceof TopicPublish.Error) {
    if (resp.errorCode() === MomentoErrorCode.AUTHENTICATION_ERROR) {
      console.log(
        "token has expired, going to refresh subscription and retry publish",
      );
      clearCurrentClient();
      await subscribeToTopic(user, targetLanguage, onItemCb, onErrorCb);
      await publish(user, targetLanguage, message);
    } else {
      console.error("failed to publish to topic", resp);
    }
  }
}

type SendMessageProps = {
  user: User;
  messageType: MessageType;
  message: string;
  sourceLanguage: string;
};

export async function sendMessage(props: SendMessageProps) {
  const chatMessage: ChatMessageEvent = {
    user: props.user,
    messageType: props.messageType,
    message:
      props.messageType === MessageType.IMAGE ? props.message : props.message,
    sourceLanguage: props.sourceLanguage,
    timestamp: Date.now(),
  };
  await publish(props.user, props.sourceLanguage, JSON.stringify(chatMessage));
}

export const compressImage = async (imageFile: File): Promise<File> => {
  try {
    console.log("Compressing image...");
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
