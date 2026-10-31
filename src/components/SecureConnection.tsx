import './secure.css';
import {useRef,useState} from 'react';
import type {Portfolio} from '../finance/model';
import {createSecureClient,replaceWithBackup,sameSnapshot} from '../finance/secure';
import type {RemoteSnapshot,ServerProposal} from '../finance/secure';

export default function SecureConnection({data,onReplace}:{data:Portfolio;onReplace:(p:Portfolio)=>void}) {
 const [client]=useState(()=>createSecureClient());
 const [connected,setConnected]=useState(false),[busy,setBusy]=useState(false),[consent,setConsent]=useState(false);
 const [remote,setRemote]=useState<RemoteSnapshot|null>(null),[proposals,setProposals]=useState<ServerProposal[]>([]),[message,setMessage]=useState('Hors connexion — aucune transmission automatique.');
 const current=useRef(data);current.current=data;
 async function perform(work:()=>Promise<void>) {
  setBusy(true);try{await work();}catch(error){setMessage(error instanceof Error?error.message:'Connexion indisponible.');}finally{setBusy(false);}
 }
 async function refresh() {
  const [snapshot,list]=await Promise.all([client.read(),client.proposals()]);setRemote(snapshot);setProposals(list.proposals);
 }
 function receive(snapshot:RemoteSnapshot) {
  if(!snapshot.portfolio)throw new Error('Le serveur est vide ; aucune donnée locale remplacée.');
  replaceWithBackup(current.current,snapshot.portfolio,json=>localStorage.setItem('pio-finance-backup-'+new Date().toISOString()+'-'+crypto.randomUUID(),json),onReplace);
 }
 const aligned=!!remote?.portfolio && sameSnapshot(data,remote.portfolio);
 return <details className="secure-connection">
  <summary>Connexion sécurisée</summary>
  <p>Backend local volontaire. Les robots et suggestions locales ne sont pas des IA connectées. Aucune connexion, lecture ou synchronisation au simple affichage.</p>
  <p role="status">{message}</p>
  {!connected ? <form onSubmit={e=>{
   e.preventDefault();const password=String(new FormData(e.currentTarget).get('password'));e.currentTarget.reset();
   void perform(async()=>{await client.login(password);setConnected(true);setMessage('Session propriétaire active');});
  }}><label>Mot de passe personnel<input type="password" name="password" autoComplete="current-password" required maxLength={256}/></label>
   <button className="secondary" disabled={busy}>Se connecter personnellement</button>
   <button className="text-button" type="button" disabled={busy} onClick={()=>void perform(async()=>{await client.me();setConnected(true);setMessage('Session propriétaire active');})}>Reprendre ma session</button>
  </form> : <>
   <div className="secure-actions">
    <button className="secondary" disabled={busy} onClick={()=>void perform(async()=>{await refresh();setMessage('Lecture explicite terminée. Aucun envoi du portefeuille local.');})}>Lire le serveur</button>
    <button className="text-button" disabled={busy} onClick={()=>void perform(async()=>{await client.logout();setConnected(false);setRemote(null);setProposals([]);setConsent(false);setMessage('Déconnecté ; les actions restent locales.');})}>Se déconnecter</button>
   </div>
   {remote && <>
    <strong>{remote.portfolio?'Serveur lu — révision '+remote.revision:'Serveur vide — révision 0'}</strong>
    {remote.portfolio && <p>{remote.portfolio.companies.length} sociétés · {remote.portfolio.tasks.length} missions serveur. {aligned?'Identique à la copie locale.':'Différences avec la copie locale : aucun remplacement automatique.'}</p>}
    <p className="notice">Un envoi partage toutes les sociétés, notes, finances, historique et tâches avec ce backend. Holding lit le groupe ; les agents métier lisent seulement les sociétés attribuées par l’opérateur. Exportez les données sensibles hors du dépôt. La copie locale reste votre référence avant votre décision explicite.</p>
    <label className="secure-consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>Je consens à partager ce portefeuille avec le backend local et les agents autorisés.</label>
    <div className="secure-actions">
     {!remote.portfolio ? <button className="secondary" disabled={busy||!consent} onClick={()=>void perform(async()=>{await client.initialize(current.current,consent,0);await refresh();setConsent(false);setMessage('Initialisation vérifiée sur le serveur.');})}>Initialiser le serveur vide</button> : <>
      <button className="secondary" disabled={busy||!consent} onClick={()=>{
       if(!confirm('Envoyer toute la copie locale et remplacer la révision serveur '+remote.revision+' ? Une version serveur sera conservée.'))return;
       void perform(async()=>{await client.push(current.current,consent,remote.revision);await refresh();setConsent(false);setMessage('Envoi explicite vérifié.');});
      }}>Envoyer la copie locale (Push)</button>
      <button className="secondary" disabled={busy} onClick={()=>{
       if(!confirm('Recevoir la copie serveur affichée ? Votre copie locale sera sauvegardée séparément avant remplacement.'))return;
       void perform(async()=>{const fresh=await client.read();receive(fresh);setRemote(fresh);setMessage('Copie serveur reçue ; sauvegarde locale de secours conservée (pio-finance-backup-…).');});
      }}>Recevoir le serveur (Pull)</button>
     </>}
    </div>
    <h3>Propositions serveur à examiner</h3>
    <p>Une proposition n’est pas une mission. Confirmer exige une copie locale identique au snapshot examiné et une révision toujours actuelle côté serveur. Les refus ne suppriment aucune mission locale.</p>
    {!aligned && remote.portfolio && <p>Pour confirmer : recevez volontairement la copie serveur, ou envoyez vos modifications locales avec consentement, puis réexaminez la proposition.</p>}
    {!proposals.length && <p>Aucune proposition accessible.</p>}
    {proposals.map(p=><article className="secure-proposal" key={p.id}>
     <p><strong>{remote.portfolio?.companies.find(c=>c.id===p.task.companyId)?.name||p.task.companyId}</strong> · {p.author} → {p.reportsTo}{p.urgent?' · Urgence':''} · {p.status} · proposition v{p.proposalRevision} / snapshot {p.baseRevision}</p>
     {p.status==='pending' ? <>
      <form key={p.id+':'+p.proposalRevision} onSubmit={e=>{
       e.preventDefault();const f=new FormData(e.currentTarget);const task={...p.task,title:String(f.get('title')),priority:String(f.get('priority')),assignee:String(f.get('assignee')),due:String(f.get('due'))};
       void perform(async()=>{await client.edit(p,remote,task);await refresh();setMessage('Proposition révisée ; relisez avant confirmation.');});
      }}>
       <label>Titre de la proposition<input name="title" defaultValue={p.task.title} required maxLength={1000}/></label>
       <label>Priorité proposée<select name="priority" defaultValue={p.task.priority}>{['Basse','Normale','Haute'].map(v=><option key={v}>{v}</option>)}</select></label>
       <label>Responsable proposé<input name="assignee" defaultValue={p.task.assignee} maxLength={200}/></label>
       <label>Échéance proposée<input type="date" name="due" defaultValue={p.task.due}/></label>
       <button className="secondary" disabled={busy}>Enregistrer la révision de proposition</button>
      </form>
      <p>La confirmation utilise uniquement la version enregistrée ci-dessus : « {p.task.title} », {p.task.priority}, {p.task.assignee||'sans responsable'}, {p.task.due||'sans échéance'}. Enregistrez d’abord vos modifications de formulaire.</p>
      <button className="secondary" disabled={busy||!aligned||p.baseRevision!==remote.revision} onClick={()=>{
       if(!confirm('Créer exactement une mission « '+p.task.title+' » pour cette société, sur la révision '+remote.revision+' ?'))return;
       const before=current.current;
       void perform(async()=>{
        if(!remote.portfolio||!sameSnapshot(before,remote.portfolio))throw new Error('La copie locale a changé. Relisez et réexaminez.');
        await client.confirm(p,remote);const fresh=await client.read();
        if(!sameSnapshot(current.current,before)){await refresh();throw new Error('Mission créée côté serveur ; modifications locales conservées. Utilisez Pull après sauvegarde.');}
        receive(fresh);await refresh();setMessage('Mission confirmée sur le serveur et reçue localement.');
       });
      }}>Confirmer une mission</button>
      <button className="text-button" disabled={busy} onClick={()=>void perform(async()=>{await client.reject(p);await refresh();setMessage('Proposition refusée, aucune mission créée.');})}>Refuser la proposition</button>
      {p.baseRevision!==remote.revision && <p>Snapshot dépassé : relisez les données puis enregistrez une révision de proposition pour la rattacher explicitement au snapshot affiché.</p>}
     </> : <p>{p.task.title} — {p.status==='confirmed'?'Mission créée une seule fois sur le serveur.':'Refusée ; non appliquée.'}</p>}
    </article>)}
   </>}
  </>}
 </details>;
}
