const express = require("express");
const router = express.Router();
const db = require("../lib/db.js");
const authMiddleware = require("../middleware/auth.js");
const { matchAndNotify, haversineKm } = require("../lib/matching.js");

/* ===========================================================
  1️⃣ - Calcular total e ETA (checkout do carrinho)
  Observação: se for passado address_id, busca lat/lng e estima frete/ETA
=========================================================== */
router.post("/cart/checkout", async (req, res) => {
  const { items = [], coupon, address_id } = req.body;
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

  // se receber address_id, buscamos lat/lng e calculamos distância e ETA
  let delivery_fee = 7.9;
  let eta_minutes = 30;
  if (address_id) {
    try {
      const [addrRows] = await db.query("SELECT lat, lng FROM addresses WHERE id = ?", [address_id]);
      if (addrRows.length > 0) {
        // busca latitude/longitude do restaurante (assume primeiro item -> merchant)
        const [mRows] = await db.query(
          `SELECT DISTINCT m.merchant_id, mr.lat AS merchant_lat, mr.lng AS merchant_lng
           FROM menus m
           JOIN menu_items mi ON mi.menu_id = m.id
           JOIN merchants mr ON mr.id = m.merchant_id
           WHERE mi.id IN (${items.map(() => '?').join(',')}) LIMIT 1`,
          items.map((i) => i.item_id)
        );

        if (mRows && mRows.length > 0) {
          const merchantLat = Number(mRows[0].merchant_lat) || 0;
          const merchantLng = Number(mRows[0].merchant_lng) || 0;
          const addr = addrRows[0];
          const distKm = haversineKm(merchantLat, merchantLng, Number(addr.lat), Number(addr.lng));
          // simples modelo de frete: base + 1.2 * km
          delivery_fee = Math.max(5, +(5 + distKm * 1.2).toFixed(2));
          // ETA: 10min base + 4min por km (aprox)
          eta_minutes = Math.max(10, Math.round(10 + distKm * 4));
        }
      }
    } catch (e) {
      console.error('Erro ao calcular frete por endereço:', e);
    }
  }

  const total = +(subtotal + delivery_fee).toFixed(2);

  res.json({ subtotal, delivery_fee, total, eta_minutes });
});

/* ===========================================================
  2️⃣ - Criar pedido (detecta o restaurante automaticamente pelos itens)
=========================================================== */
router.post("/", authMiddleware, async (req, res) => {
  const { items = [], coupon, address_id } = req.body;
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

    // se address_id foi enviado, tenta calcular frete/eta usando haversine
    let delivery_fee = 7.9;
    let eta_minutes = 30;
    if (address_id) {
      try {
        const [addrRows] = await db.query("SELECT lat, lng FROM addresses WHERE id = ?", [address_id]);
        if (addrRows.length > 0) {
          const addr = addrRows[0];
          const [mRows] = await db.query(
            `SELECT mr.lat AS merchant_lat, mr.lng AS merchant_lng FROM merchants mr WHERE mr.id = ? LIMIT 1`,
            [merchant_id]
          );
          if (mRows && mRows.length > 0) {
            const merchantLat = Number(mRows[0].merchant_lat) || 0;
            const merchantLng = Number(mRows[0].merchant_lng) || 0;
            const distKm = haversineKm(merchantLat, merchantLng, Number(addr.lat), Number(addr.lng));
            delivery_fee = Math.max(5, +(5 + distKm * 1.2).toFixed(2));
            eta_minutes = Math.max(10, Math.round(10 + distKm * 4));
          }
        }
      } catch (e) {
        console.error('Erro ao calcular frete no create order:', e);
      }
    }

    const total = +(subtotal + delivery_fee).toFixed(2);

    // 🧾 Insere o pedido no banco
    const [result] = await db.query(
      `
      INSERT INTO orders 
      (customer_id, merchant_id, status, total, delivery_fee, payment_status, eta_minutes, address_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [req.user.id, merchant_id, "PLACED", total, delivery_fee, "PAID", eta_minutes, address_id || null]
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
        eta_minutes,
        address_id: address_id || null,
        created_at: new Date(),
      });
      console.log(`📡 Novo pedido emitido: #${orderId} → restaurante ${merchant_id}`);
    }

    res.json({
      id: orderId,
      status: "PLACED",
      total,
      delivery_fee,
      eta_minutes,
      merchant_id,
      address_id: address_id || null,
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
  Retorna também coordenadas do merchant e do endereço quando disponíveis
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
    // busca coordenadas do restaurante
    try {
      const [mcoords] = await db.query(
        `SELECT lat AS merchant_lat, lng AS merchant_lng FROM merchants WHERE id = ? LIMIT 1`,
        [order.merchant_id]
      );
      if (mcoords && mcoords.length > 0) {
        order.merchant_lat = Number(mcoords[0].merchant_lat) || null;
        order.merchant_lng = Number(mcoords[0].merchant_lng) || null;
      }
    } catch (e) {
      console.error('Erro ao buscar coords do merchant:', e);
    }

    // busca coordenadas do endereço do pedido (se houver address_id)
    try {
      const [addrRows] = await db.query(
        `SELECT a.lat AS address_lat, a.lng AS address_lng FROM addresses a JOIN orders o ON o.address_id = a.id WHERE o.id = ? LIMIT 1`,
        [order.id]
      );
      if (addrRows && addrRows.length > 0) {
        order.address_lat = Number(addrRows[0].address_lat) || null;
        order.address_lng = Number(addrRows[0].address_lng) || null;
      }
    } catch (e) {
      console.error('Erro ao buscar coords do endereco do pedido:', e);
    }

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
  Quando status é READY, inicia matching de entregadores
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

    // 🔔 Se pedido pronto, inicia processo de matching
    if (status === "READY") {
      try {
        // busca dados do pedido e do restaurante
        const [ords] = await db.query("SELECT merchant_id FROM orders WHERE id = ?", [req.params.id]);
        const merchantId = ords[0].merchant_id;
        const [ms] = await db.query("SELECT id, name, lat, lng FROM merchants WHERE id = ?", [merchantId]);
        const merchant = ms[0] || { id: merchantId, lat: 0, lng: 0, name: "unknown" };

        // executa matching e notifica via socket
        await matchAndNotify(req.io, db, req.params.id, merchant, { startRadiusKm: 5, topN: 5 });
      } catch (mErr) {
        console.error("Erro no matching:", mErr);
      }
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

  // GET coords for order (merchant and address) - usable by couriers for simulation
  router.get('/:id/coords', authMiddleware, async (req, res) => {
    try {
      const orderId = req.params.id;
      const [rows] = await db.query(
        `SELECT o.id, o.merchant_id, o.address_id, mr.lat AS merchant_lat, mr.lng AS merchant_lng, a.lat AS address_lat, a.lng AS address_lng
         FROM orders o
         LEFT JOIN merchants mr ON o.merchant_id = mr.id
         LEFT JOIN addresses a ON o.address_id = a.id
         WHERE o.id = ? LIMIT 1`,
        [orderId]
      );

      if (!rows || rows.length === 0) return res.status(404).json({ error: 'Pedido nao encontrado' });

      const r = rows[0];
      res.json({
        id: r.id,
        merchant_lat: r.merchant_lat ? Number(r.merchant_lat) : null,
        merchant_lng: r.merchant_lng ? Number(r.merchant_lng) : null,
        address_lat: r.address_lat ? Number(r.address_lat) : null,
        address_lng: r.address_lng ? Number(r.address_lng) : null,
      });
    } catch (e) {
      console.error('Erro ao buscar coords do pedido:', e);
      res.status(500).json({ error: 'Erro interno' });
    }
  });

module.exports = router;

