import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext"; // ✅ usa o contexto
import { api } from "@/lib/api"; // ✅ usa o axios configurado

export default function ClientAuth() {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [msg, setMsg] = useState("");
  const { login } = useAuth(); // função global

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = mode === "signup" ? "/auth/signup" : "/auth/login";
      const body =
        mode === "signup"
          ? { ...form, role: "client" }
          : { email: form.email, password: form.password, role: "client" };

      const { data } = await api.post(url, body);
      login(data.token); // ✅ guarda token no AuthContext
      setMsg("✅ Sucesso! Você está autenticado.");
    } catch (err) {
      console.error(err);
      setMsg("❌ Erro: " + (err.response?.data?.error || "Falha no servidor"));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <div className="bg-gray-100 dark:bg-gray-900 p-8 rounded-2xl shadow-xl w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4 text-center">
          {mode === "signup" ? "Criar conta de Cliente" : "Login do Cliente"}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <>
              <input type="text" name="name" placeholder="Nome completo" onChange={handleChange}
                className="w-full p-3 rounded-lg border dark:bg-gray-800 dark:border-gray-700" />
              <input type="text" name="phone" placeholder="Telefone (opcional)" onChange={handleChange}
                className="w-full p-3 rounded-lg border dark:bg-gray-800 dark:border-gray-700" />
            </>
          )}
          <input type="email" name="email" placeholder="Email" onChange={handleChange}
            className="w-full p-3 rounded-lg border dark:bg-gray-800 dark:border-gray-700" />
          <input type="password" name="password" placeholder="Senha" onChange={handleChange}
            className="w-full p-3 rounded-lg border dark:bg-gray-800 dark:border-gray-700" />
          <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white">
            {mode === "signup" ? "Cadastrar" : "Entrar"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm">{msg}</p>

        <p className="mt-6 text-center text-sm">
          {mode === "signup" ? (
            <>Já tem conta?{" "}
              <button onClick={() => setMode("login")} className="text-green-500 hover:underline">
                Fazer login
              </button></>
          ) : (
            <>Novo por aqui?{" "}
              <button onClick={() => setMode("signup")} className="text-green-500 hover:underline">
                Criar conta
              </button></>
          )}
        </p>
      </div>
    </div>
  );
}
