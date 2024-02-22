import 'react-native-get-random-values';
import './polyfill';
import ChatApp from './ChatApp';
import {useState} from 'react';
import {Button, StyleSheet, TextInput, View} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {User} from './shared/models';
import {v4} from 'uuid';

export default function App() {
  const [inputValue, setInputValue] = useState("");
  const [existingUser, setExistingUser] = useState<User>(null);
  const [error, setError] = useState<string | null>(null);
  const login = () => {
    setExistingUser(
      {
        username: inputValue,
        id: v4()
      }
    );
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
      width: '80%',
      margin: 12,
      borderWidth: 1,
      padding: 10,
    },
  });

  return !existingUser ? (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder={'Enter your username'}
        placeholderTextColor={'#999999'}
        multiline={false}
        value={inputValue}
        onChangeText={setInputValue}/>
      <Button
        title={"Submit"}
        onPress={login}/>
    </View>
  ) : (
    <SafeAreaProvider>
      <ChatApp user={existingUser} />
    </SafeAreaProvider>
  );

}
