const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { load, save } = require('../database');
const { v4: uuidv4 } = require('uuid');

const JWT_SECRET = 'fogo-parrilla-secret-key-2026';

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Token não fornecido' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
}

router.post('/register', (req, res) => {
  const { name, email, password, phone } = req.body;
  const db = load();
  if (db.users.find(u => u.email === email)) {
    return res.status(400).json({ error: 'Email já cadastrado' });
  }
  const user = { id: uuidv4(), name, email, password, phone, role: 'cliente', addresses: [] };
  db.users.push(user);
  save(db);
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const db = load();
  const user = db.users.find(u => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ error: 'Email ou senha inválidos' });
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

router.get('/me', authMiddleware, (req, res) => {
  const db = load();
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  res.json({ id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, addresses: user.addresses });
});

router.put('/me', authMiddleware, (req, res) => {
  const db = load();
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  Object.assign(user, req.body);
  save(db);
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
});

router.post('/address', authMiddleware, (req, res) => {
  const db = load();
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  const address = { id: uuidv4(), ...req.body };
  user.addresses.push(address);
  save(db);
  res.json(address);
});

router.delete('/address/:addressId', authMiddleware, (req, res) => {
  const db = load();
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  user.addresses = user.addresses.filter(a => a.id !== req.params.addressId);
  save(db);
  res.json({ success: true });
});

module.exports = router;
module.exports.authMiddleware = authMiddleware;
