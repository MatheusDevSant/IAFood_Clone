require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../src/lib/db');

(async () => {
  try {
    const hash = await bcrypt.hash('123', 10);
    const users = [
      { role: 'client', name: 'Demo Cliente', email: 'demo.cliente@example.com', phone: '11990000001' },
      { role: 'merchant', name: 'Demo Restaurante', email: 'demo.restaurante@example.com', phone: '11990000002' },
      { role: 'courier', name: 'Demo Entregador', email: 'demo.entregador@example.com', phone: '11990000003' },
    ];

    for (const u of users) {
      // remove existing with same email
      await db.query('DELETE FROM users WHERE email = ?', [u.email]);
      const [res] = await db.query('INSERT INTO users (role, name, email, phone, password_hash) VALUES (?, ?, ?, ?, ?)', [u.role, u.name, u.email, u.phone, hash]);
      const id = res.insertId;
      console.log(`Criado ${u.role} -> id=${id} email=${u.email}`);

      if (u.role === 'merchant') {
        await db.query('DELETE FROM merchants WHERE user_id = ?', [id]).catch(() => {});
        await db.query('INSERT INTO merchants (user_id, name, status, radius_km, lat, lng) VALUES (?, ?, ?, ?, ?, ?)', [id, u.name, 'open', 5.0, -23.5505, -46.6333]);
      }

      if (u.role === 'client') {
        await db.query('DELETE FROM addresses WHERE user_id = ?', [id]).catch(() => {});
        await db.query('INSERT INTO addresses (user_id, geohash, lat, lng, label, address_line, city, state, postal_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [id, null, -23.5512, -46.6335, 'Casa Demo', 'R. Demo, 100', 'São Paulo', 'SP', '01310-000']);
      }

      if (u.role === 'courier') {
        await db.query('DELETE FROM couriers WHERE user_id = ?', [id]).catch(() => {});
        await db.query('INSERT INTO couriers (user_id, is_online, lat, lng, rating, last_active) VALUES (?, ?, ?, ?, ?, NOW())', [id, 1, -23.5520, -46.6340, 4.8]);
      }
    }

    console.log('\n✅ Contas principais criadas/atualizadas (senha: 123)');

    const [rows] = await db.query("SELECT id, name, role, email FROM users WHERE email IN (?, ?, ?) ORDER BY role", ['demo.cliente@example.com', 'demo.restaurante@example.com', 'demo.entregador@example.com']);
    console.table(rows);

    process.exit(0);
  } catch (err) {
    console.error('Erro ao criar contas demo:', err);
    process.exit(1);
  }
})();
