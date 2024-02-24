import 'react-native-get-random-values';
import './polyfill';
import ChatApp from './ChatApp';
import {useState} from 'react';
import {Button, StyleSheet, TextInput, View, Text} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {User} from './shared/models';
import {v4} from 'uuid';
import MoChatPeekUp from './assets/mochat-mo-peek-up';

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
    },
    input: {
      height: 40,
      width: '80%',
      margin: 12,
      borderWidth: 1,
      borderColor: '#c4f135',
      color: '#ffffff',
      padding: 8,
    },
    welcomeText: {
      marginTop: -24,
      color: '#c4f135',
      fontWeight: 'bold',
      fontSize: 24,
    }
  });

  return !existingUser ? (
    <View style={styles.container}>
      <MoChatPeekUp width={'50%'} height={'50%'} />
      <Text style={styles.welcomeText}>Welcome to MoChat!</Text>
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
