import type { ForwardedRef } from "react";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

export type Turn = {
  role: "user" | "assistant";
  content: string;
  referenceBlockIds?: string[];
};

type ConversationHandle = {
  scrollToBottom: () => void;
};

type ConversationProps = {
  turns: Turn[];
};

const Conversation = forwardRef<ConversationHandle, ConversationProps>(function Conversation(
  { turns },
  ref: ForwardedRef<ConversationHandle>
) {
  const conversationContainerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Expose scrollToBottom to parent
  useImperativeHandle(ref, () => ({
    scrollToBottom: () => {
      if (conversationContainerRef.current) {
        conversationContainerRef.current.scrollTop = conversationContainerRef.current.scrollHeight;
      }
    },
  }));

  // Smart auto-scroll: only scroll if user is at the bottom
  useEffect(() => {
    if (autoScroll && conversationContainerRef.current) {
      conversationContainerRef.current.scrollTop = conversationContainerRef.current.scrollHeight;
    }
  }, [turns, autoScroll]);

  // Handler to track if user is at the bottom
  const handleScroll = () => {
    const ccr = conversationContainerRef.current;
    if (!ccr) return;
    const isAtBottom = ccr.scrollHeight - ccr.scrollTop - ccr.clientHeight < 2;
    setAutoScroll(isAtBottom);
  };

  const userTurn = (turn: Turn, i: number) => {
    return (
      <div key={i} className="bg-accent flex flex-col gap-2 rounded border p-2">
        {turn.content}
      </div>
    );
  };

  const assistantTurn = (turn: Turn, i: number) => {
    return (
      <div
        key={i}
        className="prose prose-neutral prose-code:bg-accent prose-code:rounded prose-code:border dark:prose-invert text-foreground max-w-none px-2 [&_h1]:my-2 [&_h2]:my-2 [&_h3]:my-2 [&_h4]:my-2 [&_h5]:my-2 [&_h6]:my-2 [&_hr]:my-2 [&_p]:my-0 [&_pre]:my-0 [&_table]:border [&_td]:border [&_td]:px-4 [&_td]:py-2 [&_th]:border [&_th]:px-4 [&_th]:py-2 [&_ul]:mt-1"
      >
        <ReactMarkdown>{turn.content}</ReactMarkdown>
      </div>
    );
  };

  return (
    <div
      ref={conversationContainerRef}
      className="flex w-full flex-1 flex-col gap-6 overflow-y-auto"
      id="conversation-container"
      onScroll={handleScroll}
    >
      {turns.map((turn, i) => (turn.role === "user" ? userTurn(turn, i) : assistantTurn(turn, i)))}
    </div>
  );
});

export default Conversation;
