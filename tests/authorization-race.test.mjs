import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createProposal} from '../server/proposals.mjs';
import {revokeAgent} from '../server/operator.mjs';
import {agentFixture} from './bridge-fixture.mjs';
test('authorization is revalidated inside the SQLite write transaction, including independent revocation and reassignment',async()=>{
 await agentFixture(async({store,portfolio})=>{
  const actor={role:'agent',id:'mbtg',...store.read().agents.mbtg};
  const body={task:{companyId:portfolio.companies[3].id,title:'Synthetic race',priority:'Normale',assignee:'',due:''},expectedRevision:1,idempotencyKey:'permission-race-test'};
  revokeAgent(store,'mbtg');
  assert.throws(()=>createProposal(store,actor,body),e=>e.status===401,'stale authorization must not permit mutation');
  store.transaction(s=>{s.agents.mbtg.revoked=false;s.agents.mbtg.companyIds=[];});
  assert.throws(()=>createProposal(store,actor,body),e=>e.status===403,'stale company assignment must not permit mutation');
  assert.equal(store.read().proposals.length,0);
 });
});
