let products = [];
let categories = [];

async function loadProducts() {
  try {
    [products, categories] = await Promise.all([
      api('/api/products'),
      api('/api/products/categories')
    ]);
    renderNav();
    renderAllCategories();
  } catch (e) {
    document.getElementById('mainContent').innerHTML = '<p style="text-align:center;padding:2rem;color:var(--danger);">Erro ao carregar cardápio</p>';
  }
}

function renderNav() {
  const nav = document.getElementById('categoryNav');
  nav.innerHTML = categories.map(c => `
    <button class="nav-cat-btn" onclick="scrollToCategory(${c.id}, this)">
      ${c.icon} ${c.name}
    </button>
  `).join('');
}

function renderAllCategories() {
  const main = document.getElementById('mainContent');
  main.innerHTML = categories.map(cat => {
    const catProducts = products.filter(p => p.categoryId === cat.id && p.available);
    return `
      <div id="cat-${cat.id}" class="category-section">
        <h2 class="section-title"><span class="icon">${cat.icon}</span>${cat.name}</h2>
        <div class="product-grid">
          ${catProducts.map(p => `
            <div class="product-card ${p.featured ? 'featured' : ''}" onclick="addToCart(${JSON.stringify(p).replace(/"/g, '&quot;')})">
              ${p.featured ? '<div class="product-badge">🔥 Destaque</div>' : ''}
              <div class="product-name">${p.name}</div>
              <div class="product-desc">${p.description}</div>
              <div class="product-footer">
                <span class="product-price">R$ ${p.price.toFixed(2)}</span>
                <button class="btn-add" onclick="event.stopPropagation();addToCart(${JSON.stringify(p).replace(/"/g, '&quot;')})">+</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
}

function scrollToCategory(catId, btn) {
  const el = document.getElementById(`cat-${catId}`);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.querySelectorAll('.nav-cat-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
}

document.addEventListener('DOMContentLoaded', loadProducts);
