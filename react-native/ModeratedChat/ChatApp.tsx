import {createUser, getUser} from './utils/user';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Image,
  Pressable
} from 'react-native';
import translation from './api/translation';
import {useEffect, useState} from 'react';
import {ChatMessageEvent, MessageType, User} from './shared/models';
import {SelectList} from 'react-native-dropdown-select-list/index';
import {TopicItem, TopicSubscribe} from '@gomomento/sdk-web';
import {sendTextMessage, subscribeToTopic} from './utils/momento-web';
import Storage from 'expo-storage';
import MoChatSend from './assets/mochat-send-button';
import momentoReactNativePolyfill from '@gomomento/sdk-react-native';

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
  input: {
    height: 40,
    margin: 12,
    borderWidth: 1,
    padding: 10,
  },
});

momentoReactNativePolyfill();

type ChatProps = {
  username: string
}

const ChatApp = (props: ChatProps) => {
  createUser(props.username);
  const user: User = getUser();
  const [chats, setChats] = useState<ChatMessageEvent[]>([]);
  const [textInput, setTextInput] = useState("");
  // TODO: store locally
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [availableLanguages, setAvailableLanguages] = useState<
    LanguageOption[]
  >([]);

  const fetchLatestChats = () => {
    console.log(`fetching messages for language: ${selectedLanguage}`);
    if (!selectedLanguage) {
      console.log("selected language not set . . . waiting");
      return;
    }
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
    const firstLoad = async () => {
      try {
        const savedLanguage = await Storage.getItem({key: 'selectedLanguage'});
        console.log(`saved language from storage: ${savedLanguage}`);
        setSelectedLanguage(savedLanguage || "en");
        console.log(`using saved language: ${savedLanguage || "en"}`);
      } catch (err) {
        console.log(err);
      }
    };
    firstLoad();
    fetchLatestChats();
    fetchSupportedLanguages();

  }, []);

  const saveSelectedLanguage = async (lang: string) => {
    try {
      console.log(`in saveSelectedLanguage with ${lang}`);
      await Storage.setItem({key: 'selectedLanguage', value: lang});
      console.log(`retrieving stored item: ${await Storage.getItem({key: 'selectedLanguage'})}`);
    } catch (err) {
      console.log(err);
    }
  }

  const handleLanguageSelect = (selectedValue: string) => {
    // TODO: store locally
    // localStorage.setItem("selectedLanguage", selectedValue);
    console.log("setting language to " + selectedValue);
    setSelectedLanguage(selectedValue);
    saveSelectedLanguage(selectedValue);
  };

  const onItem = async (item: TopicItem) => {
    try {
      console.log(`listening to: ${selectedLanguage}`);
      const message = JSON.parse(item.valueString()) as ChatMessageEvent;
      // TODO: Image support
      // if (message.messageType === MessageType.IMAGE) {
      //   message.message = await getImageMessage({
      //     imageId: message.message,
      //     sourceLanguage: selectedLanguage,
      //   });
      // }
      setChats((curr) => [...curr, message]);
    } catch (e) {
      console.error("unable to parse chat message", e);
    }
  };

  const onError = async (
    error: TopicSubscribe.Error,
    _sub: TopicSubscribe.Subscription,
  ) => {
    console.error(
      "received error from momento, getting new token and resubscribing",
      error,
    );
    await subscribeToTopic(selectedLanguage, onItem, onError);
  };

  const onSendMessage = async () => {
    if (textInput) {
      console.log(`sending message ${textInput}`);
      await sendTextMessage({
        messageType: MessageType.TEXT,
        message: textInput,
        sourceLanguage: selectedLanguage,
      });
      setTextInput("");
    } else {
      // TODO: image support
      console.log("someday i'll send an image");
    }
    // } else if (imageInput) {
    //   const imageAsBase64 = await readFileAsBase64(imageInput);
    //   await sendImageMessage({
    //     base64Image: imageAsBase64,
    //     sourceLanguage: selectedLanguage,
    //   });
    //   setImageInput(null);
    //   closeImagePreview();
    // }
  };

  useEffect(() => {
    subscribeToTopic(selectedLanguage, onItem, onError)
      .then(() => {
        console.log("successfully subscribed");
      })
      .catch((e) => console.error("error subscribing to topic", e));
    void fetchLatestChats();
  }, [selectedLanguage]);

  // const scrollToBottom = () => {
  //   const chatContainer = document.querySelector(".scrollbar-width-thin");
  //   const scrollHeight = chatContainer?.scrollHeight;
  //   chatContainer?.scrollTo(0, scrollHeight ?? 0);
  // };
  //
  // useEffect(() => {
  //   scrollToBottom();
  // }, [chats]);

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
            search={false}
            defaultOption={{key:'en', value: '🇺🇸 English'}}
            maxHeight={300}
          />
        </View>
        <View>
          {chats.map((chat, index) => (
            <Text key={index}>{chat.user.username} - {new Date(chat.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}

              {chat.messageType == 'text' ? (
                "\n" + chat.message + "\n"
              ) : (
                '\nimage data\n'
              )}</Text>
          ))}
        </View>
        <View>
          <TextInput
            style={styles.input}
            placeholder={'Type your message...'}
            value={textInput}
            onChangeText={setTextInput}
          ></TextInput>
          <Pressable onPress={() => alert("woohoo!")}>
            <Image
              source={require('./assets/attachment-icon.png')}/>
          </Pressable>
          <Pressable onPress={onSendMessage}>
            <Image
              source={require('./assets/send-icon.png')}
              height={10}
              width={10}
            />
          </Pressable>
          <MoChatSend width={32} height={32} />
        </View>
      </View>
    </ScrollView>
  )
}

export default ChatApp;
