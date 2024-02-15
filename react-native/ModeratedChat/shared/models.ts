export type User = {
  username: string;
  id: string;
};

export enum MessageType {
  TEXT = "text",
  IMAGE = "image",
}

export type ChatMessageEvent = {
  user: User;
  messageType: MessageType;
  message: string;
  sourceLanguage: string;
  timestamp: number;
};

export type PostMessageEvent = {
  messageType: MessageType;
  message: string;
  sourceLanguage: string;
  timestamp: number;
};
