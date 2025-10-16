import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { useNavigate } from "react-router-dom";

export default function MerchantAuth() {
  const [mode, setMode] = useState("login"); // "login" ou "signup"
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [msg, setMsg] = useState("");
  const { login, user, loading } = useAuth();
  const navigate = useNavigate();

  // ✅ Se já estiver logado, redireciona
  useEffect(() => {
    if (!loading && user?.role === "merchant") {
      navigate("/merchant/dashboard");
    }
  }, [loading, user, navigate]);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");

    try {
      const url = mode === "signup" ? "/auth/signup" : "/auth/login";
      const body =
        mode === "signup"
          ? { ...form, role: "merchant" }
          : { email: form.email, password: form.password, role: "merchant" };

      const { data } = await api.post(url, body);

      // ✅ Salva token e usuário localmente
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      // ✅ Atualiza contexto global
      login(data.token, data.user);

      setMsg("✅ Sucesso! Restaurante autenticado.");
      setTimeout(() => navigate("/merchant/dashboard"), 1000);
    } catch (err) {
      console.error(err);
      setMsg(
        "❌ Erro: " +
          (err.response?.data?.message ||
            err.response?.data?.error ||
            "Falha no servidor")
      );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <div className="bg-gray-100 dark:bg-gray-900 p-8 rounded-2xl shadow-xl w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4 text-center text-green-600 dark:text-green-400">
          {mode === "signup" ? "Cadastrar Restaurante" : "Login do Restaurante"}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <>
              <input
                type="text"
                name="name"
                placeholder="Nome do restaurante"
                onChange={handleChange}
                className="w-full p-3 rounded-lg border dark:bg-gray-800 dark:border-gray-700"
                required
              />
              <input
                type="text"
                name="phone"
                placeholder="Telefone comercial"
                onChange={handleChange}
                className="w-full p-3 rounded-lg border dark:bg-gray-800 dark:border-gray-700"
                required
              />
            </>
          )}

          <input
            type="email"
            name="email"
            placeholder="Email"
            onChange={handleChange}
            className="w-full p-3 rounded-lg border dark:bg-gray-800 dark:border-gray-700"
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Senha"
            onChange={handleChange}
            className="w-full p-3 rounded-lg border dark:bg-gray-800 dark:border-gray-700"
            required
          />

          <Button
            type="submit"
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            {mode === "signup" ? "Cadastrar" : "Entrar"}
          </Button>
        </form>

        {msg && (
          <p className="mt-4 text-center text-sm text-gray-700 dark:text-gray-300">
            {msg}
          </p>
        )}

        <p className="mt-6 text-center text-sm">
          {mode === "signup" ? (
            <>
              Já tem conta?{" "}
              <button
                onClick={() => setMode("login")}
                className="text-green-600 hover:underline"
              >
                Fazer login
              </button>
            </>
          ) : (
            <>
              Novo restaurante?{" "}
              <button
                onClick={() => setMode("signup")}
                className="text-green-600 hover:underline"
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
