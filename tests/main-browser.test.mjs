import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {existsSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
test('main/AZQAR real-browser regression suite',{timeout:300000},async t=>{
 const bundled=chromium.executablePath();
 const env={...process.env,NO_COLOR:'1',PLAYWRIGHT_CHROMIUM_EXECUTABLE:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||(existsSync(bundled)?bundled:'C:/Program Files/Google/Chrome/Application/chrome.exe')};
 const vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5173','--strictPort'],{env,stdio:['ignore','pipe','pipe']});let output='';vite.stdout.on('data',b=>output+=b);vite.stderr.on('data',b=>output+=b);
 try {
  for(let i=0;i<100&&!output.includes('http://127.0.0.1:5173');i++){assert.equal(vite.exitCode,null,output);await wait(100);}
  assert.ok(output.includes('http://127.0.0.1:5173'),output);
  for(const file of ['connection-browser.mjs','azqar-browser.mjs','browser-smoke.cjs','world-browser.cjs'])await t.test(file,{timeout:160000},async()=>{
   const result=await new Promise((resolve,reject)=>{const child=spawn(process.execPath,['tests/'+file],{env,stdio:['ignore','pipe','pipe']});let stdout='',stderr='';child.stdout.on('data',b=>stdout+=b);child.stderr.on('data',b=>stderr+=b);const timer=setTimeout(()=>child.kill(),150000);child.once('error',reject);child.once('exit',(code,signal)=>{clearTimeout(timer);resolve({code,signal,stdout,stderr});});});
   writeFileSync('verification/'+file+'.stdout.log',result.stdout);writeFileSync('verification/'+file+'.stderr.log',result.stderr);
   assert.equal(result.code,0,JSON.stringify(result));console.log(result.stdout.trim());
  });
 }finally{vite.kill();if(vite.exitCode===null)await new Promise(r=>vite.once('exit',r));}
});
