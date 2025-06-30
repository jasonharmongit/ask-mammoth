import { ArrowUp } from "@carbon/icons-react";
import { useState, type Dispatch, type SetStateAction } from "react";
import type { Turn } from "./conversation";

type UserInputProps = {
  sendMessage: (msg: string) => void;
  isConnected: boolean;
  setTurns: Dispatch<SetStateAction<Turn[]>>;
  scrollToBottom: () => void;
};

export default function UserInput({ sendMessage, isConnected, setTurns, scrollToBottom }: UserInputProps) {
  const [input, setInput] = useState("");

  return (
    <div
      className="fixed bottom-15 bg-accent flex flex-col items-center rounded-lg bg-gray-300 h-20 w-[768px] shadow-lg hover:shadow-xl focus-within:shadow-xl"
      id="user-input-container"
    >
      <textarea
        className="bg-accent border-none pb-0 w-full resize-none p-2 focus:outline-none"
        placeholder="Ask me about the candidates..."
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
          className="self-end bg-gray-400 rounded-lg"
          onClick={() => {
            handleSendMessage();
          }}
          disabled={!isConnected || !input.trim()}
        >
          <ArrowUp />
        </button>
      </div>
    </div>
  );

  function handleSendMessage() {
    const userTurn: Turn = {
      role: "user",
      content: input,
    };

    if (input.trim()) {
      setTurns((prev) => [...prev, userTurn]);
      sendMessage(input);
      setInput("");
      setTimeout(scrollToBottom, 100);
    }
  }
}
