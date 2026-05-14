const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.PG_HOST,
    database: process.env.PG_DB,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    port: parseInt(process.env.PG_PORT || '5432'),
    ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: 1,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
});

const ALLOWED_ORIGINS = ['https://hio42.asia', 'http://localhost:3000', 'http://localhost:8080'];

function cors(req, res) {
    const origin = req.headers.origin;
    if (ALLOWED_ORIGINS.includes(origin) || !origin || origin.endsWith('.pages.dev') || origin.endsWith('.vercel.app')) {
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return true;
    }
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

    const url = new URL(req.url, `https://${req.headers.host}`);
    const pathname = url.pathname;

    try {
        // GET /api/comment
        if (req.method === 'GET' && pathname === '/api/comment') {
            const pageUrl = url.searchParams.get('path') || url.searchParams.get('url') || '/';
            const page = parseInt(url.searchParams.get('page')) || 1;
            const pageSize = parseInt(url.searchParams.get('pageSize')) || 10;

            const countResult = await pool.query(
                `SELECT COUNT(*) as total FROM wl_comment WHERE url = $1 AND status NOT IN ('waiting', 'spam')`,
                [pageUrl]
            );
            const total = parseInt(countResult.rows[0].total);

            const result = await pool.query(
                `SELECT id, nick, mail, link, comment, insertedat,
                        status, "like", sticky, rid, pid, ua, ip
                 FROM wl_comment
                 WHERE url = $1 AND status NOT IN ('waiting', 'spam')
                 ORDER BY insertedat DESC
                 LIMIT $2 OFFSET $3`,
                [pageUrl, pageSize, (page - 1) * pageSize]
            );

            return json(res, {
                errno: 0,
                errmsg: '',
                data: {
                    page,
                    totalPages: Math.ceil(total / pageSize),
                    pageSize,
                    count: total,
                    data: result.rows.map(formatComment),
                },
            });
        }

        // POST /api/comment
        if (req.method === 'POST' && pathname === '/api/comment') {
            const body = await readBody(req);
            const { url: cUrl, nick, mail, link, comment, pid, rid } = body;

            if (!cUrl || !nick || !comment) {
                return json(res, { errno: 400, errmsg: 'url, nick, and comment are required' }, 400);
            }

            const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
            const ua = req.headers['user-agent'] || '';

            const result = await pool.query(
                `INSERT INTO wl_comment (url, nick, mail, link, comment, pid, rid, ip, ua, status, insertedat)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'approved', NOW())
                 RETURNING *`,
                [cUrl, nick || '', mail || '', link || '', comment || '', pid || 0, rid || 0, ip, ua]
            );

            return json(res, {
                errno: 0,
                errmsg: '',
                data: formatComment(result.rows[0]),
            });
        }

        // GET /api/counter
        if (req.method === 'GET' && pathname === '/api/counter') {
            const pageUrl = url.searchParams.get('path') || '/';
            const result = await pool.query(`SELECT time FROM wl_counter WHERE url = $1`, [pageUrl]);
            return json(res, { errno: 0, errmsg: '', data: { url: pageUrl, time: result.rows[0]?.time || 0 } });
        }

        // POST /api/counter
        if (req.method === 'POST' && pathname === '/api/counter') {
            const body = await readBody(req);
            const { url: pageUrl } = body;
            if (!pageUrl) return json(res, { errno: 400, errmsg: 'url is required' }, 400);

            await pool.query(
                `INSERT INTO wl_counter (url, time, createdat, updatedat)
                 VALUES ($1, 1, NOW(), NOW())
                 ON CONFLICT (url) DO UPDATE SET time = wl_counter.time + 1, updatedat = NOW()`,
                [pageUrl]
            );
            return json(res, { errno: 0, errmsg: '' });
        }

        return json(res, { errno: 404, errmsg: 'Not found' }, 404);
    } catch (err) {
        console.error('Waline API Error:', err);
        return json(res, { errno: 500, errmsg: 'Internal server error' }, 500);
    }
};

function formatComment(row) {
    return {
        id: row.id,
        nick: row.nick || '',
        mail: row.mail || '',
        link: row.link || '',
        comment: row.comment || '',
        insertedAt: row.insertedat,
        status: row.status,
        like: row.like || 0,
        sticky: row.sticky || 0,
        rid: row.rid || 0,
        pid: row.pid || 0,
        ip: row.ip || '',
        ua: row.ua || '',
        addr: '',
        avatar: '',
        browser: '',
        os: '',
    };
}
