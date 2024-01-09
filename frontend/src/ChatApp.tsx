import React, { type ChangeEvent, useEffect, useRef, useState } from "react";
import {
  type ChatMessageEvent,
  MessageType,
  sendMessage,
  subscribeToTopic,
  type User,
} from "./utils/momento-web";
import { type TopicItem, type TopicSubscribe } from "@gomomento/sdk-web";
import translation from "./api/translation";
import momentoLogoGreen from "./assets/MomentoLogoGreen.svg";
import md5 from "md5";
import { debounce } from "lodash";

export interface LanguageOption {
  value: string;
  label: string;
}
const attachmentIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    className="h-6 w-6"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M12 5v14m0 0l-3-3m3 3l3-3M3 7h18a2 2 0 012 2v8a2 2 0 01-2 2H3a2 2 0 01-2-2V9a2 2 0 012-2z"
    />
  </svg>
);

const ChatApp = (props: { user: User }) => {
  const [chats, setChats] = useState<ChatMessageEvent[]>([]);
  const [textInput, setTextInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>(
    localStorage.getItem("selectedLanguage") || "en",
  );
  const [availableLanguages, setAvailableLanguages] = useState<
    LanguageOption[]
  >([]);
  const [imageInput, setImageInput] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showImagePreview, setShowImagePreview] = useState(false);

  useEffect(() => {
    if (imageInput) {
      openImagePreview();
    }
  }, [imageInput]);

  const closeImagePreview = () => {
    setShowImagePreview(false);
  };

  const openImagePreview = () => {
    if (imageInput) {
      setShowImagePreview(true);
    }
  };

  const handleImageButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageInput(file);
    }
  };

  const handleImageCancel = () => {
    setImageInput(null);
    setShowImagePreview(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const usernameColorMap: Record<string, string> = {};
  const getUsernameColor = (username: string) => {
    if (!usernameColorMap[username]) {
      const hash = md5(username);
      const r = parseInt(hash.slice(0, 2), 16);
      const g = parseInt(hash.slice(2, 4), 16);
      const b = parseInt(hash.slice(4, 6), 16);
      usernameColorMap[username] = `rgb(${r}, ${g}, ${b})`;
    }

    return usernameColorMap[username];
  };

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
        const supportedLanguages = response.supportedLanguages;
        setAvailableLanguages(supportedLanguages);
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
      // console.log("test", item.valueString());
      // console.log(`listening to: ${selectedLanguage}`);
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
    await subscribeToTopic(props.user, selectedLanguage, onItem, onError);
  };

  const onSendMessage = async () => {
    if (textInput) {
      console.log("sending message text", textInput);
      await sendMessage({
        user: props.user,
        messageType: MessageType.TEXT,
        message: textInput,
        sourceLanguage: selectedLanguage,
      });
      setTextInput("");
    } else if (imageInput) {
      console.log("sending message image", imageInput);
      // const imageArrayBuffer = await readFileAsArrayBuffer(imageInput);
      // const uint8Array = new Uint8Array(imageArrayBuffer);
      const imageAsBase64 = await readFileAsBase64(imageInput);
      console.log("imageAsBase64", imageAsBase64);
      await sendMessage({
        user: props.user,
        messageType: MessageType.IMAGE,
        message: imageAsBase64,
        sourceLanguage: selectedLanguage,
      });
      setImageInput(null);
      closeImagePreview();
    }
  };

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result && typeof reader.result === "string") {
          const imageBase64 = reader.result.split(",")[1]; // Get base64 part of the data URL
          resolve(imageBase64);
        } else {
          reject(new Error("Failed to read file as base64."));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const debouncedSendMessage = debounce(onSendMessage, 500);

  const onEnterClicked = async (e: { keyCode: number }) => {
    if (e.keyCode === 13 && textInput) {
      await onSendMessage();
    }
  };

  useEffect(() => {
    subscribeToTopic(props.user, selectedLanguage, onItem, onError)
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

  console.log(chats);
  return (
    <div className="flex h-screen flex-col bg-gradient-to-b from-gray-800 to-black text-white">
      <div className="flex flex-none items-center justify-between bg-gray-900 p-4">
        <div className={"flex flex-row space-x-4"}>
          <img
            src={momentoLogoGreen}
            className="h-8 w-8"
            alt="Momento logo Green"
          />
          <h1 className="text-3xl font-bold">Welcome to Momento Chat</h1>
        </div>
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
          <div key={index} className={`mb-2 flex items-start p-2`}>
            <div
              className="mr-6 flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full"
              style={{ backgroundColor: getUsernameColor(chat.user.id) }}
            >
              <span className="text-xs font-bold text-white">
                {chat.user.username.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <div className="mb-1 flex flex-row text-sm text-gray-400">
                {chat.user.username} -{" "}
                {new Date(chat.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {props.user.id === chat.user.id && (
                  <span className={"ml-2 font-bold"}>(You)</span>
                )}
              </div>
              {chat.messageType === MessageType.TEXT ? (
                <div className="text-white">{chat.message}</div>
              ) : (
                <img
                  src={`data:image/png;base64,${chat.message}`}
                  alt="Image"
                  className="h-auto max-w-full"
                />
              )}
              {/*<div className="text-white">{chat.message}</div>*/}
            </div>
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
        <div className="ml-2 flex items-center">
          <button
            onClick={handleImageButtonClick}
            className="rounded-full bg-gray-800 p-2 text-white transition duration-300 hover:bg-gray-900 focus:outline-none"
          >
            {attachmentIcon}
          </button>
        </div>
        <button
          onClick={debouncedSendMessage}
          disabled={!textInput && !imageInput}
          className="rounded bg-pink-500 p-2 text-white transition duration-300 hover:bg-pink-600 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-500 disabled:brightness-75"
        >
          Send
        </button>
      </div>
      <input
        type="file"
        accept="image/*"
        onChange={handleImageChange}
        className="hidden"
        ref={fileInputRef}
      />
      {showImagePreview && imageInput && (
        <div className="fixed left-0 top-0 flex h-full w-full items-center justify-center bg-black bg-opacity-75">
          <div className="w-full max-w-md rounded bg-white p-4 shadow-lg">
            <img
              src={URL.createObjectURL(imageInput)}
              alt="Image Preview"
              className="h-auto w-full rounded"
            />
            <div className="mt-4 flex justify-end">
              <button
                onClick={onSendMessage}
                className="rounded-full bg-pink-500 p-2 text-white transition duration-300 hover:bg-pink-600 focus:outline-none"
              >
                Send
              </button>
              <button
                onClick={handleImageCancel}
                className="ml-2 rounded-full bg-gray-500 p-2 text-white transition duration-300 hover:bg-gray-600 focus:outline-none"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatApp;
