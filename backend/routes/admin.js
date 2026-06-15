const express = require('express');
const router = express.Router();
const db = require('../database');
const { authMiddleware } = require('./auth');

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso restrito' });
  next();
}

router.get('/dashboard', authMiddleware, adminOnly, async (req, res) => {
  try {
    const orders = await db.getAllOrders();
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.status === 'pendente').length;
    const totalRevenue = orders.reduce((s, o) => s + parseFloat(o.total), 0);
    res.json({ totalOrders, pendingOrders, totalRevenue, recentOrders: orders.slice(0, 10) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/orders', authMiddleware, adminOnly, async (req, res) => {
  try {
    const orders = await db.getAllOrders();
    res.json(orders);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/orders/:id/status', authMiddleware, adminOnly, async (req, res) => {
  try {
    await db.updateOrderStatus(req.params.id, req.body.status);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/products', authMiddleware, adminOnly, async (req, res) => {
  try {
    const products = await db.getProducts();
    res.json(products);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/products', authMiddleware, adminOnly, async (req, res) => {
  try {
    const product = await db.createProduct(req.body);
    res.json(product);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/products/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await db.updateProduct(parseInt(req.params.id), req.body);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/products/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await db.deleteProduct(parseInt(req.params.id));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/categories', authMiddleware, adminOnly, async (req, res) => {
  try {
    const cats = await db.getCategories();
    res.json(cats);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/categories', authMiddleware, adminOnly, async (req, res) => {
  try {
    const cat = await db.createCategory(req.body);
    res.json(cat);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/categories/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await db.updateCategory(parseInt(req.params.id), req.body);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/categories/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await db.deleteCategory(parseInt(req.params.id));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/store', authMiddleware, adminOnly, async (req, res) => {
  try {
    await db.updateStoreConfig(req.body);
    const store = await db.getStoreConfig();
    res.json(store);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
