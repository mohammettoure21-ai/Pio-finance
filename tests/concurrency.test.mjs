import {test} from 'node:test';
import assert from 'node:assert/strict';
import {request} from 'node:http';
import {agentFixture} from './bridge-fixture.mjs';
const task=companyId=>({companyId,title:'Synthetic mission',priority:'Normale',assignee:'',due:''});
test('concurrent different confirmations and stale snapshots cannot lose data; explicit owner rebase is required',async()=> {
 await agentFixture(async({req,portfolio,store})=> {
  const payload={task:task(portfolio.companies[3].id),expectedRevision:1,idempotencyKey:'concurrency-first'};
  const p=(await req('mbtg','/proposals','POST',payload)).data.proposal;
  const second=(await req('mbtg','/proposals','POST',{...payload,idempotencyKey:'concurrency-second'})).data.proposal;
  const results=await Promise.all([p,second].map((p,i)=>req('owner',`/proposals/${p.id}/confirm`,'POST',{expectedRevision:1,proposalRevision:1,idempotencyKey:'concurrency-confirm-'+i})));
  assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
  assert.equal(store.read().portfolio.tasks.length,2);
  const pending=(await req('owner','/proposals')).data.proposals.find(p=>p.status==='pending');
  assert.equal((await req('owner',`/proposals/${pending.id}/confirm`,'POST',{expectedRevision:2,proposalRevision:1,idempotencyKey:'stale-snapshot-attempt'})).status,409);
  const reviewed=await req('owner',`/proposals/${pending.id}`,'PATCH',{expectedRevision:2,proposalRevision:1,task:pending.task,idempotencyKey:'explicit-owner-rebase'});assert.equal(reviewed.status,200);
  assert.equal((await req('owner',`/proposals/${pending.id}/confirm`,'POST',{expectedRevision:2,proposalRevision:2,idempotencyKey:'rebased-confirm-attempt'})).status,200);
  assert.equal(store.read().portfolio.tasks.length,3);
 });
});
test('conciergerie routing is server-owned: normal via immobilier, urgent directly holding',async()=> {
 await agentFixture(async({req,portfolio})=> {
  const payload={task:task(portfolio.companies[1].id),expectedRevision:1,idempotencyKey:'routing-normal-test',reportsTo:'mbtg'};
  const normal=await req('conciergerie','/proposals','POST',payload);assert.equal(normal.data.proposal.reportsTo,'immobilier');
  const urgent=await req('conciergerie','/proposals','POST',{...payload,urgent:true,idempotencyKey:'routing-urgent-test'});assert.equal(urgent.data.proposal.reportsTo,'holding');
  assert.equal((await req('immobilier','/proposals')).data.proposals.length,2);
  assert.equal((await req('mbtg','/proposals')).data.proposals.length,0);
 });
});
test('HTTP bounds, strict Host, missing origin, CORS and malformed bodies fail closed',async()=> {
 await agentFixture(async({req,base})=> {
  const badHost=await new Promise((resolve,reject)=>{const r=request(base+'/portfolio',{headers:{host:'evil.invalid','x-forwarded-host':'127.0.0.1'}},res=>{res.resume();resolve(res.statusCode);});r.on('error',reject);r.end();});
  assert.equal(badHost,403);
  assert.equal((await req('owner','/portfolio','PUT',{}, {origin:''})).status,403);
  assert.equal((await req('owner','/portfolio','GET',undefined,{origin:'https://evil.invalid'})).status,403);
  const r=await fetch(base+'/portfolio',{method:'OPTIONS',headers:{origin:'https://evil.invalid'}});assert.equal(r.status,403);assert.equal(r.headers.get('access-control-allow-origin'),null);
  const large=await req('owner','/portfolio','PUT',{text:'x'.repeat(2*1024*1024)});assert.equal(large.status,413);
  const malformed=await fetch(base+'/session/login',{method:'POST',headers:{origin:'http://127.0.0.1:5173','content-type':'application/json'},body:'{'});assert.equal(malformed.status,400);
  assert.equal((await req('owner','/portfolio?token=forbidden')).status,404);
 });
});
