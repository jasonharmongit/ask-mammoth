import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if ((error.response?.status === 401 || error.response?.status === 403) && window.location.pathname !== "/login") {
      console.error("Authentication error:", error);
      window.location.href = "/login";
      return Promise.reject(new Error("Authentication required. Please log in."));
    }
    return Promise.reject(error);
  }
);

export default api;
