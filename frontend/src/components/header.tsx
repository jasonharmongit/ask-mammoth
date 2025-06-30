import askMammothLogo from "../assets/ask-mammoth-logo.png";

export default function Header() {
  return (
    <div className="flex items-center justify-center p-4 gap-2 bg-gray-300 rounded-t-lg w-full md:w-[768px]">
      <img src={askMammothLogo} alt="Ask Mammoth Logo" className="h-8 w-auto" />
      <h1>AskMammoth Oracle</h1>
    </div>
  );
}
