import { randomUUID } from 'node:crypto';
import { fail } from './http.mjs';
import { canSee } from './scopes.mjs';
import { canonical, mutate, revision, saveVersion, validPortfolio } from './operations.mjs';
import { digest } from './store.mjs';
const snapshotHash=s=>digest(canonical(s.portfolio));
function validTask(task,portfolio) {
  if (!task || typeof task !== 'object' || Object.keys(task).some(k=>!['companyId','title','priority','assignee','due'].includes(k)) ||
    !['companyId','title','priority','assignee','due'].every(k=>typeof task[k]==='string') ||
    !task.title.trim() || task.title.length>1000 || task.assignee.length>200 || !portfolio?.companies.some(c=>c.id===task.companyId) ||
    !['Basse','Normale','Haute'].includes(task.priority) || (task.due && (!/^\d{4}-\d{2}-\d{2}$/.test(task.due) || !Number.isFinite(Date.parse(task.due)) || new Date(task.due).toISOString().slice(0,10)!==task.due))) fail(400,'Invalid mission');
  validPortfolio({...portfolio,tasks:[...portfolio.tasks,{...task,id:randomUUID(),done:false}]});
  return structuredClone(task);
}
export function createProposal(store,actor,body) {
  if (actor.role!=='agent') fail(403,'Agent required to propose; human reviews and confirms');
  if (!canSee(actor,body.task?.companyId)) fail(403,'Company not assigned');
  revision(body.expectedRevision);
  if (body.urgent!==undefined && typeof body.urgent!=='boolean') fail(400,'urgent must be boolean');
  return mutate(store,actor,'propose',body,s=> {
    if (body.expectedRevision!==s.revision || !s.portfolio) fail(409,'Revision conflict');
    if (s.proposals.length>=5000) fail(409,'Proposal capacity reached; operator maintenance required');
    const task=validTask(body.task,s.portfolio);
    const p={id:randomUUID(),author:actor.id,task,status:'pending',proposalRevision:1,baseRevision:s.revision,snapshotHash:snapshotHash(s),createdAt:new Date().toISOString(),urgent:body.urgent===true,reportsTo:actor.id==='conciergerie' && body.urgent!==true?'immobilier':'holding'};
    s.proposals.push(p); return {proposal:structuredClone(p)};
  });
}
export function reviewProposal(store,actor,id,action,body) {
  if (actor.role!=='owner') fail(403,'Owner required');
  revision(body.proposalRevision);
  if (action!=='reject') revision(body.expectedRevision);
  return mutate(store,actor,`proposal:${id}:${action}`,body,s=> {
    const p=s.proposals.find(p=>p.id===id);
    if (!p) fail(404,'Proposal not found');
    if (p.status!=='pending' || p.proposalRevision!==body.proposalRevision) fail(409,'Proposal changed or already resolved');
    if (action==='reject') {
      p.status='rejected';p.proposalRevision++;return {proposal:structuredClone(p)};
    }
    if (!s.portfolio || body.expectedRevision!==s.revision) fail(409,'Snapshot changed; review current data first');
    if (action==='edit') {
      if (body.task?.companyId!==p.task.companyId) fail(400,'companyId is immutable');
      p.task=validTask(body.task,s.portfolio); p.baseRevision=s.revision;p.snapshotHash=snapshotHash(s);p.proposalRevision++;
      return {proposal:structuredClone(p)};
    }
    if (p.baseRevision!==s.revision || p.snapshotHash!==snapshotHash(s)) fail(409,'Snapshot changed; explicitly review/rebase proposal');
    const task={...validTask(p.task,s.portfolio),id:randomUUID(),done:false};
    const updated={...s.portfolio,tasks:[...s.portfolio.tasks,task]};
    saveVersion(s,updated);
    p.status='confirmed';p.proposalRevision++;p.taskId=task.id;p.confirmedRevision=s.revision;
    return {proposal:structuredClone(p),task,revision:s.revision};
  });
}
