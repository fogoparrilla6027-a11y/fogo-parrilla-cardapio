require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/pix', require('./routes/pix'));
app.use('/api/upload', require('./routes/upload'));

app.get('/api/store', async (req, res) => {
  try {
    const store = await db.getStoreConfig();
    res.json(store);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

db.initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🔥 Fogo Parrilla rodando em http://localhost:${PORT}`);
  });
}).catch(e => {
  console.error('[DB] Erro ao iniciar:', e.message);
  process.exit(1);
});
