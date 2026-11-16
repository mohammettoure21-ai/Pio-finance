import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openStore,digest} from '../server/store.mjs';
import {initialPortfolio} from '../src/finance/model.ts';
const operator = await import('../server/operator.mjs').catch(()=>({}));
test('operator grants only five fixed identities to explicit existing company IDs, rotates and revokes independently',()=> {
  assert.equal(typeof operator.grantAgent,'function','operator provisioning missing');
  const dir=mkdtempSync(join(tmpdir(),'pio-op-')); const store=openStore(join(dir,'db'));
  try {
    store.init('synthetic-test-password-01');
    const p=initialPortfolio(); store.transaction(s=>{s.portfolio=p;s.revision=1;});
    const file=join(dir,'agent','mbtg.token');
    assert.throws(()=>operator.grantAgent(store,'sixth',[],file));
    assert.throws(()=>operator.grantAgent(store,'mbtg',['MBTG'],file));
    assert.equal(existsSync(file),false);
    operator.grantAgent(store,'mbtg',[p.companies[3].id],file);
    const token=readFileSync(file,'utf8').trim(); assert.match(token,/^[A-Za-z0-9_-]{43}$/);
    assert.equal(JSON.stringify(store.read()).includes(token),false);
    assert.equal(store.read().agents.mbtg.hash,digest(token));
    assert.throws(()=>operator.grantAgent(store,'mbtg',[],file));
    const next=join(dir,'agent','mbtg-rotated.token');
    operator.grantAgent(store,'mbtg',[p.companies[3].id],next);
    assert.notEqual(store.read().agents.mbtg.hash,digest(token));
    operator.revokeAgent(store,'mbtg'); assert.equal(store.read().agents.mbtg.revoked,true);
  } finally {store.close();rmSync(dir,{recursive:true,force:true});}
});
