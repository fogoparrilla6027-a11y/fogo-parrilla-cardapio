const express = require('express');
const router = express.Router();
const { load, save } = require('../database');
const { authMiddleware } = require('./auth');

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso restrito' });
  next();
}

router.get('/dashboard', authMiddleware, adminOnly, (req, res) => {
  const db = load();
  const totalOrders = db.orders.length;
  const pendingOrders = db.orders.filter(o => o.status === 'pendente').length;
  const totalRevenue = db.orders.reduce((sum, o) => sum + o.total, 0);
  const recentOrders = db.orders.slice(0, 10);
  res.json({ totalOrders, pendingOrders, totalRevenue, recentOrders });
});

router.get('/orders', authMiddleware, adminOnly, (req, res) => {
  const db = load();
  res.json(db.orders);
});

router.put('/orders/:id/status', authMiddleware, adminOnly, (req, res) => {
  const db = load();
  const order = db.orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Pedido não encontrado' });
  order.status = req.body.status;
  save(db);
  res.json(order);
});

router.get('/products', authMiddleware, adminOnly, (req, res) => {
  const db = load();
  res.json(db.products);
});

router.post('/products', authMiddleware, adminOnly, (req, res) => {
  const db = load();
  const maxId = Math.max(...db.products.map(p => p.id), 0);
  const product = { id: maxId + 1, ...req.body, available: true };
  db.products.push(product);
  save(db);
  res.json(product);
});

router.put('/products/:id', authMiddleware, adminOnly, (req, res) => {
  const db = load();
  const idx = db.products.findIndex(p => p.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Produto não encontrado' });
  Object.assign(db.products[idx], req.body);
  save(db);
  res.json(db.products[idx]);
});

router.delete('/products/:id', authMiddleware, adminOnly, (req, res) => {
  const db = load();
  const idx = db.products.findIndex(p => p.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Produto não encontrado' });
  db.products.splice(idx, 1);
  save(db);
  res.json({ success: true });
});

router.get('/categories', authMiddleware, adminOnly, (req, res) => {
  const db = load();
  res.json(db.categories);
});

router.post('/categories', authMiddleware, adminOnly, (req, res) => {
  const db = load();
  const maxId = Math.max(...db.categories.map(c => c.id), 0);
  const cat = { id: maxId + 1, ...req.body };
  db.categories.push(cat);
  save(db);
  res.json(cat);
});

router.put('/categories/:id', authMiddleware, adminOnly, (req, res) => {
  const db = load();
  const idx = db.categories.findIndex(c => c.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Categoria não encontrada' });
  Object.assign(db.categories[idx], req.body);
  save(db);
  res.json(db.categories[idx]);
});

router.delete('/categories/:id', authMiddleware, adminOnly, (req, res) => {
  const db = load();
  const idx = db.categories.findIndex(c => c.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Categoria não encontrada' });
  db.categories.splice(idx, 1);
  save(db);
  res.json({ success: true });
});

router.put('/store', authMiddleware, adminOnly, (req, res) => {
  const db = load();
  Object.assign(db.store, req.body);
  save(db);
  res.json(db.store);
});

module.exports = router;
