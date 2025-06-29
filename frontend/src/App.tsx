import { useCallback } from "react";
import Header from "./header";

function App() {
  const handleClick = useCallback(async () => {
    try {
      const res = await fetch("/api/hello");
      const data = await res.json();
      console.log(data);
    } catch (err) {
      console.error("Error fetching /api/hello:", err);
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
