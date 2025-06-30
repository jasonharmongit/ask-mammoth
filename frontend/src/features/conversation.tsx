import type { RefObject } from "react";
import ReactMarkdown from "react-markdown";

export type Turn = {
  role: "user" | "assistant";
  content: string;
  referenceBlockIds?: string[];
};

type ConversationProps = {
  turns: Turn[];
  bottomRef?: RefObject<HTMLDivElement | null>;
};

const Conversation = ({ turns, bottomRef }: ConversationProps) => {
  const userTurn = (turn: Turn, i: number) => {
    return (
      <div key={i} className="bg-gray-400 flex flex-col gap-2 shadow-md rounded-lg p-2">
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
    <div className="flex w-full flex-col gap-6 p-4" id="conversation-container">
      {turns.map((turn, i) => (turn.role === "user" ? userTurn(turn, i) : assistantTurn(turn, i)))}
      <div ref={bottomRef} />
    </div>
  );
};

export default Conversation;
