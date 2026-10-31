import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync,renameSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,join} from 'node:path';
import {tmpdir} from 'node:os';

const root=fileURLToPath(new URL('../',import.meta.url));
const out=join(root,'verification');
mkdirSync(out,{recursive:true});
const scratch=resolve(process.env.PIO_TEST_TMPDIR||process.env.TMPDIR||tmpdir());
mkdirSync(scratch,{recursive:true});
const env={...process.env,TMPDIR:scratch,TMP:scratch,TEMP:scratch,NO_COLOR:'1'};
const tests=['portfolio','world','suggestions','bridge','authorization-race','agents','operator','proposals','concurrency','secure-client','private','cli','mcp','persistence'].map(name=>`tests/${name}.test.mjs`);
const steps=[
 {name:'unit-http-mcp',args:['--test','--test-reporter=tap',...tests],tests:true},
 {name:'secure-browser',args:['--test','--test-reporter=tap','tests/secure-browser.test.mjs'],tests:true},
 {name:'typescript',args:['node_modules/typescript/bin/tsc','-b']},
 {name:'vite-build',args:['node_modules/vite/bin/vite.js','build']},
];
const report={startedAt:new Date().toISOString(),node:process.version,steps:[],status:'running'};
function save(){const file=join(out,'results.json');writeFileSync(file+'.tmp',JSON.stringify(report,null,2)+'\n');renameSync(file+'.tmp',file);}
let failed=false;
for(const step of steps){
 console.log(`Verifying ${step.name}...`);
 const started=Date.now();
 const r=spawnSync(process.execPath,step.args,{cwd:root,env,encoding:'utf8',timeout:360000,maxBuffer:12*1024*1024,windowsHide:true});
 const stdout=r.stdout||'',stderr=r.stderr||'';
 writeFileSync(join(out,step.name+'.stdout.log'),stdout);
 writeFileSync(join(out,step.name+'.stderr.log'),stderr);
 const record={name:step.name,command:[process.execPath,...step.args],exitCode:r.status,signal:r.signal,durationMs:Date.now()-started};
 if(step.tests){
  record.counts={};
  for(const label of ['tests','pass','fail','cancelled','skipped','todo']){
   const matches=[...stdout.matchAll(new RegExp(`^# ${label} (\\d+)\\s*$`,'gm'))];
   if(matches.length)record.counts[label]=Number(matches.at(-1)[1]);
  }
  if(!Number.isInteger(record.counts.tests)||record.counts.tests<1||record.counts.pass!==record.counts.tests||record.counts.fail!==0||record.counts.cancelled!==0||record.counts.skipped!==0){record.invalidTestSummary=true;failed=true;}
 }
 if(r.status!==0||r.error){failed=true;if(r.error)record.error=r.error.message;}
 report.steps.push(record);save();
 console.log(JSON.stringify(record));
 if(failed)break;
}
report.finishedAt=new Date().toISOString();
report.status=failed?'failed':'passed';
report.testTotals=report.steps.filter(s=>s.counts).reduce((a,s)=>{for(const key of Object.keys(a))a[key]+=s.counts[key]||0;return a;},{tests:0,pass:0,fail:0,cancelled:0,skipped:0});
report.productionDeployed=false;
report.personalDataUsed=false;
save();
console.log(`Verification ${report.status}: ${JSON.stringify(report.testTotals)}. Evidence: verification/results.json`);
process.exitCode=failed?1:0;
