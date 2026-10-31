import { createServer } from 'node:http';
import { digest, secret } from './store.mjs';
import { snapshot } from './operations.mjs';
import { scopedPortfolio, canSee } from './scopes.mjs';
import { createProposal, reviewProposal } from './proposals.mjs';

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export function fail(status, message) { throw new HttpError(status, message); }
const cookieName = 'pio_owner';
const sessionSeconds = 8 * 60 * 60;
export function createBridge({store, origin = 'http://127.0.0.1:5173'}) {
  const expected = new URL(origin);
  if (expected.origin !== origin || expected.protocol !== 'http:' || !['127.0.0.1','localhost'].includes(expected.hostname)) throw new Error('Only exact loopback development origins are supported');
  const attempts = new Map();
  const server = createServer({maxHeaderSize: 16384, requestTimeout: 15000, headersTimeout: 10000}, async (req,res) => {
    res.setHeader('Content-Type','application/json; charset=utf-8');
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Content-Security-Policy',"default-src 'none'; frame-ancestors 'none'");
    try {
      const localHost = `127.0.0.1:${server.address().port}`;
      if (![localHost, `localhost:${server.address().port}`].includes(req.headers.host)) fail(403,'Host refused');
      if (req.headers.origin && req.headers.origin !== origin) fail(403,'Origin refused');
      const method = req.method;
      const path = req.url;
      if (!path.startsWith('/api/pio/') || path.includes('?')) fail(404,'Not found');
      const write = !['GET','HEAD'].includes(method);
      let body = {};
      if (write) {
        if (!req.headers.authorization && req.headers.origin !== origin) fail(403,'Origin required');
        if (req.headers['content-type'] !== 'application/json') fail(415,'JSON required');
        if (Number(req.headers['content-length']) > 2 * 1024 * 1024) fail(413,'Request too large');
        const chunks = []; let size = 0;
        const timer = setTimeout(() => req.destroy(), 10000);
        try {
          for await (const chunk of req) {
            size += chunk.length;
            if (size > 2 * 1024 * 1024) fail(413,'Request too large');
            chunks.push(chunk);
          }
        } finally { clearTimeout(timer); }
        try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { fail(400,'Invalid JSON'); }
        if (!body || typeof body !== 'object' || Array.isArray(body)) fail(400,'Object required');
      }
      const send = (data, status=200) => { res.statusCode = status; res.end(JSON.stringify(data)); };
      if (path === '/api/pio/session/login' && method === 'POST') {
        if (req.headers.authorization) fail(403,'Owner login only');
        const now = Date.now();
        const key = req.socket.remoteAddress;
        const record = attempts.get(key);
        const a = record && record.until > now ? record : {count:0,until:now+600000};
        attempts.set(key,a);
        if (++a.count > 20) fail(429,'Try again later');
        if (!store.verifyPassword(body.password)) fail(401,'Invalid credentials');
        const token=secret(), csrf=secret();
        store.transaction(s => {
          for (const [key,value] of Object.entries(s.sessions)) if (value.expires < now) delete s.sessions[key];
          s.sessions[digest(token)]={csrf,expires:now+sessionSeconds*1000};
        });
        res.setHeader('Set-Cookie',`${cookieName}=${token}; Path=/api/pio; HttpOnly; SameSite=Strict; Max-Age=${sessionSeconds}`);
        return send({role:'owner',csrf});
      }
      const state=store.read();
      let actor;
      if (req.headers.authorization) {
        const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.headers.authorization);
        if (!match) fail(401,'Invalid credentials');
        const entry=Object.entries(state.agents).find(([,a])=>a.hash===digest(match[1]) && !a.revoked);
        if (!entry) fail(401,'Invalid credentials');
        actor={role:'agent',id:entry[0],...entry[1]};
      } else {
        const token=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(`${cookieName}=`))?.slice(cookieName.length+1);
        const session=token && state.sessions[digest(token)];
        if (!session || session.expires <= Date.now()) fail(401,'Login required');
        if (write && req.headers['x-pio-csrf'] !== session.csrf) fail(403,'CSRF refused');
        actor={role:'owner',id:'owner',session: digest(token),csrf:session.csrf};
      }
      if (path === '/api/pio/session/me' && method === 'GET') return send({role:actor.role, id:actor.id, ...actor.role==='owner' && {csrf:actor.csrf}});
      if (path === '/api/pio/session/logout' && method === 'POST') {
        if (actor.role !== 'owner') fail(403,'Owner required');
        store.transaction(s=>delete s.sessions[actor.session]);
        res.setHeader('Set-Cookie',`${cookieName}=; Path=/api/pio; HttpOnly; SameSite=Strict; Max-Age=0`);
        return send({ok:true});
      }
      if (actor.role === 'agent' && write && !(path==='/api/pio/proposals' && method==='POST')) fail(403,'Agents can only read and propose');
      if (path === '/api/pio/proposals' && method==='GET') return send({proposals:state.proposals.filter(p=>canSee(actor,p.task.companyId))});
      if (path === '/api/pio/proposals' && method==='POST') return send(createProposal(store,actor,body));
      const proposalRoute=/^\/api\/pio\/proposals\/([a-f0-9-]{36})(?:\/(confirm|reject))?$/.exec(path);
      if (proposalRoute && ((method==='POST' && proposalRoute[2]) || (method==='PATCH' && !proposalRoute[2]))) return send(reviewProposal(store,actor,proposalRoute[1],proposalRoute[2]||'edit',body));
      if ((path === '/api/pio/portfolio/initialize' && method === 'POST') || (path === '/api/pio/portfolio' && method === 'PUT')) return send(snapshot(store,actor,path,body,method === 'POST'));
      if (path === '/api/pio/portfolio' && method === 'GET') return send({revision:state.revision,portfolio:scopedPortfolio(state.portfolio,actor)});
      fail(404,'Not found');
    } catch (error) {
      res.statusCode=error.status||500;
      if (!res.writableEnded) res.end(JSON.stringify({error:error.status ? error.message : 'Internal error'}));
    }
  });
  server.keepAliveTimeout=5000;
  server.maxRequestsPerSocket=100;
  server.on('clientError', (_err,socket)=>socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n'));
  return server;
}
