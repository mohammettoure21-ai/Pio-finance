// Local TLS proxy fixture: CA explicitly trusted, never rejectUnauthorized=false.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {once} from 'node:events';
import {createServer as tlsServer,request as tlsRequest} from 'node:https';
import {request as httpRequest} from 'node:http';
import {openStore} from '../server/store.mjs';
import {createBridge} from '../server/http.mjs';
test('verified fixture TLS reverse proxy preserves Vercel Origin, rewrites loopback Host and enforces Secure cookie/CSRF without CORS',{timeout:30000},async()=>{
 const root=mkdtempSync(join(tmpdir(),'pio-tls-fixture-'));const key=join(root,'fixture.key'),cert=join(root,'fixture.crt');
 const path=p=>process.platform==='win32'?p.replaceAll('\\','/').replace(/^([A-Za-z]):\//,(_,d)=>'/'+d.toLowerCase()+'/'):p;
 const r=spawnSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-keyout',path(key),'-out',path(cert),'-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1','-addext','basicConstraints=critical,CA:TRUE'],{encoding:'utf8',timeout:15000});
 assert.equal(r.status,0,r.error?.message||r.stderr);
 const origin='https://pio-finance.vercel.app',store=openStore(join(root,'db'));store.init('synthetic-test-password-01');
 const backend=createBridge({store,origin});let proxy;
 try {
  backend.listen(0,'127.0.0.1');await once(backend,'listening');const port=backend.address().port;
  proxy=tlsServer({key:readFileSync(key),cert:readFileSync(cert)},(req,res)=>{
   const upstream=httpRequest({host:'127.0.0.1',port,path:req.url,method:req.method,headers:{...req.headers,host:`127.0.0.1:${port}`}},incoming=>{res.writeHead(incoming.statusCode,incoming.headers);incoming.pipe(res);});
   upstream.on('error',()=>{res.writeHead(502);res.end();});req.pipe(upstream);
  });proxy.listen(0,'127.0.0.1');await once(proxy,'listening');
  async function request(path,method='GET',body,extra={}){return new Promise((resolve,reject)=>{const payload=body===undefined?undefined:JSON.stringify(body);const req=tlsRequest({host:'127.0.0.1',servername:'localhost',port:proxy.address().port,path:'/api/pio'+path,method,ca:readFileSync(cert),headers:{origin,...payload&&{'content-type':'application/json','content-length':Buffer.byteLength(payload)},...extra}},res=>{assert.equal(res.socket.authorized,true);let text='';res.on('data',b=>text+=b);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,value:JSON.parse(text)}));});req.on('error',reject);req.end(payload);});}
  const empty=await request('/session/me');assert.equal(empty.status,401);assert.equal(empty.headers['access-control-allow-origin'],undefined);
  assert.equal((await request('/session/login','POST',{password:'synthetic-test-password-01'},{origin:'https://2-29-156-0.sslip.io','x-forwarded-proto':'https'})).status,403);
  const login=await request('/session/login','POST',{password:'synthetic-test-password-01'});assert.equal(login.status,200);assert.match(login.headers['set-cookie'][0],/HttpOnly; SameSite=Strict; Secure;/);
  const cookie=login.headers['set-cookie'][0].split(';')[0];assert.equal((await request('/session/me','GET',undefined,{cookie})).value.role,'owner');
  assert.equal((await request('/session/logout','POST',{}, {cookie})).status,403);
  assert.equal((await request('/session/logout','POST',{}, {cookie,'x-pio-csrf':login.value.csrf,origin:'https://evil.example'})).status,403);
  assert.equal((await request('/session/logout','POST',{}, {cookie,'x-pio-csrf':login.value.csrf})).status,200);
  assert.equal((await request('/portfolio','GET',undefined,{cookie})).status,401);
  console.log('Verified local fixture TLS certificate; same-origin proxy contract, exact Origin, loopback Host, Secure session, CSRF and logout passed. Not a deployed Vercel/Caddy test.');
 } finally {
  for(const server of [proxy,backend])if(server?.listening){server.closeAllConnections();await new Promise(r=>server.close(r));}
  store.close();rmSync(root,{recursive:true,force:true});
 }
});
