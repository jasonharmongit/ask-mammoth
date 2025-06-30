import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE_URL}/api/authenticate`, {
      method: "GET",
      credentials: "include",
    }).then((res) => {
      if (res.ok) {
        setAuthenticated(true);
      } else {
        navigate("/");
      }
      setLoading(false);
    });
  }, [navigate]);

  if (loading) return <div>Loading...</div>;
  if (!authenticated) return null;
  return children;
}
