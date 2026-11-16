import {test} from 'node:test';
import assert from 'node:assert/strict';
import {agentFixture} from './bridge-fixture.mjs';
import {revokeAgent} from '../server/operator.mjs';
test('Holding reads exact group without state mutation, cannot borrow owner rights, and revocation leaves portfolio unchanged',async()=>{
 await agentFixture(async({req,store})=>{
  const before=store.read();
  const result=await req('holding','/portfolio');assert.equal(result.status,200);assert.deepEqual(result.data.portfolio,before.portfolio);
  assert.equal((await req('holding','/proposals')).status,200);
  assert.equal((await req('holding','/session/me')).data.role,'agent');assert.deepEqual(store.read(),before,'reads do not mutate any state');
  for(const [route,method] of [['/portfolio','PUT'],['/portfolio/initialize','POST'],['/session/login','POST'],['/session/logout','POST'],['/agents','POST'],['/proposals/00000000-0000-0000-0000-000000000000/confirm','POST']])
   assert.equal((await req('holding',route,method,{})).status,403,route);
  assert.deepEqual(store.read(),before,'denied owner operations do not mutate state');
  revokeAgent(store,'holding');assert.equal((await req('holding','/portfolio')).status,401);assert.deepEqual(store.read().portfolio,before.portfolio);
 });
});
