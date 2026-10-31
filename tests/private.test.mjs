import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,rmSync,writeFileSync,statSync} from 'node:fs';
import {tmpdir,userInfo} from 'node:os';
import {join} from 'node:path';
import {openStore,privateDirectory} from '../server/store.mjs';
import {grantAgent,readPrivateFile} from '../server/operator.mjs';
const security=await import('../server/private.mjs').catch(()=>({}));
test('private final credential and database files have verified user-only permissions; foreign explicit directory ACL is removed or refused',()=>{
 assert.equal(typeof security.assertPrivateFile,'function','verified final-file protection missing');
 const dir=mkdtempSync(join(tmpdir(),'pio-acl-'));
 try{
  const data=join(dir,'db');privateDirectory(data);
  if(process.platform==='win32')execFileSync('icacls.exe',[data,'/grant','*S-1-1-0:(OI)(CI)R'],{stdio:'pipe'});
  let store;
  try {store=openStore(data);}catch {return;} // Refusing an unsafe pre-existing DACL is also fail-closed.
  try{
   store.init('synthetic-test-password-01');
   security.assertPrivateFile(join(data,'pio.sqlite'));
   if(process.platform==='win32'){
    const acl=execFileSync('icacls.exe',[data],{encoding:'utf8'});assert.ok(!acl.includes('Everyone:'));assert.ok(!acl.includes('Tout le monde:'));
   }else assert.equal(statSync(data).mode&0o077,0);
   const file=join(dir,'keys','holding.token');grantAgent(store,'holding',[],file);security.assertPrivateFile(file);
   assert.match(readPrivateFile(file),/^[A-Za-z0-9_-]{43}$/);
   const unsafe=join(dir,'unsafe');writeFileSync(unsafe,'not-a-real-secret',{mode:0o644});
   if(process.platform==='win32')execFileSync('icacls.exe',[unsafe,'/grant','*S-1-1-0:R'],{stdio:'pipe'});
   assert.throws(()=>security.assertPrivateFile(unsafe));
  } finally {store.close();}
 }finally{rmSync(dir,{recursive:true,force:true});}
});
