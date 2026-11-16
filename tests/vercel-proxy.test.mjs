import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer,request as httpRequest} from 'node:http';
import {once} from 'node:events';
import {createServer as tlsServer,request as tlsRequest} from 'node:https';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {openStore} from '../server/store.mjs';
import {createBridge} from '../server/http.mjs';

async function fixture(t,{relayHandler,timeoutMs}={}) {
 const {createProxy}=await import('../server/vercel-proxy.mjs');
 const root=mkdtempSync(join(tmpdir(),'pio-vercel-fixture-'));
 const key=join(root,'fixture.key'),cert=join(root,'fixture.crt');
 const path=p=>process.platform==='win32'?p.replaceAll('\\','/').replace(/^([A-Za-z]):\//,(_,d)=>'/'+d.toLowerCase()+'/'):p;
 const generated=spawnSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-keyout',path(key),'-out',path(cert),'-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1','-addext','basicConstraints=critical,CA:TRUE'],{encoding:'utf8',timeout:15000});
 assert.equal(generated.status,0,generated.stderr);
 const origin='https://pio-finance.vercel.app',proxyKey=randomBytes(32).toString('base64url');
 const env={PIO_BACKEND_ORIGIN:'https://2-29-156-0.sslip.io',PIO_PROXY_KEY:proxyKey};
 const store=openStore(join(root,'db'));store.init('synthetic-test-password-01');
 const backend=createBridge({store,origin});let calls=0;const seen=[];
 backend.on('request',req=>seen.push({...req.headers}));
 backend.listen(0,'127.0.0.1');await once(backend,'listening');
 const relay=tlsServer({key:readFileSync(key),cert:readFileSync(cert)},(req,res)=>{
  calls++;
  if(req.headers['x-pio-proxy-key']!==proxyKey){res.writeHead(403);res.end('{}');return;}
  if(relayHandler){relayHandler(req,res);return;}
  const headers={...req.headers,host:`127.0.0.1:${backend.address().port}`};delete headers['x-pio-proxy-key'];
  const upstream=httpRequest({host:'127.0.0.1',port:backend.address().port,path:req.url,method:req.method,headers},incoming=>{res.writeHead(incoming.statusCode,incoming.headers);incoming.pipe(res);});
  upstream.on('error',()=>{res.writeHead(502);res.end('{}');});req.pipe(upstream);
 });
 relay.listen(0,'127.0.0.1');await once(relay,'listening');
 const request=(options,cb)=>tlsRequest({...options,hostname:'127.0.0.1',port:relay.address().port,servername:'localhost',ca:readFileSync(cert)},cb);
 const server=createServer(createProxy({env,request,...timeoutMs&&{timeoutMs}}));server.listen(0,'127.0.0.1');await once(server,'listening');
 t.after(async()=>{for(const s of [server,relay,backend]){s.closeAllConnections();await new Promise(r=>s.close(r));}store.close();rmSync(root,{recursive:true,force:true});});
 async function call(path='/session/me',{method='GET',body,headers={}}={}) {
  const response=await fetch(`http://127.0.0.1:${server.address().port}/api/pio${path}`,{method,headers:{origin,...body!==undefined&&{'content-type':'application/json'},...headers},body:body===undefined?undefined:JSON.stringify(body),redirect:'manual'});
  return {status:response.status,headers:response.headers,text:await response.text()};
 }
 return {call,env,seen,proxyKey,get calls(){return calls;},relay,cert,server};
}

test('actual handler relays verified TLS login, Secure session, Origin and CSRF roundtrip',async t=>{
 const f=await fixture(t);
 assert.equal((await f.call()).status,401);
 const login=await f.call('/session/login',{method:'POST',body:{password:'synthetic-test-password-01'},headers:{'x-pio-proxy-key':'spoof','x-forwarded-host':'evil','forwarded':'host=evil','authorization':'Bearer spoof'}});
 assert.equal(login.status,200);assert.match(login.headers.getSetCookie()[0],/HttpOnly; SameSite=Strict; Secure;/);
 const cookie=login.headers.getSetCookie()[0].split(';')[0],csrf=JSON.parse(login.text).csrf;
 assert.equal(JSON.parse((await f.call('/session/me',{headers:{cookie}})).text).role,'owner');
 assert.equal((await f.call('/session/logout',{method:'POST',body:{},headers:{cookie}})).status,403);
 assert.equal((await f.call('/session/logout',{method:'POST',body:{},headers:{cookie,'x-pio-csrf':csrf,origin:'https://evil.example'}})).status,403);
 assert.equal((await f.call('/session/logout',{method:'POST',body:{},headers:{cookie,'x-pio-csrf':csrf}})).status,200);
 assert.equal((await f.call('/portfolio',{headers:{cookie}})).status,401);
 for(const h of f.seen){assert.equal(h['x-pio-proxy-key'],undefined);assert.equal(h.authorization,undefined);assert.equal(h.forwarded,undefined);assert.equal(h['x-forwarded-host'],undefined);assert.ok(['https://pio-finance.vercel.app','https://evil.example'].includes(h.origin));}
});

test('strict route and config validation prevents path tricks, open targets and unapproved methods before network',async t=>{
 const f=await fixture(t);
 const invalid=['/unknown','/portfolio?target=https://evil.example','//evil.example','/%2e%2e/session/me','/session%2fme','/session/me/','/session/me?path=portfolio','/proposals/not-a-uuid/confirm'];
 // Raw HTTP avoids fetch normalizing dot segments before the handler sees them.
 for(const path of invalid){
  const result=await new Promise((resolve,reject)=>{const req=httpRequest({host:'127.0.0.1',port:f.server.address().port,path:'/api/pio'+path},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});req.on('error',reject);req.end();});
  assert.equal(result,404,path);
 }
 assert.equal((await f.call('/portfolio',{method:'DELETE'})).status,404);
 assert.equal(f.calls,0);
 for(const value of ['http://2-29-156-0.sslip.io','https://evil.example','https://user@2-29-156-0.sslip.io','https://2-29-156-0.sslip.io/','https://2-29-156-0.sslip.io?x=1','https://2-29-156-0.sslip.io:443']){
  f.env.PIO_BACKEND_ORIGIN=value;assert.equal((await f.call()).status,503);
 }
 assert.equal(f.calls,0);
});

test('proxy caps raw and Vercel-parsed bodies before sending and bounds response size',async t=>{
 const f=await fixture(t,{relayHandler:(_req,res)=>{res.writeHead(200,{'content-type':'application/json'});res.end('x'.repeat(2*1024*1024+1));}});
 assert.equal((await f.call('/session/login',{method:'POST',body:{password:'x'.repeat(2*1024*1024)}})).status,413);
 assert.equal(f.calls,0);
 // Simulate the Node Vercel body getter, with its already-consumed stream.
 const {createProxy}=await import('../server/vercel-proxy.mjs');
 const parsed=createServer((req,res)=>{req.resume();req.on('end',()=>{Object.defineProperty(req,'body',{get:()=>({password:'x'.repeat(2*1024*1024)})});createProxy({env:f.env,request(){throw Error('must not contact network');}})(req,res);});});
 parsed.listen(0,'127.0.0.1');await once(parsed,'listening');t.after(()=>new Promise(r=>parsed.close(r)));
 assert.equal((await fetch(`http://127.0.0.1:${parsed.address().port}/api/pio/session/login`,{method:'POST',headers:{'content-type':'application/json'},body:'{}'})).status,413);
 const reply=await f.call();assert.equal(reply.status,502);assert.equal(reply.text,'{"error":"PIO proxy unavailable"}');
});

test('missing proxy configuration fails closed before network access',async()=>{
 const {createProxy}=await import('../server/vercel-proxy.mjs');
 let calls=0;
 const server=createServer(createProxy({env:{},request(){calls++;throw Error('network forbidden');}}));
 server.listen(0,'127.0.0.1');await once(server,'listening');
 try {
  const response=await fetch(`http://127.0.0.1:${server.address().port}/api/pio/session/me`);
  assert.equal(response.status,503);assert.equal(response.headers.get('cache-control'),'no-store');
  assert.deepEqual(await response.json(),{error:'PIO proxy unavailable'});assert.equal(calls,0);
 } finally {server.closeAllConnections();await new Promise(r=>server.close(r));}
});

test('timeouts, redirects and upstream secrets produce bounded neutral errors',async t=>{
 const stalled=await fixture(t,{relayHandler(){},timeoutMs:100});
 assert.equal((await stalled.call()).status,504);
 const redirected=await fixture(t,{relayHandler(_req,res){res.writeHead(302,{location:'https://evil.example/secret','set-cookie':'sensitive=fixture'});res.end();}});
 const reply=await redirected.call();
 assert.equal(reply.status,502);assert.equal(reply.headers.get('location'),null);assert.equal(reply.headers.get('set-cookie'),null);
 assert.equal(reply.text,'{"error":"PIO proxy unavailable"}');
 const original=redirected.env.PIO_PROXY_KEY;
 redirected.env.PIO_PROXY_KEY='A'.repeat(43);
 assert.equal((await redirected.call()).status,502);
 redirected.env.PIO_PROXY_KEY='';
 const calls=redirected.calls;assert.equal((await redirected.call()).status,503);assert.equal(redirected.calls,calls);
 assert.ok(!reply.text.includes(original));
});

test('Vercel entry exports the same fail-closed handler without secrets in code',async()=>{
 const {default:handler}=await import('../api/pio/[...path].js');
 const server=createServer(handler);server.listen(0,'127.0.0.1');await once(server,'listening');
 try {assert.equal((await fetch(`http://127.0.0.1:${server.address().port}/api/pio/session/me`)).status,503);}
 finally {server.closeAllConnections();await new Promise(r=>server.close(r));}
});
