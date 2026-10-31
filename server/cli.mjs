import { existsSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { openStore, privateDirectory, secret, identities } from './store.mjs';
import { grantAgent, revokeAgent, readPrivateFile } from './operator.mjs';
import { createBridge } from './http.mjs';
import {protectPrivate} from './private.mjs';
const repo=realpathSync(fileURLToPath(new URL('../',import.meta.url)));
function outsideRepo(input) {
  if (!input || !isAbsolute(input)) throw new Error('Absolute private path required');
  let ancestor=resolve(input), suffix=[];
  while(!existsSync(ancestor)){suffix.unshift(ancestor.slice(dirname(ancestor).length+1));ancestor=dirname(ancestor);}
  const target=resolve(realpathSync(ancestor),...suffix);
  const rel=relative(repo,target);
  if(!rel || (!rel.startsWith('..'+sep) && rel!=='..' && !isAbsolute(rel))) throw new Error('Private files must be outside repository');
  return target;
}
function options(args) {
  const out={};
  for(let i=0;i<args.length;i+=2) {
    if(!args[i].startsWith('--') || args[i+1]===undefined || args[i+1].startsWith('--') || Object.hasOwn(out,args[i])) throw new Error('Invalid arguments');
    out[args[i]]=args[i+1];
  }
  return out;
}
let store;
try {
 if(Number(process.versions.node.split('.')[0])<24)throw new Error('Node 24 or later required');
 const [command,...args]=process.argv.slice(2),o=options(args);
 const allowed={init:['--password-file'],grant:['--agent','--companies','--token-file'],revoke:['--agent'],status:[],serve:['--port','--origin'],'export-version':['--revision','--output']};
 if(!Object.hasOwn(allowed,command)||Object.keys(o).some(k=>k!=='--data-dir'&&!allowed[command].includes(k)))throw new Error('Unsupported command or option');
 const defaultDir=join(process.env.LOCALAPPDATA||join(homedir(),'.local','share'),'PIOFinance','private');
 const data=outsideRepo(o['--data-dir']||process.env.PIO_DATA_DIR||defaultDir);
 store=openStore(data);
 if(command==='init') {
   if(store.read().password)throw new Error('Already initialized');
   const path=outsideRepo(o['--password-file']);
   privateDirectory(dirname(path));
   // The bootstrap password never appears in argv, environment values or stdout.
   if(!existsSync(path))writeFileSync(path,secret()+'\n',{flag:'wx',mode:0o600});
   protectPrivate(path);
   store.init(readPrivateFile(path));
   console.log('Owner initialized. Read the private password file locally; never send it in chat.');
 } else {
   if(!store.read().password)throw new Error('Initialize owner first');
   if(command==='grant') {
     const tokenFile=outsideRepo(o['--token-file']);
     grantAgent(store,o['--agent'],o['--companies']?o['--companies'].split(','):[],tokenFile);
     console.log('Agent credential assigned to private file. No token printed.');
   } else if(command==='revoke') {revokeAgent(store,o['--agent']);console.log('Agent revoked.');}
   else if(command==='status') {
     const s=store.read();console.log(JSON.stringify({revision:s.revision,companies:s.portfolio?.companies.map(c=>({id:c.id,name:c.name}))||[],agents:Object.keys(identities).map(id=>({id,color:identities[id],enabled:!!s.agents[id]&&!s.agents[id].revoked,companyIds:s.agents[id]?.companyIds||[]})),versions:s.versions.map(v=>({revision:v.revision,at:v.at}))},null,2));
   } else if(command==='export-version') {
     const n=Number(o['--revision']);const v=store.read().versions.find(v=>v.revision===n);if(!v)throw new Error('Version unavailable');
     const path=outsideRepo(o['--output']);privateDirectory(dirname(path));writeFileSync(path,JSON.stringify(v.portfolio,null,2),{flag:'wx',mode:0o600});protectPrivate(path);console.log('Version exported privately.');
   } else {
     const text=o['--port']||process.env.PIO_PORT||'8787';
     if(!/^\d{1,5}$/.test(text)||Number(text)<1||Number(text)>65535)throw new Error('Invalid port');
     const server=createBridge({store,origin:o['--origin']||process.env.PIO_ORIGIN||'http://127.0.0.1:5173'});
     server.listen(Number(text),'127.0.0.1',()=>console.log(`PIO bridge listening on http://127.0.0.1:${text} (local only)`));
     server.on('error',()=>{console.error('PIO listener failed.');store.close();process.exitCode=1;});
     const stop=()=>{server.closeAllConnections();server.close(()=>{store.close();process.exit(0);});};
     process.once('SIGINT',stop);process.once('SIGTERM',stop);
   }
 }
 if(command!=='serve')store.close();
} catch {
 if(store)store.close();
 console.error('PIO operation refused. Check initialization, command options, private absolute paths and file permissions. No credential or private payload logged.');
 process.exitCode=1;
}
