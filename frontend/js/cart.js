let cart = JSON.parse(localStorage.getItem('fp_cart') || '[]');

function saveCart() {
  localStorage.setItem('fp_cart', JSON.stringify(cart));
  updateCartUI();
}

function addToCart(product) {
  const existing = cart.find(i => i.productId === product.id);
  if (existing) {
    existing.quantity++;
  } else {
    cart.push({ productId: product.id, name: product.name, price: product.price, quantity: 1 });
  }
  saveCart();
  animateCart();
}

function removeFromCart(productId) {
  cart = cart.filter(i => i.productId !== productId);
  saveCart();
}

function updateQty(productId, delta) {
  const item = cart.find(i => i.productId === productId);
  if (!item) return;
  item.quantity += delta;
  if (item.quantity <= 0) {
    removeFromCart(productId);
  } else {
    saveCart();
  }
}

function getCartTotal() {
  return cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
}

function getCartCount() {
  return cart.reduce((sum, i) => sum + i.quantity, 0);
}

function updateCartUI() {
  const badge = document.getElementById('cartBadge');
  const items = document.getElementById('cartItems');
  const total = document.getElementById('cartTotal');
  const checkout = document.getElementById('btnCheckout');
  const count = getCartCount();
  if (badge) badge.textContent = count;
  if (items) {
    if (cart.length === 0) {
      items.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:2rem 0;">Carrinho vazio</p>';
    } else {
      items.innerHTML = cart.map(i => `
        <div class="cart-item">
          <div class="cart-item-info">
            <div class="cart-item-name">${i.name}</div>
            <div class="cart-item-price">R$ ${(i.price * i.quantity).toFixed(2)}</div>
          </div>
          <div class="cart-item-qty">
            <button class="qty-btn" onclick="updateQty(${i.productId}, -1)">−</button>
            <span>${i.quantity}</span>
            <button class="qty-btn" onclick="updateQty(${i.productId}, 1)">+</button>
          </div>
        </div>
      `).join('');
    }
  }
  if (total) total.textContent = `R$ ${getCartTotal().toFixed(2)}`;
  if (checkout) checkout.disabled = cart.length === 0;
}

function toggleCart() {
  document.getElementById('cartOverlay').classList.toggle('open');
  document.getElementById('cartSidebar').classList.toggle('open');
}

function animateCart() {
  const fab = document.getElementById('cartFab');
  if (!fab) return;
  fab.style.transform = 'scale(1.3)';
  setTimeout(() => fab.style.transform = 'scale(1)', 200);
}

function showCheckout() {
  if (!currentUser) {
    showAuthModal('login');
    alert('Faça login para continuar');
    return;
  }
  toggleCart();
  const overlay = document.getElementById('modalOverlay');
  const content = document.getElementById('modalContent');
  const total = getCartTotal();
  content.innerHTML = `
    <button class="modal-close" onclick="closeModal()">&times;</button>
    <h2>Finalizar Pedido</h2>
    <div class="form-group">
      <label>Forma de Pagamento</label>
      <select id="paymentMethod" onchange="toggleChangeField()">
        <option value="pix">PIX</option>
        <option value="dinheiro">Dinheiro</option>
        <option value="cartao">Cartão (na entrega)</option>
      </select>
    </div>
    <div class="form-group" id="changeGroup" style="display:none">
      <label>Troco para quanto?</label>
      <input type="number" id="changeFor" step="0.01" min="${total}" placeholder="Valor mínimo: R$ ${total.toFixed(2)}">
    </div>
    <div class="form-group">
      <label>Observação</label>
      <textarea id="orderObservation" rows="2" placeholder="Alguma observação?" style="resize:none"></textarea>
    </div>
    <div style="border-top:1px solid rgba(201,160,99,0.15);padding-top:1rem;margin-bottom:1rem;">
      <div style="display:flex;justify-content:space-between;font-size:0.9rem;color:var(--text-muted);">
        <span>Subtotal</span>
        <span>R$ ${total.toFixed(2)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-family:var(--font-mono);font-size:1.2rem;color:var(--gold);font-weight:700;margin-top:0.3rem;">
        <span>Total</span>
        <span>R$ ${total.toFixed(2)}</span>
      </div>
    </div>
    <button class="btn-checkout" onclick="submitOrder()">Confirmar Pedido</button>
  `;
  overlay.classList.add('open');
}

function toggleChangeField() {
  const method = document.getElementById('paymentMethod').value;
  document.getElementById('changeGroup').style.display = method === 'dinheiro' ? 'block' : 'none';
}

async function submitOrder() {
  const method = document.getElementById('paymentMethod').value;
  const observation = document.getElementById('orderObservation').value;
  const changeFor = method === 'dinheiro' ? parseFloat(document.getElementById('changeFor').value) : null;
  try {
    const order = await api('/api/orders', {
      method: 'POST',
      body: JSON.stringify({
        items: cart.map(i => ({ productId: i.productId, quantity: i.quantity })),
        paymentMethod: method,
        observation,
        changeFor
      })
    });
    cart = [];
    saveCart();
    closeModal();
    if (method === 'pix') {
      showPixModal(order);
    } else {
      alert(`✅ Pedido #${order.id} confirmado!`);
    }
  } catch (e) {
    alert('Erro: ' + e.message);
  }
}

async function showPixModal(order) {
  const overlay = document.getElementById('modalOverlay');
  const content = document.getElementById('modalContent');
  content.innerHTML = `
    <button class="modal-close" onclick="closeModal()">&times;</button>
    <h2>💳 Pagamento PIX</h2>
    <div class="pix-qr-container" id="pixContainer">
      <p style="color:var(--text-muted);">Gerando QR Code...</p>
    </div>
  `;
  overlay.classList.add('open');
  try {
    const data = await api('/api/pix/cobranca', {
      method: 'POST',
      body: JSON.stringify({ valor: order.total, orderId: order.id })
    });
    content.innerHTML = `
      <button class="modal-close" onclick="closeModal()">&times;</button>
      <h2>💳 Pague com PIX</h2>
      <div class="pix-qr-container">
        <div id="pixQRCode"></div>
        <div class="pix-value">R$ ${data.valor.toFixed(2)}</div>
        <div class="pix-status pending" id="pixStatus">⏳ Aguardando pagamento...</div>
        <p style="font-size:0.75rem;color:var(--text-muted);margin:0.5rem 0;">Ou copie o código:</p>
        <div class="pix-brcode" onclick="copyPix('${data.brcode}')" title="Clique para copiar">${data.brcode}</div>
        <button class="btn btn-secondary" onclick="closeModal()" style="margin-top:0.5rem;">Fechar</button>
      </div>
    `;
    new QRCode(document.getElementById('pixQRCode'), {
      text: data.brcode,
      width: 220,
      height: 220,
      colorDark: '#3E2A1E',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.L
    });
    startPixPolling(data.txid, order.id);
  } catch (e) {
    content.innerHTML = `
      <button class="modal-close" onclick="closeModal()">&times;</button>
      <h2>❌ Erro</h2>
      <p>Não foi possível gerar o QR Code: ${e.message}</p>
      <button class="btn btn-primary" onclick="closeModal()">Fechar</button>
    `;
  }
}

function startPixPolling(txid, orderId) {
  let attempts = 0;
  const maxAttempts = 120;
  const interval = setInterval(async () => {
    attempts++;
    try {
      const data = await api(`/api/pix/status/${txid}`);
      const statusEl = document.getElementById('pixStatus');
      if (!statusEl) { clearInterval(interval); return; }
      if (data.status === 'aprovado') {
        statusEl.className = 'pix-status approved';
        statusEl.textContent = '✅ Pagamento confirmado!';
        clearInterval(interval);
        setTimeout(() => {
          closeModal();
          alert('✅ Pagamento confirmado com sucesso!');
        }, 1500);
      } else if (data.status === 'expirado') {
        statusEl.className = 'pix-status expired';
        statusEl.textContent = '⏰ QR Code expirado';
        clearInterval(interval);
      } else {
        statusEl.textContent = '⏳ Aguardando pagamento...' + '.'.repeat((attempts % 3) + 1);
      }
    } catch {
      if (attempts >= maxAttempts) { clearInterval(interval); }
    }
    if (attempts >= maxAttempts) clearInterval(interval);
  }, 3000);
}

function copyPix(code) {
  navigator.clipboard.writeText(code).then(() => {
    alert('Código PIX copiado!');
  }).catch(() => {
    window.getSelection().selectAllChildren(document.querySelector('.pix-brcode'));
  });
}

document.addEventListener('DOMContentLoaded', updateCartUI);
