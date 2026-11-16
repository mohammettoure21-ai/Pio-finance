import { blankCompany, blankFinancialRecord } from '../src/finance/model.ts';
export const canSee = (actor,companyId) => actor.role==='owner' || actor.id==='holding' || actor.companyIds.includes(companyId);
const pick=(object,keys)=>Object.fromEntries(keys.filter(k=>Object.hasOwn(object,k)).map(k=>[k,object[k]]));
export function scopedPortfolio(portfolio,actor) {
  if (!portfolio || actor.role==='owner' || actor.id==='holding') return portfolio;
  const ids=new Set(portfolio.companies.filter(c=>canSee(actor,c.id)).map(c=>c.id));
  return {
    version:portfolio.version,
    companies:portfolio.companies.filter(c=>ids.has(c.id)).map(c=> {
      const safe=pick(c,Object.keys(blankCompany()));
      safe.parentId=ids.has(c.parentId)?c.parentId:'';
      safe.targetParentId=ids.has(c.targetParentId)?c.targetParentId:'';
      safe.rules=pick(c.rules,Object.keys(blankCompany().rules));
      for(const key of ['assets','debts','milestones'])safe[key]=c[key].map(i=>pick(i,['id','label','amount','kind']));
      if(c.financialRecords)safe.financialRecords=c.financialRecords.map(r=>pick(r,Object.keys(blankFinancialRecord())));
      return safe;
    }),
    tasks:portfolio.tasks.filter(t=>ids.has(t.companyId)).map(t=>pick(t,['id','title','companyId','priority','assignee','due','done'])),
    relationships:(portfolio.relationships||[]).filter(r=>ids.has(r.from)&&ids.has(r.to)).map(r=>pick(r,['from','to','kind'])),
    // Group vision, holding metadata, weekly reports and events may reference other companies.
    // They are deliberately not exported to business agents, even when an event's companyId matches.
  };
}
