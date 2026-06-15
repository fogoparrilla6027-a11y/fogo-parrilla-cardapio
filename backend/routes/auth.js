const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../database');
const { v4: uuidv4 } = require('uuid');

const JWT_SECRET = process.env.JWT_SECRET || 'fogo-parrilla-secret-key-2026';

async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Token não fornecido' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
}

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    const existing = await db.getUserByEmail(email);
    if (existing) return res.status(400).json({ error: 'Email já cadastrado' });
    const user = { id: uuidv4(), name, email, password, phone, role: 'cliente' };
    await db.createUser(user);
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await db.getUserByEmail(email);
    if (!user || user.password !== password) return res.status(401).json({ error: 'Email ou senha inválidos' });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await db.getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/me', authMiddleware, async (req, res) => {
  try {
    await db.updateUser(req.user.id, req.body);
    const user = await db.getUserById(req.user.id);
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/address', authMiddleware, async (req, res) => {
  try {
    const address = { id: uuidv4(), ...req.body };
    await db.addUserAddress(req.user.id, address);
    res.json(address);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/address/:addressId', authMiddleware, async (req, res) => {
  try {
    await db.removeUserAddress(req.user.id, req.params.addressId);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
module.exports.authMiddleware = authMiddleware;
