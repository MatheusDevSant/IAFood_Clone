import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Moon,
  Sun,
  ShoppingCart,
  LogOut,
  ChevronDown,
  User,
  Utensils,
  Bike,
  List,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Navbar() {
  const [darkMode, setDarkMode] = useState(localStorage.getItem("theme") === "dark");
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  /* =====================================================
     🌈 Paleta por papel
  ===================================================== */
  const roleColors = {
    client: {
      main: "text-purple-600",
      hover: "hover:bg-purple-600",
      badge: "bg-purple-100 text-purple-700",
      button: "hover:bg-purple-600 hover:text-white",
      border: "border-b-4 border-purple-600",
    },
    merchant: {
      main: "text-green-600",
      hover: "hover:bg-green-600",
      badge: "bg-green-100 text-green-700",
      button: "hover:bg-green-600 hover:text-white",
      border: "border-b-4 border-green-600",
    },
    courier: {
      main: "text-amber-600",
      hover: "hover:bg-amber-500",
      badge: "bg-amber-100 text-amber-700",
      button: "hover:bg-amber-500 hover:text-white",
      border: "border-b-4 border-amber-500",
    },
  };

  const theme = user?.role ? roleColors[user.role] : roleColors.client;

  /* =====================================================
     ⚙️ Tema escuro / claro
  ===================================================== */
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const navLink = (path, label) => (
    <Link
      to={path}
      className={`${
        location.pathname === path
          ? `${theme.main} font-semibold`
          : "text-gray-600 dark:text-gray-300"
      } hover:opacity-80 transition`}
    >
      {label}
    </Link>
  );

  /* =====================================================
     🔗 Links dinâmicos
  ===================================================== */
  const renderLinksByRole = () => {
    if (!user) return null;

    switch (user.role) {
      case "client":
        return (
          <>
            {navLink("/", "Início")}
            {navLink("/orders", "Meus Pedidos")}
            {navLink("/profile", "Perfil")}
          </>
        );
      case "merchant":
        return (
          <>
            {navLink("/merchant/dashboard", "Painel do Restaurante")}
            {navLink("/profile", "Perfil")}
          </>
        );
      case "courier":
        return (
          <>
            {navLink("/courier/dashboard", "Entregas")}
            {navLink("/profile", "Perfil")}
          </>
        );
      default:
        return null;
    }
  };

  /* =====================================================
     🧱 Render principal
  ===================================================== */
  return (
    <nav
      className={`flex justify-between items-center px-6 py-3 shadow-sm bg-white dark:bg-gray-900 dark:text-gray-100 sticky top-0 z-50 transition-colors ${theme.border}`}
    >
      {/* Esquerda */}
      <div className="flex items-center gap-4">
        <Link
          to="/"
          className={`text-xl font-extrabold ${theme.main} hover:opacity-90 transition`}
        >
          🍔 IAFood
        </Link>

        {/* Links */}
        <div className="hidden sm:flex gap-5">{user && renderLinksByRole()}</div>
      </div>

      {/* Direita */}
      <div className="flex items-center gap-3">
        {user ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
              👋 {user.name || user.email}
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${theme.badge} dark:bg-opacity-20`}
              >
                {user.role === "client"
                  ? "Cliente"
                  : user.role === "merchant"
                  ? "Restaurante"
                  : "Entregador"}
              </span>
            </span>

            {/* Logout */}
            <Button
              variant="outline"
              size="icon"
              onClick={handleLogout}
              title="Sair"
              className="hover:bg-red-100 dark:hover:bg-red-900 transition"
            >
              <LogOut className="h-5 w-5 text-red-500" />
            </Button>
          </div>
        ) : (
          // Dropdown de login
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className={`flex items-center gap-2 ${theme.button} transition-colors`}
              >
                Entrar <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-md"
            >
              <DropdownMenuItem asChild>
                <Link to="/auth/client" className="flex items-center gap-2">
                  <User className="w-4 h-4 text-purple-600" /> Cliente
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/auth/merchant" className="flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-green-600" /> Restaurante
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/auth/courier" className="flex items-center gap-2">
                  <Bike className="w-4 h-4 text-amber-600" /> Entregador
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Carrinho — apenas cliente */}
        {user?.role === "client" && (
          <Link to="/cart">
            <Button
              variant="outline"
              size="icon"
              title="Carrinho"
              className={`${theme.button} transition-colors`}
            >
              <ShoppingCart className="h-5 w-5" />
            </Button>
          </Link>
        )}

        {/* Tema */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => setDarkMode(!darkMode)}
          title="Alternar tema"
          className={`${theme.button} transition-colors`}
        >
          {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
      </div>
    </nav>
  );
}
