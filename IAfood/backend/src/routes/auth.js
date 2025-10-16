const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../lib/db.js");
const authMiddleware = require("../middleware/auth");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "seu_segredo_jwt";

console.log("✅ Módulo auth carregado.");

/* ===========================================================
  1️⃣ - SIGNUP (Cadastro)
=========================================================== */
router.post("/signup", async (req, res) => {
  const { name, email, password, role, phone } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: "Campos obrigatórios ausentes" });
  }

  const validRoles = ["client", "merchant", "courier", "admin"];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ message: "Tipo de usuário inválido" });
  }

  try {
    // 🔍 Verifica duplicidade de email
    const [existing] = await db.query("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length > 0) {
      return res.status(409).json({ message: "E-mail já cadastrado" });
    }

    // 🔐 Criptografa senha
    const passwordHash = await bcrypt.hash(password, 10);

    // 🧾 Cria usuário
    const [result] = await db.query(
      "INSERT INTO users (role, name, email, password_hash, phone) VALUES (?, ?, ?, ?, ?)",
      [role, name, email, passwordHash, phone || null]
    );

    const newUserId = result.insertId;

    // 🍔 Se for restaurante, cria merchant vinculado automaticamente
    if (role === "merchant") {
      await db.query(
        `INSERT INTO merchants (user_id, name, status, radius_km) VALUES (?, ?, ?, ?)`,
        [newUserId, name, "OPEN", 5]
      );
      console.log(`🏪 Novo restaurante criado → user_id=${newUserId}`);
    }

    // 🔑 Gera token JWT
    const token = jwt.sign({ id: newUserId, role }, JWT_SECRET, { expiresIn: "7d" });

    res.status(201).json({
      token,
      user: { id: newUserId, name, email, role },
    });
  } catch (err) {
    console.error("❌ Erro no signup:", err);
    res.status(500).json({ message: "Erro ao criar usuário" });
  }
});

/* ===========================================================
  2️⃣ - LOGIN
=========================================================== */
router.post("/login", async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password || !role) {
    return res.status(400).json({ message: "Campos obrigatórios ausentes" });
  }

  try {
    const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    if (rows.length === 0) {
      return res.status(401).json({ message: "Usuário não encontrado" });
    }

    const user = rows[0];

    // 🔒 Verifica papel correto
    if (role && user.role !== role) {
      return res.status(403).json({ message: "Função incorreta para este login" });
    }

    // 🔑 Valida senha
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ message: "Senha incorreta" });
    }

    // 🔐 Gera token JWT
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });

    console.log(`✅ Login bem-sucedido → ${user.role}: ${user.email}`);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("❌ Erro no login:", err);
    res.status(500).json({ message: "Erro ao autenticar usuário" });
  }
});

/* ===========================================================
  3️⃣ - PERFIL (autenticado)
=========================================================== */
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, name, email, role FROM users WHERE id = ?",
      [req.user.id]
    );
    if (rows.length === 0)
      return res.status(404).json({ message: "Usuário não encontrado" });

    res.json(rows[0]);
  } catch (err) {
    console.error("Erro ao buscar perfil:", err);
    res.status(500).json({ message: "Erro interno ao buscar perfil" });
  }
});

module.exports = router;
