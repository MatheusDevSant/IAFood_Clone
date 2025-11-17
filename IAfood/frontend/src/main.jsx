import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import App from "./App";
import "./index.css";

// 🌐 Páginas principais
import Home from "@/pages/Home";
import Menu from "@/pages/Menu";

// 🔐 Autenticação
import ClientAuth from "@/pages/auth/ClientAuth";
import MerchantAuth from "@/pages/auth/MerchantAuth";
import CourierAuth from "@/pages/auth/CourierAuth";
import Verify from "@/pages/auth/Verify";
import "leaflet/dist/leaflet.css";


// 👤 Perfis e fluxos
import Profile from "@/pages/Profile";
import Cart from "@/pages/Cart";
import Orders from "@/pages/Orders";
import OrderDetails from "@/pages/OrderDetails";

// 🧾 Painéis de cada papel
import MerchantDashboard from "@/pages/MerchantDashboard";
import MerchantOrders from "@/pages/MerchantOrders";
import CourierDashboard from "@/pages/CourierDashboard";

// 🧠 Contextos globais
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";

/* ===========================================================
  🔒 Rotas protegidas — exige login antes de acessar
=========================================================== */
function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="p-6 text-center">Carregando...</div>;

  if (!user) return <Navigate to="/auth/client" replace />;

  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;

  return children;
}

/* ===========================================================
  🚀 Inicialização do App
=========================================================== */
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<App />}>
              {/* 🌐 Rotas públicas */}
              <Route index element={<Home />} />
              <Route path="menu/:id" element={<Menu />} />
              <Route path="auth/client" element={<ClientAuth />} />
              <Route path="auth/merchant" element={<MerchantAuth />} />
              <Route path="auth/courier" element={<CourierAuth />} />
              <Route path="auth/verify" element={<Verify />} />
              <Route path="cart" element={<Cart />} />

              {/* 🔐 Rotas protegidas */}
              <Route
                path="profile"
                element={
                  <PrivateRoute roles={["client", "merchant", "courier", "admin"]}>
                    <Profile />
                  </PrivateRoute>
                }
              />

              {/* 🛒 Cliente */}
              <Route
                path="orders"
                element={
                  <PrivateRoute roles={["client"]}>
                    <Orders />
                  </PrivateRoute>
                }
              />
              <Route
                path="orders/:id"
                element={
                  <PrivateRoute roles={["client"]}>
                    <OrderDetails />
                  </PrivateRoute>
                }
              />

              {/* 🍽️ Restaurante */}
              <Route
                path="merchant/dashboard"
                element={
                  <PrivateRoute roles={["merchant"]}>
                    <MerchantDashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="merchant/orders"
                element={
                  <PrivateRoute roles={["merchant"]}>
                    <MerchantOrders />
                  </PrivateRoute>
                }
              />

              {/* 🚴 Entregador */}
              <Route
                path="courier/dashboard"
                element={
                  <PrivateRoute roles={["courier"]}>
                    <CourierDashboard />
                  </PrivateRoute>
                }
              />
            </Route>
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  </React.StrictMode>
);
