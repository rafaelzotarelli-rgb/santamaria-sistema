// api/zapsign.js — Proxy serverless para ZapSign
const ZAPSIGN_TOKEN = '3db0872b-39f3-4614-b9ff-74f4f88ff876c96d3e32-5d1c-450c-97f3-9364ef56e986';
const ZAPSIGN_BASE  = 'https://sandbox.api.zapsign.com.br/api/v1';

function sanitize(str) {
  return (str||'')
    .replace(/ã/g,'a').replace(/Ã/g,'A').replace(/á/g,'a').replace(/Á/g,'A')
    .replace(/â/g,'a').replace(/Â/g,'A').replace(/à/g,'a').replace(/À/g,'A')
    .replace(/ç/g,'c').replace(/Ç/g,'C')
    .replace(/é/g,'e').replace(/É/g,'E').replace(/ê/g,'e').replace(/Ê/g,'E')
    .replace(/è/g,'e').replace(/È/g,'E').replace(/í/g,'i').replace(/Í/g,'I')
    .replace(/î/g,'i').replace(/Î/g,'I').replace(/ó/g,'o').replace(/Ó/g,'O')
    .replace(/ô/g,'o').replace(/Ô/g,'O').replace(/õ/g,'o').replace(/Õ/g,'O')
    .replace(/ú/g,'u').replace(/Ú/g,'U').replace(/ü/g,'u').replace(/Ü/g,'U')
    .replace(/[^\x20-\x7E]/g, '?')
    .replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');
}

function gerarPdf(nome, linhas) {
  var stream = 'BT\n/F1 10 Tf\n';
  var y = 800;
  (linhas||[]).forEach(function(linha) {
    if (y < 40) { y = 800; }
    stream += '50 ' + y + ' Td\n(' + sanitize(String(linha||'')) + ') Tj\n0 -14 Td\n';
    y -= 14;
  });
  stream += 'ET';

  var len = stream.length;
  var pdf = '%PDF-1.4\n'
    + '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n'
    + '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n'
    + '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n'
    + '4 0 obj<</Length ' + len + '>>\nstream\n' + stream + '\nendstream\nendobj\n'
    + '5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n'
    + 'xref\n0 6\n'
    + '0000000000 65535 f \n'
    + '0000000009 00000 n \n'
    + '0000000052 00000 n \n'
    + '0000000101 00000 n \n'
    + '0000000230 00000 n \n'
    + String(280 + len).padStart(10, '0') + ' 00000 n \n'
    + 'trailer<</Size 6/Root 1 0 R>>\n'
    + 'startxref\n'
    + String(330 + len) + '\n%%EOF';

  return Buffer.from(pdf, 'latin1').toString('base64');
}

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

      const nomeDoc   = body.name || body.nome || 'Documento Santa Maria Buffet';
      const linhas    = Array.isArray(body.texto) ? body.texto : [nomeDoc];
      const pdfBase64 = gerarPdf(nomeDoc, linhas.concat(['', '___________________________', 'Assinatura do Cliente', '', '___________________________', 'Santa Maria Buffet']));

      const payload = {
        name:       nomeDoc,
        lang:       'pt-BR',
        base64_pdf: pdfBase64,
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
