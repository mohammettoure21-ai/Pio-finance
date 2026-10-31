import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {once} from 'node:events';
import {fileURLToPath} from 'node:url';
import {agentFixture} from './bridge-fixture.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
test('MCP stdio lists only read/propose tools and performs real scoped HTTP tools/call without leaking credentials', {timeout:30000},async()=>{
 await agentFixture(async({base,files,tokens,portfolio,store})=>{
  const child=spawn(process.execPath,['server/mcp.mjs'],{cwd:root,env:{PATH:process.env.PATH,SystemRoot:process.env.SystemRoot,PIO_API_URL:base,PIO_AGENT_TOKEN_FILE:files.mbtg},stdio:['pipe','pipe','pipe']});
  const pending=new Map();let logs='',stdout='';child.stderr.on('data',b=>logs+=b.toString());
  const lines=createInterface({input:child.stdout}); lines.on('line',line=>{stdout+=line+'\n';const value=JSON.parse(line);const callback=pending.get(value.id);if(callback){pending.delete(value.id);callback(value);}});
  child.on('exit',()=>{for(const callback of pending.values())callback({error:{message:'Connector exited'}});pending.clear();});
  let seq=0;
  async function rpc(method,params={}) {
   const id=++seq;
   const response=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(id);reject(new Error('MCP request timed out'));},8000);pending.set(id,value=>{clearTimeout(timer);resolve(value);});child.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n');});
   assert.equal(response.error,undefined,'MCP request should succeed: '+JSON.stringify(response.error));return response.result;
  }
  try {
   const init=await rpc('initialize',{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'synthetic-test',version:'1'}});assert.equal(init.protocolVersion,'2025-06-18');
   child.stdin.write(JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})+'\n');
   const list=await rpc('tools/list');assert.deepEqual(list.tools.map(t=>t.name),['pio_read_context','pio_propose_mission']);
   const context=await rpc('tools/call',{name:'pio_read_context',arguments:{}});assert.notEqual(context.isError,true);
   const data=JSON.parse(context.content[0].text);assert.equal(data.portfolio.companies.length,1);assert.equal(data.portfolio.companies[0].id,portfolio.companies[3].id);
   const task={companyId:portfolio.companies[3].id,title:'MCP synthetic mission',priority:'Normale',assignee:'',due:''};
   const proposed=await rpc('tools/call',{name:'pio_propose_mission',arguments:{task,expectedRevision:1,idempotencyKey:'mcp-real-proposal-test'}});assert.notEqual(proposed.isError,true);
   assert.equal(store.read().proposals.length,1);assert.equal(store.read().portfolio.tasks.length,1);
   const denied=await rpc('tools/call',{name:'pio_confirm',arguments:{}});assert.equal(denied.isError,true);
   const forbidden=await rpc('tools/call',{name:'pio_propose_mission',arguments:{task:{...task,companyId:portfolio.companies[0].id},expectedRevision:1,idempotencyKey:'mcp-scoping-denied'}});assert.equal(forbidden.isError,true);
   assert.ok(!(stdout+logs).includes(tokens.mbtg));assert.ok(!stdout.includes('OTHER-COMPANY-PRIVATE'));
  } finally {lines.close();child.stdin.end();if(child.exitCode===null){child.kill();await once(child,'exit');}}
 });
});
