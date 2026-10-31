import { validatePortfolio } from '../src/finance/model.ts';
import { digest } from './store.mjs';
import {canSee} from './scopes.mjs';
import { fail } from './http.mjs';

export function validPortfolio(raw) {
  try { return validatePortfolio(raw); } catch { fail(400,'Invalid portfolio: schema, references or history'); }
}
export function canonical(value) {
  if (Array.isArray(value)) return '['+value.map(canonical).join(',')+']';
  if (value && typeof value === 'object') return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
  return JSON.stringify(value);
}
export function revision(value) {
  if (!Number.isSafeInteger(value) || value<0) fail(400,'expectedRevision must be a nonnegative integer');
}
export function mutate(store, actor, route, body, operation) {
  const key=body.idempotencyKey;
  if (typeof key !== 'string' || !/^[A-Za-z0-9_-]{8,128}$/.test(key)) fail(400,'An idempotencyKey (8–128 safe characters) is required');
  const index=`${actor.id}:${key}`;
  const hash=digest(canonical({route,body}));
  return store.transaction(s=> {
    if (actor.role==='agent') {
      const fresh=s.agents[actor.id];
      if(!fresh || fresh.revoked || fresh.hash!==actor.hash)fail(401,'Credential revoked or rotated');
      actor.companyIds=[...fresh.companyIds];
      if(route!=='propose' || !canSee(actor,body.task?.companyId))fail(403,'Company not assigned or action forbidden');
    } else {
      const session=s.sessions[actor.session];
      if(!session || session.expires<=Date.now() || session.csrf!==actor.csrf)fail(401,'Session expired');
    }
    const prior=s.idempotency[index];
    if (prior) {
      if (prior.hash!==hash) fail(409,'Idempotency key reused with a different payload');
      return prior.result;
    }
    const result=operation(s);
    s.idempotency[index]={hash,result};
    return result;
  });
}
export function saveVersion(s, portfolio) {
  validPortfolio(portfolio);
  s.portfolio=portfolio;
  s.revision++;
  s.versions.push({revision:s.revision,at:new Date().toISOString(),portfolio:structuredClone(portfolio)});
  return {revision:s.revision,portfolio};
}
export function snapshot(store, actor, route, body, initialize) {
  revision(body.expectedRevision);
  if (initialize && (body.consent!==true || body.expectedRevision!==0)) fail(400,'Explicit consent and expectedRevision 0 required');
  validPortfolio(body.portfolio);
  return mutate(store,actor,route,body,s=> {
    if (s.revision!==body.expectedRevision || (initialize ? s.portfolio!==null : s.portfolio===null)) fail(409,'Revision conflict; nothing overwritten');
    return saveVersion(s,body.portfolio);
  });
}
