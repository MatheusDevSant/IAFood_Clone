import { Outlet } from "react-router-dom";
import Navbar from "@/layouts/Navbar";
import { useAuth } from "@/context/AuthContext";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster"; // 👈 importa aqui

export default function App() {
  const { user } = useAuth();

  useEffect(() => {
    // Define tema visual baseado no papel do usuário
    if (!user) {
      document.body.style.setProperty("--accent-color", "#7C3AED"); // Roxo padrão
      document.body.style.setProperty("--accent-to", "#8B5CF6");
    } else if (user.role === "merchant") {
      document.body.style.setProperty("--accent-color", "#16A34A"); // Verde
      document.body.style.setProperty("--accent-to", "#22C55E");
    } else if (user.role === "courier") {
      document.body.style.setProperty("--accent-color", "#F59E0B"); // Âmbar
      document.body.style.setProperty("--accent-to", "#FBBF24");
    } else {
      document.body.style.setProperty("--accent-color", "#7C3AED"); // Roxo cliente
      document.body.style.setProperty("--accent-to", "#8B5CF6");
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 text-gray-900 dark:text-gray-100 transition-all duration-500">
      {/* Navbar fixa no topo */}
      <Navbar />

      {/* Conteúdo das páginas */}
      <main className="pt-4 pb-10 px-4 sm:px-6 lg:px-8">
        <div
          className="max-w-7xl mx-auto"
          style={{
            backgroundImage: `linear-gradient(to right, var(--accent-color), var(--accent-to))`,
            WebkitBackgroundClip: "text",
            color: "transparent",
          }}
        >
          <Outlet />
        </div>
      </main>

      {/* 🔔 Toasts globais */}
      <Toaster /> 
    </div>
  );
}
