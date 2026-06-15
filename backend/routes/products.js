const express = require('express');
const router = express.Router();
const { load } = require('../database');

router.get('/', (req, res) => {
  const db = load();
  const { category } = req.query;
  let products = db.products;
  if (category) {
    products = products.filter(p => p.categoryId === parseInt(category) || p.categoryId === category);
  }
  res.json(products);
});

router.get('/categories', (req, res) => {
  const db = load();
  res.json(db.categories);
});

router.get('/featured', (req, res) => {
  const db = load();
  res.json(db.products.filter(p => p.featured && p.available));
});

router.get('/:id', (req, res) => {
  const db = load();
  const product = db.products.find(p => p.id === parseInt(req.params.id));
  if (!product) return res.status(404).json({ error: 'Produto não encontrado' });
  res.json(product);
});

module.exports = router;
