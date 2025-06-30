import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/authenticate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken: token }),
      credentials: "include",
    });
    if (res.ok) {
      navigate("/welcome");
    } else {
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
      <form onSubmit={handleLogin} className="flex flex-col gap-2">
        <input
          type="password"
          placeholder="Enter access token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          required
          className="border p-2 border-black"
        />
        {error && <div className="text-red-500">{error}</div>}
      </form>
    </div>
  );
}
