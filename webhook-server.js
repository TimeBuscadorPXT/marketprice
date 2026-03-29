const http = require('http');
const { execSync } = require('child_process');
const crypto = require('crypto');

const SECRET = process.env.WEBHOOK_SECRET || 'marketprice-deploy-2026';
const PORT = 9000;

http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/deploy') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      // Verificar signature do GitHub
      const signature = req.headers['x-hub-signature-256'];
      if (signature) {
        const hmac = crypto.createHmac('sha256', SECRET);
        hmac.update(body);
        const expected = 'sha256=' + hmac.digest('hex');
        if (signature !== expected) {
          res.writeHead(401);
          res.end('Invalid signature');
          return;
        }
      }

      console.log('[Webhook] Push recebido, executando deploy...');
      try {
        execSync('/root/marketprice/deploy.sh', {
          stdio: 'inherit',
          timeout: 120000
        });
        res.writeHead(200);
        res.end('Deploy OK');
      } catch (err) {
        console.error('[Webhook] Deploy falhou:', err.message);
        res.writeHead(500);
        res.end('Deploy failed');
      }
    });
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
}).listen(PORT, '0.0.0.0', () => {
  console.log(`[Webhook] Listening on port ${PORT}`);
});
