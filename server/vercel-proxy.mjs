import {request as httpsRequest} from 'node:https';

const backendOrigin = 'https://2-29-156-0.sslip.io';
const limit = 2 * 1024 * 1024;
const businessHeaders = ['origin', 'cookie', 'content-type', 'x-pio-csrf'];
const uuid = '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}';
const routes = {
  GET: [/^\/api\/pio\/(session\/me|portfolio|proposals)$/],
  POST: [/^\/api\/pio\/(session\/(login|logout)|portfolio\/initialize|proposals)$/, new RegExp(`^/api/pio/proposals/${uuid}/(confirm|reject)$`)],
  PUT: [/^\/api\/pio\/portfolio$/],
  PATCH: [new RegExp(`^/api/pio/proposals/${uuid}$`)],
};

async function readBody(req) {
  let parsed;
  try { parsed = req.body; } catch { throw {status: 400}; }
  if (parsed !== undefined) {
    let body;
    try { body = Buffer.isBuffer(parsed) ? parsed : Buffer.from(typeof parsed === 'string' ? parsed : JSON.stringify(parsed)); }
    catch { throw {status: 400}; }
    if (body.length > limit) throw {status: 413};
    return body;
  }
  if (Number(req.headers['content-length']) > limit) {
    req.resume();
    throw {status: 413};
  }
  return await new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    const cleanup = () => { clearTimeout(timer); req.off('data', data); req.off('end', end); req.off('error', failed); req.off('aborted', failed); };
    const fail = status => { cleanup(); req.resume(); reject({status}); };
    const timer = setTimeout(() => fail(408), 10000);
    const data = chunk => { size += chunk.length; if (size > limit) fail(413); else chunks.push(chunk); };
    const end = () => { cleanup(); resolve(Buffer.concat(chunks)); };
    const failed = () => fail(400);
    req.on('data', data); req.on('end', end); req.on('error', failed); req.on('aborted', failed);
  });
}

// Request injection and timeout override are exclusively for local fixture tests.
export function createProxy({env = process.env, request = httpsRequest, timeoutMs = 12000} = {}) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const error = status => {
      if (res.writableEnded || res.destroyed) return;
      res.statusCode = status;
      res.removeHeader('Set-Cookie');
      res.end(JSON.stringify({error: 'PIO proxy unavailable'}));
    };
    if (env.PIO_BACKEND_ORIGIN !== backendOrigin || !/^[A-Za-z0-9_-]{43,128}$/.test(env.PIO_PROXY_KEY || '')) return error(503);
    if (!(routes[req.method] || []).some(pattern => pattern.test(req.url))) return error(404);
    let body;
    try { body = await readBody(req); } catch (e) { return error(e.status || 400); }
    if (req.method === 'GET' && body.length) return error(400);
    const headers = {};
    for (const name of businessHeaders) if (typeof req.headers[name] === 'string') headers[name] = req.headers[name];
    headers['x-pio-proxy-key'] = env.PIO_PROXY_KEY;
    headers['content-length'] = String(body.length);
    let upstream; let timer; let finished = false;
    const finish = () => { finished = true; clearTimeout(timer); };
    const fail = status => { if (finished) return; finish(); error(status); upstream?.destroy(); };
    res.on('close', () => { if (!finished) { finish(); upstream?.destroy(); } });
    try {
      timer = setTimeout(() => fail(504), timeoutMs);
      upstream = request({protocol: 'https:', hostname: '2-29-156-0.sslip.io', port: 443, path: req.url, method: req.method, headers}, incoming => {
        if (finished) { incoming.destroy(); return; }
        const status = incoming.statusCode || 502;
        if (status >= 300 && status < 400) { fail(502); incoming.destroy(); return; }
        const contentType = incoming.headers['content-type'] || '';
        if (!/^application\/json(?:;|$)/i.test(contentType)) { fail(502); incoming.destroy(); return; }
        const chunks = []; let size = 0;
        incoming.on('data', chunk => {
          size += chunk.length;
          if (size > limit) { fail(502); incoming.destroy(); }
          else if (!finished) chunks.push(chunk);
        });
        incoming.on('error', () => fail(502));
        incoming.on('aborted', () => fail(502));
        incoming.on('end', () => {
          if (finished) return;
          finish(); res.statusCode = status;
          if (incoming.headers['set-cookie']) res.setHeader('Set-Cookie', incoming.headers['set-cookie']);
          res.setHeader('Content-Type', contentType);
          res.end(Buffer.concat(chunks));
        });
      });
      upstream.on('error', () => fail(502));
      upstream.end(body);
    } catch { fail(502); }
  };
}
