const express = require('express');
const router = express.Router();
const db = require('../lib/db');
const auth = require('../middleware/auth');
const { matchAndNotify } = require('../lib/matching');

// Cria um pedido demo pronto (READY) com endereço deslocado perto do merchant
// body: { merchant_id?: number }
router.post('/create-presentation', auth, async (req, res) => {
  try {
    // pega merchant_id do body ou usa primeiro merchant
    let merchantId = req.body && req.body.merchant_id ? req.body.merchant_id : null;
    if (!merchantId) {
      const [mrows] = await db.query('SELECT id, name, lat, lng FROM merchants LIMIT 1');
      if (!mrows || mrows.length === 0) return res.status(404).json({ error: 'No merchants available' });
      merchantId = mrows[0].id;
    }

    const [ms] = await db.query('SELECT id, name, lat, lng FROM merchants WHERE id = ? LIMIT 1', [merchantId]);
    if (!ms || ms.length === 0) return res.status(404).json({ error: 'Merchant not found' });
    const merchant = ms[0];

    // encontra cliente demo (role = client). se não existir, erro
    const [clients] = await db.query("SELECT id FROM users WHERE role = 'client' LIMIT 1");
    if (!clients || clients.length === 0) return res.status(404).json({ error: 'No client users available' });
    const clientId = clients[0].id;

    // cria endereço deslocado (small offset) para ficar perto mas não igual
    const offset = 0.0012; // ~100-150m
    const addrLat = Number(merchant.lat) + offset;
    const addrLng = Number(merchant.lng) + offset;

    const [addrRes] = await db.query(
      `INSERT INTO addresses (user_id, geohash, lat, lng, label, address_line, city, state, postal_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [clientId, null, addrLat, addrLng, 'Casa Demo (apresentação)', 'Endereço Demo', 'Cidade', 'UF', '00000-000']
    );
    const addressId = addrRes.insertId;

    // seleciona um item do merchant (primeiro encontrado)
    const [items] = await db.query(
      `SELECT mi.id AS item_id, mi.price FROM menu_items mi JOIN menus m ON mi.menu_id = m.id WHERE m.merchant_id = ? LIMIT 1`,
      [merchantId]
    );
    if (!items || items.length === 0) return res.status(404).json({ error: 'No menu items for merchant' });
    const item = items[0];

    const subtotal = Number(item.price) || 10;
    const delivery_fee = 6.0;
    const total = +(subtotal + delivery_fee).toFixed(2);

    // insere pedido com status READY para disparar matching
    const [ordRes] = await db.query(
      `INSERT INTO orders (customer_id, merchant_id, status, total, delivery_fee, payment_status, eta_minutes, address_id) VALUES (?, ?, 'READY', ?, ?, 'PAID', ?, ?)`,
      [clientId, merchantId, total, delivery_fee, 20, addressId]
    );
    const orderId = ordRes.insertId;

    // insere order_item
    await db.query(`INSERT INTO order_items (order_id, item_id, qty, unit_price, options_json) VALUES (?, ?, ?, ?, ?)`, [orderId, item.item_id, 1, item.price, JSON.stringify({})]);

    // busca dados do merchant para passar ao matching
    const merchantPayload = { id: merchant.id, name: merchant.name, lat: Number(merchant.lat) || 0, lng: Number(merchant.lng) || 0 };

    // chama matching (não bloqueante)
    matchAndNotify(req.io, db, orderId, merchantPayload, { startRadiusKm: 5, topN: 5 }).catch((e) => console.error('matching demo error', e));

    res.json({ ok: true, orderId, addressId, merchant: merchantPayload });
  } catch (e) {
    console.error('Erro create-presentation:', e);
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
