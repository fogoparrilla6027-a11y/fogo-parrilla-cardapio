const API = '';
let currentUser = null;
let token = localStorage.getItem('fp_token');

async function api(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(API + url, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro na requisição');
  return data;
}

function showAuthModal(mode = 'login') {
  const overlay = document.getElementById('modalOverlay');
  const content = document.getElementById('modalContent');
  const isLogin = mode === 'login';
  content.innerHTML = `
    <button class="modal-close" onclick="closeModal()">&times;</button>
    <h2>${isLogin ? 'Entrar' : 'Cadastrar'}</h2>
    ${!isLogin ? '<div class="form-group"><label>Nome</label><input type="text" id="authName"></div>' : ''}
    <div class="form-group"><label>Email</label><input type="email" id="authEmail"></div>
    <div class="form-group"><label>Senha</label><input type="password" id="authPassword"></div>
    ${!isLogin ? '<div class="form-group"><label>Telefone</label><input type="text" id="authPhone"></div>' : ''}
    <div style="display:flex;gap:0.5rem;margin-top:1rem;">
      <button class="btn btn-primary" onclick="${isLogin ? 'doLogin()' : 'doRegister()'}" style="flex:1">
        ${isLogin ? 'Entrar' : 'Cadastrar'}
      </button>
      <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
    </div>
    <p style="text-align:center;margin-top:1rem;font-size:0.85rem;color:var(--text-muted);">
      ${isLogin ? 'Não tem conta? <a href="#" onclick="showAuthModal(\'register\')">Cadastre-se</a>' : 'Já tem conta? <a href="#" onclick="showAuthModal(\'login\')">Entrar</a>'}
    </p>
  `;
  overlay.classList.add('open');
}

async function doLogin() {
  const email = document.getElementById('authEmail').value;
  const password = document.getElementById('authPassword').value;
  try {
    const data = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    token = data.token;
    localStorage.setItem('fp_token', token);
    currentUser = data.user;
    closeModal();
    updateAuthUI();
  } catch (e) {
    alert(e.message);
  }
}

async function doRegister() {
  const name = document.getElementById('authName').value;
  const email = document.getElementById('authEmail').value;
  const password = document.getElementById('authPassword').value;
  const phone = document.getElementById('authPhone').value;
  try {
    const data = await api('/api/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password, phone }) });
    token = data.token;
    localStorage.setItem('fp_token', token);
    currentUser = data.user;
    closeModal();
    updateAuthUI();
  } catch (e) {
    alert(e.message);
  }
}

function logout() {
  token = null;
  currentUser = null;
  localStorage.removeItem('fp_token');
  updateAuthUI();
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}

function updateAuthUI() {
  const btnLogin = document.getElementById('btnLogin');
  const btnRegister = document.getElementById('btnRegister');
  const btnLogout = document.getElementById('btnLogout');
  const userInfo = document.getElementById('userInfo');
  if (currentUser) {
    if (btnLogin) btnLogin.style.display = 'none';
    if (btnRegister) btnRegister.style.display = 'none';
    if (btnLogout) btnLogout.style.display = 'inline-block';
    if (userInfo) userInfo.textContent = `👤 ${currentUser.name}`;
  } else {
    if (btnLogin) btnLogin.style.display = 'inline-block';
    if (btnRegister) btnRegister.style.display = 'inline-block';
    if (btnLogout) btnLogout.style.display = 'none';
    if (userInfo) userInfo.textContent = '';
  }
}

async function loadUser() {
  if (!token) return;
  try {
    currentUser = await api('/api/auth/me');
    updateAuthUI();
  } catch {
    token = null;
    localStorage.removeItem('fp_token');
  }
}

document.addEventListener('DOMContentLoaded', loadUser);
