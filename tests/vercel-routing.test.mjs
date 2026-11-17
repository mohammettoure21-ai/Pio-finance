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
