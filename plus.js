/* ====== Version 38 : alertes, courbes, tableau de bord, usage, hors connexion ====== */
const SEUIL_RETARD=10; // alerte si l'écart est de -10 points ou pire
const alerteRetard=r=>r&&typeof r.ecart==="number"&&r.ecart<=-SEUIL_RETARD;
const tagAlerte=r=>alerteRetard(r)?' <span class="tag t-retard">⚠ Alerte retard</span>':"";

/* ---- Graphiques SVG (sans bibliothèque) ---- */
function svgCourbe(pts,titre){
  if(!pts.length)return '<p class="mut">Pas encore de données.</p>';
  const W=320,H=170,L=34,B=24,T=10,R=8,sems=pts.map(p=>p.s),mn=Math.min(...sems),mx=Math.max(...sems);
  const X=s=>L+(mx===mn?(W-L-R)/2:(s-mn)/(mx-mn)*(W-L-R)),Y=v=>T+(100-Math.max(0,Math.min(100,v)))/100*(H-T-B);
  const ligne=(k,c,d)=>{const p=pts.map(q=>X(q.s).toFixed(1)+","+Y(q[k]).toFixed(1));return `<polyline fill="none" stroke="${c}" stroke-width="2.5" ${d?'stroke-dasharray="5 4"':""} points="${p.join(" ")}"/>`+pts.map(q=>`<circle cx="${X(q.s).toFixed(1)}" cy="${Y(q[k]).toFixed(1)}" r="3" fill="${c}"/>`).join("")};
  const grille=[0,25,50,75,100].map(v=>`<line x1="${L}" x2="${W-R}" y1="${Y(v)}" y2="${Y(v)}" stroke="#ddd"/><text x="${L-4}" y="${Y(v)+4}" font-size="10" text-anchor="end" fill="#666">${v}</text>`).join("");
  const xs=pts.filter((_,i)=>pts.length<=8||i%Math.ceil(pts.length/8)===0).map(q=>`<text x="${X(q.s)}" y="${H-8}" font-size="10" text-anchor="middle" fill="#666">S${q.s}</text>`).join("");
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${esc(titre||"Courbe")}">${grille}${xs}${ligne("prevu","#888",true)}${ligne("realise","#0a7d3e",false)}</svg>
  <div class="mut" style="font-size:12px"><span style="color:#0a7d3e">━</span> Réalisé &nbsp; <span style="color:#888">╍</span> Prévu (en %)</div>`;
}
function svgBarres(items,opt){
  opt=opt||{};const max=opt.max||100;
  return items.map(i=>{const v=Math.max(0,Math.min(max,i.v)),c=opt.couleur?opt.couleur(i.v):"#0a7d3e";
    return `<div style="margin:5px 0"><div style="display:flex;justify-content:space-between;font-size:13px"><span>${esc(i.l)}</span><b>${i.t!=null?esc(i.t):Math.round(i.v)+"%"}</b></div><div style="background:#eee;border-radius:5px;height:12px"><div style="width:${(v/max*100).toFixed(1)}%;background:${c};height:12px;border-radius:5px"></div></div></div>`}).join("")||'<p class="mut">Aucune donnée.</p>';
}
const coulTaux=v=>v>=90?"#0a7d3e":v>=70?"#d9a300":"#c0392b";
function svgEtats(n){ // barre empilée des états
  const tot=Object.values(n).reduce((a,b)=>a+b,0);if(!tot)return "";
  const C={avance:"#2471a3",conforme:"#0a7d3e",retard:"#c0392b",non_commence:"#999"};
  return `<div style="display:flex;height:22px;border-radius:6px;overflow:hidden">${Object.keys(C).filter(k=>n[k]).map(k=>`<div title="${esc(ETAT[k])}" style="width:${n[k]/tot*100}%;background:${C[k]}"></div>`).join("")}</div>
  <div style="font-size:12px;margin-top:4px">${Object.keys(C).filter(k=>n[k]).map(k=>`<span style="color:${C[k]}">■</span> ${esc(ETAT[k])} ${n[k]} (${Math.round(n[k]/tot*100)}%)`).join(" &nbsp; ")}</div>`;
}
const moy=a=>a.length?a.reduce((s,x)=>s+(+x||0),0)/a.length:0;
function groupeCourbes(lignes){ // lignes de plusieurs classes -> html
  const g={};lignes.forEach(l=>{const k=(l.classe_formulaire||"")+" "+(l.division||"");(g[k]=g[k]||[]).push({s:+l.semaine,prevu:+l.taux_prevu,realise:+l.taux_realise})});
  const ks=Object.keys(g).sort();
  return ks.map(k=>`<div class="card"><h3>${esc(k.trim())}</h3>${svgCourbe(g[k].sort((a,b)=>a.s-b.s),k)}</div>`).join("")||'<p class="mut">Aucun point envoyé pour le moment.</p>';
}

/* ---- AE : courbe d'une classe + dernier envoi des retardataires ---- */
document.addEventListener("click",async ev=>{
  const b=ev.target.closest&&ev.target.closest("[data-crb]");if(!b)return;
  const z=document.getElementById("ed-"+b.dataset.crb);if(!z)return;
  if(z.dataset.ouvert==="1"){z.innerHTML="";z.dataset.ouvert="0";return}
  z.innerHTML="<p class='mut'>Chargement…</p>";
  try{
    const r=await rest(`soumissions?select=semaine,taux_prevu,taux_realise&enseignant_id=eq.${b.dataset.en}&classe_code=eq.${encodeURIComponent(b.dataset.cc)}&division=eq.${encodeURIComponent(b.dataset.dv)}&statut=neq.rejete&order=semaine`);
    z.innerHTML=svgCourbe(r.map(x=>({s:x.semaine,prevu:+x.taux_prevu,realise:+x.taux_realise})),"Progression");z.dataset.ouvert="1";
  }catch(e){z.innerHTML='<div class="msg err">'+esc(e.message)+'</div>'}
});
async function plusAE(c,s,rows,sans){
  try{
    const al=rows.filter(alerteRetard).length,e=document.getElementById("alr");
    if(e)e.innerHTML=al?`<div class="msg err">⚠ ${al} classe(s) en alerte retard (écart de ${SEUIL_RETARD} points ou plus).</div>`:"";
    if(!sans.length)return;
    const d=await rest(`soumissions?select=enseignant_id,semaine&etablissement_id=eq.${c.etablissement_id}&matiere=eq.${c.matiere}&statut=neq.rejete&semaine=lt.${s}&order=semaine.desc`);
    const der={};d.forEach(x=>{if(!der[x.enseignant_id])der[x.enseignant_id]=x.semaine});
    document.querySelectorAll("[data-der]").forEach(sp=>{const w=der[sp.dataset.der];sp.textContent=w?"dernier envoi : semaine "+w+" ("+(s-w)+" sem. de retard)":"n'a encore rien envoyé"});
  }catch(e){}
}

/* ---- Enseignant : ma progression ---- */
async function ensProgression(){
  const z=document.getElementById("pg");z.innerHTML="<p class='mut'>Chargement…</p>";
  try{const r=await rpc("mon_historique",{p_whatsapp:ensCle(),p_code:ENS.c},false);
    if(!r.ok)throw new Error(r.message);z.innerHTML=groupeCourbes(r.lignes);z.scrollIntoView()}
  catch(e){z.innerHTML='<div class="msg err">'+esc(e.message)+(String(e.message).includes("mon_historique")?" (mise à jour du serveur à faire)":"")+'</div>'}
}

/* ---- Mode hors connexion : file d'envoi ---- */
const FILE_CLE="sdh.file";
const fileLire=()=>{try{return JSON.parse(localStorage.getItem(FILE_CLE)||"[]")}catch(e){return[]}};
const fileEcrire=f=>{try{localStorage.setItem(FILE_CLE,JSON.stringify(f))}catch(e){}};
function fileAjouter(w,c,lignes){const f=fileLire();f.push({w,c,lignes,t:Date.now()});fileEcrire(f)}
async function fileVider(){
  let f=fileLire(),n=0;if(!f.length||navigator.onLine===false)return 0;
  const reste=[];
  for(const it of f){
    try{const r=await rpc("soumettre_point",{p_whatsapp:it.w,p_code:it.c,p_lignes:it.lignes},false);
      if(r&&r.ok)n+=r.n||it.lignes.length;else reste.push(it)}
    catch(e){reste.push(it)}
  }
  fileEcrire(reste);return n;
}
async function fileEssayer(){
  const n=await fileVider();
  if(n){const m=document.getElementById("m2")||document.getElementById("m");if(m)note(m,n+" classe(s) en attente ont été envoyées à votre AE.","good")}
  fileMajEtat();
}
function fileMajEtat(){
  const z=document.getElementById("hc");if(!z)return;
  const n=fileLire().reduce((s,x)=>s+x.lignes.length,0);
  z.innerHTML=n?`<div class="msg err">📴 ${n} classe(s) en attente d'envoi (pas de connexion). Elles partiront toutes seules dès que le réseau revient. <button class="sec sm" id="hcr">Réessayer maintenant</button></div>`:"";
  const b=document.getElementById("hcr");if(b)b.onclick=fileEssayer;
}
window.addEventListener("online",fileEssayer);
if("serviceWorker"in navigator)window.addEventListener("load",()=>setTimeout(fileEssayer,3000));

/* ---- Direction : rappel de sauvegarde ---- */
function plusRappelSauv(){
  const d=sauvDernier(),n=d?Math.floor((Date.now()-new Date(d).getTime())/86400000):null;
  if(n!==null&&n<=7)return "";
  return `<div class="msg err" style="cursor:pointer" id="rpS">💾 ${d?"Dernière sauvegarde complète il y a "+n+" jours.":"Aucune sauvegarde complète faite depuis cet appareil."} Touchez ici pour en faire une.</div>`;
}

/* ---- Direction : tableau de bord ---- */
async function dirTableau(){
  const z=$("#zone");z.innerHTML='<div class="card">Chargement du tableau de bord…</div>';
  try{
    const [rows,etabs]=await Promise.all([statLireTout("points_valides?select=etablissement,matiere,semaine,taux_prevu,taux_realise,ecart,etat,matricule"),rest("etablissements?select=nom,commune&order=nom")]);
    if(!rows.length){z.innerHTML='<div class="card"><p class="mut">Aucun point validé pour le moment.</p></div>';return}
    const com={};etabs.forEach(e=>com[e.nom]=e.commune||"Non renseignée");
    const par=(cle)=>{const g={};rows.forEach(r=>{const k=cle(r);(g[k]=g[k]||[]).push(r)});return Object.keys(g).map(k=>({l:k,v:moy(g[k].map(x=>x.taux_realise)),n:g[k].length})).sort((a,b)=>b.v-a.v)};
    const etats={};rows.forEach(r=>etats[r.etat]=(etats[r.etat]||0)+1);
    const sem={};rows.forEach(r=>{(sem[r.semaine]=sem[r.semaine]||[]).push(r)});
    const courbe=Object.keys(sem).map(s=>({s:+s,prevu:moy(sem[s].map(x=>x.taux_prevu)),realise:moy(sem[s].map(x=>x.taux_realise))})).sort((a,b)=>a.s-b.s);
    const alertes=rows.filter(alerteRetard);const colAl={};alertes.forEach(r=>colAl[r.etablissement]=(colAl[r.etablissement]||0)+1);
    const topAl=Object.entries(colAl).sort((a,b)=>b[1]-a[1]).slice(0,10);
    const parCol=par(r=>r.etablissement);
    z.innerHTML=`<div class="card"><h3>Vue d'ensemble</h3><p><b>${rows.length}</b> points validés · <b>${new Set(rows.map(r=>r.etablissement)).size}</b> collèges · taux de réalisation moyen <b>${Math.round(moy(rows.map(r=>r.taux_realise)))}%</b></p>${svgEtats(etats)}</div>
    <div class="card"><h3>Évolution par semaine</h3>${svgCourbe(courbe,"Évolution")}</div>
    <div class="card"><h3>Par commune</h3>${svgBarres(par(r=>com[r.etablissement]||"Non renseignée").map(x=>({l:x.l+" ("+x.n+")",v:x.v})),{couleur:coulTaux})}</div>
    <div class="card"><h3>Par discipline</h3>${svgBarres(par(r=>NOM_MAT[r.matiere]||r.matiere).map(x=>({l:x.l+" ("+x.n+")",v:x.v})),{couleur:coulTaux})}</div>
    <div class="card"><h3>Collèges les plus en retard</h3>${svgBarres(parCol.slice(-8).reverse().map(x=>({l:x.l,v:x.v})),{couleur:coulTaux})}</div>
    <div class="card"><h3>⚠ Alertes de retard (${alertes.length})</h3><p class="mut">Classes avec un écart de ${SEUIL_RETARD} points ou plus sous le prévu.</p>${topAl.length?svgBarres(topAl.map(([k,v])=>({l:k,v:v,t:v+" classe(s)"})),{max:Math.max(...topAl.map(x=>x[1])),couleur:()=>"#c0392b"}):'<p class="mut">Aucune alerte.</p>'}</div>`;
  }catch(e){z.innerHTML='<div class="card"><div class="msg err">'+esc(e.message)+'</div></div>'}
}

/* ---- Direction : usage de la plateforme ---- */
async function dirUsage(){
  const z=$("#zone");z.innerHTML='<div class="card">Chargement…</div>';
  try{
    const [rows,ens,aff]=await Promise.all([
      statLireTout("points_valides?select=etablissement,semaine,matricule,valide_le,cree_le"),
      statLireTout("enseignants?select=id,matricule,actif&actif=eq.true"),
      statLireTout("affectations?select=etablissement_id,matiere")]);
    const nbEns=ens.length;
    const sem={};rows.forEach(r=>{const o=sem[r.semaine]=sem[r.semaine]||{e:new Set(),c:new Set(),a:0};o.e.add(r.matricule);o.c.add(r.etablissement);o.a++});
    const ks=Object.keys(sem).map(Number).sort((a,b)=>a-b);
    const taux=ks.map(s=>({l:"Semaine "+s,v:nbEns?sem[s].e.size/nbEns*100:0,t:sem[s].e.size+" / "+nbEns+" ("+Math.round(nbEns?sem[s].e.size/nbEns*100:0)+"%)"}));
    const delais=rows.filter(r=>r.valide_le&&r.cree_le).map(r=>(new Date(r.valide_le)-new Date(r.cree_le))/3600000).filter(h=>h>=0).sort((a,b)=>a-b);
    const med=delais.length?delais[Math.floor(delais.length/2)]:null;
    const txtD=med==null?"non disponible (mise à jour du serveur à faire)":med<48?Math.round(med)+" heure(s)":(med/24).toFixed(1)+" jour(s)";
    const ae=new Set(aff.map(a=>a.etablissement_id+"|"+a.matiere)).size;
    z.innerHTML=`<div class="card"><h3>Usage de la plateforme</h3>
    <p><b>${nbEns}</b> enseignants actifs enregistrés · <b>${ae}</b> postes d'AE · <b>${new Set(rows.map(r=>r.etablissement)).size}</b> collèges ayant au moins un point validé</p>
    <p>Délai médian de validation par les AE : <b>${txtD}</b></p></div>
    <div class="card"><h3>Enseignants ayant un point validé, par semaine</h3>${svgBarres(taux,{couleur:coulTaux})}
    <p class="mut">Les connexions elles-mêmes ne sont pas enregistrées : cet indicateur mesure l'usage réel (points envoyés et validés).</p></div>
    <div class="card"><h3>Collèges actifs par semaine</h3>${svgBarres(ks.map(s=>({l:"Semaine "+s,v:sem[s].c.size,t:sem[s].c.size+" collège(s)"})),{max:Math.max(1,...ks.map(s=>sem[s].c.size))})}</div>`;
  }catch(e){z.innerHTML='<div class="card"><div class="msg err">'+esc(e.message)+'</div></div>'}
}
