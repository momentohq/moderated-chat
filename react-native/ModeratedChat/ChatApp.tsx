import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Image,
  Pressable,
  FlatList,
  useColorScheme
} from 'react-native';
import translation from './api/translation';
import {useEffect, useRef, useState} from 'react';
import {ChatMessageEvent, MessageType, User} from './shared/models';
import {SelectList} from 'react-native-dropdown-select-list/index';
import {TopicItem, TopicSubscribe} from '@gomomento/sdk-web';
import {getImageMessage, sendImageMessage, sendTextMessage, subscribeToTopic} from './utils/momento-web';
import Storage from 'expo-storage';
import MoChatSend from './assets/mochat-send-button';
import MoChatPeekUp from './assets/mochat-mo-peek-up';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import {manipulateAsync, SaveFormat} from 'expo-image-manipulator';
import {getInfoAsync} from 'expo-file-system';
import {ImagePickerAsset} from 'expo-image-picker';

export interface LanguageOption {
  value: string;
  label: string;
}

type ChatProps = {
  user: User;
}

const ChatApp = (props: ChatProps) => {
  const user = props.user;
  const [chats, setChats] = useState<ChatMessageEvent[]>([]);
  const [textInput, setTextInput] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [availableLanguages, setAvailableLanguages] = useState<
    LanguageOption[]
  >([]);

  const flatListRef = useRef(null);
  const fetchLatestChats = () => {
    if (!selectedLanguage) {
      return;
    }
    translation
      .getLatestChats(selectedLanguage)
      .then((_chats) => {
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
        setAvailableLanguages(dropdownLanguages);
      })
      .catch((e) => console.error("error fetching supported languages", e));
  };

  useEffect(() => {
    const firstLoad = async () => {
      try {
        await Storage.setItem({key: 'loggedInUser', value: JSON.stringify(user)});
        const savedLanguage = await Storage.getItem({key: 'selectedLanguage'});
        setSelectedLanguage(savedLanguage || "en");
      } catch (err) {
        console.log(err);
      }
    };
    void firstLoad();
    fetchLatestChats();
    fetchSupportedLanguages();
  }, [user]);

  const saveSelectedLanguage = async (lang: string) => {
    try {
      await Storage.setItem({key: 'selectedLanguage', value: lang});
    } catch (err) {
      console.log(err);
    }
  }

  const handleLanguageSelect = (selectedValue: string) => {
    setSelectedLanguage(selectedValue);
    void saveSelectedLanguage(selectedValue);
  };

  const onItem = async (item: TopicItem) => {
    try {
      const message = JSON.parse(item.valueString()) as ChatMessageEvent;
      // TODO: Image support
      if (message.messageType === MessageType.IMAGE) {
        message.message = await getImageMessage({
          imageId: message.message,
          sourceLanguage: selectedLanguage,
        });
      }
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
    await sendTextMessage({
      messageType: MessageType.TEXT,
      message: textInput,
      sourceLanguage: selectedLanguage,
    });
    setTextInput("");
  };

  useEffect(() => {
    if (!selectedLanguage) {
      return;
    }
    subscribeToTopic(selectedLanguage, onItem, onError)
      .then(() => {
        // celebrate a job well done
      })
      .catch((e) => console.error("error subscribing to topic", e));
    fetchLatestChats();
  }, [selectedLanguage]);

  const insets = useSafeAreaInsets();
  const styles = StyleSheet.create({
    appContainer: {
      flex: 1,
      paddingTop: insets.top,
    },
    container: {
      flex: 1,
      backgroundColor: '#25392B',
      width: "100%",
    },
    lightContainer: {
      backgroundColor: '#c4f135',
    },
    darkContainer: {
      backgroundColor: '#25392B',
    },
    banner: {
      flexDirection: 'row',
      backgroundColor: '#25392B',
      alignItems: 'center',
      justifyContent: 'space-evenly',
      width: '100%',
      padding: 4,
      zIndex: 999,
      overflow: 'visible',
    },
    dropdownInput: {
      color: '#ffffff',
      width: 85,
    },
    dropdownText: {
      color: '#ffffff',
    },
    dropdownOptionsList: {
      position: 'absolute',
      top: 40,
      width: "100%",
      zIndex: 999,
      overflow: 'visible',
      backgroundColor: '#25392B'
    },
    myItem: {
      backgroundColor: '#ffcccc',
    },
    item: {
      backgroundColor: '#cccccc',
      padding: 8,
      marginVertical: 4,
      marginHorizontal: 16,
      borderWidth: 1,
      borderRadius: 10,
    },
    input: {
      height: 40,
      margin: 12,
      borderWidth: 1,
      padding: 10,
      width: '70%',
      color: '#ffffff',
      borderColor: '#c4f135',
    },
    messageBar: {
      flexDirection: 'row',
      backgroundColor: '#25392B',
      justifyContent: 'space-evenly',
      alignItems: 'center',
      padding: 4,
    },
    welcomeMessage: {
      color: '#c4f135',
      fontWeight: 'bold',
    }
  });
  const themeContainerStyle = useColorScheme() === 'dark' ? styles.darkContainer : styles.lightContainer;

  const maxImageSize = 500000;
  const resizeImage = async (asset: ImagePickerAsset) => {
    const origInfo = await getInfoAsync(asset.uri);
    if (!origInfo.exists) {
      return;
    }
    const origSize = asset.fileSize;
    const shrinkBy = Math.ceil(origSize / maxImageSize);
    const newWidth = Math.floor(asset.width / shrinkBy);
    const manipResult = await manipulateAsync(
      asset.uri,
      [{ resize: { width: newWidth } }],
      { compress: 0.3, format: SaveFormat.JPEG, base64: true }
    );
    return manipResult.base64;
  }

  const pickImageAsync = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      base64: true
    });

    if (result.canceled) {
      return;
    }
    const asset = result.assets[0];
    let base64Image = asset.base64;
    if (asset.fileSize > maxImageSize) {
      base64Image = await resizeImage(asset);
    }
    await sendImageMessage({
      base64Image: base64Image,
      sourceLanguage: selectedLanguage,
    });
  }

  return (
    <View style={styles.appContainer}>
      <View style={[styles.banner]}>
        <MoChatPeekUp width={32} height={32} />
        <Text style={styles.welcomeMessage}>Welcome to MoChat!</Text>
        <SelectList
          inputStyles={styles.dropdownInput}
          dropdownTextStyles={styles.dropdownText}
          dropdownStyles={styles.dropdownOptionsList}
          setSelected={(val) => handleLanguageSelect(val)}
          data={availableLanguages}
          save="key"
          search={false}
          defaultOption={{key:'en', value: '🇺🇸 English'}}
          maxHeight={300}
        />
      </View>
      <View style={[styles.container, themeContainerStyle]}>
        <FlatList
          ref={flatListRef}
          data={chats}
          onContentSizeChange={() => flatListRef.current.scrollToEnd({animated: true})}
          persistentScrollbar={true}
          renderItem={
            ({item}) =>
              <View style={(item.user.id == user.id) ? [styles.item, styles.myItem] : styles.item}>
                <Text>
                {item.user.username} - {new Date(item.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                </Text>
                <View>
                {item.messageType == 'text' ? (
                  <Text>{item.message}</Text>
                ) : (
                  <Image
                    source={{uri: `data:image/jpeg;base64,${item.message}`}}
                    width={300}
                    height={300}
                  />
                )}
                </View>
              </View>
          }/>
      </View>
      <View style={styles.messageBar}>
        <TextInput
          style={styles.input}
          placeholder={'Type your message...'}
          placeholderTextColor={'#999999'}
          value={textInput}
          onChangeText={setTextInput}
        ></TextInput>
        <Pressable onPress={pickImageAsync}>
          <Image
            source={require('./assets/attachment-icon.png')}/>
        </Pressable>
        <Pressable onPress={onSendMessage}>
          <MoChatSend width={32} height={32} />
        </Pressable>
      </View>
    </View>
  )
}

export default ChatApp;
