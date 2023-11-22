import React, { useState } from "react";
import ChatApp from "./ChatApp";
import momentoLogo from "./assets/MomentoLogo.svg";
import Filter from "bad-words";
import { v4 } from "uuid";
import { type User } from "./utils/momento-web";

const App: React.FC = () => {
  const [inputValue, setInputValue] = useState("");
  const storedUser = localStorage.getItem("username-v2");
  const parsedUser = storedUser ? JSON.parse(storedUser) : null;
  const [user, setUser] = useState<User>(parsedUser);
  const [error, setError] = useState<string | null>(null);

  const profanityFilter = new Filter();

  const handleUsernameInput = () => {
    const trimmedValue = inputValue.trim();

    if (trimmedValue) {
      if (profanityFilter.isProfane(trimmedValue)) {
        setError("Username contains profanity. Please choose another.");
      } else {
        const user = {
          username: trimmedValue,
          id: v4(),
        };
        setUser(user);
        localStorage.setItem("username-v2", JSON.stringify(user));
        setError(null);
      }
    }
  };

  const handleKeyDown = (e: { keyCode: number }) => {
    if (e.keyCode == 13) {
      handleUsernameInput();
    }
  };

  return !user ? (
    <div className="flex h-screen items-center justify-center bg-gradient-to-r from-gray-800 to-gray-700">
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
            className="rounded bg-pink-500 p-2 text-white transition duration-300 hover:bg-pink-600 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-500 disabled:brightness-75"
          >
            Submit
          </button>
          {error && <div className="mt-2 text-red-500">{error}</div>}
        </div>
      </div>
    </div>
  ) : (
    <ChatApp user={user} />
  );
};

export default App;
