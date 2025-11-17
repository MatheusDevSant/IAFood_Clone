require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../src/lib/db');

(async () => {
  try {
    const hash = await bcrypt.hash('123', 10);
    // emails solicitados
    const mainUsers = [
      { role: 'client', name: 'User Cliente', email: 'client@email.com', phone: '11990001001' },
      { role: 'merchant', name: 'Restaurante Principal', email: 'restaurant@email.com', phone: '11990001002' },
      { role: 'courier', name: 'User Entregador', email: 'courier@email.com', phone: '11990001003' },
    ];

    // remove any demo.* users created previously
    await db.query("DELETE FROM users WHERE email LIKE 'demo.%@%'").catch(() => {});

    for (const u of mainUsers) {
      // delete if exists
      await db.query('DELETE FROM users WHERE email = ?', [u.email]).catch(() => {});
      const [ins] = await db.query('INSERT INTO users (role, name, email, phone, password_hash) VALUES (?, ?, ?, ?, ?)', [u.role, u.name, u.email, u.phone, hash]);
      const id = ins.insertId;
      console.log(`Criado ${u.role} id=${id} ${u.email}`);

      if (u.role === 'merchant') {
        await db.query('DELETE FROM merchants WHERE user_id = ?', [id]).catch(() => {});
        await db.query('INSERT INTO merchants (user_id, name, status, radius_km, lat, lng) VALUES (?, ?, ?, ?, ?, ?)', [id, u.name, 'open', 5.0, -23.5506, -46.6332]);
      }

      if (u.role === 'client') {
        await db.query('DELETE FROM addresses WHERE user_id = ?', [id]).catch(() => {});
        await db.query('INSERT INTO addresses (user_id, geohash, lat, lng, label, address_line, city, state, postal_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [id, null, -23.5513, -46.6336, 'Casa Principal', 'R. Principal, 100', 'São Paulo', 'SP', '01310-000']);
      }

      if (u.role === 'courier') {
        await db.query('DELETE FROM couriers WHERE user_id = ?', [id]).catch(() => {});
        await db.query('INSERT INTO couriers (user_id, is_online, lat, lng, rating, last_active) VALUES (?, ?, ?, ?, ?, NOW())', [id, 1, -23.5521, -46.6341, 4.9]);
      }
    }

    console.log('\n✅ Contas principais principais criadas/atualizadas com emails solicitados (senha: 123)');

    const [rows] = await db.query("SELECT id, name, role, email FROM users WHERE email IN (?, ?, ?) ORDER BY role", ['client@email.com', 'restaurant@email.com', 'courier@email.com']);
    console.table(rows);

    process.exit(0);
  } catch (err) {
    console.error('Erro ao criar contas principais:', err);
    process.exit(1);
  }
})();
