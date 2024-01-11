import React, { type ChangeEvent, useEffect, useRef, useState } from "react";
import {
  type ChatMessageEvent,
  compressImage,
  getImageMessage,
  MessageType,
  sendImageMessage,
  sendMessage,
  subscribeToTopic,
  type User,
} from "./utils/momento-web";
import { type TopicItem, type TopicSubscribe } from "@gomomento/sdk-web";
import translation from "./api/translation";
import momentoLogoGreen from "./assets/MomentoLogoGreen.svg";
import md5 from "md5";
import { debounce } from "lodash";
import { attachmentIcon } from "./svgs/attachment-icon";
import { v4 } from "uuid";

export interface LanguageOption {
  value: string;
  label: string;
}

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
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showImagePreview, setShowImagePreview] = useState(false);

  useEffect(() => {
    if (imageInput) {
      openImagePreview();
    }
  }, [imageInput]);

  const closeImagePreview = () => {
    setImageInput(null);
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

  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (file) {
      const allowedExtensions = ["jpeg", "jpg", "png"];
      const fileExtension = file.name.split(".").pop()?.toLowerCase();

      if (fileExtension && allowedExtensions.includes(fileExtension)) {
        try {
          const compressedFile = await compressImage(file);
          setImageInput(compressedFile);
          console.log("compressed image", compressedFile);
        } catch (error) {
          console.error("Error compressing image:", error);
        }

        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } else {
        alert("Please select a valid image file (JPEG, JPG, or PNG).");
      }
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
      const r = parseInt(hash.slice(0, 2) as string, 16);
      const g = parseInt(hash.slice(2, 4) as string, 16);
      const b = parseInt(hash.slice(4, 6) as string, 16);
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

  const onItem = async (item: TopicItem) => {
    try {
      console.log(`listening to: ${selectedLanguage}`);
      const message = JSON.parse(item.valueString()) as ChatMessageEvent;
      if (message.messageType === MessageType.IMAGE) {
        message.message = await getImageMessage({
          imageId: message.message,
          user: props.user,
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
    await subscribeToTopic(props.user, selectedLanguage, onItem, onError);
  };

  const onSendMessage = async () => {
    if (textInput) {
      await sendMessage({
        user: props.user,
        messageType: MessageType.TEXT,
        message: textInput,
        sourceLanguage: selectedLanguage,
      });
      setTextInput("");
    } else if (imageInput) {
      const imageAsBase64 = await readFileAsBase64(imageInput);
      const imageId = `image-${v4()}`;
      await sendImageMessage({
        imageId,
        base64Image: imageAsBase64,
        user: props.user,
      });
      await sendMessage({
        user: props.user,
        messageType: MessageType.IMAGE,
        message: imageId,
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
          const [, base64data] =
            reader.result.match(/data:.*;base64,(.*)/) || [];
          if (base64data) {
            resolve(base64data);
          } else {
            reject(new Error("Invalid base64 format."));
          }
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
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chats]);

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
                <div className="text-white" style={{ whiteSpace: "pre-line" }}>
                  {chat.message}
                </div>
              ) : (
                <img
                  src={`data:image/jpeg;base64,${chat.message}`}
                  alt="Image"
                  className="h-auto max-w-full"
                />
              )}
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
        <div className="group ml-2 flex items-center">
          <button
            onClick={handleImageButtonClick}
            className="relative mr-3 rounded-full bg-gray-800 p-2 text-white transition duration-300 hover:bg-gray-900 focus:outline-none"
          >
            {attachmentIcon}
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 -translate-y-2 transform rounded bg-black px-1 text-xs text-white opacity-0 group-hover:opacity-100">
              Upload an image
            </span>
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
          <div className="flex w-full max-w-md flex-col rounded bg-white p-4 shadow-lg">
            <div className={"mb-2 text-center text-xl font-bold text-black"}>
              Preview Image
            </div>
            <img
              src={URL.createObjectURL(imageInput)}
              alt="Image Preview"
              className="h-auto max-h-80 w-full rounded"
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
