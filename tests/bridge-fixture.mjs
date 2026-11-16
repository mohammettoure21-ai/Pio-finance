// Synthetic fixtures only. Never reads the browser's localStorage.
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
import {openStore} from '../server/store.mjs';
import {grantAgent,revokeAgent} from '../server/operator.mjs';
import {createBridge} from '../server/http.mjs';
import {initialPortfolio} from '../src/finance/model.ts';

export async function agentFixture(run) {
  const dir=mkdtempSync(join(tmpdir(),'pio-agent-')); const store=openStore(join(dir,'db'));
  store.init('synthetic-test-password-01');
  const portfolio=initialPortfolio(); portfolio.vision='GROUP-PRIVATE';
  portfolio.companies[3].parentId=portfolio.companies[0].id;
  portfolio.companies[0].notes='OTHER-COMPANY-PRIVATE';
  portfolio.companies[3].unknownCrossCompany='OTHER-COMPANY-PRIVATE';
  portfolio.world={startedAt:'2026-10-01T00:00:00.000Z',events:[{id:'scope-event',at:'2026-10-20T00:00:00.000Z',companyId:portfolio.companies[3].id,kind:'report',taskId:'SECRET-TASK',recipient:portfolio.companies[0].id}],reports:[{week:'2026-10-19',end:'2026-10-25',generatedAt:'2026-10-26T00:00:00.000Z',partial:false,companies:[{id:portfolio.companies[0].id,name:'OTHER-COMPANY-PRIVATE',completed:0,created:0,activity:0,open:0,late:0}]}]};
  portfolio.tasks=[{id:'secret-task',title:'SECRET-TASK',companyId:portfolio.companies[0].id,priority:'Normale',due:'',assignee:'',done:false}];
  store.transaction(s=>{s.portfolio=portfolio;s.revision=1;s.versions.push({revision:1,portfolio});});
  const tokens={},files={};
  for (const [id,ids] of [['holding',[]],['mbtg',[portfolio.companies[3].id]],['immobilier',[portfolio.companies[0].id,portfolio.companies[1].id]],['conciergerie',[portfolio.companies[1].id]],['afrodemy',[]]]) {
    files[id]=join(dir,'keys',id+'.token'); grantAgent(store,id,ids,files[id]); tokens[id]=readFileSync(files[id],'utf8').trim();
  }
  const server=createBridge({store}); server.listen(0,'127.0.0.1'); await once(server,'listening');
  const base=`http://127.0.0.1:${server.address().port}/api/pio`;
  let cookie='',csrf='';
  async function req(actor,path,method='GET',body,extra={}) {
    const headers=actor==='owner' ? {origin:'http://127.0.0.1:5173',cookie,'x-pio-csrf':csrf} : {authorization: 'Bearer' + ' ' + (tokens[actor]||actor)};
    if(body!==undefined)headers['content-type']='application/json';
    Object.assign(headers,extra);
    const r=await fetch(base+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
    const data=await r.json();
    if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0]; if(data.csrf)csrf=data.csrf;
    return {status:r.status,data};
  }
  try { await req('owner','/session/login','POST',{password:'synthetic-test-password-01'}); await run({store,portfolio,req,base,files,tokens,dir}); }
  finally {server.closeAllConnections();await new Promise(r=>server.close(r));store.close();rmSync(dir,{recursive:true,force:true});}
}
