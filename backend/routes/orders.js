const express = require('express');
const router = express.Router();
const db = require('../database');
const { authMiddleware } = require('./auth');

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { items, paymentMethod, deliveryAddress, changeFor, observation } = req.body;
    if (!items || !items.length) return res.status(400).json({ error: 'Carrinho vazio' });
    const user = await db.getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    const store = await db.getStoreConfig();
    const orderItems = [];
    for (const item of items) {
      const product = await db.getProductById(item.productId);
      if (!product) continue;
      orderItems.push({
        productId: product.id,
        name: product.name,
        price: parseFloat(product.price),
        quantity: item.quantity,
        total: parseFloat(product.price) * item.quantity
      });
    }
    if (!orderItems.length) return res.status(400).json({ error: 'Nenhum produto válido' });
    const subtotal = orderItems.reduce((s, i) => s + i.total, 0);
    const deliveryFee = deliveryAddress ? parseFloat(store.delivery_fee) : 0;
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
    const order = {
      id,
      userId: req.user.id,
      userName: user.name,
      items: orderItems,
      subtotal,
      deliveryFee,
      total: subtotal + deliveryFee,
      paymentMethod,
      deliveryAddress,
      changeFor: paymentMethod === 'dinheiro' ? changeFor : null,
      observation,
      status: 'pendente'
    };
    await db.createOrder(order);
    res.json(order);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const orders = await db.getOrdersByUser(req.user.id);
    res.json(orders);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const order = await db.getOrderById(req.params.id);
    if (!order || order.user_id !== req.user.id) return res.status(404).json({ error: 'Pedido não encontrado' });
    res.json(order);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
