const haversineKm = (lat1, lon1, lat2, lon2) => {
  function toRad(x) {
    return (x * Math.PI) / 180;
  }
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Busca candidatos online e ordena por um score simples
// score = distance_km + 0.01 * minutes_since_last_active - (rating || 0) * 0.5
async function findCandidates(db, centerLat, centerLng, radiusKm = 5) {
  // usa is_online (nome no schema) em vez de 'online' (pode ser palavra reservada ou não existir)
  const [rows] = await db.query(
    `SELECT id, user_id, lat, lng, is_online, last_active, rating FROM couriers WHERE is_online = 1`
  );

  const now = Date.now();

  const candidates = rows
    .map((c) => {
      const lat = Number(c.lat) || 0;
      const lng = Number(c.lng) || 0;
      const distanceKm = haversineKm(centerLat, centerLng, lat, lng);
      const lastActiveMs = c.last_active ? new Date(c.last_active).getTime() : 0;
      const minutesSince = lastActiveMs ? (now - lastActiveMs) / 60000 : 99999;
      const rating = Number(c.rating) || 0;
      const score = distanceKm + 0.01 * minutesSince - rating * 0.5;
      return { ...c, distanceKm, minutesSince, rating, score };
    })
    .filter((c) => c.distanceKm <= radiusKm)
    .sort((a, b) => a.score - b.score);

  return candidates;
}

// Notifica os top N candidatos via Socket.IO (assume que os couriers entrem na sala `courier-<id>`)
// Persiste proposals em 'assignments' e aguarda respostas dentro do timeout. Se ninguém aceitar,
// aumenta o raio e tenta novamente até maxRadiusKm.
async function matchAndNotify(io, db, orderId, merchant, opts = {}) {
  let radiusKm = opts.startRadiusKm || 5;
  const topN = opts.topN || 5;
  const maxRadiusKm = opts.maxRadiusKm || 20;
  const timeoutMs = (opts.timeoutSeconds || 20) * 1000;

  while (radiusKm <= maxRadiusKm) {
    const candidates = await findCandidates(db, merchant.lat, merchant.lng, radiusKm);

    if (!candidates || candidates.length === 0) {
      console.log("🔔 matching: nenhum entregador encontrado no raio", radiusKm);
      radiusKm = Math.min(radiusKm * 2, maxRadiusKm);
      continue;
    }

    const selected = candidates.slice(0, topN);

    // Persiste propostas e emite eventos
    const now = new Date();
    const expiresAt = new Date(now.getTime() + timeoutMs);

    for (const c of selected) {
      // insere assignment no DB e recupera o id inserido
      try {
        const [result] = await db.query(
          `INSERT INTO assignments (order_id, courier_id, score, status, expires_at) VALUES (?, ?, ?, 'PENDING', ?)`,
          [orderId, c.id, c.score, expiresAt]
        );
        const assignmentId = result && result.insertId ? result.insertId : null;

  // emitir para a room do user_id (frontend monta room como `courier-<user.id>`)
  const room = `courier-${c.user_id}`;
        const payload = {
          id: assignmentId,
          order_id: orderId,
          merchant_name: merchant.name || (merchant && merchant.name) || null,
          merchant: { id: merchant.id, lat: merchant.lat, lng: merchant.lng },
          distance_km: Number(c.distanceKm.toFixed(3)),
          score: Number(c.score.toFixed(3)),
          expires_at: expiresAt.toISOString(),
          ts: now.toISOString(),
        };

        io.to(room).emit("assignmentRequest", payload);
        console.log(`🔔 assignmentRequest emitted to ${room} for order ${orderId} (assignment ${assignmentId})`);
      } catch (e) {
        console.error('Erro ao inserir assignment ou notificar:', e);
      }
    }

    // Aguarda respostas por timeoutMs; verifica se algum assignment foi aceito
    await new Promise((resolve) => setTimeout(resolve, timeoutMs));

    // Verifica no banco se há assignment ACCEPTED para este order
    const [accepted] = await db.query(
      `SELECT * FROM assignments WHERE order_id = ? AND status = 'ACCEPTED' LIMIT 1`,
      [orderId]
    );

    if (accepted && accepted.length > 0) {
      console.log(`✅ order ${orderId} assigned to courier ${accepted[0].courier_id}`);
      return accepted[0];
    }

    // marca como EXPIRED os assignments pendentes para este order
    try {
      await db.query(`UPDATE assignments SET status = 'EXPIRED' WHERE order_id = ? AND status = 'PENDING'`, [orderId]);
    } catch (e) {
      console.error('Erro ao expirar assignments:', e);
    }

    // aumenta raio e tenta novamente
    radiusKm = Math.min(radiusKm * 2, maxRadiusKm);
    console.log(`🔁 Nenhum aceitou, expandindo raio para ${radiusKm}km e tentando novamente`);
  }

  console.log(`⚠️ Nenhum entregador disponível até ${opts.maxRadiusKm || 20}km para order ${orderId}`);
  return null;
}

module.exports = { findCandidates, matchAndNotify };
