import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,rmSync,readFileSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {openStore} from '../server/store.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
test('operator CLI bootstraps a private generated password file without printing credentials or enabling HTTP administration',()=> {
 const dir=mkdtempSync(join(tmpdir(),'pio-cli-'));
 try {
  const data=join(dir,'db'),passwordFile=join(dir,'owner','bootstrap.password');
  const invoke=(...args)=>spawnSync(process.execPath,['server/cli.mjs',...args],{cwd:root,encoding:'utf8',env:{...process.env}});
  const result=invoke('init','--data-dir',data,'--password-file',passwordFile);
  assert.equal(result.status,0,'CLI init missing or failed');assert.equal(existsSync(passwordFile),true);
  const password=readFileSync(passwordFile,'utf8').trim();assert.ok(password.length>=32);assert.ok(!(result.stdout+result.stderr).includes(password));
  const store=openStore(data);assert.equal(store.verifyPassword(password),true);assert.equal(store.read().revision,0);store.close();
  assert.notEqual(invoke('init','--data-dir',data,'--password-file',passwordFile).status,0);
  const token=join(dir,'keys','holding.token');
  const granted=invoke('grant','--data-dir',data,'--agent','holding','--token-file',token);assert.equal(granted.status,0);assert.equal(existsSync(token),true);
  assert.ok(!(granted.stdout+granted.stderr).includes(readFileSync(token,'utf8').trim()));
  assert.equal(invoke('revoke','--data-dir',data,'--agent','holding').status,0);
  assert.notEqual(invoke('serve','--data-dir',data,'--host','0.0.0.0').status,0);
  assert.notEqual(invoke('init','--data-dir',join(root,'private-test-denied'),'--password-file',join(dir,'never-created')).status,0);
  assert.equal(existsSync(join(root,'private-test-denied')),false);
 } finally {rmSync(dir,{recursive:true,force:true});}
});
