const express = require('express');
const router = express.Router();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { load, save } = require('../database');
const { authMiddleware } = require('./auth');

const CONFIG_PATH = path.join(__dirname, '..', '..', 'data', 'pix_config.json');

function loadPixConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    }
  } catch (e) { }
  return {
    enabled: false,
    certificate_pfx: 'C:/Users/Administrador/Desktop/API/FOGO PARRILLA LTDA_59086592000159.pfx',
    certificate_password: '34021080',
    client_id: '782d72c8-0d3b-4f7f-8577-f7f5679f128f',
    auth_url: 'https://auth.sicoob.com.br/auth/realms/cooperado/protocol/openid-connect/token',
    api_url: 'https://api.sicoob.com.br/pix/api/v2',
    pix_key: '59086592000159',
    merchant_name: 'FOGO PARRILLA LTDA',
    merchant_city: 'Itauna',
    modo_teste: true
  };
}

function savePixConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

function generateTxid() {
  const timestamp = Date.now().toString(36).slice(-10);
  const random = crypto.randomBytes(16).toString('hex');
  return (timestamp + random).slice(0, 35);
}

async function getAccessToken() {
  const config = loadPixConfig();
  if (!config.enabled) return null;
  try {
    const pfxPath = config.certificate_pfx;
    if (!fs.existsSync(pfxPath)) {
      console.error('[PIX] Certificado não encontrado:', pfxPath);
      return null;
    }
    const forge = require('node-forge');
    const pfxData = fs.readFileSync(pfxPath);
    const pfx = forge.pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(forge.util.createBuffer(pfxData.toString('binary'))), config.certificate_password);
    const keyObj = pfx.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0] ||
                   pfx.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag]?.[0];
    const certObj = pfx.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag]?.[0];
    if (!keyObj || !certObj) {
      console.error('[PIX] Não foi possível extrair chave/certificado do PFX');
      return null;
    }
    const keyPem = forge.pki.privateKeyToPem(keyObj.key);
    const certPem = forge.pki.certificateToPem(certObj.cert);
    const tempDir = path.join(__dirname, '..', '..', 'data', 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    const certFile = path.join(tempDir, 'pix_cert.pem');
    const keyFile = path.join(tempDir, 'pix_key.pem');
    fs.writeFileSync(certFile, certPem);
    fs.writeFileSync(keyFile, keyPem);
    const httpsAgent = new (require('https').Agent)({
      cert: fs.readFileSync(certFile),
      key: fs.readFileSync(keyFile)
    });
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', config.client_id);
    params.append('scope', 'cob.write cob.read pix.write pix.read');
    const response = await axios.post(config.auth_url, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      httpsAgent,
      timeout: 30000
    });
    return response.data.access_token;
  } catch (e) {
    console.error('[PIX] Erro ao obter token:', e.message);
    return null;
  }
}

function calcularCRC16(payload) {
  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) crc = (crc << 1) ^ 0x1021;
      else crc = crc << 1;
      crc &= 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function gerarPayloadEMV(chavePix, valor, nome, cidade, txid) {
  const removeAccents = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  nome = removeAccents(nome).slice(0, 25);
  cidade = removeAccents(cidade).slice(0, 15);
  chavePix = chavePix.trim();
  if (!txid) txid = generateTxid();
  let payload = '000201';
  const gui = '0014br.gov.bcb.pix';
  const chave = `01${String(chavePix.length).padStart(2, '0')}${chavePix}`;
  const merchantInfo = `26${String(gui.length + chave.length).padStart(2, '0')}${gui}${chave}`;
  payload += merchantInfo;
  payload += '52040000';
  payload += '5303986';
  if (valor > 0) {
    const vStr = valor.toFixed(2);
    payload += `54${String(vStr.length).padStart(2, '0')}${vStr}`;
  }
  payload += '5802BR';
  payload += `59${String(nome.length).padStart(2, '0')}${nome}`;
  payload += `60${String(cidade.length).padStart(2, '0')}${cidade}`;
  const txidField = `05${String(txid.length).padStart(2, '0')}${txid}`;
  payload += `62${String(txidField.length).padStart(2, '0')}${txidField}`;
  payload += '6304';
  const crc = calcularCRC16(payload);
  return { brcode: payload + crc, txid };
}

async function criarCobrancaApi(valor) {
  const config = loadPixConfig();
  if (!config.enabled || config.modo_teste) return null;
  try {
    const token = await getAccessToken();
    if (!token) return null;
    const txid = generateTxid();
    const payload = {
      calendario: { expiracao: 3600 },
      valor: { original: valor.toFixed(2) },
      chave: config.pix_key,
      solicitacaoPagador: 'Fogo Parrilla - Pagamento'
    };
    const pfxPath = config.certificate_pfx;
    const forge = require('node-forge');
    const pfxData = fs.readFileSync(pfxPath);
    const pfx = forge.pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(forge.util.createBuffer(pfxData.toString('binary'))), config.certificate_password);
    const keyObj = pfx.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0] ||
                   pfx.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag]?.[0];
    const certObj = pfx.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag]?.[0];
    const keyPem = forge.pki.privateKeyToPem(keyObj.key);
    const certPem = forge.pki.certificateToPem(certObj.cert);
    const tempDir = path.join(__dirname, '..', '..', 'data', 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    const certFile = path.join(tempDir, 'pix_cert_api.pem');
    const keyFile = path.join(tempDir, 'pix_key_api.pem');
    fs.writeFileSync(certFile, certPem);
    fs.writeFileSync(keyFile, keyPem);
    const httpsAgent = new (require('https').Agent)({
      cert: fs.readFileSync(certFile),
      key: fs.readFileSync(keyFile)
    });
    const response = await axios.put(`${config.api_url}/cob/${txid}`, payload, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      httpsAgent,
      timeout: 30000
    });
    const data = response.data;
    const brcode = data.brcode || data.pixCopiaECola || '';
    return { txid, brcode, location: data.location || '', response: data };
  } catch (e) {
    console.error('[PIX] Erro ao criar cobrança:', e.message);
    return null;
  }
}

router.get('/config', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso restrito' });
  const config = loadPixConfig();
  res.json({
    enabled: config.enabled,
    modo_teste: config.modo_teste,
    pix_key: config.pix_key,
    merchant_name: config.merchant_name,
    merchant_city: config.merchant_city,
    client_id: config.client_id ? config.client_id.slice(0, 8) + '...' : ''
  });
});

router.put('/config', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso restrito' });
  const config = loadPixConfig();
  Object.assign(config, req.body);
  savePixConfig(config);
  res.json({ success: true });
});

router.post('/cobranca', authMiddleware, async (req, res) => {
  const { valor, orderId } = req.body;
  if (!valor || valor <= 0) return res.status(400).json({ error: 'Valor inválido' });
  const config = loadPixConfig();
  let result;
  if (config.enabled && !config.modo_teste) {
    result = await criarCobrancaApi(valor);
  }
  if (!result) {
    const txid = generateTxid();
    const emv = gerarPayloadEMV(config.pix_key, valor, config.merchant_name, config.merchant_city, txid);
    result = { txid: emv.txid, brcode: emv.brcode, modo_offline: true };
  }
  const db = load();
  const tx = {
    id: result.txid,
    orderId: orderId || null,
    userId: req.user.id,
    valor,
    brcode: result.brcode,
    status: 'pendente',
    modo: result.modo_offline ? 'offline' : 'api',
    createdAt: new Date().toISOString()
  };
  db.pix_transactions.push(tx);
  save(db);
  res.json({
    txid: result.txid,
    brcode: result.brcode,
    valor,
    expiracao: 3600
  });
});

router.get('/status/:txid', authMiddleware, async (req, res) => {
  const db = load();
  const tx = db.pix_transactions.find(t => t.id === req.params.txid);
  if (!tx) return res.status(404).json({ error: 'Transação não encontrada' });
  if (tx.userId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  if (tx.status === 'aprovado') {
    return res.json({ status: 'aprovado', txid: tx.id });
  }
  if (tx.status === 'expirado') {
    return res.json({ status: 'expirado', txid: tx.id });
  }
  if (!tx.modo || tx.modo === 'offline') {
    return res.json({ status: 'pendente', txid: tx.id, modo: 'offline' });
  }
  try {
    const config = loadPixConfig();
    const token = await getAccessToken();
    if (!token) return res.json({ status: tx.status, txid: tx.id });
    const pfxPath = config.certificate_pfx;
    const forge = require('node-forge');
    const pfxData = fs.readFileSync(pfxPath);
    const pfx = forge.pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(forge.util.createBuffer(pfxData.toString('binary'))), config.certificate_password);
    const keyObj = pfx.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0] ||
                   pfx.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag]?.[0];
    const certObj = pfx.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag]?.[0];
    const keyPem = forge.pki.privateKeyToPem(keyObj.key);
    const certPem = forge.pki.certificateToPem(certObj.cert);
    const tempDir = path.join(__dirname, '..', '..', 'data', 'temp');
    const certFile = path.join(tempDir, 'pix_cert_status.pem');
    const keyFile = path.join(tempDir, 'pix_key_status.pem');
    fs.writeFileSync(certFile, certPem);
    fs.writeFileSync(keyFile, keyPem);
    const httpsAgent = new (require('https').Agent)({
      cert: fs.readFileSync(certFile),
      key: fs.readFileSync(keyFile)
    });
    const response = await axios.get(`${config.api_url}/cob/${tx.id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
      httpsAgent,
      timeout: 30000
    });
    const data = response.data;
    const apiStatus = data.status;
    const statusMap = { ATIVA: 'pendente', CONCLUIDA: 'aprovado', REMOVIDA: 'expirado', REJEITADA: 'expirado' };
    const mappedStatus = statusMap[apiStatus] || 'pendente';
    if (mappedStatus !== tx.status) {
      tx.status = mappedStatus;
      if (tx.status === 'aprovado' && tx.orderId) {
        const order = db.orders.find(o => o.id === tx.orderId);
        if (order) order.status = 'confirmado';
      }
      save(db);
    }
    return res.json({ status: mappedStatus, txid: tx.id });
  } catch (e) {
    return res.json({ status: tx.status, txid: tx.id });
  }
});

router.post('/confirmar', authMiddleware, async (req, res) => {
  const { txid, orderId } = req.body;
  if (req.user.role !== 'admin' && !orderId) {
    return res.status(403).json({ error: 'Acesso restrito' });
  }
  const db = load();
  const tx = db.pix_transactions.find(t => t.id === txid);
  if (!tx) return res.status(404).json({ error: 'Transação não encontrada' });
  tx.status = 'aprovado';
  if (tx.orderId) {
    const order = db.orders.find(o => o.id === tx.orderId);
    if (order) order.status = 'confirmado';
  }
  if (orderId && !tx.orderId) {
    tx.orderId = orderId;
    const order = db.orders.find(o => o.id === orderId);
    if (order) order.status = 'confirmado';
  }
  save(db);
  res.json({ success: true, status: 'aprovado' });
});

module.exports = router;
