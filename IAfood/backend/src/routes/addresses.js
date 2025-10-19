const express = require('express');
const router = express.Router();
const db = require('../lib/db');
const auth = require('../middleware/auth');

// List addresses for logged user
router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM addresses WHERE user_id = ? ORDER BY id DESC', [req.user.id]);
    res.json(rows);
  } catch (e) {
    console.error('Erro ao buscar enderecos', e);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Create address
router.post('/', auth, async (req, res) => {
  try {
    const { label, address_line, city, state, postal_code, lat, lng, geohash } = req.body;
    if (!lat || !lng) return res.status(400).json({ error: 'lat e lng obrigatorios' });

    const [result] = await db.query(
      `INSERT INTO addresses (user_id, geohash, lat, lng, label, address_line, city, state, postal_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, geohash || null, lat, lng, label || null, address_line || null, city || null, state || null, postal_code || null]
    );

    res.json({ id: result.insertId });
  } catch (e) {
    console.error('Erro ao criar endereco', e);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Delete address (only owner)
router.delete('/:id', auth, async (req, res) => {
  try {
    const id = req.params.id;
    // ensure address belongs to user
    const [rows] = await db.query('SELECT id FROM addresses WHERE id = ? AND user_id = ?', [id, req.user.id]);
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'Endereco nao encontrado' });

    await db.query('DELETE FROM addresses WHERE id = ?', [id]);
    res.json({ ok: true });
  } catch (e) {
    console.error('Erro ao deletar endereco', e);
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
