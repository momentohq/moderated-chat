import React, { useState } from "react";
import ChatApp from "./ChatApp";
import momentoLogo from "./assets/MomentoLogo.svg";
import Filter from "bad-words";
import { createUser, doesUserExist } from "./utils/user";

const App: React.FC = () => {
  const [inputValue, setInputValue] = useState("");
  const [existingUser, setExistingUser] = useState<boolean>(doesUserExist());
  const [error, setError] = useState<string | null>(null);

  const profanityFilter = new Filter();

  const handleUsernameInput = () => {
    const trimmedValue = inputValue.trim();

    if (trimmedValue) {
      if (profanityFilter.isProfane(trimmedValue)) {
        setError("Username contains profanity. Please choose another.");
      } else {
        createUser(trimmedValue);
        setExistingUser(true);
        setError(null);
      }
    }
  };

  const handleKeyDown = (e: { keyCode: number }) => {
    if (e.keyCode == 13) {
      handleUsernameInput();
    }
  };

  return !existingUser ? (
    <div
      className="flex h-screen items-center justify-center"
      style={{ background: "radial-gradient(circle, #25392B, #0E2515)" }}
    >
      <div>
        <img src={momentoLogo} className="h-32 w-80" alt="Momento logo" />
        <div className="flex flex-col items-center rounded bg-white p-10 shadow-md">
          <label className="mb-2 block text-lg font-semibold text-gray-800">
            Enter your username:
          </label>
          <input
            type="text"
            value={inputValue ?? ""}
            onChange={(e) => setInputValue(e.target.value)}
            className="mb-4 w-full border p-2"
            onKeyDown={handleKeyDown}
          />
          <button
            onClick={handleUsernameInput}
            className="rounded bg-lime-400 p-2 text-black transition duration-300 hover:bg-green-950 hover:text-white focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-500 disabled:brightness-75"
          >
            Submit
          </button>
          {error && <div className="mt-2 text-red-500">{error}</div>}
        </div>
      </div>
    </div>
  ) : (
    <ChatApp />
  );
};

export default App;
