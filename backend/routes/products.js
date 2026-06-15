const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/', async (req, res) => {
  try {
    const products = await db.getProducts(req.query.category);
    res.json(products);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/categories', async (req, res) => {
  try {
    const categories = await db.getCategories();
    res.json(categories);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/featured', async (req, res) => {
  try {
    const products = await db.getFeaturedProducts();
    res.json(products);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const product = await db.getProductById(parseInt(req.params.id));
    if (!product) return res.status(404).json({ error: 'Produto não encontrado' });
    res.json(product);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
