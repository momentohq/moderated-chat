import {
  Configurations,
  CredentialProvider,
  TopicClient,
  type TopicItem,
  TopicPublish,
  TopicSubscribe,
  MomentoErrorCode,
} from "@gomomento/sdk-web";
import TranslationApi from "../api/translation";

export type ChatMessageEvent = {
  username: string;
  message: string;
  sourceLanguage: string;
  timestamp: number;
};

let webTopicClient: TopicClient | undefined = undefined;
let subscription: TopicSubscribe.Subscription | undefined = undefined;
let username = "";
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

export function setUsername(_username: string) {
  username = _username;
}

async function getNewWebClients(): Promise<MomentoClients> {
  webTopicClient = undefined;
  // we don't want to cache the token, since it will expire in 5 min
  // await fetch(window.location.origin + "/api/momento/token", {
  //   cache: "no-store",
  // });

  const tokenResp = await TranslationApi.getToken(username);
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

async function getWebTopicClient(): Promise<TopicClient> {
  if (webTopicClient) {
    return webTopicClient;
  }

  const clients = await getNewWebClients();
  return clients.topicClient;
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
  console.log(`subscribing to topic: ${topic}`);
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
  username: string;
  message: string;
  sourceLanguage: string;
};

export async function sendMessage(props: SendMessageProps) {
  const chatMessage: ChatMessageEvent = {
    username: props.username,
    message: props.message,
    sourceLanguage: props.sourceLanguage,
    timestamp: Date.now(),
  };
  await publish(props.sourceLanguage, JSON.stringify(chatMessage));
}
