import { ArrowUp } from "@carbon/icons-react";
import { useState, type Dispatch, type SetStateAction } from "react";
import type { Turn } from "./conversation";

type UserInputProps = {
  sendMessage: (msg: { history: Turn[] }) => void;
  isConnected: boolean;
  setTurns: Dispatch<SetStateAction<Turn[]>>;
  scrollToBottom: () => void;
};

export default function UserInput({ sendMessage, isConnected, setTurns, scrollToBottom }: UserInputProps) {
  const [input, setInput] = useState("");

  return (
    <div className="fixed bottom-0 w-full md:pb-15 bg-gray-200">
      <div
        className="bg-accent flex flex-col items-center rounded-t-xl md:rounded-b-xl bg-gray-400 h-20 w-full md:w-[768px] shadow-xl hover:shadow-2xl focus-within:shadow-xl"
        id="user-input-container"
      >
        <textarea
          className="bg-accent border-none pb-0 w-full resize-none p-2 focus:outline-none"
          placeholder="Ask me about the candidates..."
          value={input}
          disabled={!isConnected}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
        />
        <div className="bg-accent flex w-full gap-1 rounded-b p-1" id="user-input-footer">
          <div className="w-full h-full" id="autofill-container"></div>
          <button
            className="self-end bg-gray-300 rounded-lg p-0"
            onClick={() => {
              handleSendMessage();
            }}
            disabled={!isConnected || !input.trim()}
          >
            <ArrowUp />
          </button>
        </div>
      </div>
    </div>
  );

  function handleSendMessage() {
    const userTurn: Turn = {
      role: "user",
      content: input,
    };

    if (input.trim()) {
      setTurns((prevTurns) => {
        const newTurns = [...prevTurns, userTurn];
        sendMessage({ history: newTurns });
        return newTurns;
      });
      setInput("");
      setTimeout(scrollToBottom, 200);
    }
  }
}
