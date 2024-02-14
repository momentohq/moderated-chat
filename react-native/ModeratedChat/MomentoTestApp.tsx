import {
  CacheClient, CacheDictionaryFetch,
  CacheGet, CacheSetFetch,
  Configurations,
  CredentialProvider,
  TopicClient,
  TopicConfigurations, TopicPublish
} from '@gomomento/sdk-web';
import {StyleSheet, Text, View} from 'react-native';
import {StatusBar} from 'expo-status-bar';

const credProvider = CredentialProvider.fromString({
  apiKey: process.env.EXPO_PUBLIC_MOMENTO_API_KEY
});

const client = new CacheClient({
  defaultTtlSeconds: 60,
  credentialProvider: credProvider,
  configuration: Configurations.Browser.latest()
});

const pubsub = new TopicClient({
  credentialProvider: credProvider,
  configuration: TopicConfigurations.Default.latest()
})

const helper = async () => {
  const key = "key";
  const value = "value";
  const cache = "test";
  console.log();
  console.log();
  console.log("----- starting new run -----");
  console.log();
  console.log();

  /**
   * testing unary data type
   */
  const setResp = await client.set(cache, key, value);
  console.log("unary set resp", setResp);
  const getResp = await client.get(cache, key);
  console.log("unary get resp", getResp);
  if (getResp instanceof CacheGet.Hit) {
    console.log("unary get was a hit, value is:", getResp.valueString());
  } else {
    console.error("unary get was not a hit, should have been one");
  }

  /**
   * testing set data type
   */
  const setName = "my set";
  const setElement = "my element"
  const setAddEleResp = await client.setAddElement(cache, setName, setElement);
  console.log('set add element resp', setAddEleResp);
  const setFetchResp = await client.setFetch(cache, setName);
  if (setFetchResp instanceof CacheSetFetch.Hit) {
    console.log("set fetch response is a hit:", setFetchResp.valueArrayString())
  } else {
    console.error("set fetch was not a hit, should have been one");
  }

  /**
   * testing dictionary data type
   */
  const dictionaryName = "my dictionary";
  const dictKey = "my dict key";
  const dictValue = "my dict value";
  const dictSetFieldResp = await client.dictionarySetField(cache, dictionaryName, dictKey, dictValue);
  console.log('dictionary set field resp', dictSetFieldResp);
  const dictFetchResp = await client.dictionaryFetch(cache, dictionaryName);
  if (dictFetchResp instanceof CacheDictionaryFetch.Hit) {
    console.log("dictionary fetch response is a hit:", dictFetchResp.valueRecordStringString())
  } else {
    console.error("dictionary fetch was not a hit, should have been one");
  }


  const topicname = "topic"

  console.log("publishing...")
  const publishResp = await pubsub.publish(cache, topicname, 'hello!!!!');
  if (publishResp instanceof TopicPublish.Success) {
    console.log("successful publish");
  } else {
    console.log("publish error:");
    console.log(publishResp);
  }

  console.log("subscribing...")
  const subscribeResp = await pubsub.subscribe(cache, topicname, {
    onError(err, sub) {
      console.log(`error on topic pubsub. Topic: ${topicname}. Error: ${err}`)
    },
    onItem(item) {
      console.log(`topic item received! Topic: ${topicname}. Item: ${item.value()}`);
    }
  });
  console.log("done subscribing");
  console.log(subscribeResp);
}

export default function MomentoTestApp() {
  helper().then(() => console.log("helper ran successfully")).catch((e) => console.error("helper failed", e));
  return (
    <View style={styles.container}>
      <Text>Welcome to Chat!</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
