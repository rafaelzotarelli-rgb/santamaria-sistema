// api/zapsign.js — Proxy serverless para ZapSign (evita bloqueio CORS)
// Coloque este arquivo em /api/zapsign.js no repositório GitHub

const ZAPSIGN_TOKEN = 'b4ef5c08-b314-49d0-9f72-8159a7a11fe154147000-c334-4c7b-81bb-0706d7b83a2c';
const ZAPSIGN_BASE  = 'https://api.zapsign.com.br/api/v1';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action, token } = req.query;

  try {
    if (req.method === 'POST' && action === 'criar') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

      const response = await fetch(`${ZAPSIGN_BASE}/docs/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ZAPSIGN_TOKEN}`,
        },
        body: JSON.stringify(body),
      });

      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch(e) { data = { error: text }; }

      if (!response.ok) {
        return res.status(response.status).json({ error: data.detail || data.message || data.error || text.slice(0,300) });
      }
      return res.status(200).json(data);
    }

    if (req.method === 'GET' && action === 'status' && token) {
      const response = await fetch(`${ZAPSIGN_BASE}/docs/${token}/`, {
        headers: { 'Authorization': `Bearer ${ZAPSIGN_TOKEN}` },
      });

      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch(e) { data = { error: text }; }

      if (!response.ok) {
        return res.status(response.status).json({ error: data.detail || data.error || text.slice(0,300) });
      }
      return res.status(200).json(data);
    }

    return res.status(400).json({ error: 'Acao invalida. Use ?action=criar ou ?action=status&token=...' });

  } catch (err) {
    return res.status(500).json({ error: 'Erro interno: ' + err.message });
  }
}
