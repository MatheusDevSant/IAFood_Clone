const express = require("express");
const router = express.Router();
const db = require("../lib/db");

// Rota: GET /catalog/merchants/:id/menu
router.get("/catalog/merchants/:id/menu", async (req, res) => {
  try {
    const merchantId = req.params.id;

    // Busca todos os menus do restaurante
    const [menus] = await db.query(
      "SELECT id, title FROM menus WHERE merchant_id = ?",
      [merchantId]
    );

    // Se não existir nenhum menu, retorna 404
    if (!menus.length) {
      return res.status(404).json({ error: "Menu não encontrado para este restaurante." });
    }

    // Monta o cardápio completo
    const fullMenu = [];
    for (const menu of menus) {
      const [items] = await db.query(
        "SELECT id, name, description, price, available FROM menu_items WHERE menu_id = ?",
        [menu.id]
      );
      fullMenu.push({
        title: menu.title || "Cardápio",
        items,
      });
    }

    res.json(fullMenu);
  } catch (err) {
    console.error("Erro ao buscar menu:", err);
    res.status(500).json({ error: "Erro ao buscar menu" });
  }
});

module.exports = router;
