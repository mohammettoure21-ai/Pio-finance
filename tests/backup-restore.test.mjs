// Disposable GPG home and synthetic SQLite only. Never reads a user's keyring.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {once} from 'node:events';
import {openStore} from '../server/store.mjs';
import {createBridge} from '../server/http.mjs';
import {grantAgent} from '../server/operator.mjs';
import {initialPortfolio} from '../src/finance/model.ts';
import {applyAzqarProfile} from '../src/finance/azqar.ts';
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
test('closed SQLite archive: fixture GPG encryption, independent restore, integrity, exact AZQAR state, invalidated sessions and revoked keys',{timeout:180000},async()=>{
 const root=mkdtempSync(join(tmpdir(),'pio-backup-fixture-'));
 const home=join(root,'gnupg'),source=join(root,'db'),target=join(root,'restored');
 mkdirSync(home,{mode:0o700});mkdirSync(target);
 const toolPath=p=>process.platform==='win32' ? p.replaceAll('\\','/').replace(/^([A-Za-z]):\//,(_,drive)=>'/'+drive.toLowerCase()+'/') : p;
 const env={...process.env,GNUPGHOME:toolPath(home)};
 function run(command,args){const toolArgs=['gpg','tar'].includes(command)?args.map(toolPath):args;const r=spawnSync(command,toolArgs,{env,encoding:'utf8',timeout:90000});assert.equal(r.status,0,`${command} failed: ${r.error?.message||r.stderr}`);return r.stdout;}
 const gpg=args=>run('gpg',['--homedir',home,'--batch','--yes','--pinentry-mode','loopback',...args]);
 let store,server,base,cookie='',csrf='';
 async function start(path){store=openStore(path);server=createBridge({store});server.listen(0,'127.0.0.1');await once(server,'listening');base=`http://127.0.0.1:${server.address().port}/api/pio`;}
 async function stop(){server.closeAllConnections();await new Promise(r=>server.close(r));store.close();store=null;}
 async function request(path,method='GET',body,token){const r=await fetch(base+path,{method,headers:{origin:'http://127.0.0.1:5173',cookie,'x-pio-csrf':csrf,...token&&{authorization:'Bearer '+token},...body&&{'content-type':'application/json'}},body:body?JSON.stringify(body):undefined});const value=await r.json();if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];if(value.csrf)csrf=value.csrf;return {status:r.status,value};}
 try {
  await start(source);store.init('synthetic-test-password-01');
  await request('/session/login','POST',{password:'synthetic-test-password-01'});
  const portfolio=applyAzqarProfile(initialPortfolio());portfolio.companies[0].notes='SYNTHETIC backup roundtrip';
  assert.equal((await request('/portfolio/initialize','POST',{portfolio,consent:true,expectedRevision:0,idempotencyKey:'synthetic-backup-init'})).status,200);
  const tokenFile=join(root,'keys','holding.token');grantAgent(store,'holding',[],tokenFile);const token=readFileSync(tokenFile,'utf8').trim();
  const before=store.read();const oldCookie=cookie,oldCsrf=csrf;
  await stop(); // SQLite closed before archiving: never copy a running database.
  const originalDbHash=hash(join(source,'pio.sqlite'));
  const archive=join(root,'closed-state.tar'),cipher=archive+'.gpg',plain=join(root,'decrypted.tar');
  run('tar',['--force-local','-cf',archive,'-C',root,'db']);const checksum=hash(archive);
  gpg(['--passphrase','','--quick-generate-key','PIO Synthetic Fixture <pio-fixture@invalid.example>','default','default','1d']);
  const listing=gpg(['--with-colons','--list-keys']);const fingerprint=listing.split('\n').find(l=>l.startsWith('fpr:'))?.split(':')[9];assert.ok(fingerprint);
  gpg(['--trust-model','always','--recipient',fingerprint,'--output',cipher,'--encrypt',archive]);
  assert.notEqual(hash(cipher),checksum);
  gpg(['--passphrase','','--output',plain,'--decrypt',cipher]);assert.equal(hash(plain),checksum);
  run('tar',['--force-local','-xf',plain,'-C',target]);
  const restored=join(target,'db');assert.equal(hash(join(restored,'pio.sqlite')),originalDbHash);
  const db=new DatabaseSync(join(restored,'pio.sqlite'));assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');db.close();
  await start(restored);assert.deepEqual(store.read(),before);
  assert.deepEqual((await request('/portfolio')).value,{revision:1,portfolio});
  assert.equal((await request('/portfolio','GET',undefined,token)).status,200);
  await stop();
  run(process.execPath,['server/cli.mjs','invalidate-sessions','--data-dir',restored]);
  run(process.execPath,['server/cli.mjs','revoke','--data-dir',restored,'--agent','holding']);
  await start(restored);cookie=oldCookie;csrf=oldCsrf;
  assert.equal((await request('/portfolio')).status,401,'restored human session invalidated');
  assert.equal((await request('/portfolio','GET',undefined,token)).status,401,'restored agent key revoked');
  assert.equal((await request('/session/login','POST',{password:'synthetic-test-password-01'})).status,200);
  assert.deepEqual((await request('/portfolio')).value,{revision:1,portfolio});
  assert.deepEqual(store.read().versions,before.versions);
  console.log('Synthetic stopped-state archive checksum verified; fixture-only GPG; SQLite integrity_check=ok; exact AZQAR portfolio/revision/history; restored session and agent denied.');
 } finally {
  if(store)await stop();
  spawnSync('gpgconf',['--homedir',toolPath(home),'--kill','gpg-agent'],{env,timeout:15000,windowsHide:true});
  rmSync(root,{recursive:true,force:true});
 }
});
