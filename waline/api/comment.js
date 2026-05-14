const { Pool } = require('pg');

let pool = null;
function getPool() {
    if (!pool) {
        pool = new Pool({
            host: process.env.PG_HOST,
            database: process.env.PG_DB,
            user: process.env.PG_USER,
            password: process.env.PG_PASSWORD,
            port: parseInt(process.env.PG_PORT || '5432'),
            ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false,
            max: 1,
            connectionTimeoutMillis: 5000,
        });
    }
    return pool;
}

function cors(req, res) {
    const origin = req.headers.origin;
    const allowed = ['https://hio42.asia', 'http://localhost:3000', 'http://localhost:8080'];
    if (allowed.includes(origin) || !origin || origin.endsWith('.pages.dev') || origin.endsWith('.vercel.app')) {
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return true; }
    return false;
}

function json(res, data, status = 200) {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(data));
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try { resolve(JSON.parse(body || '{}')); }
            catch (e) { reject(new Error('Invalid JSON')); }
        });
        req.on('error', reject);
    });
}

module.exports = async function handler(req, res) {
    if (cors(req, res)) return;

    const url = new URL(req.url, 'https://' + (req.headers.host || 'localhost'));
    const pathname = url.pathname;
    const isCommentPath = pathname === '/api/comment' || pathname === '/comment';
    const isCounterPath = pathname === '/api/counter' || pathname === '/counter';

    console.log('DEBUG', JSON.stringify({ method: req.method, pathname, isComment: isCommentPath, isCounter: isCounterPath }));

    // Simple test first - if pathname matches, return success before DB
    if (req.method === 'GET' && isCommentPath) {
        return json(res, { errno: 0, errmsg: '', data: { page: 1, totalPages: 0, pageSize: 10, count: 0, data: [] } });
    }

    return json(res, { errno: 404, errmsg: 'Not found: ' + pathname }, 404);
};
