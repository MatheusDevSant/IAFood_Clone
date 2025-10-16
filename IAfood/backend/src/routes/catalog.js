const express = require("express");
const router = express.Router();
const db = require("../lib/db");

// listar restaurantes
router.get("/merchants", async (req, res) => {
  try {
    const search = req.query.q ? `%${req.query.q}%` : "%";
    const [rows] = await db.query(
      "SELECT id, name, status, radius_km FROM merchants WHERE name LIKE ?",
      [search]
    );
    res.json(rows);
  } catch (err) {
    console.error("Erro ao buscar merchants:", err);
    res.status(500).json({ error: "Erro ao buscar restaurantes" });
  }
});

module.exports = router;
