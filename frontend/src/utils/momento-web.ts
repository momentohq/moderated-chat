import {
  CacheClient,
  Configurations,
  CredentialProvider,
  TopicClient,
  type TopicItem,
  TopicPublish,
  TopicSubscribe,
} from "@gomomento/sdk-web";

export type Payload = {
  message: string;
  targetLanguage: string;
};

export type ChatMessageEvent = {
  username: string;
  payload: Payload;
  timestamp: number;
};

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

async function getNewWebClients(): Promise<MomentoClients> {
  webTopicClient = undefined;
  // we don't want to cache the token, since it will expire in 5 min
  await fetch(window.location.origin + "/api/momento/token", {
    cache: "no-store",
  });
  const token = "your-momento-auth-token-goes-here";
  const topicClient = new TopicClient({
    configuration: Configurations.Browser.v1(),
    credentialProvider: CredentialProvider.fromString({
      authToken: token,
      endpointOverrides: {
        baseEndpoint: `cell-alpha-dev.preprod.a.momentohq.com`,
      },
    }),
  });
  webTopicClient = topicClient;
  const cacheClient = new CacheClient({
    configuration: Configurations.Browser.v1(),
    credentialProvider: CredentialProvider.fromString({
      authToken: token,
      endpointOverrides: {
        baseEndpoint: `cell-alpha-dev.preprod.a.momentohq.com`,
      },
    }),
    defaultTtlSeconds: 60,
  });
  webCacheClient = cacheClient;
  return {
    cacheClient,
    topicClient,
  };
}

export const clearCurrentClient = () => {
  subscription?.unsubscribe();
  subscription = undefined;
  webTopicClient = undefined;
  webCacheClient = undefined;
};

async function getWebTopicClient(): Promise<TopicClient> {
  if (webTopicClient) {
    return webTopicClient;
  }

  const clients = await getNewWebClients();
  return clients.topicClient;
}

// export async function listCaches(): Promise<string[]> {
//   const fetchResp = await fetch(window.location.origin + "/api/momento/caches");
//   const caches: string[] = await fetchResp.json();
//   return caches;
// }

export async function subscribeToTopic(
  cacheName: string,
  topicName: string,
  onItem: (item: TopicItem) => void,
  onError: (
    error: TopicSubscribe.Error,
    subscription: TopicSubscribe.Subscription,
  ) => Promise<void>,
) {
  onErrorCb = onError;
  onItemCb = onItem;
  const topicClient = await getWebTopicClient();
  const resp = await topicClient.subscribe(cacheName, topicName, {
    onItem: onItemCb,
    onError: onErrorCb,
  });
  if (resp instanceof TopicSubscribe.Subscription) {
    subscription = resp;
    return subscription;
  }

  throw new Error(`unable to subscribe to topic: ${resp}`);
}

async function publish(cacheName: string, topicName: string, message: string) {
  const topicClient = await getWebTopicClient();
  const resp = await topicClient.publish(cacheName, topicName, message);
  if (resp instanceof TopicPublish.Error) {
    // if (resp.errorCode() === MomentoErrorCode.AUTHENTICATION_ERROR) {
    //   console.log(
    //     "token has expired, going to refresh subscription and retry publish",
    //   );
    //   clearCurrentClient();
    //   await subscribeToTopic(cacheName, topicName, onItemCb, onErrorCb);
    //   await publish(cacheName, topicName, message);
    // } else {
    //   console.error("failed to publish to topic", resp);
    // }
    console.error("failed to publish to topic", resp);
  }
}

export async function sendMessage(
  cacheName: string,
  topicName: string,
  username: string,
  payload: Payload,
) {
  const chatMessage: ChatMessageEvent = {
    username,
    payload,
    timestamp: Date.now(),
  };
  await publish(cacheName, topicName, JSON.stringify(chatMessage));
}
