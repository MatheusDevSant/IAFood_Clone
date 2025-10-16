const express = require("express");
const router = express.Router();
const db = require("../lib/db.js");
const authMiddleware = require("../middleware/auth.js");

/* ===========================================================
  1️⃣ - Calcular total e ETA (Checkout do carrinho)
=========================================================== */
router.post("/cart/checkout", async (req, res) => {
  const { items = [], coupon } = req.body;
  if (!items.length) return res.status(400).json({ error: "Carrinho vazio" });

  const ids = items.map((i) => i.item_id);
  const placeholders = ids.map(() => "?").join(",");

  const [rows] = await db.query(
    `SELECT id, price FROM menu_items WHERE id IN (${placeholders})`,
    ids
  );

  let subtotal = 0;
  rows.forEach((dbItem) => {
    const item = items.find((i) => i.item_id === dbItem.id);
    subtotal += dbItem.price * (item.qty || 1);
  });

  if (coupon === "PROMO10") subtotal *= 0.9;

  const delivery_fee = 7.9;
  const total = +(subtotal + delivery_fee).toFixed(2);

  res.json({ subtotal, delivery_fee, total, eta_minutes: 30 });
});

/* ===========================================================
  2️⃣ - Criar pedido (corrigido: merchant detectado automaticamente)
=========================================================== */
router.post("/", authMiddleware, async (req, res) => {
  const { items = [], coupon } = req.body;
  if (!items.length)
    return res.status(400).json({ error: "Carrinho vazio" });

  try {
    // 🔍 Detecta automaticamente o restaurante dos itens
    const itemIds = items.map((i) => i.item_id);
    const placeholders = itemIds.map(() => "?").join(",");
    const [merchantRows] = await db.query(
      `
      SELECT DISTINCT m.merchant_id
      FROM menus m
      JOIN menu_items mi ON mi.menu_id = m.id
      WHERE mi.id IN (${placeholders})
      `,
      itemIds
    );

    if (merchantRows.length !== 1) {
      return res.status(400).json({
        error: "Itens pertencem a restaurantes diferentes ou inválidos",
      });
    }

    const merchant_id = merchantRows[0].merchant_id;

    // 💰 Calcula total e taxa de entrega
    const [rows] = await db.query(
      `SELECT id, price FROM menu_items WHERE id IN (${placeholders})`,
      itemIds
    );

    let subtotal = 0;
    rows.forEach((dbItem) => {
      const item = items.find((i) => i.item_id === dbItem.id);
      subtotal += dbItem.price * (item.qty || 1);
    });

    if (coupon === "PROMO10") subtotal *= 0.9;
    const delivery_fee = 7.9;
    const total = +(subtotal + delivery_fee).toFixed(2);

    // 🧾 Insere o pedido no banco
    const [result] = await db.query(
      `
      INSERT INTO orders 
      (customer_id, merchant_id, status, total, delivery_fee, payment_status, eta_minutes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [req.user.id, merchant_id, "PLACED", total, delivery_fee, "PAID", 30]
    );

    const orderId = result.insertId;

    // 🍔 Insere os itens do pedido
    for (const it of items) {
      await db.query(
        `
        INSERT INTO order_items 
        (order_id, item_id, qty, unit_price, options_json)
        VALUES (?, ?, ?, ?, ?)
        `,
        [
          orderId,
          it.item_id,
          it.qty || 1,
          it.price || 0,
          JSON.stringify(it.options || {}),
        ]
      );
    }

    // 📡 Emite evento em tempo real para o restaurante
    if (req.io) {
      req.io.emit("order:new", {
        id: orderId,
        customer_id: req.user.id,
        merchant_id,
        status: "PLACED",
        total,
        delivery_fee,
        eta_minutes: 30,
        created_at: new Date(),
      });
      console.log(`📡 Novo pedido emitido: #${orderId} → restaurante ${merchant_id}`);
    }

    res.json({
      id: orderId,
      status: "PLACED",
      total,
      delivery_fee,
      eta_minutes: 30,
      merchant_id,
    });
  } catch (err) {
    console.error("Erro ao criar pedido:", err);
    res.status(500).json({ error: "Erro interno ao criar pedido" });
  }
});

/* ===========================================================
  3️⃣ - Listar pedidos de um restaurante (merchant)
=========================================================== */
router.get("/merchant", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "merchant")
      return res.status(403).json({ error: "Acesso negado" });

    const [merchant] = await db.query(
      "SELECT id FROM merchants WHERE user_id = ?",
      [req.user.id]
    );

    if (merchant.length === 0)
      return res.status(404).json({ error: "Restaurante não encontrado" });

    const [orders] = await db.query(
      `
      SELECT o.*, u.name AS customer_name
      FROM orders o
      JOIN users u ON o.customer_id = u.id
      WHERE o.merchant_id = ?
      ORDER BY o.created_at DESC
      `,
      [merchant[0].id]
    );

    res.json(orders);
  } catch (err) {
    console.error("Erro ao buscar pedidos do restaurante:", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

/* ===========================================================
  4️⃣ - Ver pedido detalhado (cliente)
=========================================================== */
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const [orders] = await db.query(
      `
      SELECT 
        o.id, o.status, o.total, o.delivery_fee, o.eta_minutes,
        o.created_at, m.name AS merchant_name
      FROM orders o
      JOIN merchants m ON o.merchant_id = m.id
      WHERE o.id = ? AND o.customer_id = ?
      `,
      [req.params.id, req.user.id]
    );

    if (orders.length === 0)
      return res.status(404).json({ error: "Pedido não encontrado" });

    const order = orders[0];
    order.total = Number(order.total);
    order.delivery_fee = Number(order.delivery_fee);
    order.eta_minutes = Number(order.eta_minutes || 0);

    const [items] = await db.query(
      `
      SELECT 
        mi.name AS item_name, oi.qty, oi.unit_price
      FROM order_items oi
      JOIN menu_items mi ON oi.item_id = mi.id
      WHERE oi.order_id = ?
      `,
      [order.id]
    );

    order.items = items.map((i) => ({
      ...i,
      qty: Number(i.qty),
      unit_price: Number(i.unit_price),
    }));

    res.json(order);
  } catch (err) {
    console.error("Erro ao buscar pedido:", err);
    res.status(500).json({ error: "Erro interno ao buscar pedido" });
  }
});

/* ===========================================================
  5️⃣ - Atualizar status do pedido
=========================================================== */
router.post("/:id/status", authMiddleware, async (req, res) => {
  const { status } = req.body;
  const valid = ["ACCEPTED", "READY", "DELIVERED", "CANCELLED"];
  if (!valid.includes(status))
    return res.status(400).json({ error: "Status inválido" });

  try {
    await db.query("UPDATE orders SET status = ? WHERE id = ?", [
      status,
      req.params.id,
    ]);

    // 📡 Emite atualização em tempo real
    if (req.io) {
      req.io.emit("orderStatusUpdated", {
        orderId: req.params.id,
        status,
      });
      console.log(`📡 Status atualizado: ${status} (pedido #${req.params.id})`);
    }

    res.json({ ok: true, status });
  } catch (err) {
    console.error("Erro ao atualizar status:", err);
    res.status(500).json({ error: "Erro ao atualizar status" });
  }
});

/* ===========================================================
  6️⃣ - Listar pedidos do cliente logado
=========================================================== */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const [orders] = await db.query(
      `
      SELECT 
        o.id, o.status, o.total, o.delivery_fee, o.created_at,
        o.eta_minutes, m.name AS merchant_name
      FROM orders o
      INNER JOIN merchants m ON o.merchant_id = m.id
      WHERE o.customer_id = ?
      ORDER BY o.created_at DESC
      `,
      [req.user.id]
    );

    orders.forEach((o) => {
      o.total = Number(o.total);
      o.delivery_fee = Number(o.delivery_fee);
      o.eta_minutes = Number(o.eta_minutes || 0);
    });

    const orderIds = orders.map((o) => o.id);
    if (orderIds.length > 0) {
      const [items] = await db.query(
        `
        SELECT 
          oi.order_id, oi.qty, oi.unit_price, mi.name AS item_name
        FROM order_items oi
        JOIN menu_items mi ON oi.item_id = mi.id
        WHERE oi.order_id IN (${orderIds.map(() => "?").join(",")})
        `,
        orderIds
      );

      const grouped = {};
      for (const item of items) {
        const formatted = {
          item_name: item.item_name,
          qty: Number(item.qty),
          unit_price: Number(item.unit_price),
        };
        if (!grouped[item.order_id]) grouped[item.order_id] = [];
        grouped[item.order_id].push(formatted);
      }

      orders.forEach((o) => (o.items = grouped[o.id] || []));
    }

    res.json(orders);
  } catch (err) {
    console.error("Erro ao listar pedidos:", err);
    res.status(500).json({ error: "Erro interno ao buscar pedidos" });
  }
});

module.exports = router;
