const http = require('http');
const fs = require('fs');
const path = require('path');

// Создаём папку для логов
const LOG_DIR = './logs';
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR);
}

const server = http.createServer((req, res) => {
    // CORS для локальной разработки
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Эндпоинт для логов
    if (req.url === '/log-error' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const logData = JSON.parse(body);
                const logFile = path.join(LOG_DIR, `error-${new Date().toISOString().split('T')[0]}.log`);
                const logLine = JSON.stringify(logData) + '\n';
                
                fs.appendFile(logFile, logLine, (err) => {
                    if (err) {
                        console.error('Ошибка записи лога:', err);
                        res.writeHead(500);
                        res.end(JSON.stringify({ status: 'error', message: 'Failed to write log' }));
                        return;
                    }
                    console.log('✅ Лог записан:', logData.error.message);
                    res.writeHead(200);
                    res.end(JSON.stringify({ status: 'ok' }));
                });
            } catch (e) {
                console.error('Ошибка обработки лога:', e);
                res.writeHead(400);
                res.end(JSON.stringify({ status: 'error', message: 'Invalid JSON' }));
            }
        });
        return;
    }

    // Отдаём статику
    if (req.url === '/' || req.url === '/index.html') {
        fs.readFile('./index.html', (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end('Not found');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
        });
        return;
    }

    // manifest.json
    if (req.url === '/manifest.json') {
        fs.readFile('./manifest.json', (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end('Not found');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(data);
        });
        return;
    }

    // sw.js
    if (req.url === '/sw.js') {
        fs.readFile('./sw.js', (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end('Not found');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'application/javascript' });
            res.end(data);
        });
        return;
    }

    res.writeHead(404);
    res.end('Not found');
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
    console.log(`📁 Логи пишутся в папку: ${LOG_DIR}`);
});