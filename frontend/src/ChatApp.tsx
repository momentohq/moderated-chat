import React, { type ChangeEvent, useEffect, useRef, useState } from "react";
import {
  compressImage,
  getImageMessage,
  sendImageMessage,
  sendTextMessage,
  subscribeToTopic,
} from "./utils/momento-web";
import { type TopicItem, type TopicSubscribe } from "@gomomento/sdk-web";
import translation from "./api/translation";
import moChatMoPeekUpLogo from "./assets/mochat-mo-peek-up.svg";
import md5 from "md5";
import { debounce } from "lodash";
import { attachmentIcon } from "./svgs/attachment-icon";
import { moSendIcon } from "./svgs/mo-send-icon";
import { type ChatMessageEvent, MessageType } from "./shared/models";
import { getUser } from "./utils/user";

export interface LanguageOption {
  value: string;
  label: string;
}

const ChatApp = () => {
  const user = getUser();
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

  const languageLabelsArray = availableLanguages.map(
    (language) => language.label,
  );
  const availableFlags = languageLabelsArray.map(
    (label) => label.split(" ")[0],
  );

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
  const colors = ["#C2B2A9", "#E1D9D5", "#EAF8B6", "#ABE7D2"];

  const getUsernameColor = (username: string) => {
    if (!usernameColorMap[username]) {
      const storedColor = localStorage.getItem(`${username}_color`);
      if (storedColor && colors.includes(storedColor)) {
        usernameColorMap[username] = storedColor;
      } else {
        const hash = md5(username);
        const colorIndex =
          parseInt(hash.slice(0, 1) as string, 16) % colors.length;
        usernameColorMap[username] = colors[colorIndex];
        localStorage.setItem(`${username}_color`, usernameColorMap[username]);
      }
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
          sourceLanguage: selectedLanguage,
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
    await subscribeToTopic(selectedLanguage, onItem, onError);
  };

  const onSendMessage = async () => {
    if (textInput) {
      await sendTextMessage({
        messageType: MessageType.TEXT,
        message: textInput,
        sourceLanguage: selectedLanguage,
      });
      setTextInput("");
    } else if (imageInput) {
      const imageAsBase64 = await readFileAsBase64(imageInput);
      await sendImageMessage({
        base64Image: imageAsBase64,
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
    subscribeToTopic(selectedLanguage, onItem, onError)
      .then(() => {
        console.log("successfully subscribed");
      })
      .catch((e) => console.error("error subscribing to topic", e));
    void fetchLatestChats();
  }, [selectedLanguage]);

  const scrollToBottom = () => {
    const chatContainer = document.querySelector(".scrollbar-width-thin");
    const scrollHeight = chatContainer?.scrollHeight;
    chatContainer?.scrollTo(0, scrollHeight ?? 0);
  };

  useEffect(() => {
    scrollToBottom();
  }, [chats]);

  return (
    <div
      className="flex h-screen flex-col text-white"
      style={{ background: "radial-gradient(circle, #25392B, #0E2515)" }}
    >
      <div className="relative flex h-20 flex-none justify-between bg-green-950">
        <div className={"flex flex-row items-center space-x-2"}>
          <img
            src={moChatMoPeekUpLogo}
            className="mx-2 mt-2 h-20 w-20"
            alt="Momento logo Green"
          />
          <div
            className={"font-manrope text-xl font-bold sm:text-2xl md:text-3xl"}
          >
            Welcome to MoChat
          </div>
        </div>
        <div className="flex items-center md:mr-5">
          <select
            className="hidden rounded-lg border-none bg-transparent shadow focus:border-green-900 focus:outline-none focus:ring-1 focus:ring-green-900 md:block"
            value={selectedLanguage}
            onChange={handleLanguageSelect}
          >
            {availableLanguages.map((language) => (
              <option key={language.value} value={language.value}>
                {language.label}
              </option>
            ))}
          </select>
          <select
            className="xs:block rounded-lg border-none bg-transparent shadow focus:border-green-900 focus:outline-none focus:ring-1 focus:ring-green-900 md:hidden"
            value={selectedLanguage}
            onChange={handleLanguageSelect}
          >
            {availableFlags.map((flag, index) => (
              <option key={index} value={availableLanguages[index].value}>
                {flag}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="scrollbar-width-thin scrollbar-thumb-gray-300 scrollbar-track-transparent flex-1 overflow-auto p-4 font-inter">
        {chats.map((chat, index) => (
          <div key={index} className={`mb-2 flex items-end p-2`}>
            <div
              className="mr-6 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: getUsernameColor(chat.user.id) }}
            >
              <span className="text-xs font-bold text-black">
                {chat.user.username.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className={"flex flex-col"}>
              <div className={"ml-2 text-sm"}>
                {chat.user.username} -{" "}
                {new Date(chat.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {user.id === chat.user.id && (
                  <span className={"ml-2"}>(You)</span>
                )}
              </div>
              <div
                className="p-2.5"
                style={{
                  whiteSpace: "pre-line",
                  backgroundColor:
                    chat.user.id === user.id ? "#00C88C" : "#E1D9D5",
                  borderRadius: "15px",
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                  borderBottomLeftRadius: "0",
                  maxWidth: "70%",
                  overflowWrap: "break-word",
                }}
              >
                <div
                  className={`mb-1 flex flex-row text-sm ${
                    chat.user.id === user.id ? "text-white" : "text-gray-500"
                  }`}
                ></div>
                {chat.messageType === MessageType.TEXT ? (
                  <div className="text-green-900">{chat.message}</div>
                ) : (
                  <img
                    src={`data:image/jpeg;base64,${chat.message}`}
                    alt="Image"
                    className="h-auto max-w-full"
                  />
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className={"rounded-xl bg-green-950 p-2.5"}>
        <div className="mx-4 flex items-center">
          <input
            type="text"
            placeholder="Type your message..."
            value={textInput}
            onKeyDown={onEnterClicked}
            onChange={(e) => setTextInput(e.target.value)}
            className="mr-2 flex-1 rounded-xl border border-green-900 bg-green-950 text-white placeholder-white focus:border-green-900 focus:outline-none focus:ring-2 focus:ring-green-900"
          />
          <div className="group flex items-center md:ml-2">
            <button
              onClick={handleImageButtonClick}
              className="relative rounded p-2 text-black transition duration-300 hover:bg-green-900 focus:outline-none"
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
            className="rounded text-black transition duration-300 hover:bg-green-900 focus:outline-none disabled:cursor-not-allowed disabled:brightness-50"
          >
            {moSendIcon}
          </button>
        </div>
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
