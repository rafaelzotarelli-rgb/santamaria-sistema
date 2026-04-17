// api/zapsign.js — Proxy serverless para ZapSign
const ZAPSIGN_TOKEN = '3db0872b-39f3-4614-b9ff-74f4f88ff876c96d3e32-5d1c-450c-97f3-9364ef56e986';
const ZAPSIGN_BASE  = 'https://sandbox.api.zapsign.com.br/api/v1';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action, token } = req.query;

  try {
    // Criar documento
    if (req.method === 'POST' && action === 'criar') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const payload = {
        name:       body.name || 'Documento Santa Maria Buffet',
        lang:       'pt-BR',
        base64_pdf: body.base64_pdf,
        signers:    body.signers || [],
      };
      const response = await fetch(`${ZAPSIGN_BASE}/docs/`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ZAPSIGN_TOKEN}` },
        body:    JSON.stringify(payload),
      });
      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch(e) { data = { error: text.slice(0,500) }; }
      if (!response.ok) return res.status(response.status).json({ error: data.detail || data.message || data.error || text.slice(0,300) });
      return res.status(200).json(data);
    }

    // Verificar status
    if (req.method === 'GET' && action === 'status' && token) {
      const response = await fetch(`${ZAPSIGN_BASE}/docs/${token}/`, {
        headers: { 'Authorization': `Bearer ${ZAPSIGN_TOKEN}` },
      });
      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch(e) { data = { error: text.slice(0,300) }; }
      if (!response.ok) return res.status(response.status).json({ error: data.detail || data.error || text.slice(0,300) });
      return res.status(200).json(data);
    }

    // Cancelar documento
    if (req.method === 'POST' && action === 'cancelar' && token) {
      await fetch(`${ZAPSIGN_BASE}/docs/${token}/cancel/`, {
        method:  'POST',
        headers: { 'Authorization': `Bearer ${ZAPSIGN_TOKEN}` },
      });
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Acao invalida.' });

  } catch (err) {
    return res.status(500).json({ error: 'Erro interno: ' + err.message });
  }
}
