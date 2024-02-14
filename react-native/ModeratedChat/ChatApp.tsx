import {getUser} from './utils/user';
import {View, Text, StyleSheet} from 'react-native';

const ChatApp = () => {
  const user = getUser();

  return (
    <View style={styles.container}>
      <Text>So far so good!</Text>
      <Text>{user.username}</Text>
      <Text>{user.id}</Text>
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
