/* ====== Statistiques des évaluations (interrogations et devoirs) ====== */
const EVALS=[["I1","1re interrogation"],["I2","2e interrogation"],["D1","1er devoir"],["D2","2e devoir"]];
const NOM_EVAL={I1:"1re interrogation",I2:"2e interrogation",D1:"1er devoir",D2:"2e devoir"};
const nbS=v=>{if(v===null||v===undefined||v==="")return null;const n=parseFloat(String(v).replace(",","."));return isNaN(n)?null:n};
const fnS=v=>v==null?"":String(Math.round(v*100)/100).replace(".",",");
function statCalc(r){
  const gs=+r.g_sup||0,fs=+r.f_sup||0,gi=+r.g_inf||0,fi=+r.f_inf||0;
  const mx=[nbS(r.g_max),nbS(r.f_max)].filter(x=>x!=null),mn=[nbS(r.g_min),nbS(r.f_min)].filter(x=>x!=null);
  const et=gs+fs+gi+fi;
  return{gs,fs,ts:gs+fs,gi,fi,ti:gi+fi,eg:gs+gi,ef:fs+fi,et,max:mx.length?Math.max(...mx):null,min:mn.length?Math.min(...mn):null,taux:et?Math.round((gs+fs)/et*1000)/10:null};
}
const tauxTxt=t=>t==null?"–":fr(t)+" %";
function statTableau(r){
  const c=statCalc(r);
  return `<table class="st"><tr><th>${esc(NOM_EVAL[r.type_eval]||"Évaluation")}</th><th>G</th><th>F</th><th>Total</th></tr>
  <tr><td>Moy ≥ 10</td><td>${c.gs}</td><td>${c.fs}</td><td>${c.ts}</td></tr>
  <tr><td>Moy &lt; 10</td><td>${c.gi}</td><td>${c.fi}</td><td>${c.ti}</td></tr>
  <tr><td>Max</td><td>${fnS(nbS(r.g_max))}</td><td>${fnS(nbS(r.f_max))}</td><td>${fnS(c.max)}</td></tr>
  <tr><td>Min</td><td>${fnS(nbS(r.g_min))}</td><td>${fnS(nbS(r.f_min))}</td><td>${fnS(c.min)}</td></tr></table>
  <div class="mut" style="font-size:12px">Effectif : ${c.et} (G ${c.eg}, F ${c.ef}) · Réussite : ${tauxTxt(c.taux)}</div>`;
}
const ETQ={en_attente:"en attente",valide:"validé",rejete:"rejeté"};
function statGroupes(rows){
  const m=new Map();
  rows.forEach(r=>{const k=[r.etablissement,r.matiere,r.classe_formulaire,r.division,r.enseignant].join("|");
    if(!m.has(k))m.set(k,{k,etab:r.etablissement,commune:r.commune||"",matiere:r.matiere,classe:r.classe_formulaire,div:r.division,ens:r.enseignant,evals:{}});
    m.get(k).evals[r.type_eval]=r});
  return[...m.values()].sort((a,b)=>String(a.etab).localeCompare(b.etab)||String(a.matiere).localeCompare(b.matiere)||String(a.classe).localeCompare(b.classe)||String(a.div).localeCompare(b.div));
}
function statSynthese(rows){
  const m=new Map();
  rows.forEach(r=>{const k=r.etablissement+"|"+r.matiere;
    if(!m.has(k))m.set(k,{etab:r.etablissement,matiere:r.matiere,cl:new Set(),t:{}});
    const o=m.get(k);o.cl.add([r.classe_formulaire,r.division,r.enseignant].join("|"));
    const c=statCalc(r),a=o.t[r.type_eval]||(o.t[r.type_eval]={s:0,e:0});a.s+=c.ts;a.e+=c.et});
  return[...m.values()].sort((a,b)=>String(a.etab).localeCompare(b.etab)||String(a.matiere).localeCompare(b.matiere));
}
function statTxtT(a){return a&&a.e?fr(Math.round(a.s/a.e*1000)/10)+" % ("+a.e+")":"–"}
function statTableSynth(rows){
  const S=statSynthese(rows);
  return `<table class="st"><tr><th>Collège</th><th>Disc.</th><th>Classes</th>${EVALS.map(e=>`<th>${esc(e[1])}</th>`).join("")}</tr>
  ${S.map(o=>`<tr><td>${esc(o.etab)}</td><td>${esc(NOM_MAT[o.matiere]||o.matiere)}</td><td>${o.cl.size}</td>${EVALS.map(e=>`<td>${statTxtT(o.t[e[0]])}</td>`).join("")}</tr>`).join("")}</table>
  <div class="mut" style="font-size:12px">Chaque case : taux de réussite (moyenne ≥ 10) et, entre parenthèses, l'effectif concerné.</div>`;
}
function statExcel(rows,sem,portee){
  const v=rows.filter(r=>r.statut==="valide");
  const e1=[{v:["Collège","Commune","Discipline","Enseignant","Matricule","Classe","Division","Semestre","Évaluation","Moy≥10 G","Moy≥10 F","Moy≥10 Total","Moy<10 G","Moy<10 F","Moy<10 Total","Max G","Max F","Max Total","Min G","Min F","Min Total","Effectif G","Effectif F","Effectif Total","Réussite (%)"]}];
  v.forEach(r=>{const c=statCalc(r);e1.push([r.etablissement,r.commune||"",NOM_MAT[r.matiere]||r.matiere,r.enseignant,r.matricule||"",r.classe_formulaire,r.division,r.semestre,NOM_EVAL[r.type_eval]||r.type_eval,
    c.gs,c.fs,c.ts,c.gi,c.fi,c.ti,nbS(r.g_max),nbS(r.f_max),c.max,nbS(r.g_min),nbS(r.f_min),c.min,c.eg,c.ef,c.et,c.taux])});
  const e2=[{v:["Collège","Discipline","Classes"].concat(EVALS.map(e=>e[1]+" – réussite (%)")).concat(EVALS.map(e=>e[1]+" – effectif"))}];
  statSynthese(v).forEach(o=>e2.push([o.etab,NOM_MAT[o.matiere]||o.matiere,o.cl.size].concat(EVALS.map(e=>{const a=o.t[e[0]];return a&&a.e?Math.round(a.s/a.e*1000)/10:""})).concat(EVALS.map(e=>{const a=o.t[e[0]];return a?a.e:""}))));
  telechargerBlob(classeurXLSX([{nom:"Synthèse",rows:e2,larg:[28,16,9,20,20,20,20,14,14,14,14]},{nom:"Détail",rows:e1,larg:[26,14,14,26,12,10,9,9,18,9,9,9,9,9,9,8,8,8,8,8,8,9,9,9,10]}]),
    "Statistiques-evaluations-S"+sem+"-"+slug(portee||"Donga")+".xlsx");
}
function imprimerHTML(html,titre,orient){
  $("#rapport").innerHTML=html;
  const st=document.createElement("style");st.id="pg-land";st.textContent="@page{size:A4 "+(orient||"portrait")+";margin:10mm}";document.head.appendChild(st);
  const ancien=document.title;document.title=titre;document.body.classList.add("mode-rapport");
  const fin=()=>{document.body.classList.remove("mode-rapport");document.title=ancien;const s=document.getElementById("pg-land");if(s)s.remove();window.removeEventListener("afterprint",fin)};
  window.addEventListener("afterprint",fin);setTimeout(()=>window.print(),50);
}
function statPDF(rows,sem,portee){
  const v=rows.filter(r=>r.statut==="valide"),G=statGroupes(v);
  let h=`<h2 style="font-size:17px;margin:0 0 4px">Statistiques des évaluations — Semestre ${sem}</h2><div style="font-weight:700;font-style:italic;margin-bottom:8px">${esc(portee||"Département de la Donga")}</div>`+statTableSynth(v);
  if(G.length<=150){
    let cur="";
    G.forEach(g=>{const t=g.etab+"|"+g.matiere;
      if(t!==cur){cur=t;h+=`<h3 style="margin:14px 0 4px;page-break-after:avoid">${esc(g.etab)} — ${esc(NOM_MAT[g.matiere]||g.matiere)}</h3>`}
      h+=`<div style="page-break-inside:avoid;margin:6px 0"><b>${esc(g.classe)} ${esc(g.div)}</b> <span class="mut">· ${esc(g.ens)}</span><div style="display:flex;flex-wrap:wrap;gap:10px">${EVALS.filter(e=>g.evals[e[0]]).map(e=>`<div>${statTableau(g.evals[e[0]])}</div>`).join("")}</div></div>`});
  }
  imprimerHTML(h,"Statistiques-evaluations-S"+sem+"-"+slug(portee||"Donga"));
}
async function statLireTout(path){
  let tout=[],d=0;
  for(;;){const r=await rest(path,{headers:{Range:d+"-"+(d+999),"Range-Unit":"items"}});tout=tout.concat(r||[]);if(!r||r.length<1000)break;d+=1000}
  return tout;
}
/* Affichage commun : opt = {z, portee, charger(sem), maj(ids,statut) (AE seulement)} */
async function statVue(opt){
  const z=opt.z;let sem=opt.sem||1,F={m:"",e:"",c:""},rows=[];
  z.innerHTML='<div class="card">Chargement…</div>';
  const charge=async()=>{
    z.innerHTML='<div class="card">Chargement…</div>';
    try{rows=await opt.charger(sem)}catch(e){z.innerHTML=`<div class="msg err">${esc(e.message)}</div>`;return}
    rend();
  };
  const uniq=k=>[...new Set(rows.map(r=>r[k]).filter(Boolean))].sort();
  function rend(){
    const ms=uniq("matiere"),es=uniq("etablissement"),cs=uniq("commune");
    if(F.m&&!ms.includes(F.m))F.m="";if(F.e&&!es.includes(F.e))F.e="";if(F.c&&!cs.includes(F.c))F.c="";
    const f=rows.filter(r=>(!F.m||r.matiere===F.m)&&(!F.e||r.etablissement===F.e)&&(!F.c||r.commune===F.c));
    const att=f.filter(r=>r.statut==="en_attente"),val=f.filter(r=>r.statut==="valide"),G=statGroupes(f);
    const sel=(id,lib,liste,cur,nom)=>liste.length>1?`<div><label>${lib}</label><select id="${id}"><option value="">Tous</option>${liste.map(x=>`<option value="${esc(x)}" ${x===cur?"selected":""}>${esc(nom?nom(x):x)}</option>`).join("")}</select></div>`:"";
    z.innerHTML=`<div class="card"><h3>Statistiques des évaluations</h3>
      <label>Semestre</label><select id="ssem"><option value="1" ${sem===1?"selected":""}>Semestre 1</option><option value="2" ${sem===2?"selected":""}>Semestre 2</option></select>
      <div class="row">${sel("fc","Commune",cs,F.c)}${sel("fe","Collège",es,F.e)}${sel("fm","Discipline",ms,F.m,x=>NOM_MAT[x]||x)}</div>
      <p class="mut">${val.length} évaluation(s) validée(s)${opt.maj?` · ${att.length} à valider`:""}</p>
      ${opt.maj&&att.length?`<button class="ok" id="stout">Tout valider (${att.length})</button>`:""}
      ${val.length?`<button class="sec sm" id="sdx">Télécharger en Excel</button><button class="sec sm" id="sdp">PDF</button>`:""}<div id="sm"></div></div>
      ${G.length?`<div class="card"><h3>Synthèse</h3><div class="scroll">${statTableSynth(opt.maj?f:val)}</div></div>`:'<div class="card"><p class="mut">Aucune statistique pour ce semestre.</p></div>'}
      ${G.length>40&&!opt.maj?'<div class="card"><p class="mut">Beaucoup de classes : choisissez une commune, un collège ou une discipline pour voir le détail par classe.</p></div>':G.map(g=>{
        const ids=EVALS.map(e=>g.evals[e[0]]).filter(r=>r&&r.statut==="en_attente").map(r=>r.id);
        return `<div class="card"><b>${esc(g.classe)} ${esc(g.div)}</b> <span class="mut">· ${esc(g.etab)} · ${esc(NOM_MAT[g.matiere]||g.matiere)} · ${esc(g.ens)}</span>
        <div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:8px">${EVALS.filter(e=>g.evals[e[0]]).map(e=>{const r=g.evals[e[0]];return `<div>${statTableau(r)}${opt.maj?`<span class="tag">${ETQ[r.statut]||""}</span>`:""}</div>`}).join("")}</div>
        ${opt.maj&&ids.length?`<button class="ok sm" data-v="${ids.join(",")}">Valider</button><button class="ko sm" data-r="${ids.join(",")}">Rejeter</button>`:""}</div>`}).join("")}`;
    $("#ssem").onchange=e=>{sem=+e.target.value;charge()};
    if($("#fc"))$("#fc").onchange=e=>{F.c=e.target.value;rend()};
    if($("#fe"))$("#fe").onchange=e=>{F.e=e.target.value;rend()};
    if($("#fm"))$("#fm").onchange=e=>{F.m=e.target.value;rend()};
    if($("#sdx"))$("#sdx").onclick=()=>statExcel(f,sem,F.e||F.c||opt.portee);
    if($("#sdp"))$("#sdp").onclick=()=>statPDF(f,sem,F.e||F.c||opt.portee);
    const maj=async(ids,st)=>{try{await opt.maj(ids,st);await charge()}catch(e){note($("#sm"),e.message)}};
    if($("#stout"))$("#stout").onclick=()=>maj(att.map(a=>a.id),"valide");
    z.querySelectorAll("[data-v]").forEach(b=>b.onclick=()=>maj(b.dataset.v.split(","),"valide"));
    z.querySelectorAll("[data-r]").forEach(b=>b.onclick=()=>maj(b.dataset.r.split(","),"rejete"));
  }
  charge();
}
const STAT_ORD="order=etablissement,matiere,classe_formulaire,division,type_eval";
function aeStats(){
  const c=AE.cur;
  statVue({z:$("#zone"),portee:c.etablissements.nom,
    charger:s=>statLireTout(`stats_vue?select=*&etablissement_id=eq.${c.etablissement_id}&matiere=eq.${encodeURIComponent(c.matiere)}&semestre=eq.${s}&${STAT_ORD}`),
    maj:(ids,st)=>rest("stats_evaluations?id=in.("+ids.join(",")+")",{method:"PATCH",headers:{Prefer:"return=minimal"},body:{statut:st}})});
}
function censStats(){
  const e=AE.cens[0];
  statVue({z:$("#zone"),portee:e.etablissements.nom,
    charger:s=>statLireTout(`stats_vue?select=*&etablissement_id=eq.${e.etablissement_id}&semestre=eq.${s}&${STAT_ORD}`)});
}
function encStats(){
  statVue({z:$("#zone"),portee:libPortee(ENC.p),charger:async s=>{const r=await rpc("stats_encadreur",{p_semestre:s});return r.rows||[]}});
}
function dirStats(){
  statVue({z:$("#zone"),portee:"Département de la Donga",charger:s=>statLireTout(`stats_vue?select=*&semestre=eq.${s}&${STAT_ORD}`)});
}
/* Saisie par l'enseignant */
async function ensStats(){
  const code=$("#cl").value,dv=$("#dv").value.trim(),fc=$("#fc").value,box=$("#sts");
  const nomCl=(listeClasses(ENS.matiere).find(c=>c.code===code)||{}).nom||code;
  let ex=[];try{const r=await rpc("mes_stats",{p_whatsapp:ENS.w,p_code:ENS.c},false);if(r.ok)ex=r.rows}catch(e){}
  box.innerHTML=`<div class="card"><h3>Statistiques des évaluations</h3><p class="mut">${esc(nomCl)} ${esc(dv)}</p>
  <label>Semestre</label><select id="ss"><option value="1">Semestre 1</option><option value="2">Semestre 2</option></select><div id="sf"></div>
  <button class="ok" id="se">Enregistrer et envoyer à mon AE</button><button class="sec" id="sfer">Fermer</button><div id="sm"></div></div>`;
  const ch=[["g_sup","sup","G"],["f_sup","sup","F"],["g_inf","inf","G"],["f_inf","inf","F"],["g_max","max","G"],["f_max","max","F"],["g_min","min","G"],["f_min","min","F"]];
  const exDe=(t,s)=>ex.find(r=>r.classe_code===code&&r.division===dv&&r.semestre===s&&r.type_eval===t);
  const val=(t,k)=>{const el=$(`[data-k="${t}.${k}"]`);return el?el.value.trim():""};
  const maj=t=>{
    const r={};ch.forEach(c=>r[c[0]]=val(t,c[0]));const c=statCalc(r);
    $("#t-"+t+"-sup").textContent=c.ts;$("#t-"+t+"-inf").textContent=c.ti;$("#t-"+t+"-max").textContent=fnS(c.max);$("#t-"+t+"-min").textContent=fnS(c.min);
    $("#r-"+t).textContent="Effectif : "+c.et+" (G "+c.eg+", F "+c.ef+") · Réussite : "+tauxTxt(c.taux);
  };
  const rend=()=>{
    const s=+$("#ss").value;
    $("#sf").innerHTML=EVALS.map(([t,n])=>{const e=exDe(t,s)||{};
      const inp=k=>`<input data-k="${t}.${k}" inputmode="decimal" value="${e[k]==null?"":String(e[k]).replace(".",",")}" style="width:100%;margin:0;padding:6px;text-align:center">`;
      return `<div style="margin:12px 0"><table class="st" style="width:100%"><tr><th>${n}${e.statut?` <span class="tag">${ETQ[e.statut]}</span>`:""}</th><th>G</th><th>F</th><th>Total</th></tr>
      <tr><td>Moy ≥ 10</td><td>${inp("g_sup")}</td><td>${inp("f_sup")}</td><td id="t-${t}-sup"></td></tr>
      <tr><td>Moy &lt; 10</td><td>${inp("g_inf")}</td><td>${inp("f_inf")}</td><td id="t-${t}-inf"></td></tr>
      <tr><td>Max</td><td>${inp("g_max")}</td><td>${inp("f_max")}</td><td id="t-${t}-max"></td></tr>
      <tr><td>Min</td><td>${inp("g_min")}</td><td>${inp("f_min")}</td><td id="t-${t}-min"></td></tr></table><div class="mut" id="r-${t}" style="font-size:12px"></div></div>`}).join("");
    EVALS.forEach(([t])=>{maj(t);document.querySelectorAll(`[data-k^="${t}."]`).forEach(i=>i.oninput=()=>maj(t))});
  };
  rend();$("#ss").onchange=rend;$("#sfer").onclick=()=>{box.innerHTML=""};
  $("#se").onclick=async()=>{
    const s=+$("#ss").value,lignes=[],m=$("#sm");
    for(const [t,n] of EVALS){
      const v={};ch.forEach(c=>v[c[0]]=val(t,c[0]));
      if(Object.values(v).every(x=>x===""||x==="0"))continue;
      const o={classe_code:code,division:dv,classe_formulaire:fc,semestre:s,type_eval:t};
      for(const c of ch){
        const x=nbS(v[c[0]]);
        if(c[1]==="sup"||c[1]==="inf"){if(x!=null&&(x<0||!Number.isInteger(x)))return note(m,n+" : l'effectif "+c[2]+" doit être un nombre entier.");o[c[0]]=x||0}
        else{if(x!=null&&(x<0||x>20))return note(m,n+" : les notes vont de 0 à 20.");o[c[0]]=x==null?"":x}
      }
      for(const g of ["g","f"]){
        const eff=o[g+"_sup"]+o[g+"_inf"];
        if(eff>0&&(o[g+"_max"]===""||o[g+"_min"]===""))return note(m,n+" : indiquez le Max et le Min des "+(g==="g"?"garçons":"filles")+".");
        if(o[g+"_max"]!==""&&o[g+"_min"]!==""&&o[g+"_min"]>o[g+"_max"])return note(m,n+" : le Min des "+(g==="g"?"garçons":"filles")+" dépasse le Max.");
      }
      const e=exDe(t,s);
      if(e&&ch.every(c=>(nbS(e[c[0]])||0)===(nbS(o[c[0]])||0)&&((c[1]==="sup"||c[1]==="inf")||(nbS(e[c[0]])==null)===(o[c[0]]===""))))continue;
      lignes.push(o);
    }
    if(!lignes.length)return note(m,"Rien de nouveau à envoyer.");
    try{const r=await rpc("soumettre_stats",{p_whatsapp:ENS.w,p_code:ENS.c,p_lignes:lignes},false);
      if(!r.ok)return note(m,r.message);
      lignes.forEach(l=>{ex=ex.filter(x=>!(x.classe_code===l.classe_code&&x.division===l.division&&x.semestre===l.semestre&&x.type_eval===l.type_eval));ex.push({...l,statut:"en_attente"})});
      rend();note($("#sm"),"Envoyé à votre AE ("+r.n+" évaluation(s)). Il le validera.","good");
    }catch(e){note(m,e.message)}
  };
  box.scrollIntoView();
}
