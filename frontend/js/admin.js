let adminToken = localStorage.getItem('fp_token');
let storeData = {};

function checkAdmin() {
  if (!adminToken) { window.location.href = '/'; return; }
  api('/api/auth/me').then(u => {
    if (u.role !== 'admin') { window.location.href = '/'; return; }
    document.getElementById('adminUser').textContent = `👤 ${u.name}`;
    loadDashboard();
  }).catch(() => { window.location.href = '/'; });
}

function switchTab(tab) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
  document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
  document.getElementById(`admin${tab.charAt(0).toUpperCase() + tab.slice(1)}`).classList.add('active');
  if (tab === 'orders') loadOrders();
  if (tab === 'products') loadProductsAdmin();
  if (tab === 'categories') loadCategoriesAdmin();
  if (tab === 'pix') loadPixConfig();
  if (tab === 'store') loadStore();
}

document.getElementById('adminTabs').addEventListener('click', e => {
  if (e.target.classList.contains('admin-tab')) switchTab(e.target.dataset.tab);
});

async function loadDashboard() {
  const el = document.getElementById('adminDashboard');
  try {
    const data = await api('/api/admin/dashboard');
    el.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-value">${data.totalOrders}</div><div class="stat-label">Total de Pedidos</div></div>
        <div class="stat-card"><div class="stat-value">${data.pendingOrders}</div><div class="stat-label">Pendentes</div></div>
        <div class="stat-card"><div class="stat-value">R$ ${data.totalRevenue.toFixed(2)}</div><div class="stat-label">Receita Total</div></div>
      </div>
      <h3 style="font-family:var(--font-display);color:var(--gold);margin-bottom:0.75rem;">📋 Últimos Pedidos</h3>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>#</th><th>Cliente</th><th>Total</th><th>Status</th><th>Data</th></tr></thead>
          <tbody>${data.recentOrders.map(o => `
            <tr>
              <td style="font-family:var(--font-mono);font-size:0.75rem;">${o.id}</td>
              <td>${o.userName}</td>
              <td style="font-family:var(--font-mono);color:var(--gold);">R$ ${o.total.toFixed(2)}</td>
              <td><span class="order-status ${o.status}">${o.status}</span></td>
              <td style="font-size:0.75rem;color:var(--text-muted);">${new Date(o.createdAt).toLocaleString('pt-BR')}</td>
            </tr>
          `).join('')}</tbody>
        </table>
      </div>
    `;
  } catch (e) { el.innerHTML = '<p style="color:var(--danger);">Erro ao carregar dashboard</p>'; }
}

async function loadOrders() {
  const el = document.getElementById('adminOrders');
  try {
    const orders = await api('/api/admin/orders');
    el.innerHTML = `
      <h3 style="font-family:var(--font-display);color:var(--gold);margin-bottom:0.75rem;">📋 Todos os Pedidos</h3>
      ${orders.length === 0 ? '<p style="color:var(--text-muted);">Nenhum pedido ainda.</p>' : `
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>Pedido</th><th>Cliente</th><th>Itens</th><th>Total</th><th>Pagamento</th><th>Status</th><th>Data</th><th>Ações</th></tr></thead>
          <tbody>${orders.map(o => `
            <tr>
              <td style="font-family:var(--font-mono);font-size:0.75rem;">${o.id}</td>
              <td>${o.userName}</td>
              <td style="font-size:0.8rem;">${o.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}</td>
              <td style="font-family:var(--font-mono);color:var(--gold);">R$ ${o.total.toFixed(2)}</td>
              <td>${o.paymentMethod}</td>
              <td><span class="order-status ${o.status}">${o.status}</span></td>
              <td style="font-size:0.75rem;color:var(--text-muted);">${new Date(o.createdAt).toLocaleString('pt-BR')}</td>
              <td>
                <select onchange="updateOrderStatus('${o.id}', this.value)" style="padding:0.3rem;background:var(--bg);border:1px solid rgba(201,160,99,0.2);border-radius:4px;color:var(--text);font-size:0.75rem;">
                  <option value="pendente" ${o.status === 'pendente' ? 'selected' : ''}>Pendente</option>
                  <option value="confirmado" ${o.status === 'confirmado' ? 'selected' : ''}>Confirmado</option>
                  <option value="preparando" ${o.status === 'preparando' ? 'selected' : ''}>Preparando</option>
                  <option value="saiu-entrega" ${o.status === 'saiu-entrega' ? 'selected' : ''}>Saiu p/ Entrega</option>
                  <option value="entregue" ${o.status === 'entregue' ? 'selected' : ''}>Entregue</option>
                  <option value="cancelado" ${o.status === 'cancelado' ? 'selected' : ''}>Cancelado</option>
                </select>
              </td>
            </tr>
          `).join('')}</tbody>
        </table>
      </div>`}
    `;
  } catch (e) { el.innerHTML = '<p style="color:var(--danger);">Erro ao carregar pedidos</p>'; }
}

async function updateOrderStatus(id, status) {
  try { await api(`/api/admin/orders/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }); } catch (e) { alert(e.message); }
}

async function loadProductsAdmin() {
  const el = document.getElementById('adminProducts');
  try {
    const prods = await api('/api/admin/products');
    el.innerHTML = `
      <div class="toolbar">
        <button class="btn btn-primary" onclick="showProductForm()">+ Novo Produto</button>
        <input type="text" id="prodFilter" placeholder="Buscar..." oninput="filterProducts()" style="flex:1;max-width:300px;">
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>Img</th><th>ID</th><th>Nome</th><th>Categoria</th><th>Preço</th><th>Destaque</th><th>Disponível</th><th>Ações</th></tr></thead>
          <tbody id="prodTableBody">
            ${prods.map(p => [
              '<tr class="prod-row" data-name="' + p.name.toLowerCase() + '">',
              '<td>' + (p.image ? '<img src="' + p.image + '" style="width:36px;height:36px;border-radius:6px;object-fit:cover;">' : '<div style="width:36px;height:36px;border-radius:6px;background:var(--bg-elevated);display:flex;align-items:center;justify-content:center;font-size:1rem;">🍖</div>') + '</td>',
              '<td>' + p.id + '</td>',
              '<td>' + p.name + '</td>',
              '<td>' + (categories.find(c => c.id === p.categoryId)?.name || p.categoryId) + '</td>',
              '<td style="font-family:var(--font-mono);color:var(--gold);">R$ ' + p.price.toFixed(2) + '</td>',
              '<td>' + (p.featured ? '🔥' : '−') + '</td>',
              '<td><label class="toggle"><input type="checkbox" ' + (p.available ? 'checked' : '') + ' onchange="toggleProduct(' + p.id + ', this.checked)"><span class="toggle-slider"></span></label></td>',
              '<td>',
              '<button class="btn btn-secondary" style="padding:0.3rem 0.6rem;font-size:0.75rem;" onclick="showProductForm(' + p.id + ')">✏️</button> ',
              '<button class="btn btn-danger" style="padding:0.3rem 0.6rem;font-size:0.75rem;" onclick="deleteProduct(' + p.id + ')">🗑️</button>',
              '</td></tr>'
            ].join('')).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (e) { el.innerHTML = '<p style="color:var(--danger);">Erro ao carregar produtos</p>'; }
}

function filterProducts() {
  const q = document.getElementById('prodFilter').value.toLowerCase();
  document.querySelectorAll('.prod-row').forEach(r => {
    r.style.display = r.dataset.name.includes(q) ? '' : 'none';
  });
}

function showProductForm(id) {
  const overlay = document.getElementById('modalOverlay');
  const content = document.getElementById('modalContent');
  const p = id ? products.find(x => x.id === id) : null;
  content.innerHTML = `
    <button class="modal-close" onclick="closeModal()">&times;</button>
    <h2>${p ? 'Editar' : 'Novo'} Produto</h2>
    <div class="form-group"><label>Nome</label><input type="text" id="pfName" value="${p?.name || ''}"></div>
    <div class="form-group"><label>Descrição</label><textarea id="pfDesc" rows="2">${p?.description || ''}</textarea></div>
    <div class="form-group"><label>Preço</label><input type="number" id="pfPrice" step="0.01" value="${p?.price || ''}"></div>
    <div class="form-group"><label>Categoria</label><select id="pfCat">${categories.map(c => `<option value="${c.id}" ${p?.categoryId === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}</select></div>
    <div class="form-group"><label><input type="checkbox" id="pfFeatured" ${p?.featured ? 'checked' : ''}> Destaque</label></div>
    ${p ? `
    <div class="form-group">
      <label>Imagem do Produto</label>
      <div style="display:flex;gap:0.5rem;align-items:center;">
        <input type="file" id="pfImage" accept="image/*" style="flex:1;">
        <button class="btn btn-secondary" onclick="uploadProductImage(${p.id})">📤 Enviar</button>
      </div>
      ${p.image ? `<div style="margin-top:0.5rem;"><img src="${p.image}" style="max-width:120px;max-height:80px;border-radius:6px;"></div>` : ''}
    </div>` : ''}
    <div style="display:flex;gap:0.5rem;">
      <button class="btn btn-primary" onclick="saveProduct(${id || ''})">Salvar</button>
      <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
    </div>
  `;
  overlay.classList.add('open');
}

async function uploadProductImage(id) {
  const fileInput = document.getElementById('pfImage');
  if (!fileInput.files[0]) return alert('Selecione uma imagem');
  const formData = new FormData();
  formData.append('image', fileInput.files[0]);
  try {
    const data = await fetch('/api/upload/product/' + id, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + adminToken },
      body: formData
    }).then(r => r.json());
    if (data.error) throw new Error(data.error);
    alert('✅ Imagem enviada!');
    closeModal();
    loadProductsAdmin();
  } catch (e) { alert(e.message); }
}

async function saveProduct(id) {
  const data = {
    name: document.getElementById('pfName').value,
    description: document.getElementById('pfDesc').value,
    price: parseFloat(document.getElementById('pfPrice').value),
    categoryId: parseInt(document.getElementById('pfCat').value),
    featured: document.getElementById('pfFeatured').checked
  };
  try {
    if (id) {
      await api('/api/admin/products/' + id, { method: 'PUT', body: JSON.stringify(data) });
    } else {
      await api('/api/admin/products', { method: 'POST', body: JSON.stringify(data) });
    }
    closeModal();
    loadProductsAdmin();
  } catch (e) { alert(e.message); }
}

async function toggleProduct(id, available) {
  try { await api('/api/admin/products/' + id, { method: 'PUT', body: JSON.stringify({ available }) }); } catch (e) { alert(e.message); }
}

async function deleteProduct(id) {
  if (!confirm('Excluir produto?')) return;
  try { await api('/api/admin/products/' + id, { method: 'DELETE' }); loadProductsAdmin(); } catch (e) { alert(e.message); }
}

async function loadCategoriesAdmin() {
  const el = document.getElementById('adminCategories');
  try {
    const cats = await api('/api/admin/categories');
    el.innerHTML = `
      <div class="toolbar">
        <button class="btn btn-primary" onclick="showCategoryForm()">+ Nova Categoria</button>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>ID</th><th>Ícone</th><th>Nome</th><th>Ordem</th><th>Ações</th></tr></thead>
          <tbody>${cats.map(c => `
            <tr>
              <td>${c.id}</td>
              <td>${c.icon}</td>
              <td>${c.name}</td>
              <td>${c.order}</td>
              <td>
                <button class="btn btn-secondary" style="padding:0.3rem 0.6rem;font-size:0.75rem;" onclick="showCategoryForm(${c.id})">✏️</button>
                <button class="btn btn-danger" style="padding:0.3rem 0.6rem;font-size:0.75rem;" onclick="deleteCategory(${c.id})">🗑️</button>
              </td>
            </tr>
          `).join('')}</tbody>
        </table>
      </div>
    `;
  } catch (e) { el.innerHTML = '<p style="color:var(--danger);">Erro ao carregar categorias</p>'; }
}

function showCategoryForm(id) {
  const overlay = document.getElementById('modalOverlay');
  const content = document.getElementById('modalContent');
  const c = id ? categories.find(x => x.id === id) : null;
  content.innerHTML = `
    <button class="modal-close" onclick="closeModal()">&times;</button>
    <h2>${c ? 'Editar' : 'Nova'} Categoria</h2>
    <div class="form-group"><label>Nome</label><input type="text" id="cfName" value="${c?.name || ''}"></div>
    <div class="form-group"><label>Ícone</label><input type="text" id="cfIcon" value="${c?.icon || ''}" placeholder="ex: 🥩"></div>
    <div class="form-group"><label>Ordem</label><input type="number" id="cfOrder" value="${c?.order || ''}"></div>
    <div style="display:flex;gap:0.5rem;">
      <button class="btn btn-primary" onclick="saveCategory(${id || ''})">Salvar</button>
      <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
    </div>
  `;
  overlay.classList.add('open');
}

async function saveCategory(id) {
  const data = { name: document.getElementById('cfName').value, icon: document.getElementById('cfIcon').value, order: parseInt(document.getElementById('cfOrder').value) };
  try {
    if (id) { await api('/api/admin/categories/' + id, { method: 'PUT', body: JSON.stringify(data) }); }
    else { await api('/api/admin/categories', { method: 'POST', body: JSON.stringify(data) }); }
    closeModal(); loadCategoriesAdmin();
  } catch (e) { alert(e.message); }
}

async function deleteCategory(id) {
  if (!confirm('Excluir categoria?')) return;
  try { await api('/api/admin/categories/' + id, { method: 'DELETE' }); loadCategoriesAdmin(); } catch (e) { alert(e.message); }
}

async function loadPixConfig() {
  const el = document.getElementById('adminPix');
  try {
    const config = await api('/api/pix/config');
    el.innerHTML = `
      <h3 style="font-family:var(--font-display);color:var(--gold);margin-bottom:1rem;">💳 Configuração PIX Sicoob</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
        <div class="form-group"><label>PIX Habilitado</label><label class="toggle" style="display:block;margin-top:0.3rem;"><input type="checkbox" id="pixEnabled" ${config.enabled ? 'checked' : ''}><span class="toggle-slider"></span></label></div>
        <div class="form-group"><label>Modo Teste (offline)</label><label class="toggle" style="display:block;margin-top:0.3rem;"><input type="checkbox" id="pixTestMode" ${config.modo_teste ? 'checked' : ''}><span class="toggle-slider"></span></label></div>
        <div class="form-group"><label>Chave PIX (CNPJ)</label><input type="text" id="pixKey" value="${config.pix_key}" style="font-family:var(--font-mono);"></div>
        <div class="form-group"><label>Nome Recebedor</label><input type="text" id="pixMerchant" value="${config.merchant_name}"></div>
        <div class="form-group"><label>Cidade</label><input type="text" id="pixCity" value="${config.merchant_city}"></div>
        <div class="form-group"><label>Client ID</label><input type="text" id="pixClientId" value="${config.client_id}" style="font-family:var(--font-mono);font-size:0.75rem;"></div>
      </div>
      <div style="margin-top:1rem;">
        <p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:1rem;">⚠️ Certificado .pfx configurado em data/pix_config.json. Modo offline gera QR Code EMV sem API.</p>
        <button class="btn btn-primary" onclick="savePixConfig()">💾 Salvar</button>
        <button class="btn btn-secondary" onclick="testPix()" style="margin-left:0.5rem;">🧪 Testar PIX</button>
      </div>
    `;
  } catch (e) { el.innerHTML = '<p style="color:var(--danger);">Erro</p>'; }
}

async function savePixConfig() {
  try {
    await api('/api/pix/config', { method: 'PUT', body: JSON.stringify({
      enabled: document.getElementById('pixEnabled').checked, modo_teste: document.getElementById('pixTestMode').checked,
      pix_key: document.getElementById('pixKey').value, merchant_name: document.getElementById('pixMerchant').value,
      merchant_city: document.getElementById('pixCity').value, client_id: document.getElementById('pixClientId').value
    })});
    alert('✅ Salvo!');
  } catch (e) { alert(e.message); }
}

async function testPix() {
  try {
    const data = await api('/api/pix/cobranca', { method: 'POST', body: JSON.stringify({ valor: 0.01, orderId: null }) });
    showPixModal({ total: 0.01 });
  } catch (e) { alert(e.message); }
}

async function loadStore() {
  const el = document.getElementById('adminStore');
  try {
    storeData = await api('/api/store');
    el.innerHTML = `
      <h3 style="font-family:var(--font-display);color:var(--gold);margin-bottom:1rem;">🏪 Configurações da Loja</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
        <div class="form-group" style="grid-column:1/-1;">
          <label>Logo do Restaurante</label>
          <div style="display:flex;gap:1rem;align-items:center;flex-wrap:wrap;">
            <div id="logoPreview">${storeData.logo ? '<img src="' + storeData.logo + '" style="max-height:60px;border-radius:8px;">' : '<div style="width:60px;height:60px;border-radius:8px;background:var(--bg-elevated);display:flex;align-items:center;justify-content:center;font-size:1.5rem;">🔥</div>'}</div>
            <input type="file" id="sLogo" accept="image/*">
            <button class="btn btn-primary" onclick="uploadLogo()">📤 Enviar Logo</button>
          </div>
        </div>
        <div class="form-group"><label>Nome</label><input type="text" id="sName" value="${storeData.name}"></div>
        <div class="form-group"><label>Slogan</label><input type="text" id="sSlogan" value="${storeData.slogan || ''}"></div>
        <div class="form-group" style="grid-column:1/-1;"><label>Descrição</label><textarea id="sDesc" rows="2">${storeData.description}</textarea></div>
        <div class="form-group" style="grid-column:1/-1;"><label>Endereço</label><input type="text" id="sAddress" value="${storeData.address}"></div>
        <div class="form-group"><label>Telefone</label><input type="text" id="sPhone" value="${storeData.phone}"></div>
        <div class="form-group"><label>WhatsApp</label><input type="text" id="sWhats" value="${storeData.whatsapp}"></div>
        <div class="form-group"><label>Instagram</label><input type="text" id="sInsta" value="${storeData.instagram}"></div>
        <div class="form-group"><label>Taxa de Entrega</label><input type="number" id="sDelivery" step="0.01" value="${storeData.delivery_fee}"></div>
        <div class="form-group"><label>Pedido Mínimo</label><input type="number" id="sMinOrder" step="0.01" value="${storeData.min_order}"></div>
        <div class="form-group" style="grid-column:1/-1;"><label>Horários</label><input type="text" id="sHours" value="${storeData.working_hours}"></div>
      </div>
      <button class="btn btn-primary" onclick="saveStore()" style="margin-top:1rem;">💾 Salvar Loja</button>
    `;
  } catch (e) { el.innerHTML = '<p style="color:var(--danger);">Erro</p>'; }
}

async function uploadLogo() {
  const fileInput = document.getElementById('sLogo');
  if (!fileInput.files[0]) return alert('Selecione uma imagem');
  const formData = new FormData();
  formData.append('logo', fileInput.files[0]);
  try {
    const data = await fetch('/api/upload/logo', {
      method: 'POST', headers: { 'Authorization': 'Bearer ' + adminToken }, body: formData
    }).then(r => r.json());
    if (data.error) throw new Error(data.error);
    alert('✅ Logo enviada!');
    loadStore();
  } catch (e) { alert(e.message); }
}

async function saveStore() {
  try {
    await api('/api/admin/store', { method: 'PUT', body: JSON.stringify({
      name: document.getElementById('sName').value, slogan: document.getElementById('sSlogan').value,
      description: document.getElementById('sDesc').value, address: document.getElementById('sAddress').value,
      phone: document.getElementById('sPhone').value, whatsapp: document.getElementById('sWhats').value,
      instagram: document.getElementById('sInsta').value, logo: storeData.logo || '',
      delivery_fee: parseFloat(document.getElementById('sDelivery').value) || 0,
      min_order: parseFloat(document.getElementById('sMinOrder').value) || 0,
      working_hours: document.getElementById('sHours').value
    })});
    alert('✅ Loja atualizada!');
  } catch (e) { alert(e.message); }
}

document.addEventListener('DOMContentLoaded', checkAdmin);
