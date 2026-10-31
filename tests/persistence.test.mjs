import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
import {openStore} from '../server/store.mjs';
import {createBridge} from '../server/http.mjs';
import {grantAgent,revokeAgent} from '../server/operator.mjs';
import {initialPortfolio} from '../src/finance/model.ts';
test('HTTP snapshots, proposals, owner sessions, agent hashes, idempotency and version history survive a real SQLite reopen',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'pio-reopen-')),data=join(dir,'db');let store,server,base,cookie='',csrf='';
 async function start(){store=openStore(data);server=createBridge({store});server.listen(0,'127.0.0.1');await once(server,'listening');base=`http://127.0.0.1:${server.address().port}/api/pio`;}
 async function stop(){server.closeAllConnections();await new Promise(r=>server.close(r));store.close();}
 async function req(path,method='GET',body,token){const headers={origin:'http://127.0.0.1:5173',cookie,'x-pio-csrf':csrf,...token&&{authorization:'Bearer'+' '+token},...body&&{'content-type':'application/json'}};const r=await fetch(base+path,{method,headers,body:body?JSON.stringify(body):undefined});const value=await r.json();if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];if(value.csrf)csrf=value.csrf;return {status:r.status,value};}
 try{
  await start();store.init('synthetic-test-password-01');await req('/session/login','POST',{password:'synthetic-test-password-01'});
  const portfolio=initialPortfolio();portfolio.companies[3].notes='durable synthetic note';
  const init={consent:true,portfolio,expectedRevision:0,idempotencyKey:'persistent-initialization'};
  assert.equal((await req('/portfolio/initialize','POST',init)).status,200);
  const file=join(dir,'keys','mbtg.token');grantAgent(store,'mbtg',[portfolio.companies[3].id],file);const token=readFileSync(file,'utf8').trim();
  const payload={task:{companyId:portfolio.companies[3].id,title:'Persistent synthetic task',priority:'Normale',assignee:'',due:''},expectedRevision:1,idempotencyKey:'persistent-proposal'};
  const proposed=await req('/proposals','POST',payload,token);assert.equal(proposed.status,200);
  const p=proposed.value.proposal,confirmation={expectedRevision:1,proposalRevision:1,idempotencyKey:'persistent-confirmation'};
  assert.equal((await req(`/proposals/${p.id}/confirm`,'POST',confirmation,token)).status,403,'bearer cannot borrow human cookie rights');
  const result=await req(`/proposals/${p.id}/confirm`,'POST',confirmation);assert.equal(result.status,200);
  await stop();await start();
  assert.equal((await req('/session/me')).value.role,'owner');
  assert.deepEqual((await req(`/proposals/${p.id}/confirm`,'POST',confirmation)).value,result.value);
  assert.equal((await req('/portfolio')).value.portfolio.tasks.length,1);
  assert.equal((await req('/portfolio','GET',undefined,token)).value.portfolio.companies.length,1);
  assert.equal(store.read().versions.length,2);assert.equal(store.read().versions[0].portfolio.companies[3].notes,'durable synthetic note');
  revokeAgent(store,'mbtg');await stop();await start();
  assert.equal((await req('/portfolio','GET',undefined,token)).status,401);
  assert.equal((await req('/portfolio')).value.revision,2);
 } finally {if(server?.listening)await stop();rmSync(dir,{recursive:true,force:true});}
});
