import { type User } from "../shared/models";
import { v4 } from "uuid";

const usernameLocalStorageKey = "username-v2";

export const getUser = (): User => {
  const storedUser = localStorage.getItem(usernameLocalStorageKey);
  if (!storedUser) {
    throw new Error("User not found");
  }
  return JSON.parse(storedUser) as User;
};

export const createUser = (username: string) => {
  const user: User = {
    username,
    id: v4(),
  };
  localStorage.setItem(usernameLocalStorageKey, JSON.stringify(user));
};

export const doesUserExist = (): boolean => {
  return !!localStorage.getItem(usernameLocalStorageKey);
};
