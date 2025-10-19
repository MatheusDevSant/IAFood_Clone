import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

export default function Verify() {
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  useEffect(() => {

    console.log("Demo verification code: 123456");
  }, []);

  const handleValidate = () => {
    const role = searchParams.get("role") || "client";
    const pending = sessionStorage.getItem("pending_verification");
    if (code === "123456" && pending) {
      const pendingObj = JSON.parse(pending);
      // create fake token and user
      const fakeToken = "demo-token." + btoa(JSON.stringify({ role })) + ".sig";
      const userData = pendingObj.user || { name: "Demo User", email: "demo@iafood" };
      const user = { ...userData, role };
      // login in AuthContext using demo data
      login(fakeToken, user);
      sessionStorage.removeItem("pending_verification");
      setMsg("✅ Verificado! Redirecionando...");
      setTimeout(() => {
        if (role === "client") navigate("/");
        else if (role === "merchant") navigate("/merchant/dashboard");
        else if (role === "courier") navigate("/courier/dashboard");
      }, 800);
    } else {
      setMsg("❌ Código inválido. Use 123456 para demo.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <div className="bg-gray-100 dark:bg-gray-900 p-8 rounded-2xl shadow-xl w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4 text-center">Verificação</h1>
        <p className="text-sm text-muted-foreground mb-4">Insira o código enviado por e-mail/SMS (demo: 123456)</p>
        <input type="text" value={code} onChange={(e) => setCode(e.target.value)} className="w-full p-3 rounded-lg border dark:bg-gray-800 dark:border-gray-700 mb-4" placeholder="Código de verificação" />
        <Button onClick={handleValidate} className="w-full bg-green-600 hover:bg-green-700 text-white">Validar</Button>
        {msg && <p className="mt-4 text-center text-sm">{msg}</p>}
      </div>
    </div>
  );
}
