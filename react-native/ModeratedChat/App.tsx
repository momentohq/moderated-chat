import 'react-native-get-random-values';
import momentoReactNativePolyfill from '@gomomento/sdk-react-native';
import ChatApp from './ChatApp';
import {useState} from 'react';
import {Button, StyleSheet, TextInput, View} from 'react-native';

momentoReactNativePolyfill();

export default function App() {
  const [inputValue, setInputValue] = useState("");
  const [existingUser, setExistingUser] = useState("");
  const [error, setError] = useState<string | null>(null);
  const login = () => {
    setExistingUser(inputValue);
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#25392B',
      alignItems: 'center',
      justifyContent: 'center'
    },
    input: {
      height: 40,
      margin: 12,
      borderWidth: 1,
      padding: 10,
    },
  });

  return existingUser == "" ? (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder={"Enter your username"}
        multiline={false}
        value={inputValue}
        onChangeText={setInputValue}/>
      <Button
        title={"Submit"}
        onPress={login}/>
    </View>
  ) : (
    <ChatApp username={existingUser} />
  );
}
