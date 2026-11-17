import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';

test('Vercel explicitly routes nested PIO endpoints to a root native function without loosening CSP',async()=>{
 const config=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
 assert.deepEqual(config.rewrites,[{source:'/api/pio/:path*',destination:'/api/pio-proxy?__pio_path=:path*'}]);
 assert.ok(existsSync(new URL('../api/pio-proxy.js',import.meta.url)));
 const {default:handler}=await import('../api/pio-proxy.js');
 assert.equal(typeof handler,'function');
 const csp=config.headers.flatMap(h=>h.headers).find(h=>h.key==='Content-Security-Policy').value;
 assert.match(csp,/connect-src 'self';/);
 assert.equal(config.git.deploymentEnabled['feat/hermes-holding-bridge'],false);
});

test('route adapter accepts only identical platform captures and rejects duplicates, extras, arrays and mismatches',async()=>{
 const {createRoutedProxy}=await import('../api/pio-proxy.js');
 const {EventEmitter}=await import('node:events');
 const env={PIO_BACKEND_ORIGIN:'https://2-29-156-0.sslip.io',PIO_PROXY_KEY:'A'.repeat(43)};
 async function exercise(url,query,method='GET'){
  let calls=0;
  const route=createRoutedProxy({env,request(){calls++;throw Error('fixture: no network');}});
  const res=new EventEmitter();res.setHeader=()=>{};res.removeHeader=()=>{};res.end=()=>{res.writableEnded=true;};
  await route({url,query,method,headers:{},body:Buffer.alloc(0)},res);
  return {status:res.statusCode,calls};
 }
 for(const [url,query,method] of [
  ['/api/pio-proxy?__pio_path=session/me&path=session/me'],
  ['/api/pio/session/me?__pio_path=session/me&path=session/me'],
  ['/api/pio-proxy',{__pio_path:'session/me',path:'session/me'}],
  ['/api/pio-proxy',{__pio_path:'session/me'}],
  ['/api/pio/session/me',{__pio_path:'session/me',path:'session/me'}],
  ['/api/pio-proxy?__pio_path=portfolio&path=portfolio',undefined,'PUT'],
  ['/api/pio-proxy?__pio_path=proposals/11111111-1111-1111-1111-111111111111',undefined,'PATCH'],
 ])assert.deepEqual(await exercise(url,query,method),{status:502,calls:1});
 for(const [url,query,method] of [
  ['/api/pio-proxy?__pio_path=session/me&path=portfolio'],
  ['/api/pio-proxy?__pio_path=session/me&__pio_path=session/me'],
  ['/api/pio-proxy?__pio_path=session/me&path=session/me&path=session/me'],
  ['/api/pio-proxy?__pio_path=session/me&extra=x'],
  ['/api/pio/portfolio?__pio_path=session/me&path=session/me'],
  ['/api/pio-proxy',{__pio_path:['session/me']}],
  ['/api/pio-proxy',{__pio_path:'session/me',extra:'x'}],
  ['/api/pio/session/me',{__pio_path:'session/me',path:['portfolio']}],
  ['/api/pio/session/me',{__pio_path:['session/me']}],
  ['/api/pio/session/me',{__pio_path:'session/me',extra:'x'}],
  ['/api/pio/session/me',{path:'session/me'}],
  ['/api/pio-proxy?__pio_path=session/me',undefined,'DELETE'],
 ])assert.deepEqual(await exercise(url,query,method),{status:404,calls:0});
});
