import type { Dispatch, RefObject, SetStateAction } from "react";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

export type Turn = {
  role: "user" | "assistant";
  content: string;
  referenceBlockIds?: string[];
};

type ConversationProps = {
  turns: Turn[];
  bottomRef?: RefObject<HTMLDivElement | null>;
  setTurns: Dispatch<SetStateAction<Turn[]>>;
};

const Conversation = ({ turns, bottomRef, setTurns }: ConversationProps) => {
  const [isFetching, setIsFetching] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    const fetchTimer: number = window.setTimeout(() => {
      setIsFetching(false);
      setIsAnalyzing(true);
      window.setTimeout(() => {
        setIsAnalyzing(false);
        setTurns((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "Totally unbiased, 100% real analysis complete.\n\nCandidates Analyzed:\nAdam Augustine\nAhmer Farooq\nGeoffrey Kee\nJason Harmon\nShailaja Shah\nTanner Young\n\n\nHello! I am the AskMammoth Oracle. My job is to help you hire the best candidate by painting a vivid picture of what it would look like to hire a given individual. I understand that you're looking to hire a new Full-Stack Engineer, and I'm here to help! I've already retrieved the data and run an analysis for the candidates above.\n\nWould you like me to give my recommendation? Or would you like a foretelling of one of the candidates, specifically?",
          },
        ]);
      }, 2000);
    }, 2000);
    return () => {
      clearTimeout(fetchTimer);
    };
  }, [setTurns]);

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
        className="prose whitespace-pre-line prose-neutral prose-code:bg-accent prose-code:rounded prose-code:border dark:prose-invert text-foreground max-w-none px-2 [&_h1]:my-2 [&_h2]:my-2 [&_h3]:my-2 [&_h4]:my-2 [&_h5]:my-2 [&_h6]:my-2 [&_hr]:my-2 [&_p]:my-0 [&_pre]:my-0 [&_table]:border [&_td]:border [&_td]:px-4 [&_td]:py-2 [&_th]:border [&_th]:px-4 [&_th]:py-2 [&_ul]:mt-1"
      >
        <ReactMarkdown>{turn.content}</ReactMarkdown>
      </div>
    );
  };

  return (
    <div className="flex w-full flex-col gap-6 p-2 md:p-4" id="conversation-container">
      {isFetching ? (
        <Loader text="Fetching candidate data..." />
      ) : isAnalyzing ? (
        <Loader text="6 candidates found. Analyzing..." />
      ) : (
        <>
          {turns.map((turn, i) => (turn.role === "user" ? userTurn(turn, i) : assistantTurn(turn, i)))}
          <div ref={bottomRef} />
        </>
      )}
      <div className="h-20" />
    </div>
  );
};

function Loader({ text }: { text: string }) {
  return (
    <div className="flex justify-center mb-30 gap-2">
      <div className="mb-2">
        <span className="inline-block w-6 h-6 border-4 border-gray-300 border-t-black rounded-full animate-spin" />
      </div>
      <div className="text-lg whitespace-pre-line">{text}</div>
    </div>
  );
}

export default Conversation;
