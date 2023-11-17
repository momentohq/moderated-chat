import React, { useState } from "react";
import ChatApp from "./ChatApp";
import { setUsername, username } from "./utils/momento-web";
import momentoLogo from "./assets/MomentoLogo.svg";

const App: React.FC = () => {
  const storedUserName = localStorage.getItem("username");
  const [inputValue, setInputValue] = useState("");
  const [isUsernameSet, setIsUsernameSet] = useState(storedUserName !== null);

  const handleUsernameInput = () => {
    if (inputValue.trim() !== "") {
      setUsername(inputValue);
      setIsUsernameSet(true);
      localStorage.setItem("username", inputValue);
    }
  };

  const handleKeyDown = (e: { keyCode: number }) => {
    if (e.keyCode == 13) {
      setIsUsernameSet(true);
    }
  };

  return !isUsernameSet ? (
    <div className="flex h-screen items-center justify-center bg-gradient-to-r from-gray-800 to-gray-700">
      <div>
        <img src={momentoLogo} className="h-32 w-80" alt="Momento logo" />
        <div className="flex flex-col items-center rounded bg-white p-10 shadow-md">
          <label className="mb-2 block text-lg font-semibold text-gray-800">
            Enter your username:
          </label>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="mb-4 w-full border p-2"
          />
          <button
            onKeyDown={handleKeyDown}
            onClick={handleUsernameInput}
            className="rounded bg-pink-500 p-2 text-white transition duration-300 hover:bg-pink-600 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-500 disabled:brightness-75"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  ) : (
    <ChatApp username={username} />
  );
};

export default App;
