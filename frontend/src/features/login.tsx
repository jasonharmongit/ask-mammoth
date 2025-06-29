import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await fetch("http://localhost:3000/api/authenticate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken: token }),
      credentials: "include",
    });
    if (res.ok) {
      navigate("/home");
    } else {
      setError("Invalid access token");
    }
  };

  return (
    <div className="flex w-screen h-screen items-center justify-center" id="login container">
      <form onSubmit={handleLogin} className="flex flex-col gap-2">
        <input
          type="password"
          placeholder="Access Token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          required
        />
        <button type="submit">Enter</button>
        {error && <div className="text-red-500">{error}</div>}
      </form>
    </div>
  );
}
