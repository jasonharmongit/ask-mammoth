import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Welcome() {
  const navigate = useNavigate();

  // Message as an array of nodes for simple bolding
  const messageNodes = [
    "Welcome to AskMammoth.\n\nWant to ",
    <strong key="really">really</strong>,
    " know if a candidate would be a good fit?",
  ];

  // Flatten message to string for typewriter effect
  const flatMessage = messageNodes.map((node) => (typeof node === "string" ? node : "really")).join("");
  const [charIndex, setCharIndex] = useState(0);

  useEffect(() => {
    if (charIndex < flatMessage.length) {
      const timeout = setTimeout(() => setCharIndex(charIndex + 1), 50);
      return () => clearTimeout(timeout);
    }
  }, [charIndex, flatMessage.length]);

  // Render the message up to charIndex, preserving bolding for 'really'
  function renderTypedMessage() {
    let count = 0;
    return messageNodes.map((node, idx) => {
      if (typeof node === "string") {
        const nextCount = count + node.length;
        const textToShow = node.slice(0, Math.max(0, Math.min(node.length, charIndex - count)));
        count = nextCount;
        return <span key={idx}>{textToShow}</span>;
      } else {
        // For <strong>really</strong>
        if (charIndex > count) {
          count += "really".length;
          return node;
        }
        return null;
      }
    });
  }

  return (
    <div className="flex w-screen h-screen items-center justify-center flex-col gap-8" id="welcome container">
      <div className="font-jetbrains text-2xl text-center whitespace-pre-line">{renderTypedMessage()}</div>
      {charIndex >= flatMessage.length && (
        <button
          className="border font-jetbrains text-2xl hover:bg-black hover:text-white"
          onClick={() => navigate("/home")}
        >
          Ask Mammoth
        </button>
      )}
    </div>
  );
}
