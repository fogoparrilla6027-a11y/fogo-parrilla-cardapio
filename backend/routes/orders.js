const express = require('express');
const router = express.Router();
const { load, save } = require('../database');
const { authMiddleware } = require('./auth');

router.post('/', authMiddleware, (req, res) => {
  const db = load();
  const { items, paymentMethod, deliveryAddress, changeFor, observation } = req.body;
  if (!items || !items.length) return res.status(400).json({ error: 'Carrinho vazio' });
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  const orderItems = items.map(item => {
    const product = db.products.find(p => p.id === item.productId);
    return {
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: item.quantity,
      total: product.price * item.quantity
    };
  });
  const subtotal = orderItems.reduce((sum, i) => sum + i.total, 0);
  const deliveryFee = deliveryAddress ? db.store.delivery_fee : 0;
  const total = subtotal + deliveryFee;
  const order = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
    userId: req.user.id,
    userName: user.name,
    items: orderItems,
    subtotal,
    deliveryFee,
    total,
    paymentMethod,
    deliveryAddress,
    changeFor: paymentMethod === 'dinheiro' ? changeFor : null,
    observation,
    status: 'pendente',
    createdAt: new Date().toISOString()
  };
  db.orders.unshift(order);
  save(db);
  res.json(order);
});

router.get('/', authMiddleware, (req, res) => {
  const db = load();
  const orders = db.orders.filter(o => o.userId === req.user.id);
  res.json(orders);
});

router.get('/:id', authMiddleware, (req, res) => {
  const db = load();
  const order = db.orders.find(o => o.id === req.params.id && o.userId === req.user.id);
  if (!order) return res.status(404).json({ error: 'Pedido não encontrado' });
  res.json(order);
});

module.exports = router;
