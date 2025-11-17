import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { useNavigate } from "react-router-dom";

export default function CourierAuth() {
  const [mode, setMode] = useState("login"); // "login" ou "signup"
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [msg, setMsg] = useState("");
  const { login, user, loading } = useAuth();
  const navigate = useNavigate();

  // 🚦 Redireciona se já estiver logado como entregador
  useEffect(() => {
    if (!loading && user?.role === "courier") {
      navigate("/courier/dashboard");
    }
  }, [loading, user, navigate]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = mode === "signup" ? "/auth/signup" : "/auth/login";
      const body =
        mode === "signup"
          ? { ...form, role: "courier" }
          : { email: form.email, password: form.password, role: "courier" };

      const { data } = await api.post(url, body);
      login(data.token);
      setMsg("✅ Sucesso! Entregador autenticado.");
      setTimeout(() => navigate("/courier/dashboard"), 1000);
    } catch (err) {
      console.error(err);
      setMsg("❌ Erro: " + (err.response?.data?.message || "Falha no servidor"));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <div className="bg-gray-100 dark:bg-gray-900 p-8 rounded-2xl shadow-xl w-full max-w-md">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4 text-center text-amber-600 dark:text-amber-400 drop-shadow-sm">
          {mode === "signup" ? "Cadastrar Entregador" : "Login do Entregador"}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <>
              <input
                type="text"
                name="name"
                placeholder="Nome completo"
                onChange={handleChange}
                className="w-full p-3 rounded-md border dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-300 dark:focus:ring-amber-500"
                required
              />
              <input
                type="text"
                name="phone"
                placeholder="Telefone de contato"
                onChange={handleChange}
                className="w-full p-3 rounded-md border dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-300 dark:focus:ring-amber-500"
                required
              />
            </>
          )}

          <input
            type="email"
            name="email"
            placeholder="Email"
            onChange={handleChange}
            className="w-full p-3 rounded-md border dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-300 dark:focus:ring-amber-500"
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Senha"
            onChange={handleChange}
            className="w-full p-3 rounded-md border dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-300 dark:focus:ring-amber-500"
            required
          />

          <Button
            type="submit"
            className="w-full bg-amber-500 hover:bg-amber-600 text-white py-3"
          >
            {mode === "signup" ? "Cadastrar" : "Entrar"}
          </Button>
        </form>

        {msg && <p className="mt-4 text-center text-sm">{msg}</p>}

        <p className="mt-6 text-center text-sm">
          {mode === "signup" ? (
            <>
              Já tem conta?{" "}
              <button
                onClick={() => setMode("login")}
                className="text-amber-600 hover:underline"
              >
                Fazer login
              </button>
            </>
          ) : (
            <>
              Novo entregador?{" "}
              <button
                onClick={() => setMode("signup")}
                className="text-amber-600 hover:underline"
              >
                Criar conta
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
