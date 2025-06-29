import { useCallback } from "react";
import Header from "./header";

function App() {
  const handleClick = useCallback(async () => {
    try {
      console.log("sending message 'Hello, who are you?' to the assistant");
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: "You are a helpful assistant." },
            { role: "user", content: "Hello, who are you?" },
          ],
        }),
      });
      const data = await res.json();
      console.log("assistant response:", data);
    } catch (err) {
      console.error("Error fetching /api/assistant:", err);
    }
  }, []);

  return (
    <div className="flex flex-col w-screen h-screen" id="app-container">
      <Header />
      <div id="app-content" className="flex flex-col items-start w-full h-full px-4">
        <button className="border p-2 border-black" onClick={handleClick}>
          Click to test
        </button>
      </div>
    </div>
  );
}

export default App;
