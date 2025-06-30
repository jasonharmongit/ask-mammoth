import { useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import Header from "../components/header";
import { useWebsocket } from "../hooks/use-websocket";
import type { Turn } from "./conversation";
import Conversation from "./conversation";
import UserInput from "./user-input";

export default function Home() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const threadIdRef = useRef(uuidv4());
  const conversationRef = useRef<{ scrollToBottom: () => void }>(null);

  const { isConnected, sendMessage } = useWebsocket<string, string>({
    endpoint: `/api/assistant/${threadIdRef.current}`,
    onMessage: handleMessage,
  });

  return (
    <div className="flex w-screen items-center h-screen flex-col p-15 bg-gray-200" id="home-container">
      <Header />
      <div
        id="conversation-container"
        className="w-[768px] flex flex-col h-full"
        style={{
          background: "linear-gradient(to bottom, #d1d5db 0%, #e5e7eb 60%, transparent 80%)",
        }}
      >
        <Conversation ref={conversationRef} turns={turns} />
        <UserInput
          sendMessage={sendMessage}
          isConnected={isConnected}
          setTurns={setTurns}
          scrollToBottom={() => conversationRef.current?.scrollToBottom()}
        />
      </div>
    </div>
  );

  function handleMessage(msg: string) {
    let parsed: { type: string; data?: string };
    try {
      parsed = JSON.parse(msg);
    } catch {
      throw new Error("Turn is not a valid JSON: " + msg);
    }
    if (parsed.type === "chunk") {
      setTurns((prevTurns) => {
        const chunk: string = parsed.data ?? "";
        const lastTurn = prevTurns[prevTurns.length - 1];
        const newAssistantTurn: Turn = { role: "assistant", content: chunk };
        // If last message is user, start new assistant turn
        if (lastTurn.role === "user") {
          return [...prevTurns, newAssistantTurn];
        } else {
          // Otherwise, append the chunk to assistant's (current) turn
          return [
            // Create a shallow copy of the previous turns, excluding the last turn (which is the assistant's current turn)
            ...prevTurns.slice(0, -1),
            // Add a shallow copy of the last turn, with the content updated with the new chunk
            { ...lastTurn, content: lastTurn.content + chunk },
          ];
        }
      });
    }
  }
}
