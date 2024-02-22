import { type User } from "../shared/models";
import Storage from 'expo-storage';

export const getUser = async (): Promise<User> => {
  const storedUser = await Storage.getItem({key: 'loggedInUser'});
  console.log(`getUser returning user: ${storedUser}`);
  return JSON.parse(storedUser) as User;
};
