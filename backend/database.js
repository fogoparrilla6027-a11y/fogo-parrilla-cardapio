const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function query(text, params) {
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    return res;
  } finally {
    client.release();
  }
}

async function initDB() {
  await query(`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      slug VARCHAR(100),
      icon VARCHAR(10) DEFAULT '📦',
      category_order INTEGER DEFAULT 0
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
      name VARCHAR(200) NOT NULL,
      description TEXT DEFAULT '',
      price DECIMAL(10,2) NOT NULL DEFAULT 0,
      image TEXT DEFAULT '',
      available BOOLEAN DEFAULT true,
      featured BOOLEAN DEFAULT false
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      email VARCHAR(200) UNIQUE NOT NULL,
      password VARCHAR(200) NOT NULL,
      phone VARCHAR(50) DEFAULT '',
      role VARCHAR(20) DEFAULT 'cliente',
      addresses JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS orders (
      id VARCHAR(50) PRIMARY KEY,
      user_id VARCHAR(50) REFERENCES users(id),
      user_name VARCHAR(200),
      items JSONB DEFAULT '[]'::jsonb,
      subtotal DECIMAL(10,2) DEFAULT 0,
      delivery_fee DECIMAL(10,2) DEFAULT 0,
      total DECIMAL(10,2) DEFAULT 0,
      payment_method VARCHAR(50),
      delivery_address JSONB,
      change_for DECIMAL(10,2),
      observation TEXT DEFAULT '',
      status VARCHAR(50) DEFAULT 'pendente',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS pix_transactions (
      id VARCHAR(50) PRIMARY KEY,
      order_id VARCHAR(50),
      user_id VARCHAR(50),
      valor DECIMAL(10,2) DEFAULT 0,
      brcode TEXT DEFAULT '',
      status VARCHAR(50) DEFAULT 'pendente',
      modo VARCHAR(20) DEFAULT 'offline',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS store_config (
      key VARCHAR(100) PRIMARY KEY,
      value JSONB DEFAULT '{}'::jsonb
    )
  `);
  await seedData();
}

async function seedData() {
  const { rows: existing } = await query('SELECT COUNT(*) as count FROM categories');
  if (parseInt(existing[0].count) > 0) return;

  const cats = [
    { name: 'Pratos Especiais', slug: 'pratos-especiais', icon: '🥩', category_order: 1 },
    { name: 'Porções', slug: 'porcoes', icon: '🍟', category_order: 2 },
    { name: 'Combos', slug: 'combos', icon: '🔥', category_order: 3 },
    { name: 'Pratos do Dia', slug: 'pratos-do-dia', icon: '☀️', category_order: 4 },
    { name: 'Bebidas', slug: 'bebidas', icon: '🥤', category_order: 5 }
  ];

  for (const c of cats) {
    await query(
      'INSERT INTO categories (name, slug, icon, category_order) VALUES ($1, $2, $3, $4)',
      [c.name, c.slug, c.icon, c.category_order]
    );
  }

  const prods = [
    { cat: 'Pratos Especiais', items: [
      { name: 'Picanha na Chapa', desc: 'Picanha selecionada grelhada na chapa, servida com arroz, farofa e vinagrete', price: 89.90, featured: true },
      { name: 'Costela no Bafo', desc: 'Costela bovina assada lentamente no bafo por 12 horas, acompanha mandioca', price: 79.90, featured: true },
      { name: 'Maminha ao Molho Madeira', desc: 'Maminha grelhada ao molho madeira com legumes salteados e arroz', price: 74.90 },
      { name: 'Filé de Frango à Parrilla', desc: 'Filé de frango grelhado na parrilla, acompanha arroz, feijão e salada', price: 54.90 }
    ]},
    { cat: 'Porções', items: [
      { name: 'Porção de Batata Frita', desc: 'Batata frita crocante servida com ketchup e maionese', price: 34.90 },
      { name: 'Porção de Mandioca Frita', desc: 'Mandioca frita crocante com tempero especial', price: 32.90 },
      { name: 'Porção de Calabresa', desc: 'Calabresa acebolada com pimentão e molho especial', price: 38.90 },
      { name: 'Porção de Frango à Passarinho', desc: 'Frango à passarinho crocante com limão e molho tártaro', price: 42.90 },
      { name: 'Porção de Carne de Sol', desc: 'Carne de sol frita com cebola roxa e azeite', price: 49.90 },
      { name: 'Porção de Torresmo', desc: 'Torresmo pururuca crocante com limão', price: 29.90 }
    ]},
    { cat: 'Combos', items: [
      { name: 'Combo Fogo Leve', desc: 'Picanha na chapa + batata frita + 2 refrigerantes lata', price: 119.90, featured: true },
      { name: 'Combo Casal', desc: '2 picanhas na chapa + mandioca frita + vinagrete + 2 bebidas', price: 179.90, featured: true },
      { name: 'Combo Família', desc: 'Costela no bafo + picanha na chapa + batata frita + mandioca + 4 bebidas', price: 259.90, featured: true },
      { name: 'Combo Executivo', desc: 'Filé de frango à parrilla + arroz + feijão + salada + bebida', price: 59.90 },
      { name: 'Combo Parrilla Leve', desc: 'Maminha ao molho madeira + arroz + legumes + 1 bebida', price: 89.90 },
      { name: 'Combo Frango Completo', desc: 'Filé de frango + batata frita + arroz + salada + 2 bebidas', price: 89.90 },
      { name: 'Combo Picanha Premium', desc: 'Picanha na chapa + batata frita + mandioca + vinagrete + 2 bebidas', price: 149.90 },
      { name: 'Combo Torresmo & Cerveja', desc: 'Porção de torresmo + 4 cervejas garrafa', price: 69.90 },
      { name: 'Combo Caldo & Drink', desc: 'Caldo de feijão + porção de torresmo + 2 drinks', price: 59.90 },
      { name: 'Combo Frango & Batata', desc: 'Frango à passarinho + batata frita + 2 bebidas', price: 69.90 },
      { name: 'Combo Carne de Sol & Mandioca', desc: 'Carne de sol + mandioca frita + vinagrete + 2 bebidas', price: 79.90 },
      { name: 'Combo Petisco', desc: 'Batata frita + calabresa acebolada + 2 bebidas', price: 64.90 },
      { name: 'Combo Amigo', desc: 'Porção mista (batata, mandioca, calabresa) + 3 cervejas', price: 89.90 },
      { name: 'Combo Executivo Maminha', desc: 'Maminha grelhada + arroz + feijão + batata frita + bebida', price: 79.90 },
      { name: 'Combo Super Família', desc: '2 picanhas + costela no bafo + 2 porções + 6 bebidas + sobremesa', price: 349.90 },
      { name: 'Combo da Casa', desc: 'Picanha na chapa + calabresa acebolada + mandioca + vinagrete + 2 bebidas', price: 129.90 },
      { name: 'Combo Petisco Premium', desc: 'Batata frita + frango à passarinho + carne de sol + 4 cervejas', price: 119.90 }
    ]},
    { cat: 'Pratos do Dia', items: [
      { name: 'Prato do Dia - Segunda', desc: 'Filé de frango grelhado + arroz + feijão + batata frita + salada', price: 39.90 },
      { name: 'Prato do Dia - Quarta', desc: 'Bife à milanesa + arroz + feijão + purê + salada', price: 34.90 },
      { name: 'Prato do Dia - Sexta', desc: 'Peixe grelhado + arroz + feijão + legumes + salada', price: 42.90 }
    ]},
    { cat: 'Bebidas', items: [
      { name: 'Coca-Cola Lata', desc: 'Coca-Cola lata 350ml', price: 6.00 },
      { name: 'Coca-Cola Zero Lata', desc: 'Coca-Cola Zero lata 350ml', price: 6.00 },
      { name: 'Guaraná Antarctica Lata', desc: 'Guaraná Antarctica lata 350ml', price: 5.50 },
      { name: 'Fanta Laranja Lata', desc: 'Fanta Laranja lata 350ml', price: 5.50 },
      { name: 'Sprite Lata', desc: 'Sprite lata 350ml', price: 5.50 },
      { name: 'Água Mineral', desc: 'Água mineral sem gás 500ml', price: 4.00 },
      { name: 'Água Mineral com Gás', desc: 'Água mineral com gás 500ml', price: 4.50 },
      { name: 'Suco Natural de Laranja', desc: 'Suco natural de laranja 500ml', price: 10.00 },
      { name: 'Suco Natural de Limão', desc: 'Suco natural de limão 500ml', price: 10.00 },
      { name: 'Cerveja Brahma Garrafa', desc: 'Cerveja Brahma garrafa 600ml', price: 12.00 },
      { name: 'Cerveja Skol Garrafa', desc: 'Cerveja Skol garrafa 600ml', price: 12.00 },
      { name: 'Cerveja Antarctica Garrafa', desc: 'Cerveja Antarctica garrafa 600ml', price: 12.00 },
      { name: 'Cerveja Heineken Garrafa', desc: 'Cerveja Heineken garrafa 600ml', price: 16.00 }
    ]}
  ];

  for (const group of prods) {
    const catRes = await query('SELECT id FROM categories WHERE name = $1', [group.cat]);
    const catId = catRes.rows[0].id;
    for (const p of group.items) {
      await query(
        'INSERT INTO products (category_id, name, description, price, available, featured) VALUES ($1, $2, $3, $4, true, $5)',
        [catId, p.name, p.desc, p.price, p.featured || false]
      );
    }
  }

  await query(
    `INSERT INTO users (id, name, email, password, phone, role) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (email) DO NOTHING`,
    ['admin-001', 'Administrador', 'admin@fogoparrilla.com.br', 'admin123', '(37) 99999-0000', 'admin']
  );

  const storeDefault = {
    name: 'Fogo Parrilla',
    slogan: 'O verdadeiro sabor da parrilla',
    description: 'Churrascaria especializada em carnes nobres grelhadas na parrilla. Tradição desde 2019 em Itaúna-MG.',
    address: 'Av. Jove Soares, 1216 - Centro, Itaúna - MG',
    phone: '(37) 99999-0000',
    whatsapp: '5537999990000',
    instagram: '@fogoparrilla',
    since: 2019,
    pix_key: '59086592000159',
    pix_merchant: 'FOGO PARRILLA LTDA',
    pix_city: 'Itauna',
    delivery_fee: 5.00,
    min_order: 20.00,
    working_hours: 'Seg-Sáb: 11h às 23h | Dom: 11h às 16h'
  };

  await query(
    'INSERT INTO store_config (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING',
    ['store', JSON.stringify(storeDefault)]
  );

  console.log('[DB] Seed data inserted');
}

// Category queries
async function getCategories() {
  const r = await query('SELECT id, name, slug, icon, category_order as "order" FROM categories ORDER BY category_order');
  return r.rows;
}

async function getCategoryByName(name) {
  const r = await query('SELECT * FROM categories WHERE name = $1', [name]);
  return r.rows[0];
}

async function createCategory(data) {
  const r = await query(
    'INSERT INTO categories (name, slug, icon, category_order) VALUES ($1, $2, $3, $4) RETURNING *',
    [data.name, data.slug || data.name.toLowerCase().replace(/\s+/g, '-'), data.icon || '📦', data.order || 0]
  );
  return r.rows[0];
}

async function updateCategory(id, data) {
  const sets = []; const vals = []; let idx = 1;
  for (const [k, v] of Object.entries(data)) {
    if (k === 'order') { sets.push(`category_order = $${idx}`); vals.push(v); idx++; continue; }
    sets.push(`${k} = $${idx}`); vals.push(v); idx++;
  }
  vals.push(id);
  await query(`UPDATE categories SET ${sets.join(', ')} WHERE id = $${idx}`, vals);
}

async function deleteCategory(id) {
  await query('DELETE FROM categories WHERE id = $1', [id]);
}

// Product queries
async function getProducts(categoryId) {
  if (categoryId) {
    const r = await query('SELECT id, category_id as "categoryId", name, description, price, image, available, featured FROM products WHERE category_id = $1 AND available = true ORDER BY id', [categoryId]);
    return r.rows;
  }
  const r = await query('SELECT id, category_id as "categoryId", name, description, price, image, available, featured FROM products ORDER BY id');
  return r.rows;
}

async function getFeaturedProducts() {
  const r = await query('SELECT id, category_id as "categoryId", name, description, price, image, available, featured FROM products WHERE featured = true AND available = true');
  return r.rows;
}

async function getProductById(id) {
  const r = await query('SELECT id, category_id as "categoryId", name, description, price, image, available, featured FROM products WHERE id = $1', [id]);
  return r.rows[0];
}

async function createProduct(data) {
  const r = await query(
    'INSERT INTO products (category_id, name, description, price, image, available, featured) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
    [data.categoryId, data.name, data.description || '', data.price, data.image || '', data.available !== false, data.featured || false]
  );
  return r.rows[0];
}

async function updateProduct(id, data) {
  const sets = []; const vals = []; let idx = 1;
  const map = { categoryId: 'category_id' };
  for (const [k, v] of Object.entries(data)) {
    const col = map[k] || k;
    sets.push(`${col} = $${idx}`); vals.push(v); idx++;
  }
  vals.push(id);
  await query(`UPDATE products SET ${sets.join(', ')} WHERE id = $${idx}`, vals);
}

async function deleteProduct(id) {
  await query('DELETE FROM products WHERE id = $1', [id]);
}

// User queries
async function getUserByEmail(email) {
  const r = await query('SELECT * FROM users WHERE email = $1', [email]);
  return r.rows[0];
}

async function getUserById(id) {
  const r = await query('SELECT id, name, email, phone, role, addresses FROM users WHERE id = $1', [id]);
  return r.rows[0];
}

async function createUser(user) {
  await query(
    'INSERT INTO users (id, name, email, password, phone, role) VALUES ($1, $2, $3, $4, $5, $6)',
    [user.id, user.name, user.email, user.password, user.phone || '', user.role || 'cliente']
  );
}

async function updateUser(id, data) {
  const sets = []; const vals = []; let idx = 1;
  for (const [k, v] of Object.entries(data)) {
    if (k === 'addresses') { sets.push(`${k} = $${idx}::jsonb`); vals.push(JSON.stringify(v)); idx++; continue; }
    sets.push(`${k} = $${idx}`); vals.push(v); idx++;
  }
  vals.push(id);
  await query(`UPDATE users SET ${sets.join(', ')} WHERE id = $${idx}`, vals);
}

async function addUserAddress(id, address) {
  await query('UPDATE users SET addresses = addresses || $1::jsonb WHERE id = $2', [JSON.stringify(address), id]);
}

async function removeUserAddress(id, addressId) {
  await query(`UPDATE users SET addresses = (SELECT jsonb_agg(a) FROM jsonb_array_elements(addresses) a WHERE a->>'id' != $1) WHERE id = $2`, [addressId, id]);
}

// Order queries
async function createOrder(order) {
  const r = await query(
    `INSERT INTO orders (id, user_id, user_name, items, subtotal, delivery_fee, total, payment_method, delivery_address, change_for, observation, status)
     VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9::jsonb, $10, $11, $12) RETURNING *`,
    [order.id, order.userId, order.userName, JSON.stringify(order.items), order.subtotal, order.deliveryFee, order.total,
     order.paymentMethod, order.deliveryAddress ? JSON.stringify(order.deliveryAddress) : null, order.changeFor || null,
     order.observation || '', order.status || 'pendente']
  );
  return r.rows[0];
}

async function getOrdersByUser(userId) {
  const r = await query('SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
  return r.rows;
}

async function getOrderById(id) {
  const r = await query('SELECT * FROM orders WHERE id = $1', [id]);
  return r.rows[0];
}

async function getAllOrders() {
  const r = await query('SELECT * FROM orders ORDER BY created_at DESC');
  return r.rows;
}

async function updateOrderStatus(id, status) {
  await query('UPDATE orders SET status = $1 WHERE id = $2', [status, id]);
}

// PIX queries
async function createPixTransaction(tx) {
  await query(
    'INSERT INTO pix_transactions (id, order_id, user_id, valor, brcode, status, modo) VALUES ($1, $2, $3, $4, $5, $6, $7)',
    [tx.id, tx.orderId, tx.userId, tx.valor, tx.brcode, tx.status || 'pendente', tx.modo || 'offline']
  );
}

async function updatePixStatus(id, status) {
  await query('UPDATE pix_transactions SET status = $1 WHERE id = $2', [status, id]);
}

async function getPixTransaction(id) {
  const r = await query('SELECT * FROM pix_transactions WHERE id = $1', [id]);
  return r.rows[0];
}

// Store queries
async function getStoreConfig() {
  const r = await query('SELECT value FROM store_config WHERE key = $1', ['store']);
  return r.rows[0]?.value || {};
}

async function updateStoreConfig(data) {
  await query('UPDATE store_config SET value = $1::jsonb WHERE key = $2', [JSON.stringify(data), 'store']);
}

module.exports = {
  initDB,
  // Categories
  getCategories, getCategoryByName, createCategory, updateCategory, deleteCategory,
  // Products
  getProducts, getFeaturedProducts, getProductById, createProduct, updateProduct, deleteProduct,
  // Users
  getUserByEmail, getUserById, createUser, updateUser, addUserAddress, removeUserAddress,
  // Orders
  createOrder, getOrdersByUser, getOrderById, getAllOrders, updateOrderStatus,
  // PIX
  createPixTransaction, updatePixStatus, getPixTransaction,
  // Store
  getStoreConfig, updateStoreConfig
};
