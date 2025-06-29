import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Welcome() {
  const message = `Welcome to AskMammoth.\n\nWant to really know if a candidate would be a good fit?\n\nAsk Mammoth.`;
  const [displayed, setDisplayed] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i <= message.length) {
        setDisplayed(message.slice(0, i));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 50);
    return () => {
      clearInterval(interval);
      setDisplayed("");
    };
  }, [message]);

  function renderWithBold(text: string) {
    // Split on 'really' and 'Ask Mammoth' and render as <strong>
    const regex = /(Ask Mammoth|really)/g;
    const parts = text.split(regex);
    return parts.map((part, idx) =>
      part === "really" || part === "Ask Mammoth" ? <strong key={idx}>{part}</strong> : part
    );
  }

  return (
    <div className="flex w-screen h-screen items-center justify-center flex-col gap-8" id="welcome container">
      <div className="font-jetbrains text-2xl text-center whitespace-pre-line">{renderWithBold(displayed)}</div>
      <button
        className="border font-jetbrains text-xl hover:bg-black hover:text-white"
        onClick={() => navigate("/login")}
      >
        BEGIN
      </button>
    </div>
  );
}

// The hardest part of hiring is not knowing how it's going to turn out. Now, for the first time ever, artificial intelligence allows employers not only to find potential candidates to catch a glimpse into a future with them.\n
