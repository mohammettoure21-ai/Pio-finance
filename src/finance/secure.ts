import { validatePortfolio } from './model.ts';
import type { Portfolio, Task } from './model.ts';
export type RemoteSnapshot = {revision:number; portfolio:Portfolio|null};
export type ServerProposal = {
 id:string; author:string; task:Omit<Task,'id'|'done'>; status:'pending'|'confirmed'|'rejected';
 proposalRevision:number; baseRevision:number; reportsTo:string; urgent:boolean;
};
export class BridgeError extends Error {
 status:number;
 constructor(status:number,message:string) {super(message);this.status=status;}
}
function canonical(value:unknown):string {
 if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
 if(value && typeof value==='object')return '{'+Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>JSON.stringify(k)+':'+canonical(v)).join(',')+'}';
 return JSON.stringify(value);
}
export const sameSnapshot=(a:Portfolio,b:Portfolio)=>canonical(a)===canonical(b);
export function replaceWithBackup(local:Portfolio,remote:Portfolio,backup:(json:string)=>void,apply:(data:Portfolio)=>void) {
 validatePortfolio(remote);
 backup(JSON.stringify(local)); // If persistence fails, abort before touching the current source.
 apply(remote);
}
export function createSecureClient(transport:typeof fetch=fetch) {
 let csrf='';
 const keys=new Map<string,string>();
 async function request<T>(path:string,method='GET',body?:unknown):Promise<T> {
  const headers:Record<string,string>={};
  if(body!==undefined)headers['content-type']='application/json';
  if(csrf)headers['x-pio-csrf']=csrf;
  const response=await transport('/api/pio'+path,{method,credentials:'same-origin',headers,body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
  const value=await response.json();
  if(!response.ok)throw new BridgeError(response.status,response.status===409?'Conflit : rien n’a été écrasé. Relisez le serveur et examinez les différences.':response.status===401?'Connexion personnelle requise.':value.error||'Échec du serveur');
  return value as T;
 }
 function mutation<T>(path:string,method:string,body:Record<string,unknown>):Promise<T> {
  const fingerprint=method+path+canonical(body);
  if(!keys.has(fingerprint))keys.set(fingerprint,crypto.randomUUID());
  return request<T>(path,method,{...body,idempotencyKey:keys.get(fingerprint)});
 }
 return {
  async login(password:string) {const session=await request<{csrf:string;role:string}>('/session/login','POST',{password});csrf=session.csrf;return session;},
  async me(){const session=await request<{csrf:string;role:string}>('/session/me');csrf=session.csrf;return session;},
  async logout(){await request('/session/logout','POST',{});csrf='';},
  read:()=>request<RemoteSnapshot>('/portfolio'),
  proposals:()=>request<{proposals:ServerProposal[]}>('/proposals'),
  async initialize(portfolio:Portfolio,consent:boolean,expectedRevision:number) {
   if(!consent)throw new Error('Un consentement explicite est nécessaire.');
   if(expectedRevision!==0)throw new Error('Le serveur doit être vide.');
   validatePortfolio(portfolio);
   return mutation<RemoteSnapshot>('/portfolio/initialize','POST',{portfolio,consent:true,expectedRevision});
  },
  async push(portfolio:Portfolio,consent:boolean,expectedRevision:number) {
   if(!consent)throw new Error('Un consentement explicite est nécessaire.');
   validatePortfolio(portfolio);
   return mutation<RemoteSnapshot>('/portfolio','PUT',{portfolio,expectedRevision});
  },
  edit:(p:ServerProposal,snapshot:RemoteSnapshot,task:ServerProposal['task'])=>mutation<{proposal:ServerProposal}>('/proposals/'+p.id,'PATCH',{task,expectedRevision:snapshot.revision,proposalRevision:p.proposalRevision}),
  reject:(p:ServerProposal)=>mutation<{proposal:ServerProposal}>('/proposals/'+p.id+'/reject','POST',{proposalRevision:p.proposalRevision}),
  confirm:(p:ServerProposal,snapshot:RemoteSnapshot)=>mutation<{revision:number;task:Task}>('/proposals/'+p.id+'/confirm','POST',{expectedRevision:snapshot.revision,proposalRevision:p.proposalRevision}),
 };
}
