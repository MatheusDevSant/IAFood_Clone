const express = require('express');
const router = express.Router();
const db = require('../lib/db');
const auth = require('../middleware/auth');

// Courier responde a uma proposta (accept/reject)
router.post('/:id/respond', auth, async (req, res) => {
  const assignmentId = req.params.id;
  const { action } = req.body; // 'ACCEPT' or 'REJECT'

  if (!['ACCEPT','REJECT'].includes(action)) return res.status(400).json({ error: 'Invalid action' });

  try {
    // busca assignment
    const [rows] = await db.query('SELECT * FROM assignments WHERE id = ?', [assignmentId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Assignment not found' });

    const assignment = rows[0];

  // valida se o courier (por user_id) corresponde ao usuário autenticado
  const [courierRows] = await db.query('SELECT user_id FROM couriers WHERE id = ?', [assignment.courier_id]);
  if (courierRows.length === 0) return res.status(404).json({ error: 'Courier not found' });
  if (req.user.id !== courierRows[0].user_id) return res.status(403).json({ error: 'Forbidden' });

    if (assignment.status !== 'PENDING') return res.status(400).json({ error: 'Assignment not pending' });

    if (action === 'REJECT') {
      await db.query("UPDATE assignments SET status = 'REJECTED' WHERE id = ?", [assignmentId]);
      // notifica via socket (se disponível) - emit global para simplicity
      if (req.io) {
        // tenta obter user_id do courier para notificar a room correta
        const [cr] = await db.query('SELECT user_id FROM couriers WHERE id = ?', [assignment.courier_id]);
        const room = cr && cr[0] && cr[0].user_id ? `courier-${cr[0].user_id}` : `courier-${assignment.courier_id}`;
        req.io.to(room).emit('assignmentResponse', { assignmentId, status: 'REJECTED' });
      }
      return res.json({ ok: true, status: 'REJECTED' });
    }

    // ACCEPT: precisamos garantir atomicidade: verificar se order já não foi assigned
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const [orderRows] = await conn.query('SELECT status FROM orders WHERE id = ? FOR UPDATE', [assignment.order_id]);
      if (orderRows.length === 0) {
        await conn.rollback();
        return res.status(404).json({ error: 'Order not found' });
      }

      if (orderRows[0].status === 'ASSIGNED') {
        await conn.rollback();
        return res.status(409).json({ error: 'Order already assigned' });
      }

      // marca assignment como ACCEPTED
      await conn.query("UPDATE assignments SET status = 'ACCEPTED' WHERE id = ?", [assignmentId]);

      // atualiza pedido como ASSIGNED e guarda courier_id em campo (se desejar criar coluna courier_id)
      await conn.query("UPDATE orders SET status = 'ASSIGNED' WHERE id = ?", [assignment.order_id]);

      await conn.commit();

      // emite eventos
      if (req.io) {
  req.io.emit('orderStatusUpdated', { orderId: assignment.order_id, status: 'ASSIGNED' });
  const [cr2] = await db.query('SELECT user_id FROM couriers WHERE id = ?', [assignment.courier_id]);
  const room2 = cr2 && cr2[0] && cr2[0].user_id ? `courier-${cr2[0].user_id}` : `courier-${assignment.courier_id}`;
  req.io.to(room2).emit('assignmentResponse', { assignmentId, status: 'ACCEPTED' });
      }

      return res.json({ ok: true, status: 'ACCEPTED' });
    } catch (e) {
      await conn.rollback();
      console.error('Erro ao aceitar assignment', e);
      return res.status(500).json({ error: 'Internal error' });
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao responder assignment' });
  }
});

module.exports = router;
