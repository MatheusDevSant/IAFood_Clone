import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    // 🔥 redireciona todas as rotas (ex: /orders/1, /menu/3) para index.html
    historyApiFallback: true,
  },
});
