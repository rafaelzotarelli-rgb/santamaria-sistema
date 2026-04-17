// api/zapsign.js — Proxy serverless para ZapSign (evita bloqueio CORS)
// Coloque este arquivo em /api/zapsign.js no repositório GitHub

const ZAPSIGN_TOKEN = 'b4ef5c08-b314-49d0-9f72-8159a7a11fe154147000-c334-4c7b-81bb-0706d7b83a2c';
const ZAPSIGN_BASE  = 'https://api.zapsign.com.br/api/v1';

export default async function handler(req, res) {
  // Permite chamadas do frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action, token } = req.query;

  try {
    if (req.method === 'POST' && action === 'criar') {
      // Criar documento no ZapSign
      const response = await fetch(`${ZAPSIGN_BASE}/docs/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ZAPSIGN_TOKEN}`,
        },
        body: JSON.stringify(req.body),
      });

      const data = await response.json();
      if (!response.ok) {
        return res.status(response.status).json({ error: data.detail || data.message || 'Erro ZapSign' });
      }
      return res.status(200).json(data);
    }

    if (req.method === 'GET' && action === 'status' && token) {
      // Verificar status de assinatura
      const response = await fetch(`${ZAPSIGN_BASE}/docs/${token}/`, {
        headers: { 'Authorization': `Bearer ${ZAPSIGN_TOKEN}` },
      });

      const data = await response.json();
      if (!response.ok) {
        return res.status(response.status).json({ error: data.detail || 'Erro ao consultar ZapSign' });
      }
      return res.status(200).json(data);
    }

    return res.status(400).json({ error: 'Ação inválida. Use ?action=criar ou ?action=status&token=...' });

  } catch (err) {
    return res.status(500).json({ error: 'Erro interno: ' + err.message });
  }
}
