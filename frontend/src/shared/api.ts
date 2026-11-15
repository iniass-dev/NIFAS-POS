import axios from "axios";

// En mode Electron POS, server_url est injecté dans le localStorage par main-pos.js
// En dev ou back-office, on passe par le proxy Vite → /api
function getBaseUrl(): string {
  const serverUrl = localStorage.getItem("server_url");
  return serverUrl ? `${serverUrl}/api` : "/api";
}

export const api = axios.create({
  headers: { "Content-Type": "application/json" },
});

// baseURL dynamique : lu à chaque requête pour supporter le changement en cours de session
api.interceptors.request.use((config) => {
  config.baseURL = getBaseUrl();
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !window.location.pathname.includes("/login")) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("nifas-auth");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);
