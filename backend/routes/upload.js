const express = require('express');
const router = express.Router();
const multer = require('multer');
const db = require('../database');
const { authMiddleware } = require('./auth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Apenas imagens são permitidas'));
  }
});

router.post('/product/:id', authMiddleware, upload.single('image'), async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso restrito' });
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhuma imagem enviada' });
    const base64 = req.file.buffer.toString('base64');
    const dataUrl = `data:${req.file.mimetype};base64,${base64}`;
    await db.updateProduct(parseInt(req.params.id), { image: dataUrl });
    res.json({ image: dataUrl });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/logo', authMiddleware, upload.single('logo'), async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso restrito' });
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhuma imagem enviada' });
    const base64 = req.file.buffer.toString('base64');
    const dataUrl = `data:${req.file.mimetype};base64,${base64}`;
    const store = await db.getStoreConfig();
    store.logo = dataUrl;
    await db.updateStoreConfig(store);
    res.json({ logo: dataUrl });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/upload', authMiddleware, upload.single('image'), async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso restrito' });
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhuma imagem enviada' });
    const base64 = req.file.buffer.toString('base64');
    const dataUrl = `data:${req.file.mimetype};base64,${base64}`;
    res.json({ url: dataUrl });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
