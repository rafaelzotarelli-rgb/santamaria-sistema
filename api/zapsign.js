// api/zapsign.js — Proxy serverless para ZapSign
const ZAPSIGN_TOKEN = '3db0872b-39f3-4614-b9ff-74f4f88ff876c96d3e32-5d1c-450c-97f3-9364ef56e986';
const ZAPSIGN_BASE  = 'https://sandbox.api.zapsign.com.br/api/v1';

function sanitize(str) {
  return (str||'')
    .replace(/[àáâãäå]/gi, a => 'aaaaaa'['àáâãäå'.indexOf(a)] || a)
    .replace(/ã/g,'a').replace(/Ã/g,'A')
    .replace(/á/g,'a').replace(/Á/g,'A')
    .replace(/â/g,'a').replace(/Â/g,'A')
    .replace(/à/g,'a').replace(/À/g,'A')
    .replace(/ç/g,'c').replace(/Ç/g,'C')
    .replace(/é/g,'e').replace(/É/g,'E')
    .replace(/ê/g,'e').replace(/Ê/g,'E')
    .replace(/è/g,'e').replace(/È/g,'E')
    .replace(/í/g,'i').replace(/Í/g,'I')
    .replace(/î/g,'i').replace(/Î/g,'I')
    .replace(/ó/g,'o').replace(/Ó/g,'O')
    .replace(/ô/g,'o').replace(/Ô/g,'O')
    .replace(/õ/g,'o').replace(/Õ/g,'O')
    .replace(/ú/g,'u').replace(/Ú/g,'U')
    .replace(/ü/g,'u').replace(/Ü/g,'U')
    .replace(/ñ/g,'n').replace(/Ñ/g,'N')
    .replace(/[^\x20-\x7E]/g, '?')
    .replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');
}

function gerarPdf(titulo, linhas) {
  var stream = 'BT\n/F1 10 Tf\n';
  var y = 800;
  linhas.forEach(function(linha) {
    if (y < 40) { stream += '0 800 Td\n'; y = 800; }
    stream += '50 ' + y + ' Td\n(' + sanitize(linha) + ') Tj\n0 -14 Td\n';
    y -= 14;
  });
  stream += 'ET';

  var len = stream.length;
  var pdf = [
    '%PDF-1.4',
    '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj',
    '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj',
    '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj',
    '4 0 obj<</Length ' + len + '>>\nstream\n' + stream + '\nendstream\nendobj',
    '5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj',
    'xref\n0 6',
    '0000000000 65535 f ',
    '0000000009 00000 n ',
    '0000000052 00000 n ',
    '0000000101 00000 n ',
    '0000000230 00000 n ',
    '000000' + String(280 + len).padStart(6, '0') + ' 00000 n ',
    'trailer<</Size 6/Root 1 0 R>>',
    'startxref',
    String(330 + len),
    '%%EOF'
  ].join('\n');

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

      // Gera PDF no servidor a partir do texto enviado
      const linhas = (body.texto || ['Documento Santa Maria Buffet']).concat([
        '', '___________________________', 'Assinatura do Cliente', '',
        '___________________________', 'Santa Maria Buffet'
      ]);
      const pdfBase64 = gerarPdf(body.nome || 'Documento', linhas);

      const payload = {
        name:       body.nome,
        lang:       'pt-BR',
        sandbox:    body.sandbox !== false,
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
      try { data = JSON.parse(text); } catch(e) { data = { error: text.slice(0,300) }; }
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
