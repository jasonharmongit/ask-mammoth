import { useEffect, useRef, useState } from "react";
import Header from "../components/header";
import { useWebsocket } from "../hooks/use-websocket";
import type { Turn } from "./conversation";
import Conversation from "./conversation";
import UserInput from "./user-input";

export default function Home() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [threadId, setThreadId] = useState<string | undefined>(undefined);
  const homeContainerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const { isConnected, sendMessage: rawSendMessage } = useWebsocket<{ userMessage: string; threadId?: string }, string>(
    {
      endpoint: "/ws/assistant",
      onMessage: handleMessage,
    }
  );

  // Wrap sendMessage to include threadId if present
  const sendMessage = (msg: { userMessage: string; threadId: string }) => {
    rawSendMessage({
      userMessage: msg.userMessage,
      ...(threadId ? { threadId } : {}),
    });
  };

  // Scroll to bottom when turns change, if autoScroll is true
  useEffect(() => {
    if (autoScroll && homeContainerRef.current) {
      homeContainerRef.current.scrollTop = homeContainerRef.current.scrollHeight;
    }
  }, [turns, autoScroll]);

  // Handler to track if user is at the bottom
  const handleScroll = () => {
    const ccr = homeContainerRef.current;
    if (!ccr) return;
    const isAtBottom = ccr.scrollHeight - ccr.scrollTop - ccr.clientHeight < 2;
    setAutoScroll(isAtBottom);
  };

  // Expose scrollToBottom for UserInput
  const scrollToBottom = () => {
    if (homeContainerRef.current) {
      homeContainerRef.current.scrollTop = homeContainerRef.current.scrollHeight;
    }
  };

  return (
    <div
      ref={homeContainerRef}
      className="flex w-screen items-center min-h-screen flex-col px-15 pt-15 pb-35 bg-gray-200 overflow-y-auto"
      id="home-container"
      onScroll={handleScroll}
    >
      <Header />
      <div
        id="conversation-container"
        className="w-[768px] flex flex-col"
        style={{
          background: "linear-gradient(to bottom, #d1d5db 0%, #e5e7eb 60%, transparent 80%)",
        }}
      >
        <Conversation turns={turns} />
        <UserInput
          sendMessage={sendMessage}
          isConnected={isConnected}
          setTurns={setTurns}
          scrollToBottom={scrollToBottom}
        />
      </div>
    </div>
  );

  function handleMessage(msg: string) {
    let parsed: { type: string; value?: string; threadId?: string };
    try {
      parsed = JSON.parse(msg);
    } catch {
      throw new Error("Turn is not a valid JSON: " + msg);
    }
    if (parsed.threadId && !threadId) {
      setThreadId(parsed.threadId);
    }
    if (parsed.type === "chunk") {
      setTurns((prevTurns) => {
        const chunk: string = parsed.value ?? "";
        const lastTurn = prevTurns[prevTurns.length - 1];
        const newAssistantTurn: Turn = { role: "assistant", content: chunk };
        // If last message is user, start new assistant turn
        if (lastTurn.role === "user") {
          return [...prevTurns, newAssistantTurn];
        } else {
          // Otherwise, append the chunk to assistant's (current) turn
          return [...prevTurns.slice(0, -1), { ...lastTurn, content: lastTurn.content + chunk }];
        }
      });
    }
  }
}
