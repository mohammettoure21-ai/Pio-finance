import {execFileSync} from 'node:child_process';
import {chmodSync,lstatSync} from 'node:fs';
let account;
function currentAccount(){return account ||= execFileSync('whoami.exe',[],{encoding:'utf8'}).trim();}
function assertPrivate(path,directory) {
 const stat=lstatSync(path);
 if(stat.isSymbolicLink() || (directory?!stat.isDirectory():!stat.isFile()))throw new Error('Private regular path required');
 if(process.platform==='win32') {
  const acl=execFileSync('icacls.exe',[path],{encoding:'utf8'});
  const grants=acl.split(/\r?\n/).filter(line=>/:\([^)]+\)/.test(line));
  if(grants.length!==1 || !grants[0].toLowerCase().includes(currentAccount().toLowerCase()+':') || !grants[0].includes('(F)') || /\((DENY|IO)\)/.test(grants[0]))throw new Error('User-only Windows DACL required');
 } else if((stat.mode&0o077)!==0 || stat.uid!==process.getuid())throw new Error('User-only ownership and permissions required');
}
export function protectPrivate(path,directory=false) {
 if(process.platform==='win32') {
  // Remove inherited grants and the common explicit broad principals. Any other
  // unexpected explicit principal is refused by the readback, never ignored.
  execFileSync('icacls.exe',[path,'/inheritance:r','/grant:r',`${currentAccount()}:${directory?'(OI)(CI)':''}F`,'/remove:g','*S-1-5-18','*S-1-5-32-544','*S-1-3-4','*S-1-3-0','*S-1-1-0','*S-1-5-11','*S-1-5-32-545'],{stdio:'pipe'});
 } else chmodSync(path,directory?0o700:0o600);
 assertPrivate(path,directory);
}
export const assertPrivateFile=path=>assertPrivate(path,false);
export const assertPrivateDirectory=path=>assertPrivate(path,true);
