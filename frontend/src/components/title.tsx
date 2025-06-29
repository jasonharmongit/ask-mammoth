import askMammothLogo from "../assets/ask-mammoth-logo.png";

export default function Title() {
  return (
    <div className="flex gap-2">
      <img src={askMammothLogo} alt="Ask Mammoth Logo" className="h-8 w-auto" />
      <h1>AskMammoth</h1>
    </div>
  );
}
