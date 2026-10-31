import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialPortfolio} from '../src/finance/model.ts';
const m=await import('../src/finance/secure.ts').catch(()=>({}));
test('secure client does not contact server at construction and consent is required before sending local data',async()=> {
 assert.equal(typeof m.createSecureClient,'function','voluntary secure client missing');
 const calls=[]; const fetcher=async(path,options)=> {calls.push({path,options});return {ok:true,status:200,json:async()=>({csrf:'synthetic-csrf',role:'owner',revision:1})};};
 const client=m.createSecureClient(fetcher); assert.equal(calls.length,0);
 const p=initialPortfolio();
 await assert.rejects(client.initialize(p,false,0),/consentement/);assert.equal(calls.length,0);
 await assert.rejects(client.push(p,false,1),/consentement/);assert.equal(calls.length,0);
 await client.login('synthetic-password'); assert.equal(calls.length,1);
 assert.equal(calls[0].options.credentials,'same-origin');
 await client.initialize(p,true,0);assert.equal(calls.length,2);
 assert.equal(calls[1].options.headers['x-pio-csrf'],'synthetic-csrf');
 assert.equal(calls[1].options.headers.authorization,undefined);
 const body=JSON.parse(calls[1].options.body);assert.deepEqual(body.portfolio,p);assert.equal(body.expectedRevision,0);assert.equal(body.consent,true);
 await client.logout();
});
test('server adoption validates and backs up local data before replacement, and never replaces when backup fails',()=> {
 assert.equal(typeof m.replaceWithBackup,'function','safe replacement missing');
 const local=initialPortfolio(), remote=initialPortfolio(), order=[];
 m.replaceWithBackup(local,remote,s=>{order.push('backup');assert.deepEqual(JSON.parse(s),local);},p=>{order.push('apply');assert.deepEqual(p,remote);});
 assert.deepEqual(order,['backup','apply']);
 assert.throws(()=>m.replaceWithBackup(local,remote,()=>{throw new Error('quota');},()=>assert.fail('must not apply')),/quota/);
 assert.throws(()=>m.replaceWithBackup(local,{version:1},()=>assert.fail('invalid backup'),()=>assert.fail('invalid apply')));
 assert.equal(m.sameSnapshot(local,structuredClone(local)),true);assert.equal(m.sameSnapshot(local,remote),false);
});
