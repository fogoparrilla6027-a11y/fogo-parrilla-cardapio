const express = require('express');
const cors = require('cors');
const path = require('path');
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

app.get('/api/store', (req, res) => {
  const db = require('./database');
  const data = db.load();
  res.json(data.store);
});

app.listen(PORT, () => {
  console.log(`🔥 Fogo Parrilla rodando em http://localhost:${PORT}`);
});
