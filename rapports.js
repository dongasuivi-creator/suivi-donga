/* ====== Version 40 : synthèse mensuelle (collège), comparaison et rapport de période (Direction) ====== */
const RP={cm:0,mois:null};
const MOIS_MIN=["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
const moisListe=()=>{const m=[];SEMAINES_REF.forEach(w=>{const k=w[1].slice(0,7);if(!m.includes(k))m.push(k)});return m};
const libMois=k=>{const p=k.split("-");return MOIS_MIN[+p[1]-1]+" "+p[0]};
const auj40=()=>new Date().toISOString().slice(0,10);
const semDuMois=k=>[...new Set(SEMAINES_REF.filter(w=>w[1].slice(0,7)===k&&w[1]<=auj40()).map(w=>w[0]))].sort((a,b)=>a-b);
const r1=v=>Math.round((+v||0)*10)/10;
const tabH=(ent,lignes)=>`<div class="scroll"><table class="te"><thead><tr>${ent.map(h=>"<th>"+esc(h)+"</th>").join("")}</tr></thead><tbody>${lignes.map(l=>"<tr>"+l.map(c=>"<td>"+(c&&c.h!==undefined?c.h:esc(c))+"</td>").join("")+"</tr>").join("")}</tbody></table></div>`;
const pastille=(v)=>v>0.4?`<b style="color:#0a7d3e">▲ +${r1(v)}</b>`:v<-0.4?`<b style="color:#c0392b">▼ ${r1(v)}</b>`:`<span style="color:#666">＝ ${r1(v)}</span>`;

/* ---------- Directeur / Censeur : synthèse mensuelle ---------- */
function syCalcul(pts,ens,sems){
  const al=pts.filter(alerteRetard);
  const serie=sems.map(s=>{const r=pts.filter(p=>p.semaine===s);return r.length?{s,prevu:moy(r.map(x=>x.taux_prevu)),realise:moy(r.map(x=>x.taux_realise))}:null}).filter(Boolean);
  const mats=[...new Set(ens.map(e=>e.matiere).concat(pts.map(p=>p.matiere)))].sort();
  const disc=mats.map(m=>{const e=ens.filter(x=>x.matiere===m),r=pts.filter(x=>x.matiere===m);
    const paires=new Set(r.map(x=>x.enseignant_id+"|"+x.semaine)).size,att=e.length*sems.length;
    return {nom:NOM_MAT[m]||m,nbE:e.length,n:r.length,prevu:moy(r.map(x=>x.taux_prevu)),real:moy(r.map(x=>x.taux_realise)),al:r.filter(alerteRetard).length,envoi:att?Math.min(100,paires/att*100):0}});
  const manq=ens.map(e=>({nom:e.nom,mat:NOM_MAT[e.matiere]||e.matiere,m:sems.filter(s=>!pts.some(p=>p.enseignant_id===e.id&&p.semaine===s))})).filter(x=>x.m.length).sort((a,b)=>b.m.length-a.m.length);
  return {pts,ens,sems,al,serie,disc,manq,
    n:pts.length,val:pts.filter(p=>p.statut==="valide").length,prevu:moy(pts.map(x=>x.taux_prevu)),real:moy(pts.map(x=>x.taux_realise))};
}
function syHTML(nom,k,d){
  const et={};d.pts.forEach(p=>et[p.etat]=(et[p.etat]||0)+1);
  let h=`<div class="card"><h3>Vue d'ensemble — ${esc(libMois(k))}</h3><p><b>${d.n}</b> points reçus (${d.val} validés) pour <b>${d.ens.length}</b> enseignants sur <b>${d.sems.length}</b> semaine(s) · réalisé moyen <b>${Math.round(d.real)}%</b> pour <b>${Math.round(d.prevu)}%</b> prévu · <b style="color:${d.al.length?"#c0392b":"#0a7d3e"}">${d.al.length}</b> alerte(s) de retard</p>${svgEtats(et)}</div>`;
  h+=`<div class="card"><h3>Progression du collège</h3>${svgCourbe(d.serie,"Progression du mois")}</div>`;
  h+=`<div class="card"><h3>Par discipline</h3>${tabH(["Discipline","Ens.","Points","Taux d'envoi","Prévu %","Réalisé %","Alertes"],d.disc.map(x=>[x.nom,x.nbE,x.n,Math.round(x.envoi)+"%",Math.round(x.prevu),Math.round(x.real),x.al]))}</div>`;
  h+=`<div class="card"><h3>⚠ Classes en alerte de retard (${d.al.length})</h3>${d.al.length?tabH(["Semaine","Discipline","Enseignant","Classe","Écart"],d.al.sort((a,b)=>a.ecart-b.ecart).map(p=>["S"+p.semaine,NOM_MAT[p.matiere]||p.matiere,(p.enseignants||{}).nom||"",(p.classe_formulaire||"")+" "+(p.division||""),p.ecart])):'<p class="mut">Aucune alerte ce mois-ci.</p>'}</div>`;
  h+=`<div class="card"><h3>Enseignants avec semaines manquantes (${d.manq.length})</h3>${d.manq.length?tabH(["Enseignant","Discipline","Semaines sans point"],d.manq.map(x=>[x.nom,x.mat,x.m.map(s=>"S"+s).join(", ")])):'<p class="mut">Tous les enseignants ont envoyé chaque semaine. Bravo !</p>'}</div>`;
  return h;
}
async function censSynthese(){
  const z=$("#zone"),cl=AE.cens,mois=moisListe().filter(k=>semDuMois(k).length);
  if(!mois.length){z.innerHTML='<div class="card"><p class="mut">Aucun mois commencé pour le moment.</p></div>';return}
  if(!RP.mois||!mois.includes(RP.mois))RP.mois=mois.includes(auj40().slice(0,7))?auj40().slice(0,7):mois[mois.length-1];
  const et=cl[Math.min(RP.cm,cl.length-1)],k=RP.mois;
  z.innerHTML=`<div class="card"><h3>Synthèse mensuelle du collège</h3>${cl.length>1?`<label>Collège</label><select id="rpc">${cl.map((x,i)=>`<option value="${i}" ${i===RP.cm?"selected":""}>${esc(x.etablissements.nom)}</option>`).join("")}</select>`:`<div class="mut">${esc(et.etablissements.nom)}</div>`}
  <label>Mois</label><select id="rpm">${mois.map(m=>`<option value="${m}" ${m===k?"selected":""}>${esc(libMois(m))}</option>`).join("")}</select></div><div id="syz"><div class="card">Chargement…</div></div>`;
  if($("#rpc"))$("#rpc").onchange=e=>{RP.cm=+e.target.value;censSynthese()};
  $("#rpm").onchange=e=>{RP.mois=e.target.value;censSynthese()};
  try{
    const id=et.etablissement_id,sems=semDuMois(k);
    const [pts,ens]=await Promise.all([
      statLireTout(`soumissions?select=enseignant_id,matiere,classe_formulaire,division,semaine,taux_prevu,taux_realise,ecart,etat,statut,enseignants(nom)&etablissement_id=eq.${id}&semaine=in.(${sems.join(",")})&statut=neq.rejete&order=semaine`),
      rest(`enseignants?select=id,nom,matiere&actif=eq.true&etablissement_id=eq.${id}&order=nom`)]);
    const d=syCalcul(pts,ens,sems),nom=et.etablissements.nom;
    $("#syz").innerHTML=`<div class="card"><button class="sec sm" id="syp">PDF (à imprimer)</button><button class="sec sm" id="syx">Excel</button></div>`+syHTML(nom,k,d);
    $("#syp").onclick=()=>imprimerHTML(`<div style="text-align:center;margin-bottom:10px"><div style="font-size:18px;font-weight:700">Synthèse mensuelle — ${esc(libMois(k))}</div><div style="font-weight:700">${esc(nom)}</div></div>`+syHTML(nom,k,d).replace(/class="card"/g,'style="margin:10px 0;page-break-inside:avoid"')+`<div class="sign"><div>Établi par<br>${esc(sess.email)}</div><div>Le Directeur</div></div>`,"Synthese-"+slug(nom)+"-"+k,"portrait");
    $("#syx").onclick=()=>{const H=v=>({v,s:3}),C=v=>({v,s:2});
      telechargerBlob(classeurXLSX([
        {nom:"Disciplines",rows:[{v:["Discipline","Enseignants","Points","Taux d'envoi %","Prévu %","Réalisé %","Alertes"].map(H),h:30}].concat(d.disc.map(x=>({v:[x.nom,x.nbE,x.n,Math.round(x.envoi),Math.round(x.prevu),Math.round(x.real),x.al].map(C),h:22}))),larg:[22,12,10,14,10,10,10]},
        {nom:"Alertes",rows:[{v:["Semaine","Discipline","Enseignant","Classe","Écart"].map(H),h:30}].concat(d.al.map(p=>({v:["S"+p.semaine,NOM_MAT[p.matiere]||p.matiere,(p.enseignants||{}).nom||"",(p.classe_formulaire||"")+" "+(p.division||""),p.ecart].map(C),h:22}))),larg:[10,20,28,16,10]},
        {nom:"Semaines manquantes",rows:[{v:["Enseignant","Discipline","Semaines sans point"].map(H),h:30}].concat(d.manq.map(x=>({v:[x.nom,x.mat,x.m.map(s=>"S"+s).join(", ")].map(C),h:22}))),larg:[28,20,30]}]),"Synthese-"+slug(nom)+"-"+k+".xlsx")};
  }catch(e){$("#syz").innerHTML='<div class="card"><div class="msg err">'+esc(e.message)+'</div></div>'}
}
/* alertes de la semaine dans « Suivi du collège » */
function plusSuiviAlertes(zz,sou){
  const al=sou.filter(alerteRetard);if(!al.length)return;
  const c=document.createElement("div");c.className="card";
  c.innerHTML=`<h3>⚠ Classes en alerte cette semaine (${al.length})</h3>`+tabH(["Discipline","Enseignant","Classe","Écart"],al.sort((a,b)=>a.ecart-b.ecart).map(p=>[NOM_MAT[p.matiere]||p.matiere,(p.enseignants||{}).nom||"",(p.classe_formulaire||"")+" "+(p.division||""),p.ecart]));
  zz.prepend(c);
}

/* ---------- Direction : données communes ---------- */
async function dirDonnees(){
  const [rows,etabs]=await Promise.all([statLireTout("points_valides?select=etablissement,matiere,semaine,taux_prevu,taux_realise,ecart,etat,matricule"),rest("etablissements?select=nom,commune&order=nom")]);
  const com={};etabs.forEach(e=>com[e.nom]=e.commune||"Non renseignée");
  rows.forEach(r=>{r.commune=com[r.etablissement]||"Non renseignée";r.disc=NOM_MAT[r.matiere]||r.matiere});
  return rows;
}
function agg(rows,cle){const g={};rows.forEach(r=>{(g[cle(r)]=g[cle(r)]||[]).push(r)});
  return Object.keys(g).map(k=>({k,n:g[k].length,prevu:moy(g[k].map(x=>x.taux_prevu)),real:moy(g[k].map(x=>x.taux_realise)),al:g[k].filter(alerteRetard).length,rows:g[k]}))}
const entre=(rows,a,b)=>rows.filter(r=>r.semaine>=a&&r.semaine<=b);
const lireSem=(id,def)=>{const v=parseInt($("#"+id).value,10);return v>=1&&v<=45?v:def};

/* ---------- Direction : comparer deux périodes ---------- */
const CMP={};
async function dirComparer(){
  const z=$("#zone");z.innerHTML='<div class="card">Chargement…</div>';
  try{
    const rows=await dirDonnees(),M=rows.length?Math.max(...rows.map(r=>r.semaine)):1;
    const b2=CMP.b2||M,b1=CMP.b1||Math.max(1,M-3),a2=CMP.a2||Math.max(1,b1-1),a1=CMP.a1||Math.max(1,a2-3);
    const champ=(id,v)=>`<input id="${id}" inputmode="numeric" value="${v}" style="width:70px;display:inline-block">`;
    z.innerHTML=`<div class="card"><h3>Comparer deux périodes</h3>
      <p>Période A (avant) : semaines ${champ("ca1",a1)} à ${champ("ca2",a2)}</p>
      <p>Période B (après) : semaines ${champ("cb1",b1)} à ${champ("cb2",b2)}</p>
      <button id="cgo">Comparer</button></div><div id="cz"></div>`;
    const go=()=>{CMP.a1=lireSem("ca1",1);CMP.a2=lireSem("ca2",1);CMP.b1=lireSem("cb1",1);CMP.b2=lireSem("cb2",M);
      const A=entre(rows,CMP.a1,CMP.a2),B=entre(rows,CMP.b1,CMP.b2);
      const bloc=(titre,cle)=>{const ka=agg(A,cle),kb=agg(B,cle),noms=[...new Set(ka.map(x=>x.k).concat(kb.map(x=>x.k)))];
        const L=noms.map(n=>{const a=ka.find(x=>x.k===n),b=kb.find(x=>x.k===n);return {n,a:a?a.real:null,b:b?b.real:null,d:(a&&b)?b.real-a.real:null}});
        L.sort((x,y)=>(y.d===null?-999:y.d)-(x.d===null?-999:x.d));
        return `<div class="card"><h3>${titre}</h3>${tabH([titre.replace("Par ","").replace(/^./,c=>c.toUpperCase()),"Réalisé A %","Réalisé B %","Évolution (points)"],L.map(x=>[x.n,x.a===null?"–":Math.round(x.a),x.b===null?"–":Math.round(x.b),{h:x.d===null?"–":pastille(x.d)}]))}</div>`};
      const ga=moy(A.map(x=>x.taux_realise)),gb=moy(B.map(x=>x.taux_realise));
      const cols=agg(B,r=>r.etablissement).map(x=>{const a=agg(A,r=>r.etablissement).find(y=>y.k===x.k);return a?x.real-a.real:null}).filter(v=>v!==null);
      const html=`<div class="card"><h3>Résultat</h3><p>Réalisé moyen : <b>${Math.round(ga)}%</b> (A) → <b>${Math.round(gb)}%</b> (B) · ${pastille(gb-ga)} points</p>
        <p class="mut">${cols.filter(v=>v>0.4).length} collège(s) en progression · ${cols.filter(v=>v<-0.4).length} en baisse · ${cols.filter(v=>Math.abs(v)<=0.4).length} stables</p>
        <button class="sec sm" id="cpdf">PDF (à imprimer)</button></div>`+bloc("Par collège",r=>r.etablissement)+bloc("Par commune",r=>r.commune)+bloc("Par discipline",r=>r.disc);
      $("#cz").innerHTML=(A.length&&B.length)?html:'<div class="msg err">Pas de points validés sur l\'une des deux périodes.</div>';
      if($("#cpdf"))$("#cpdf").onclick=()=>imprimerHTML(`<div style="text-align:center;margin-bottom:10px"><div style="font-size:18px;font-weight:700">Comparaison de deux périodes</div><div>A : semaines ${CMP.a1} à ${CMP.a2} · B : semaines ${CMP.b1} à ${CMP.b2}</div></div>`+html.replace(/<button[^>]*>.*?<\/button>/,"").replace(/class="card"/g,'style="margin:10px 0"'),"Comparaison-periodes","portrait")};
    $("#cgo").onclick=go;go();
  }catch(e){z.innerHTML='<div class="card"><div class="msg err">'+esc(e.message)+'</div></div>'}
}

/* ---------- Direction : rapport de période (trimestre, mois…) ---------- */
const RAP={};
function rapHTML(rows,de,a){
  const et={};rows.forEach(r=>et[r.etat]=(et[r.etat]||0)+1);
  const sem=agg(rows,r=>r.semaine).map(x=>({s:+x.k,prevu:x.prevu,realise:x.real})).sort((p,q)=>p.s-q.s);
  const col=agg(rows,r=>r.etablissement).sort((x,y)=>y.real-x.real);
  const al=rows.filter(alerteRetard);
  const comm=(agg(rows,r=>r.commune)).sort((x,y)=>y.real-x.real),disc=agg(rows,r=>r.disc).sort((x,y)=>y.real-x.real);
  const cmn=r=>(rows.find(x=>x.etablissement===r)||{}).commune||"";
  return `<div class="card"><h3>Vue d'ensemble — semaines ${de} à ${a}</h3><p><b>${rows.length}</b> points validés · <b>${col.length}</b> collèges · réalisé moyen <b>${Math.round(moy(rows.map(r=>r.taux_realise)))}%</b> pour <b>${Math.round(moy(rows.map(r=>r.taux_prevu)))}%</b> prévu · <b style="color:#c0392b">${al.length}</b> alerte(s) de retard</p>${svgEtats(et)}</div>
  <div class="card"><h3>Évolution par semaine</h3>${svgCourbe(sem,"Évolution")}</div>
  <div class="card"><h3>Classement des collèges</h3>${tabH(["Rang","Collège","Commune","Points","Prévu %","Réalisé %","Alertes"],col.map((x,i)=>[i+1,x.k,cmn(x.k),x.n,Math.round(x.prevu),Math.round(x.real),x.al]))}</div>
  <div class="card"><h3>Par commune</h3>${svgBarres(comm.map(x=>({l:x.k+" ("+x.n+")",v:x.real})),{couleur:coulTaux})}</div>
  <div class="card"><h3>Par discipline</h3>${svgBarres(disc.map(x=>({l:x.k+" ("+x.n+")",v:x.real})),{couleur:coulTaux})}</div>
  <div class="card"><h3>Collèges à suivre (réalisé sous 70 % ou alertes)</h3>${(()=>{const s=col.filter(x=>x.real<70||x.al>0);return s.length?tabH(["Collège","Réalisé %","Alertes"],s.map(x=>[x.k,Math.round(x.real),x.al])):'<p class="mut">Aucun collège en difficulté sur cette période.</p>'})()}</div>`;
}
async function dirRapport(){
  const z=$("#zone");z.innerHTML='<div class="card">Chargement…</div>';
  try{
    const rows=await dirDonnees(),M=rows.length?Math.max(...rows.map(r=>r.semaine)):1;
    const de=RAP.de||1,a=RAP.a||M;
    z.innerHTML=`<div class="card"><h3>Rapport de période</h3><p class="mut">Par exemple un trimestre, un mois ou un semestre : choisissez les semaines.</p>
      <p>Du <b>semaine</b> <input id="rd" inputmode="numeric" value="${de}" style="width:70px;display:inline-block"> à la semaine <input id="ra" inputmode="numeric" value="${a}" style="width:70px;display:inline-block"></p>
      <button id="rgo">Afficher</button></div><div id="rz"></div>`;
    const go=()=>{RAP.de=lireSem("rd",1);RAP.a=lireSem("ra",M);
      const R=entre(rows,RAP.de,RAP.a);
      if(!R.length){$("#rz").innerHTML='<div class="msg err">Aucun point validé sur cette période.</div>';return}
      $("#rz").innerHTML=`<div class="card"><button class="sec sm" id="rpp">PDF (à imprimer)</button><button class="sec sm" id="rpx">Excel</button></div>`+rapHTML(R,RAP.de,RAP.a);
      $("#rpp").onclick=()=>imprimerHTML(`<div style="text-align:center;margin-bottom:10px"><div style="font-size:18px;font-weight:700">Rapport de suivi des progressions</div><div style="font-weight:700">Département de la Donga</div><div style="font-size:12px">Semaines ${RAP.de} à ${RAP.a}</div></div>`+rapHTML(R,RAP.de,RAP.a).replace(/class="card"/g,'style="margin:10px 0;page-break-inside:avoid"')+`<div class="sign"><div>Établi par<br>${esc(sess.email)}</div><div>La Direction Départementale</div></div>`,"Rapport-Donga-S"+RAP.de+"-S"+RAP.a,"portrait");
      $("#rpx").onclick=()=>{const H=v=>({v,s:3}),C=v=>({v,s:2});
        const f=(cle,ent)=>[{v:ent.map(H),h:30}].concat(agg(R,cle).sort((x,y)=>y.real-x.real).map((x,i)=>({v:[i+1,x.k,x.n,Math.round(x.prevu),Math.round(x.real),x.al].map(C),h:22})));
        telechargerBlob(classeurXLSX([
          {nom:"Collèges",rows:f(r=>r.etablissement,["Rang","Collège","Points","Prévu %","Réalisé %","Alertes"]),larg:[8,34,10,10,10,10]},
          {nom:"Communes",rows:f(r=>r.commune,["Rang","Commune","Points","Prévu %","Réalisé %","Alertes"]),larg:[8,26,10,10,10,10]},
          {nom:"Disciplines",rows:f(r=>r.disc,["Rang","Discipline","Points","Prévu %","Réalisé %","Alertes"]),larg:[8,26,10,10,10,10]}]),"Rapport-Donga-S"+RAP.de+"-S"+RAP.a+".xlsx")};
    };
    $("#rgo").onclick=go;go();
  }catch(e){z.innerHTML='<div class="card"><div class="msg err">'+esc(e.message)+'</div></div>'}
}
