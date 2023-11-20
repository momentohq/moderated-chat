import React, { type ChangeEvent, useEffect, useRef, useState } from "react";
import {
  type ChatMessageEvent,
  sendMessage,
  subscribeToTopic,
} from "./utils/momento-web";
import { type TopicItem, type TopicSubscribe } from "@gomomento/sdk-web";
import translation from "./api/translation";

interface LanguageOption {
  value: string;
  label: string;
}
const ChatApp = (props: { username: string }) => {
  const [chats, setChats] = useState<ChatMessageEvent[]>([]);
  const [textInput, setTextInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>(
    localStorage.getItem("selectedLanguage") || "en",
  );
  const [availableLanguages, setAvailableLanguages] = useState<
    LanguageOption[]
  >([]);

  const fetchLatestChats = () => {
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
        const supportedLanguagesMap = response.supportedLanguagesMap;
        const mappedLanguages: LanguageOption[] = Object.entries(
          supportedLanguagesMap,
        ).map(([lang, label]) => ({
          value: lang,
          label: label,
        }));
        setAvailableLanguages(mappedLanguages);
      })
      .catch((e) => console.error("error fetching supported languages", e));
  };

  useEffect(() => {
    void fetchSupportedLanguages();
    void fetchLatestChats();
  }, []);

  const handleLanguageSelect = (e: ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    localStorage.setItem("selectedLanguage", selectedValue);
    setSelectedLanguage(selectedValue);
  };

  const onItem = (item: TopicItem) => {
    try {
      console.log("test", item.valueString());
      console.log(`listening to: ${selectedLanguage}`);
      const message = JSON.parse(item.valueString()) as ChatMessageEvent;
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
    await subscribeToTopic(props.username, selectedLanguage, onItem, onError);
  };

  const onSendMessage = async () => {
    await sendMessage({
      username: props.username,
      message: textInput,
      sourceLanguage: selectedLanguage,
    });
    setTextInput("");
  };

  const onEnterClicked = async (e: { keyCode: number }) => {
    if (e.keyCode === 13 && textInput) {
      await onSendMessage();
    }
  };

  useEffect(() => {
    subscribeToTopic(props.username, selectedLanguage, onItem, onError)
      .then(() => {
        console.log("successfully subscribed");
      })
      .catch((e) => console.error("error subscribing to topic", e));
    void fetchLatestChats();
  }, [selectedLanguage]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chats]);

  return (
    <div className="flex h-screen flex-col bg-gradient-to-b from-gray-800 to-black text-white">
      <div className="flex flex-none items-center justify-between bg-gray-900 p-4">
        <h1 className="text-3xl font-bold">Welcome to the Chat App</h1>
        <div className="flex items-center">
          <select
            className="border-none bg-transparent focus:outline-none"
            value={selectedLanguage}
            onChange={handleLanguageSelect}
          >
            {availableLanguages.map((language) => (
              <option key={language.value} value={language.value}>
                {language.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex-1 overflow-y-scroll p-4">
        {chats.map((chat, index) => (
          <div
            key={index}
            className={`mb-2 p-2 ${
              chat.username != props.username ? "bg-blue-500" : "bg-green-500"
            } animate__animated animate__fadeIn rounded-md`}
          >
            <div className="mb-1 text-sm text-gray-700">
              {chat.username} - {new Date(chat.timestamp).toLocaleTimeString()}
            </div>
            <div className="text-white">{chat.message}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="flex items-center bg-gray-700 p-4">
        <input
          type="text"
          placeholder="Type your message..."
          value={textInput}
          onKeyDown={onEnterClicked}
          onChange={(e) => setTextInput(e.target.value)}
          className="mr-2 flex-1 rounded border border-gray-500 bg-gray-800 p-2 text-white focus:outline-none"
        />
        <button
          onClick={onSendMessage}
          disabled={!textInput}
          className="rounded bg-pink-500 p-2 text-white transition duration-300 hover:bg-pink-600 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-500 disabled:brightness-75"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatApp;
