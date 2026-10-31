// Synthetic fixtures only. Never reads the browser's localStorage.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
import {openStore} from '../server/store.mjs';
import {grantAgent,revokeAgent} from '../server/operator.mjs';
import {createBridge} from '../server/http.mjs';
import {initialPortfolio} from '../src/finance/model.ts';

import {agentFixture} from './bridge-fixture.mjs';
test('agents see explicit IDs only, no group context, cross-company relations/history or name-based assignments',async()=> {
  await agentFixture(async({req,portfolio,store})=> {
    const r=await req('mbtg','/portfolio'); assert.equal(r.status,200);
    assert.deepEqual(r.data.portfolio.companies.map(c=>c.id),[portfolio.companies[3].id]);
    const text=JSON.stringify(r.data); assert.ok(!text.includes('OTHER-COMPANY-PRIVATE')); assert.ok(!text.includes('SECRET-TASK')); assert.ok(!text.includes('GROUP-PRIVATE'));
    assert.equal(r.data.portfolio.companies[0].parentId,''); assert.equal(r.data.portfolio.companies[0].targetParentId,'');
    assert.deepEqual(r.data.portfolio.relationships,[]); assert.equal(r.data.portfolio.world,undefined);
    assert.equal((await req('holding','/portfolio')).data.portfolio.companies.length,4);
    assert.equal((await req('afrodemy','/portfolio')).data.portfolio.companies.length,0);
    store.transaction(s=>{s.portfolio.companies[0].name='MBTG';});
    assert.equal((await req('mbtg','/portfolio')).data.portfolio.companies.length,1);
    for(const route of ['/portfolio','/portfolio/initialize','/agents','/session/logout','/proposals/absent/confirm']) assert.equal((await req('mbtg',route,route==='/portfolio'?'PUT':'POST',{})).status,403);
    assert.equal((await req('not-a-token','/portfolio')).status,401);
    revokeAgent(store,'mbtg'); assert.equal((await req('mbtg','/portfolio')).status,401);
    assert.equal((await req('holding','/portfolio')).status,200);
  });
});
