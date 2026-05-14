const { Pool } = require('pg');
const crypto = require('crypto');

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
            max: 3,
            idleTimeoutMillis: 10000,
            connectionTimeoutMillis: 8000,
        });
    }
    return pool;
}

let tablesReady = false;
async function ensureTables() {
    if (tablesReady) return;
    const p = getPool();
    // Drop legacy ThinkJS Waline tables to avoid column conflicts
    await p.query('DROP TABLE IF EXISTS wl_comment CASCADE');
    await p.query('DROP TABLE IF EXISTS wl_counter CASCADE');
    await p.query(`
        CREATE TABLE IF NOT EXISTS wl_comment (
            id SERIAL PRIMARY KEY,
            object_id VARCHAR(36) UNIQUE NOT NULL,
            nick VARCHAR(255) NOT NULL,
            mail VARCHAR(255) DEFAULT '',
            link VARCHAR(500) DEFAULT '',
            comment TEXT NOT NULL,
            ua TEXT DEFAULT '',
            url VARCHAR(500) NOT NULL,
            pid VARCHAR(36) DEFAULT NULL,
            rid VARCHAR(36) DEFAULT NULL,
            at VARCHAR(255) DEFAULT NULL,
            status VARCHAR(20) DEFAULT 'approved',
            ip VARCHAR(100) DEFAULT '',
            addr VARCHAR(255) DEFAULT '',
            avatar VARCHAR(500) DEFAULT '',
            like_count INTEGER DEFAULT 0,
            level INTEGER DEFAULT 0,
            label VARCHAR(255) DEFAULT '',
            sticky BOOLEAN DEFAULT false,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
    `);
    await p.query(`CREATE INDEX IF NOT EXISTS idx_wl_comment_url ON wl_comment(url, status, created_at DESC)`);
    await p.query(`
        CREATE TABLE IF NOT EXISTS wl_counter (
            id SERIAL PRIMARY KEY,
            url VARCHAR(500) NOT NULL,
            type VARCHAR(100) DEFAULT '',
            time INTEGER DEFAULT 1,
            UNIQUE(url, type)
        )
    `);
    tablesReady = true;
}

function genId() {
    return crypto.randomUUID();
}

function cors(req, res) {
    const origin = req.headers.origin;
    const allowed = ['https://hio42.asia', 'http://localhost:3000', 'http://localhost:8080', 'https://app.hio42.asia'];
    if (allowed.includes(origin) || !origin || origin.endsWith('.pages.dev') || origin.endsWith('.vercel.app')) {
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
    } else {
        res.setHeader('Access-Control-Allow-Origin', '*');
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

// Helper: build a Waline comment object from a DB row
function toComment(row) {
    return {
        objectId: row.object_id,
        nick: row.nick,
        mail: row.mail || '',
        link: row.link || '',
        comment: row.comment,
        ua: row.ua || '',
        url: row.url,
        pid: row.pid || null,
        rid: row.rid || null,
        at: row.at || null,
        status: row.status,
        insertedAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
        createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
        updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
        avatar: row.avatar || '',
        addr: row.addr || '',
        like: row.like_count || 0,
        level: row.level || 0,
        label: row.label || '',
        sticky: !!row.sticky,
    };
}

// GET /comment
async function handleGetComment(params, res) {
    const p = getPool();
    const url = params.path || '/';
    const page = parseInt(params.page) || 1;
    const pageSize = Math.min(parseInt(params.pageSize) || 10, 100);
    const sort = params.sort || 'latest';
    const type = params.type || '';
    const offset = (page - 1) * pageSize;

    if (type === 'count') {
        const r = await p.query(
            'SELECT COUNT(*)::int AS count FROM wl_comment WHERE url = $1 AND status = $2',
            [url, 'approved']
        );
        return json(res, { errno: 0, errmsg: '', data: r.rows[0].count });
    }

    if (type === 'recent') {
        const count = Math.min(parseInt(params.count) || 5, 100);
        const r = await p.query(
            'SELECT * FROM wl_comment WHERE status = $1 ORDER BY created_at DESC LIMIT $2',
            ['approved', count]
        );
        return json(res, { errno: 0, errmsg: '', data: r.rows.map(toComment) });
    }

    // Paginated list
    const countResult = await p.query(
        'SELECT COUNT(*)::int AS total FROM wl_comment WHERE url = $1 AND status = $2',
        [url, 'approved']
    );
    const total = countResult.rows[0].total;
    const totalPages = Math.ceil(total / pageSize);

    const orderCol = sort === 'oldest' ? 'created_at ASC' : 'created_at DESC';

    // Get root comments (pid is null) with pagination
    const r = await p.query(
        `SELECT * FROM wl_comment
         WHERE url = $1 AND status = $2 AND pid IS NULL
         ORDER BY ${sort === 'oldest' ? 'created_at ASC' : 'sticky DESC, created_at DESC'}
         LIMIT $3 OFFSET $4`,
        [url, 'approved', pageSize, offset]
    );

    const rootComments = r.rows.map(toComment);

    // Get child comments (replies) for the loaded root comments
    if (rootComments.length > 0) {
        const rootIds = rootComments.map(c => c.objectId);
        const placeholders = rootIds.map((_, i) => `$${i + 1}`).join(',');
        const children = await p.query(
            `SELECT * FROM wl_comment WHERE pid IN (${placeholders}) AND status = $${rootIds.length + 1} ORDER BY created_at ASC`,
            [...rootIds, 'approved']
        );
        const childComments = children.rows.map(toComment);
        // Nest children under parents
        for (const child of childComments) {
            child.children = [];
        }
        const childMap = {};
        for (const child of childComments) {
            childMap[child.objectId] = child;
        }
        const nestedChildren = [];
        for (const child of childComments) {
            if (child.rid && childMap[child.rid]) {
                childMap[child.rid].children.push(child);
            } else {
                const parent = rootComments.find(c => c.objectId === child.pid);
                if (parent) {
                    if (!parent.children) parent.children = [];
                    parent.children.push(child);
                }
            }
        }
    }

    return json(res, {
        errno: 0,
        errmsg: '',
        data: { page, totalPages, pageSize, count: total, data: rootComments }
    });
}

// POST /comment
async function handlePostComment(body, req, res) {
    const p = getPool();
    const objectId = genId();
    const nick = (body.nick || 'Anonymous').trim();
    if (!body.comment || !body.comment.trim()) {
        return json(res, { errno: 1, errmsg: 'Comment content is required' }, 400);
    }

    const url = body.url || '/';
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const ua = body.ua || req.headers['user-agent'] || '';

    await p.query(
        `INSERT INTO wl_comment (object_id, nick, mail, link, comment, ua, url, pid, rid, at, status, ip)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
            objectId,
            nick,
            (body.mail || '').trim(),
            (body.link || '').trim(),
            body.comment.trim(),
            ua,
            url,
            body.pid || null,
            body.rid || null,
            body.at || null,
            'approved',
            ip
        ]
    );

    const r = await p.query('SELECT * FROM wl_comment WHERE object_id = $1', [objectId]);
    return json(res, { errno: 0, errmsg: '', data: toComment(r.rows[0]) });
}

// PUT /comment/:id - for approving/editing
async function handlePutComment(pathParts, body, res) {
    const objectId = pathParts[1]; // /comment/:id
    if (!objectId) return json(res, { errno: 1, errmsg: 'Missing objectId' }, 400);

    const p = getPool();
    if (body.status) {
        await p.query('UPDATE wl_comment SET status = $1, updated_at = NOW() WHERE object_id = $2', [body.status, objectId]);
    }
    if (body.comment) {
        await p.query('UPDATE wl_comment SET comment = $1, updated_at = NOW() WHERE object_id = $2', [body.comment.trim(), objectId]);
    }
    const r = await p.query('SELECT * FROM wl_comment WHERE object_id = $1', [objectId]);
    if (r.rows.length === 0) return json(res, { errno: 1, errmsg: 'Comment not found' }, 404);
    return json(res, { errno: 0, errmsg: '', data: toComment(r.rows[0]) });
}

// DELETE /comment/:id
async function handleDeleteComment(pathParts, res) {
    const objectId = pathParts[1];
    if (!objectId) return json(res, { errno: 1, errmsg: 'Missing objectId' }, 400);

    const p = getPool();
    // Also delete replies
    await p.query('DELETE FROM wl_comment WHERE pid = $1', [objectId]);
    await p.query('DELETE FROM wl_comment WHERE object_id = $1', [objectId]);
    return json(res, { errno: 0, errmsg: '' });
}

// GET /counter
async function handleGetCounter(params, res) {
    const p = getPool();
    const url = params.path || '/';
    const type = params.type || '';

    if (Array.isArray(params.path)) {
        // Waline v2 can request counters for multiple URLs
        const placeholders = params.path.map((_, i) => `$${i + 1}`);
        const types = Array.isArray(params.type) ? params.type : params.path.map(() => type);
        const typePlaceholders = types.map((_, i) => `$${params.path.length + i + 1}`);
        const r = await p.query(
            `SELECT url, time FROM wl_counter WHERE url IN (${placeholders.join(',')}) AND type IN (${typePlaceholders.join(',')})`,
            [...params.path, ...types]
        );
        // Fill in 0 for missing URLs
        const result = params.path.map((url, i) => {
            const row = r.rows.find(rr => rr.url === url && rr.type === types[i]);
            return { url, time: row ? parseInt(row.time) : 0 };
        });
        return json(res, { errno: 0, errmsg: '', data: result });
    }

    const r = await p.query(
        'SELECT time FROM wl_counter WHERE url = $1 AND type = $2',
        [url, type]
    );
    const time = r.rows.length > 0 ? parseInt(r.rows[0].time) : 0;
    return json(res, { errno: 0, errmsg: '', data: [{ url, time }] });
}

// POST /counter
async function handlePostCounter(body, res) {
    const p = getPool();
    const url = body.url || '/';
    const type = body.type || '';

    await p.query(
        `INSERT INTO wl_counter (url, type, time) VALUES ($1, $2, 1)
         ON CONFLICT (url, type) DO UPDATE SET time = wl_counter.time + 1`,
        [url, type]
    );

    const r = await p.query('SELECT time FROM wl_counter WHERE url = $1 AND type = $2', [url, type]);
    const time = parseInt(r.rows[0].time);
    return json(res, { errno: 0, errmsg: '', data: { url, time } });
}

// GET /user - basic user check (no login required for this site, so return not-logged-in)
async function handleGetUser(res) {
    return json(res, { errno: 0, data: null });
}

module.exports = async function handler(req, res) {
    if (cors(req, res)) return;

    try {
        await ensureTables();
    } catch (e) {
        console.error('DB init error:', e.message, e.code, e.stack);
        return json(res, { errno: 500, errmsg: 'Database connection failed: ' + (e.code || e.message) }, 500);
    }

    const url = new URL(req.url, 'https://' + (req.headers.host || 'localhost'));
    const pathname = url.pathname;
    const pathParts = pathname.split('/').filter(Boolean); // ['comment'] or ['comment', 'id'] or ['counter'] or ['user']

    const isCommentPath = pathname === '/comment' || pathname.startsWith('/comment/') || pathname === '/api/comment' || pathname.startsWith('/api/comment/');
    const isCounterPath = pathname === '/counter' || pathname === '/api/counter';
    const isUserPath = pathname === '/user' || pathname === '/api/user';

    try {
        if (isCommentPath) {
            if (req.method === 'GET') {
                return await handleGetComment(Object.fromEntries(url.searchParams), res);
            } else if (req.method === 'POST') {
                const body = await readBody(req);
                return await handlePostComment(body, req, res);
            } else if (req.method === 'PUT') {
                const body = await readBody(req);
                return await handlePutComment(pathParts, body, res);
            } else if (req.method === 'DELETE') {
                return await handleDeleteComment(pathParts, res);
            }
        }

        if (isCounterPath) {
            if (req.method === 'GET') {
                return await handleGetCounter(Object.fromEntries(url.searchParams), res);
            } else if (req.method === 'POST') {
                const body = await readBody(req);
                return await handlePostCounter(body, res);
            }
        }

        if (isUserPath && req.method === 'GET') {
            return await handleGetUser(res);
        }

        return json(res, { errno: 404, errmsg: 'Not found: ' + pathname }, 404);
    } catch (e) {
        console.error('Handler error:', e.message, e.stack);
        return json(res, { errno: 500, errmsg: 'Internal error' }, 500);
    }
};
