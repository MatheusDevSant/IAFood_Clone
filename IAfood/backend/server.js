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
const assignmentsRoutes = require("./src/routes/assignments");
const addressesRoutes = require("./src/routes/addresses");
const rateLimitMiddleware = require('./src/middleware/rateLimit');

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
app.use("/auth", rateLimitMiddleware, authRoutes);
app.use("/catalog", catalogRoutes);
app.use("/addresses", addressesRoutes);
console.log("🧭 Registrando rotas do módulo:", typeof ordersRoutes);
app.use("/orders", rateLimitMiddleware, ordersRoutes); 
app.use("/assignments", assignmentsRoutes);
console.log("✅ Rotas /orders registradas com sucesso");
app.use("/", menuRoutes);

// 🔹 Conexão Socket.IO
io.on("connection", (socket) => {
  console.log("📡 Novo cliente conectado:", socket.id);

  // Permite que clientes (couriers) entrem em uma room
  socket.on("joinRoom", ({ room }) => {
    try {
      socket.join(room);
      console.log(`Socket ${socket.id} entrou na sala ${room}`);
    } catch (e) {
      console.error('Erro ao entrar na sala', e);
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ Cliente desconectado:", socket.id);
  });

  // Re-emissão de localização: permite que um courier envie atualizações de localização para um pedido
  socket.on("order:location", (payload) => {
    try {
      // payload: { orderId, lat, lng, distance_km, eta_minutes }
      const room = `order-${payload.orderId}`;
      // emite para room do pedido e para logs
      io.to(room).emit("order:location", payload);
      // opcionalmente emite evento global de localizacao (para debugging)
      io.emit("order:location", payload);
      console.log(`🔁 order:location retransmitido para pedido ${payload.orderId}`);
    } catch (e) {
      console.error('Erro ao retransmitir order:location', e);
    }
  });

  // Re-emissão simples de chat: re-emite mensagens para a sala do pedido
  socket.on('chat:message', (msg) => {
    try {
      if (!msg || !msg.orderId) return;
      const room = `chat:order:${msg.orderId}`;
      io.to(room).emit('chat:message', msg);
      console.log(`💬 chat:message retransmitida para ${room}`);
    } catch (e) {
      console.error('Erro ao retransmitir chat:message', e);
    }
  });

  // Persiste localização do entregador quando enviada (o cliente courier envia courier:location com courier_user_id)
  socket.on('courier:location', async (payload) => {
    try {
      const { courier_user_id, lat, lng } = payload || {};
      if (!courier_user_id || !lat || !lng) return;
      // update couriers table
      const db = require('./src/lib/db');
      await db.query('UPDATE couriers SET lat = ?, lng = ?, last_active = NOW() WHERE user_id = ?', [lat, lng, courier_user_id]);
    } catch (e) {
      console.error('Erro ao persistir localização do entregador', e);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () =>
  console.log(`✅ Servidor rodando na porta ${PORT}`)
);
