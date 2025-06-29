import askMammothLogo from "./assets/ask-mammoth-logo.png";

export default function Header() {
  return (
    <div className="h-20 w-full flex items-center px-4 gap-2">
      <img src={askMammothLogo} alt="Ask Mammoth Logo" className="h-8 w-auto" />
      <h1>AskMammoth</h1>
    </div>
  );
}
