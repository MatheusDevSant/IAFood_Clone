const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");

dotenv.config();

const authRoutes = require("./src/routes/auth");
const catalogRoutes = require("./src/routes/catalog");
const menuRoutes = require("./src/routes/menu");
const ordersRoutes = require("./src/routes/orders");

const app = express();
const server = http.createServer(app);

// 🔹 Configuração do Socket.IO
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// 🔹 Middleware para injetar `io` em todas as requisições
app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());


// 🔹 Rotas
app.use("/auth", authRoutes);
app.use("/catalog", catalogRoutes);
console.log("🧭 Registrando rotas do módulo:", typeof ordersRoutes);
app.use("/orders", ordersRoutes); 
console.log("✅ Rotas /orders registradas com sucesso");
app.use("/", menuRoutes);

// 🔹 Socket.IO conexão básica
io.on("connection", (socket) => {
  console.log("📡 Novo cliente conectado:", socket.id);

  socket.on("disconnect", () => {
    console.log("❌ Cliente desconectado:", socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () =>
  console.log(`✅ Servidor rodando na porta ${PORT}`)
);
