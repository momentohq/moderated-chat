import { StatusBar } from 'expo-status-bar';
import {Button, StyleSheet, Text, View} from 'react-native';
import {
  CacheClient,
  CredentialProvider,
  Configurations,
  CacheGet,
  CacheSetFetch,
  CacheDictionaryFetch,
  TopicClient,
  TopicConfigurations, TopicPublish, TopicSubscribe
} from "@gomomento/sdk-web";
import MomentoTest from "./MomentoTest";


export default function App() {
  return (<MomentoTest />);
}
