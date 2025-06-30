import { ArrowUp } from "@carbon/icons-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export default function Login() {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await api.post("/api/authenticate", { accessToken: token });
      if (res.status === 200) {
        navigate("/welcome");
      } else {
        setError("Invalid access token");
      }
    } catch {
      setError("Invalid access token");
    }
  };

  const message = (
    <>
      Maybe the hardest part of hiring is not knowing how it's going to turn out.
      <br />
      Now, for the first time ever, you won't just <strong>find</strong> potential candidates.
      <br />
      <br />
      <strong className="text-xl md:text-2xl">You'll glimpse into a future with them.</strong>
    </>
  );

  return (
    <div className="flex w-screen h-screen items-center justify-center flex-col gap-8" id="login container">
      <div className="font-jetbrains text-base md:text-lg text-center whitespace-pre-line w-3/4 md:w-1/2">
        <p>{message}</p>
      </div>
      <form onSubmit={handleLogin} className="flex">
        <input
          type="text"
          placeholder="Enter access token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          required
          className="text-center border p-2 border-black rounded-l-lg"
        />
        <button type="submit" className=" border p-2 rounded-r-lg border-l-0 bg-gray-300">
          <ArrowUp />
        </button>
      </form>
      {error && <div className="text-red-500">{error}</div>}
    </div>
  );
}
