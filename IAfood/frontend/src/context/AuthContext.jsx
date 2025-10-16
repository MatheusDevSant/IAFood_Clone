import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // 🧠 Decodifica JWT de forma segura
  const parseJwt = (token) => {
    try {
      const base64 = token.split(".")[1];
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      return JSON.parse(jsonPayload);
    } catch (err) {
      console.warn("⚠️ Token não é JWT válido (modo demo?)");
      return null;
    }
  };

  // 🔹 Ao iniciar o app, tenta restaurar login
  useEffect(() => {
    const token = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");

    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      const payload = parseJwt(token);
      if (payload && payload.exp && payload.exp * 1000 > Date.now()) {
        setUser(payload);
      } else if (savedUser) {
        // Caso token seja fake (modo demo)
        setUser(JSON.parse(savedUser));
      } else {
        localStorage.removeItem("token");
        delete axios.defaults.headers.common["Authorization"];
      }
    }

    setLoading(false);
    setInitialized(true);
  }, []);

  // 🔸 Login: agora aceita token e userData (real ou mock)
  const login = (token, userData = null) => {
    localStorage.setItem("token", token);
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

    const payload = parseJwt(token);

    if (payload && payload.role) {
      setUser(payload);
    } else if (userData) {
      // modo demo (token fake)
      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);
    } else {
      console.warn("⚠️ Token inválido e sem userData, login ignorado.");
    }
  };

  // 🔸 Logout: limpa tudo
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    delete axios.defaults.headers.common["Authorization"];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, initialized, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
