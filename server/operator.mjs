import { writeFileSync, readFileSync, lstatSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { protectPrivate, assertPrivateFile } from './private.mjs';
import { identities, privateDirectory, secret, digest } from './store.mjs';

export function readPrivateFile(path, max=1024) {
  assertPrivateFile(path);
  const stat=lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size>max) throw new Error('Private regular file required');
  if (process.platform !== 'win32' && (stat.mode & 0o077)) throw new Error('Private file must be mode 0600');
  return readFileSync(path,'utf8').trim();
}
export function grantAgent(store, id, companyIds, tokenFile) {
  if (!Object.hasOwn(identities,id)) throw new Error('Unknown identity');
  const state=store.read();
  if (!state.password) throw new Error('Initialize owner first');
  if (!Array.isArray(companyIds) || companyIds.some(c=>typeof c!=='string' || !state.portfolio?.companies.some(x=>x.id===c))) throw new Error('Explicit existing company IDs required');
  tokenFile=resolve(tokenFile);
  privateDirectory(dirname(tokenFile));
  const token=secret();
  // Fail closed on an existing file; the operator must choose a new path for rotation.
  writeFileSync(tokenFile,token+'\n',{flag:'wx',mode:0o600});
  protectPrivate(tokenFile);
  store.transaction(s=> {s.agents[id]={hash:digest(token),companyIds:[...new Set(companyIds)],revoked:false};});
}
export function revokeAgent(store,id) {
  if (!Object.hasOwn(identities,id)) throw new Error('Unknown identity');
  store.transaction(s=> {if (s.agents[id]) s.agents[id].revoked=true;});
}
