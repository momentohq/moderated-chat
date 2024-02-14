import {getUser} from './utils/user';
import {View, Text, StyleSheet} from 'react-native';
import translation from './api/translation';
import {useEffect, useState} from 'react';
import {ChatMessageEvent} from './shared/models';

export interface LanguageOption {
  value: string;
  label: string;
}

const ChatApp = () => {
  const user = getUser();
  const [chats, setChats] = useState<ChatMessageEvent[]>([]);
  // TODO: store locally
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");
  const [availableLanguages, setAvailableLanguages] = useState<
    LanguageOption[]
  >([]);

  const fetchLatestChats = () => {
    translation
      .getLatestChats(selectedLanguage)
      .then((_chats) => {
        console.log("chats are set");
        setChats(_chats.messages);
      })
      .catch((e) => console.error("error fetching latest chats", e));
  };

  const fetchSupportedLanguages = () => {
    translation
      .getSupportedLanguages()
      .then((response) => {
        const supportedLanguages = response.supportedLanguages;
        setAvailableLanguages(supportedLanguages);
        console.log("languages are set");
      })
      .catch((e) => console.error("error fetching supported languages", e));
  };

  useEffect(() => {
    fetchLatestChats();
    fetchSupportedLanguages();
  }, []);

  return (
    <View style={styles.container}>
      <Text>So far so good!</Text>
      <Text>{chats[0].user.username}</Text>
      <Text>{chats[0].message}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ChatApp;
