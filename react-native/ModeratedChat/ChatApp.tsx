import {getUser} from './utils/user';
import {View, Text, StyleSheet, ScrollView, FlatList} from 'react-native';
import translation from './api/translation';
import {useEffect, useState} from 'react';
import {ChatMessageEvent} from './shared/models';
import {SelectList} from 'react-native-dropdown-select-list/index';
// import Storage from 'expo-storage';

export interface LanguageOption {
  value: string;
  label: string;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#25392B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  banner: {
    flex: 1,
    backgroundColor: '#cccccc',
    alignItems: 'flex-start',
    justifyContent: 'center',
    height: '20%',
    padding: '5%'
  },
  item: {
    backgroundColor: '#f9c2ff',
    padding: 20,
    marginVertical: 8,
    marginHorizontal: 16,
  },
});

const ChatApp = () => {
  const user = getUser();
  const [chats, setChats] = useState<ChatMessageEvent[]>([]);
  // TODO: store locally
  const [selectedLanguage, setSelectedLanguage] = useState<string>(
    // Storage.getString('selectedLanguage') || "en"
    "en"
  );
  const [availableLanguages, setAvailableLanguages] = useState<
    LanguageOption[]
  >([]);

  const fetchLatestChats = () => {
    translation
      .getLatestChats(selectedLanguage)
      .then((_chats) => {
        console.log(`got ${_chats.messages.length} messages`);
        setChats(_chats.messages);
      })
      .catch((e) => console.error("error fetching latest chats", e));
  };

  const fetchSupportedLanguages = () => {
    translation
      .getSupportedLanguages()
      .then((response) => {
        const supportedLanguages = response.supportedLanguages;
        const dropdownLanguages = [];
        for (const {label, value} of supportedLanguages) {
          dropdownLanguages.push({key: value, value: label})
        }
        console.log(supportedLanguages);
        console.log(dropdownLanguages);
        setAvailableLanguages(dropdownLanguages);
      })
      .catch((e) => console.error("error fetching supported languages", e));
  };

  useEffect(() => {
    fetchLatestChats();
    fetchSupportedLanguages();
  }, []);

  const handleLanguageSelect = (selectedValue: string) => {
    // TODO: store locally
    // localStorage.setItem("selectedLanguage", selectedValue);
    console.log("setting language to " + selectedValue);
    setSelectedLanguage(selectedValue);
  };

  return (
    <ScrollView>
      <View style={styles.container}>
        <View style={styles.banner}>
          <Text>Welcome to MoChat!</Text>
        </View>
        <View>
          <SelectList
            setSelected={(val) => handleLanguageSelect(val)}
            data={availableLanguages}
            save="key"
          />
        </View>
      </View>
    </ScrollView>
  )
}

export default ChatApp;
