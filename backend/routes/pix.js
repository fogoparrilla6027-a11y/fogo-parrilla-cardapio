const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('../database');
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
    certificate_pfx: process.env.PIX_CERT_PATH || '',
    certificate_password: process.env.PIX_CERT_PASS || '',
    client_id: process.env.PIX_CLIENT_ID || '782d72c8-0d3b-4f7f-8577-f7f5679f128f',
    auth_url: 'https://auth.sicoob.com.br/auth/realms/cooperado/protocol/openid-connect/token',
    api_url: 'https://api.sicoob.com.br/pix/api/v2',
    pix_key: process.env.PIX_KEY || '59086592000159',
    merchant_name: 'FOGO PARRILLA LTDA',
    merchant_city: 'Itauna',
    modo_teste: true
  };
}

function savePixConfig(config) {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

function generateTxid() {
  const timestamp = Date.now().toString(36).slice(-10);
  const random = crypto.randomBytes(16).toString('hex');
  return (timestamp + random).slice(0, 35);
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
  if (!config.enabled || config.modo_teste || !config.certificate_pfx) return null;
  try {
    const axios = require('axios');
    const forge = require('node-forge');
    const pfxData = fs.readFileSync(config.certificate_pfx);
    const pfx = forge.pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(forge.util.createBuffer(pfxData.toString('binary'))), config.certificate_password);
    const keyObj = pfx.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0] ||
                   pfx.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag]?.[0];
    const certObj = pfx.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag]?.[0];
    if (!keyObj || !certObj) return null;
    const keyPem = forge.pki.privateKeyToPem(keyObj.key);
    const certPem = forge.pki.certificateToPem(certObj.cert);
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', config.client_id);
    params.append('scope', 'cob.write cob.read pix.write pix.read');
    const https = require('https');
    const agent = new https.Agent({ cert: certPem, key: keyPem });
    const tokenRes = await axios.post(config.auth_url, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      httpsAgent: agent,
      timeout: 30000
    });
    const token = tokenRes.data.access_token;
    const txid = generateTxid();
    const payload = {
      calendario: { expiracao: 3600 },
      valor: { original: valor.toFixed(2) },
      chave: config.pix_key,
      solicitacaoPagador: 'Fogo Parrilla - Pagamento'
    };
    const cobRes = await axios.put(`${config.api_url}/cob/${txid}`, payload, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      httpsAgent: agent,
      timeout: 30000
    });
    const data = cobRes.data;
    return { txid, brcode: data.brcode || data.pixCopiaECola || '', location: data.location || '' };
  } catch (e) {
    console.error('[PIX] Erro API:', e.message);
    return null;
  }
}

router.get('/config', authMiddleware, async (req, res) => {
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

router.put('/config', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso restrito' });
  const config = loadPixConfig();
  Object.assign(config, req.body);
  savePixConfig(config);
  res.json({ success: true });
});

router.post('/cobranca', authMiddleware, async (req, res) => {
  try {
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
    await db.createPixTransaction({
      id: result.txid,
      orderId: orderId || null,
      userId: req.user.id,
      valor,
      brcode: result.brcode,
      status: 'pendente',
      modo: result.modo_offline ? 'offline' : 'api'
    });
    res.json({ txid: result.txid, brcode: result.brcode, valor, expiracao: 3600 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/status/:txid', authMiddleware, async (req, res) => {
  try {
    const tx = await db.getPixTransaction(req.params.txid);
    if (!tx) return res.status(404).json({ error: 'Transação não encontrada' });
    if (tx.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    if (tx.status !== 'pendente') {
      return res.json({ status: tx.status, txid: tx.id });
    }
    if (!tx.modo || tx.modo === 'offline') {
      return res.json({ status: 'pendente', txid: tx.id, modo: 'offline' });
    }
    return res.json({ status: 'pendente', txid: tx.id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/confirmar', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso restrito' });
  try {
    const { txid, orderId } = req.body;
    await db.updatePixStatus(txid, 'aprovado');
    if (orderId) await db.updateOrderStatus(orderId, 'confirmado');
    res.json({ success: true, status: 'aprovado' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
