/* ====== Enseignants méritants : notation (censeur), validation (directeur), classement ====== */
const N3=[["regulier","Participation régulière"],["occasionnel","Participation occasionnelle"],["non","Non-participation"]];
const N3B=[["excellent","Excellent"],["bon","Bon"],["mauvais","Mauvais"]];
const LIB={regulier:"Régulière",occasionnel:"Occasionnelle",non:"Non-participation",excellent:"Excellent",bon:"Bon",mauvais:"Mauvais"};
const MER_ETQ={propose:"proposé",valide:"validé",rejete:"rejeté"};
function merAnnee(dec){const d=new Date(),a=(d.getMonth()>=8?d.getFullYear():d.getFullYear()-1)+(dec||0);return a+"-"+(a+1)}
function merPts(o){
  const t=(v,s)=>v==null||v===""?0:(v<=25?s[0]:v<=50?s[1]:v<=75?s[2]:s[3]);
  const n3=v=>v==="regulier"?7:v==="occasionnel"?4:0,nb=v=>v==="excellent"?6:v==="bon"?4:0;
  const p={inter:t(nbS(o.taux_inter),[3,5,7,10]),exam:t(nbS(o.taux_exam),[5,10,15,20]),absences:Math.max(15-3*(+o.absences||0),0),
    demandes:(+o.demandes||0)===0?7:(+o.demandes)<=2?4:0,bachotage:n3(o.bachotage),examblanc:(o.exam_surv?3:0)+(o.exam_corr?3:0),
    survdevoirs:n3(o.surv_devoirs),animations:Math.max(10-(+o.animations_manquees||0),0),admin:nb(o.rap_admin),eleves:nb(o.rap_eleves),cahiers:nb(o.cahiers)};
  p.total=Object.values(p).reduce((a,b)=>a+b,0);return p;
}
const MER_CRIT=[["inter","Réussite, classes intermédiaires",10],["exam","Réussite à l'examen",20],["absences","Absences non justifiées",15],["demandes","Demandes d'explications",7],["bachotage","Travaux dirigés / bachotage",7],["examblanc","Examen blanc",6],["survdevoirs","Surveillance des devoirs",7],["animations","Animations pédagogiques",10],["admin","Rapport avec l'administration",6],["eleves","Rapport avec les élèves",6],["cahiers","Cahiers de textes et de notes",6]];
const pk=(r,k)=>r["p_"+k]!=null?r["p_"+k]:merPts(r)[k];
function merRang(rows){
  const g=new Map();
  rows.forEach(r=>{const k=(r.commune||"")+"|"+r.matiere;if(!g.has(k))g.set(k,[]);g.get(k).push(r)});
  const out=[];
  [...g.entries()].sort((a,b)=>a[0].localeCompare(b[0])).forEach(([k,l])=>{
    l.sort((a,b)=>b.total-a.total||(b.anciennete||0)-(a.anciennete||0)||String(a.enseignant).localeCompare(b.enseignant));
    let rang=0,prev=null,i=0;l.forEach(r=>{i++;if(r.total!==prev){rang=i;prev=r.total}r._rang=rang});
    out.push({commune:l[0].commune||"",matiere:l[0].matiere,l});
  });
  return out;
}
function merEntetes(){return["N°","Commune","Établissement","Discipline","Nom et prénom(s)","Ancienneté","Zone","Réussite classes interm. (%)","Pts","Réussite examen (%)","Pts","Absences non justifiées","Pts","Demandes d'explications","Pts","TD / bachotage","Pts","Examen blanc (surv./corr.)","Pts","Surveillance des devoirs","Pts","Séances d'animation manquées","Pts","Rapport administration","Pts","Rapport élèves","Pts","Cahiers","Pts","Total /100","Rang","Statut"]}
function merLigne(r,i,N){
  return[i,r.commune||"",r.etablissement,NOM_MAT[r.matiere]||r.matiere,r.enseignant,r.anciennete==null?"":r.anciennete,r.zone||"",nbS(r.taux_inter),pk(r,"inter"),nbS(r.taux_exam),pk(r,"exam"),r.absences,pk(r,"absences"),r.demandes,pk(r,"demandes"),LIB[r.bachotage]||"",pk(r,"bachotage"),(r.exam_surv?"Surveillance ":"")+(r.exam_corr?"Correction":"")||"Non",pk(r,"examblanc"),LIB[r.surv_devoirs]||"",pk(r,"survdevoirs"),r.animations_manquees,pk(r,"animations"),LIB[r.rap_admin]||"",pk(r,"admin"),LIB[r.rap_eleves]||"",pk(r,"eleves"),LIB[r.cahiers]||"",pk(r,"cahiers"),r.total,r._rang||"",N&&r._rang<=N?"Retenu":(MER_ETQ[r.statut]||"")];
}
function merExcel(rows,annee,N,portee){
  const G=merRang(rows),all=[{v:merEntetes()}],ret=[{v:merEntetes()}];let i=0,j=0;
  G.forEach(g=>g.l.forEach(r=>{i++;all.push(merLigne(r,i,N));if(N&&r._rang<=N){j++;ret.push(merLigne(r,j,N))}}));
  const larg=[5,14,24,16,28,10,9,12,6,12,6,12,6,12,6,18,6,18,6,18,6,12,6,16,6,16,6,16,6,10,7,12];
  const f=[];if(N)f.push({nom:"Retenus (rang ≤ "+N+")",rows:ret,larg});f.push({nom:"Classement complet",rows:all,larg});
  telechargerBlob(classeurXLSX(f),"Enseignants-meritants-"+annee+"-"+slug(portee||"Donga")+".xlsx");
}
function merPDF(rows,annee,N,portee){
  let h=`<h2 style="font-size:17px;margin:0 0 4px">Enseignants méritants — ${esc(annee)}</h2><div style="font-weight:700;font-style:italic;margin-bottom:8px">${esc(portee||"Département de la Donga")}</div>`;
  merRang(rows).forEach(g=>{
    h+=`<h3 style="margin:12px 0 4px;page-break-after:avoid">${esc(g.commune||"Sans commune")} — ${esc(NOM_MAT[g.matiere]||g.matiere)}</h3><table class="st" style="width:100%"><tr><th>Rang</th><th>Nom et prénom(s)</th><th>Établissement</th><th>Anc.</th><th>Zone</th><th>Total /100</th><th></th></tr>`+
    g.l.map(r=>`<tr><td>${r._rang}</td><td style="text-align:left">${esc(r.enseignant)}</td><td style="text-align:left">${esc(r.etablissement)}</td><td>${r.anciennete==null?"":r.anciennete}</td><td>${esc(r.zone||"")}</td><td><b>${r.total}</b></td><td>${N&&r._rang<=N?"Retenu":""}</td></tr>`).join("")+"</table>";
  });
  imprimerHTML(h,"Enseignants-meritants-"+annee+"-"+slug(portee||"Donga"));
}
/* Détail des points par critère (dépliable) */
function merDetail(r){return `<table class="st" style="width:100%">${MER_CRIT.map(c=>`<tr><td>${c[1]}</td><td>${pk(r,c[0])} / ${c[2]}</td></tr>`).join("")}</table>`}
/* ---- Vue de classement (Direction, encadreurs) ---- */
async function merVue(opt){
  const z=opt.z;let annee=merAnnee(),F={c:"",m:"",e:""},N=2,rows=[];
  const charge=async()=>{z.innerHTML='<div class="card">Chargement…</div>';try{rows=await opt.charger(annee)}catch(e){z.innerHTML=`<div class="msg err">${esc(e.message)}</div>`;return}rend()};
  const uniq=k=>[...new Set(rows.map(r=>r[k]).filter(Boolean))].sort();
  function rend(){
    const cs=uniq("commune"),ms=uniq("matiere"),es=uniq("etablissement");
    const f=rows.filter(r=>(!F.c||r.commune===F.c)&&(!F.m||r.matiere===F.m)&&(!F.e||r.etablissement===F.e));
    const sel=(id,lib,l,cur,nom)=>l.length>1?`<div><label>${lib}</label><select id="${id}"><option value="">Tous</option>${l.map(x=>`<option value="${esc(x)}" ${x===cur?"selected":""}>${esc(nom?nom(x):x)}</option>`).join("")}</select></div>`:"";
    const G=merRang(f);
    z.innerHTML=`<div class="card"><h3>Enseignants méritants</h3><label>Année scolaire</label><select id="man"><option ${annee===merAnnee()?"selected":""}>${merAnnee()}</option><option ${annee===merAnnee(-1)?"selected":""}>${merAnnee(-1)}</option></select>
      <div class="row">${sel("mc","Commune",cs,F.c)}${sel("me","Collège",es,F.e)}${sel("mm","Discipline",ms,F.m,x=>NOM_MAT[x]||x)}</div>
      <label>Retenir les N premiers par commune et discipline</label><input id="mn" inputmode="numeric" value="${N}" style="max-width:120px">
      <p class="mut">${f.length} enseignant(s) noté(s) et validé(s). Classement par total de points ; en cas d'égalité, par ancienneté.</p>
      ${f.length?`<button class="sec sm" id="mx">Télécharger en Excel</button><button class="sec sm" id="mp">PDF</button>`:""}</div>
      ${G.length?G.map(g=>`<div class="card"><h3>${esc(g.commune||"Sans commune")} — ${esc(NOM_MAT[g.matiere]||g.matiere)}</h3>
        ${g.l.map(r=>`<details style="margin:6px 0"><summary><b>${r._rang}.</b> ${esc(r.enseignant)} <span class="mut">· ${esc(r.etablissement)}</span> — <b>${r.total}/100</b> ${N&&r._rang<=N?'<span class="tag" style="background:#d9f0e3;color:#14532d;padding:2px 8px;border-radius:10px;font-size:13px">Retenu</span>':""}</summary>${merDetail(r)}</details>`).join("")}</div>`).join(""):'<div class="card"><p class="mut">Aucune note validée pour cette année.</p></div>'}`;
    $("#man").onchange=e=>{annee=e.target.value;charge()};
    ["mc:c","me:e","mm:m"].forEach(x=>{const [i,k]=x.split(":");if($("#"+i))$("#"+i).onchange=e=>{F[k]=e.target.value;rend()}});
    $("#mn").onchange=e=>{N=Math.max(0,parseInt(e.target.value,10)||0);rend()};
    if($("#mx"))$("#mx").onclick=()=>merExcel(f,annee,N,F.e||F.c||opt.portee);
    if($("#mp"))$("#mp").onclick=()=>merPDF(f,annee,N,F.e||F.c||opt.portee);
  }
  charge();
}
function dirMerite(){merVue({z:$("#zone"),portee:"Département de la Donga",charger:a=>statLireTout(`notations_vue?select=*&annee=eq.${a}&statut=eq.valide&order=commune,matiere,total.desc`)})}
function encMerite(){merVue({z:$("#zone"),portee:libPortee(ENC.p),charger:async a=>{const r=await rpc("notations_encadreur",{p_annee:a});return r.rows||[]}})}
/* ---- Collège : le censeur propose, le directeur valide ---- */
async function merCollege(){
  const z=$("#zone"),e=AE.cens[0],estDir=AE.cens.some(x=>x.role==="DIRECTEUR"),annee=merAnnee();
  z.innerHTML='<div class="card">Chargement…</div>';
  let ens,not;
  try{[ens,not]=await Promise.all([rest(`enseignants?select=id,nom,matricule,matiere&etablissement_id=eq.${e.etablissement_id}&actif=eq.true&order=matiere,nom`),rest(`notations_vue?select=*&etablissement_id=eq.${e.etablissement_id}&annee=eq.${annee}`)])}
  catch(er){z.innerHTML=`<div class="msg err">${esc(er.message)}</div>`;return}
  const nd={};not.forEach(n=>nd[n.enseignant_id]=n);
  const prop=not.filter(n=>n.statut==="propose");
  const rend=()=>{
    z.innerHTML=`<div id="mf"></div><div class="card"><h3>Enseignants méritants ${annee}</h3>
    <p class="mut">${estDir?"Vous validez les notes proposées par le censeur, ou vous notez vous-même.":"Vous proposez la note de chaque enseignant ; le directeur la valide."}<br>${not.length} noté(s) sur ${ens.length} · ${not.filter(n=>n.statut==="valide").length} validé(s)${prop.length?` · ${prop.length} en attente de validation`:""}</p>
    ${estDir&&prop.length?`<button class="ok" id="mtout">Tout valider (${prop.length})</button>`:""}
    ${not.length?`<button class="sec sm" id="mx">Excel</button><button class="sec sm" id="mp">PDF</button>`:""}<div id="mm"></div></div>
    ${ens.length?[...new Set(ens.map(x=>x.matiere))].map(m=>`<div class="card"><h3>${esc(NOM_MAT[m]||m)}</h3>${ens.filter(x=>x.matiere===m).map(x=>{const n=nd[x.id];
      return `<div style="padding:8px 0;border-top:1px solid var(--br)"><b>${esc(x.nom)}</b> <span class="mut">${esc(x.matricule)}</span><br>
      ${n?`<span class="tag" style="background:#e5e9f0;color:#1f2937;padding:2px 8px;border-radius:10px;font-size:13px">${MER_ETQ[n.statut]}</span> <b>${n.total}/100</b>`:'<span class="mut">non noté</span>'}
      ${(!n||n.statut!=="valide"||estDir)?`<button class="sec sm" data-n="${x.id}">${n?"Modifier":"Noter"}</button>`:""}
      ${estDir&&n&&n.statut==="propose"?`<button class="ok sm" data-v="${n.id}">Valider</button><button class="ko sm" data-r="${n.id}">Rejeter</button>`:""}</div>`}).join("")}</div>`).join(""):'<div class="card"><p class="mut">Aucun enseignant enregistré dans ce collège.</p></div>'}`;
    const exp=not.slice();
    if($("#mx"))$("#mx").onclick=()=>merExcel(exp,annee,0,e.etablissements.nom);
    if($("#mp"))$("#mp").onclick=()=>merPDF(exp,annee,0,e.etablissements.nom);
    const maj=async(ids,st)=>{try{await rest("notations_enseignants?id=in.("+ids.join(",")+")",{method:"PATCH",headers:{Prefer:"return=minimal"},body:{statut:st}});merCollege()}catch(er){note($("#mm"),er.message)}};
    if($("#mtout"))$("#mtout").onclick=()=>maj(prop.map(p=>p.id),"valide");
    z.querySelectorAll("[data-v]").forEach(b=>b.onclick=()=>maj([b.dataset.v],"valide"));
    z.querySelectorAll("[data-r]").forEach(b=>b.onclick=()=>maj([b.dataset.r],"rejete"));
    z.querySelectorAll("[data-n]").forEach(b=>b.onclick=()=>merForm(ens.find(x=>x.id===b.dataset.n),nd[b.dataset.n]));
  };
  function merForm(x,n0){
    const n=n0||{},box=$("#mf");
    const sel=(id,l,cur)=>`<select id="${id}"><option value="">— choisir —</option>${l.map(o=>`<option value="${o[0]}" ${cur===o[0]?"selected":""}>${o[1]}</option>`).join("")}</select>`;
    const num=(id,v)=>`<input id="${id}" inputmode="decimal" value="${v==null?"":String(v).replace(".",",")}">`;
    box.innerHTML=`<div class="card"><h3>${esc(x.nom)}</h3><p class="mut">${esc(NOM_MAT[x.matiere]||x.matiere)} · ${esc(e.etablissements.nom)}</p>
    <div class="row"><div><label>Ancienneté générale (années)</label>${num("fa",n.anciennete)}</div><div><label>Zone d'intervention</label>${sel("fz",[["Rurale","Rurale"],["Urbaine","Urbaine"]],n.zone)}</div></div>
    <div class="row"><div><label>Réussite classes intermédiaires (%)</label>${num("fi",n.taux_inter)}</div><div><label>Réussite à l'examen (%)</label>${num("fx",n.taux_exam)}</div></div>
    <div class="row"><div><label>Absences non justifiées</label>${num("fab",n.absences||0)}</div><div><label>Demandes d'explications</label>${num("fd",n.demandes||0)}</div></div>
    <label>Participation aux travaux dirigés ou bachotage</label>${sel("fb",N3,n.bachotage)}
    <label>Travaux d'examen blanc</label><div><label style="display:inline"><input type="checkbox" id="fs" ${n.exam_surv?"checked":""} style="width:auto"> Surveillance</label> <label style="display:inline;margin-left:14px"><input type="checkbox" id="fc" ${n.exam_corr?"checked":""} style="width:auto"> Correction</label></div>
    <label>Surveillance des devoirs</label>${sel("fv",N3,n.surv_devoirs)}
    <label>Séances d'animation pédagogique manquées</label>${num("fan",n.animations_manquees||0)}
    <label>Rapport avec l'administration</label>${sel("fra",N3B,n.rap_admin)}
    <label>Rapport avec les élèves</label>${sel("fre",N3B,n.rap_eleves)}
    <label>Tenue des cahiers de textes et de notes</label>${sel("fca",N3B,n.cahiers)}
    <div id="fpts" style="margin-top:10px"></div>
    <button class="ok" id="fsave">${estDir?"Enregistrer et valider":"Enregistrer la proposition"}</button>${estDir?'<button class="sec" id="fprop">Enregistrer comme proposition</button>':""}<button class="sec" id="fclose">Fermer</button><div id="fm"></div></div>`;
    const lire=()=>({anciennete:nbS($("#fa").value),zone:$("#fz").value||null,taux_inter:nbS($("#fi").value),taux_exam:nbS($("#fx").value),absences:parseInt($("#fab").value,10)||0,demandes:parseInt($("#fd").value,10)||0,bachotage:$("#fb").value||null,exam_surv:$("#fs").checked,exam_corr:$("#fc").checked,surv_devoirs:$("#fv").value||null,animations_manquees:parseInt($("#fan").value,10)||0,rap_admin:$("#fra").value||null,rap_eleves:$("#fre").value||null,cahiers:$("#fca").value||null});
    const calc=()=>{const p=merPts(lire());$("#fpts").innerHTML=`<table class="st" style="width:100%">${MER_CRIT.map(c=>`<tr><td>${c[1]}</td><td>${p[c[0]]} / ${c[2]}</td></tr>`).join("")}<tr><th>Total</th><th>${p.total} / 100</th></tr></table>`};
    calc();box.querySelectorAll("input,select").forEach(i=>{i.oninput=calc;i.onchange=calc});
    $("#fclose").onclick=()=>{box.innerHTML=""};
    const enreg=async valider=>{
      const v=lire(),m=$("#fm");
      if(v.anciennete==null||v.anciennete<0)return note(m,"Indiquez l'ancienneté générale.");
      if(!v.zone||!v.bachotage||!v.surv_devoirs||!v.rap_admin||!v.rap_eleves||!v.cahiers)return note(m,"Renseignez tous les critères : zone, travaux dirigés, surveillance des devoirs et les trois rapports.");
      for(const k of ["taux_inter","taux_exam"])if(v[k]!=null&&(v[k]<0||v[k]>100))return note(m,"Les pourcentages vont de 0 à 100.");
      try{
        await rest("notations_enseignants?on_conflict=enseignant_id,annee",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=representation"},body:{...v,etablissement_id:e.etablissement_id,enseignant_id:x.id,annee,statut:"propose"}});
        if(valider){const r=await rest(`notations_enseignants?enseignant_id=eq.${x.id}&annee=eq.${annee}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:{statut:"valide"}})}
        merCollege();
      }catch(er){note(m,er.message)}
    };
    $("#fsave").onclick=()=>enreg(estDir);if($("#fprop"))$("#fprop").onclick=()=>enreg(false);
    box.scrollIntoView();
  }
  rend();
}
