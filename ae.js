/* ====== AE ====== */
let AE={aff:[],cens:[],cur:null,tab:"valider",sem:semDefaut()};
async function aeDemarrer(){
  app.innerHTML='<div class="card">Chargement…</div>';
  try{
    const em=encodeURIComponent(sess.email);
    const [a,c]=await Promise.all([
      rest("affectations?select=id,nom,matiere,etablissement_id,etablissements(nom)&email=eq."+em+"&order=matiere"),
      rest("censeurs?select=email,whatsapp,role,etablissement_id,etablissements(nom)&email=eq."+em)]);
    if(!a.length&&!c.length){app.innerHTML=`<div class="card"><div class="msg err">Cette adresse (${esc(sess.email)}) n'est pas encore enregistrée. Demandez à votre censeur de vous ajouter comme AE.</div><button id="d">Se déconnecter</button></div>`;$("#d").onclick=deconnexion;return}
    AE.aff=a;AE.cens=c;AE.cur=a[0]||null;AE.tab=a.length?"valider":"aes";aeEcran();
  }catch(e){
    if(e.status===401){saveSess(null);return connexionRole("ae")}
    app.innerHTML=`<div class="card"><div class="msg err">${esc(e.message)}</div><button id="d">Retour</button></div>`;$("#d").onclick=accueil;
  }
}
function aeEcran(){
  const c=AE.cur;
  const tabs=[];
  if(AE.aff.length)tabs.push(["valider","À valider"],["saisir","Saisir pour un collègue"],["ens","Enseignants"],["stats","Statistiques"]);
  if(AE.cens.some(x=>x.role==="DIRECTEUR"))tabs.push(["suivi","Suivi du collège"]);
  if(AE.cens.length)tabs.push(["synth","Synthèse mensuelle"],["cstats","Stats du collège"],["merite","Enseignants méritants"]);
  if(AE.cens.length)tabs.push(["aes",AE.cens.some(x=>x.role==="DIRECTEUR")?"AE et censeurs":"AE du collège"]);
  tabs.push(["com","Communiqués"]);
  if(!tabs.some(t=>t[0]===AE.tab))AE.tab=tabs[0][0];
  app.innerHTML=`<div class="card"><div class="row" style="align-items:center"><div style="flex:3"><h2>${c?"AE "+esc(c.matiere):(AE.cens.some(x=>x.role==="DIRECTEUR")?"Directeur":"Censeur")}</h2><div class="mut">${esc(c?c.etablissements.nom:AE.cens[0].etablissements.nom)} · ${esc(sess.email)}</div></div>
  <button class="sec sm" id="q" style="flex:0 0 auto">Quitter</button></div>
  ${AE.aff.length>1?`<label>Discipline / collège</label><select id="sa">${AE.aff.map((a,i)=>`<option value="${i}" ${a.id===c.id?"selected":""}>${esc(a.matiere)} – ${esc(a.etablissements.nom)}</option>`).join("")}</select>`:""}
  ${c?`<label id="lsem">Semaine n°</label><div class="row"><input id="sem" inputmode="numeric" value="${esc(AE.sem)}" style="flex:2"><button id="oksem" class="sec" style="margin:0">Afficher</button></div>`:""}</div>
  <div class="tabs">${tabs.map(t=>`<button data-t="${t[0]}">${t[1]}</button>`).join("")}</div>
  <div id="zone"></div>`;
  $("#q").onclick=deconnexion;
  if($("#sa"))$("#sa").onchange=e=>{AE.cur=AE.aff[+e.target.value];aeEcran()};
  if($("#sem")){const majSem=()=>{AE.sem=$("#sem").value;semSauve(AE.sem);aeOnglet()};
    $("#oksem").onclick=majSem;$("#sem").onkeydown=e=>{if(e.key==="Enter")majSem()};}
  document.querySelectorAll(".tabs button").forEach(b=>b.onclick=()=>{AE.tab=b.dataset.t;aeOnglet()});
  aeOnglet();
}
function aeOnglet(){
  { const l=$("#lsem");if(l)l.textContent=AE.tab==="saisir"?"1. Semaine n° (puis touchez Afficher)":"Semaine n°"; }
  document.querySelectorAll(".tabs button").forEach(b=>b.classList.toggle("on",b.dataset.t===AE.tab));
  ({valider:aeValider,saisir:aeSaisir,ens:aeEns,aes:censAE,suivi:dirSuivi,stats:aeStats,cstats:censStats,merite:merCollege,synth:censSynthese,com:aeCom})[AE.tab]();
}
const semAE=()=>{const s=parseInt(AE.sem,10);return s>=1&&s<=45?s:null};
async function aeValider(){
  const z=$("#zone"),s=semAE();
  if(!s){z.innerHTML='<div class="msg err">Indiquez une semaine entre 1 et 45</div>';return}
  z.innerHTML='<div class="card">Chargement…</div>';
  try{
    const c=AE.cur;
    const [rows,ens]=await Promise.all([
      rest(`soumissions?select=*,enseignants(nom,matricule)&etablissement_id=eq.${c.etablissement_id}&matiere=eq.${c.matiere}&semaine=eq.${s}&order=statut,classe_formulaire`),
      rest(`enseignants?select=id,nom,matricule,whatsapp&etablissement_id=eq.${c.etablissement_id}&matiere=eq.${c.matiere}&actif=eq.true&order=nom`)]);
    const aveccpt=new Set(rows.map(r=>r.enseignant_id));
    const sans=ens.filter(e=>!aveccpt.has(e.id));
    const att=rows.filter(r=>r.statut==="en_attente");
    z.innerHTML=`<div class="card"><h3>Semaine ${s}</h3>
      <p class="mut">${att.length} à valider · ${rows.filter(r=>r.statut==="valide").length} validé(s) · ${sans.length} enseignant(s) sans point</p>
      ${att.length?'<button class="ok" id="tout">Tout valider ('+att.length+')</button>':""}
      ${rows.length?'<div class="mut" style="margin-top:8px">Télécharger le point de la semaine :</div><button class="sec sm" id="dlx">Excel</button><button class="sec sm" id="dlp">PDF</button>':""}<div id="alr"></div><div id="m"></div></div>
      ${rows.map(carteSoum).join("")}
      ${sans.length?`<div class="card"><h3>Sans point cette semaine</h3>${sans.map(e=>`<p>${esc(e.nom)} <span class="mut" data-der="${e.id}"></span><br><button class="sec sm" data-saisir="${e.id}">Saisir pour lui</button> <a href="${lienWA(e.whatsapp,"Mr/Mme "+e.nom+", merci d'envoyer votre point de progression de la semaine "+s+" sur la plateforme : "+SITE_URL+"\nPensez à cocher aussi toutes les séquences déjà exécutées, pas seulement celles de cette semaine. Merci.")}" target="_blank" rel="noopener">Relancer</a></p>`).join("")}</div>`:""}`;
    if($("#tout"))$("#tout").onclick=()=>majStatut(att.map(a=>a.id),"valide");
    plusAE(c,s,rows,sans);
    if($("#dlx"))$("#dlx").onclick=()=>aePointExcel(rows,sans,s);
    if($("#dlp"))$("#dlp").onclick=()=>aePointPDF(rows,sans,s);
    z.querySelectorAll("[data-v]").forEach(b=>b.onclick=()=>majStatut([b.dataset.v],"valide"));
    z.querySelectorAll("[data-r]").forEach(b=>b.onclick=()=>majStatut([b.dataset.r],"rejete"));
    z.querySelectorAll("[data-e]").forEach(b=>b.onclick=async()=>{
      const r=rows.find(x=>x.id===b.dataset.e);const box=$("#ed-"+r.id);await chargerMat(r.matiere);
      if(r.coches&&REF_MAT[r.matiere]){
        composantCoches({mat:r.matiere,classe:r.classe_code,coches:r.coches,date:r.date_situation,dateFixe:true,motif:r.motif,el:box,bouton:"Enregistrer et valider",
          onSave:async x=>{
            try{await rest("soumissions?id=eq."+r.id,{method:"PATCH",headers:{Prefer:"return=minimal"},body:{taux_prevu:x.prevu,taux_realise:x.realise,ecart:x.ecart,etat:x.etat,motif:x.motif,coches:x.coches,statut:"valide"}});aeValider()}
            catch(e){note($("#ckm"),e.message)}
          }});
        return;
      }
      box.innerHTML=`<div class="row"><div><label>Prévu %</label><input id="p-${r.id}" value="${r.taux_prevu}"></div><div><label>Réalisé %</label><input id="r-${r.id}" value="${r.taux_realise}"></div></div>
      <label>Motif</label><input id="mo-${r.id}" value="${esc(r.motif)}"><button class="ok sm" id="sv-${r.id}">Enregistrer et valider</button>`;
      $("#sv-"+r.id).onclick=async()=>{
        const pv=num($("#p-"+r.id).value),rl=num($("#r-"+r.id).value),mo=$("#mo-"+r.id).value.trim();
        if(pv==null||rl==null||pv<0||pv>100||rl<0||rl>100)return note($("#m"),"Taux entre 0 et 100");
        const et=evaluerStatut(pv,rl);if((et.statut==="retard"||et.statut==="non_commence")&&!mo)return note($("#m"),"Motif obligatoire en cas de retard");
        try{await rest("soumissions?id=eq."+r.id,{method:"PATCH",headers:{Prefer:"return=minimal"},body:{taux_prevu:pv,taux_realise:rl,ecart:et.ecart,etat:et.statut,motif:mo,statut:"valide"}});aeValider()}
        catch(e){note($("#m"),e.message)}
      };
    });
    z.querySelectorAll("[data-saisir]").forEach(b=>b.onclick=()=>{AE.pre=b.dataset.saisir;AE.tab="saisir";aeOnglet()});
  }catch(e){z.innerHTML=`<div class="msg err">${esc(e.message)}</div>`}
}
function carteSoum(r){
  const en=r.enseignants||{};
  return `<div class="card"><div class="row" style="align-items:center"><div style="flex:3"><b>${esc(en.nom)}</b><div class="mut">${esc(r.classe_formulaire)} ${esc(r.division)}${r.saisi_par==="ae"?" · saisi par l'AE":""}</div></div>
  <div style="flex:0 0 auto"><span class="tag t-${r.statut}">${STAT[r.statut]}</span></div></div>
  <p>Réalisé <b>${r.taux_realise}%</b> / prévu ${r.taux_prevu}% · écart ${r.ecart>0?"+":""}${r.ecart} <span class="tag t-${r.etat}">${ETAT[r.etat]||""}</span>${tagAlerte(r)}</p>
  ${r.motif?`<p class="mut">Motif : ${esc(r.motif)}</p>`:""}
  <div id="ed-${r.id}"></div>
  ${r.statut!=="valide"?`<button class="ok sm" data-v="${r.id}">Valider</button>`:""}<button class="sec sm" data-e="${r.id}">Corriger</button><button class="sec sm" data-crb="${r.id}" data-en="${r.enseignant_id}" data-cc="${esc(r.classe_code)}" data-dv="${esc(r.division)}">Courbe</button>${r.statut!=="rejete"?`<button class="ko sm" data-r="${r.id}">Rejeter</button>`:""}</div>`;
}

/* ---- Téléchargement du point de la semaine (collège + discipline de l'AE) ---- */
function aePointDonnees(rows,sans,s){
  { const m=new Map();rows.forEach(r=>{const k=[r.enseignant_id||(r.enseignants||{}).nom,r.classe_code,normDiv(r.division)].join("|"),o=m.get(k);if(!o||(r.statut==="valide"&&o.statut!=="valide")||(r.statut===o.statut&&String(r.maj_le||"")>String(o.maj_le||"")))m.set(k,r)});rows=[...m.values()]; }
  const c=AE.cur,etab=c.etablissements.nom,mat=NOM_MAT[c.matiere]||c.matiere;
  const tri=rows.slice().sort((x,y)=>String((x.enseignants||{}).nom||"").localeCompare(String((y.enseignants||{}).nom||""))||String(x.classe_formulaire).localeCompare(String(y.classe_formulaire)));
  const L=tri.map(r=>{const en=r.enseignants||{};return [en.nom||"",en.matricule||"",(r.classe_formulaire||"")+" "+(r.division||""),r.taux_prevu,r.taux_realise,r.ecart,ETAT[r.etat]||"",STAT[r.statut]||"",r.motif||""]});
  const nv=rows.filter(r=>r.statut==="valide").length;
  return {etab,mat,s,L,sans:sans.map(e=>e.nom),nv,total:rows.length,periode:(typeof periodeSemaine==="function"?periodeSemaine(s):"")};
}
const AE_ENT=["Enseignant","Matricule","Classe","Taux prévu (%)","Taux réalisé (%)","Écart (points)","Situation","Statut","Motif"];
function aePointExcel(rows,sans,s){
  const D=aePointDonnees(rows,sans,s);
  const H=v=>({v,s:3}),C=v=>({v,s:2});
  const t=[{v:[{v:"Point de la semaine "+D.s+" — "+D.etab+" — "+D.mat,s:5}],h:24},[D.periode],[D.nv+" point(s) validé(s) sur "+D.total],[],
    {v:AE_ENT.map(H),h:32}].concat(D.L.map(l=>({v:l.map(C),h:22})));
  if(D.sans.length){t.push([]);t.push(["Enseignants sans point cette semaine : "+D.sans.join(", ")])}
  t.push([]);t.push(["Établi par : "+sess.email]);
  telechargerBlob(classeurXLSX([{nom:"Point de la semaine",rows:t,larg:[28,12,16,12,12,12,14,12,36],fusions:["A1:I1"]}]),"Point-"+slug(D.etab)+"-"+slug(D.mat)+"-S"+D.s+".xlsx");
}
function aePointPDF(rows,sans,s){
  const D=aePointDonnees(rows,sans,s);
  let h='<div style="text-align:center;margin-bottom:10px"><div style="font-size:18px;font-weight:700">Point de la semaine '+D.s+'</div><div style="font-weight:700">'+esc(D.etab)+' — '+esc(D.mat)+'</div><div style="font-size:11px">'+esc(D.periode)+' · '+D.nv+' point(s) validé(s) sur '+D.total+'</div></div>';
  h+='<table class="te" style="font-size:11px"><thead><tr>'+AE_ENT.map(x=>'<th>'+esc(x)+'</th>').join("")+'</tr></thead><tbody>'+D.L.map(l=>'<tr>'+l.map(v=>'<td>'+esc(v)+'</td>').join("")+'</tr>').join("")+'</tbody></table>';
  if(D.sans.length)h+='<div style="margin-top:8px"><b>Enseignants sans point :</b> '+D.sans.map(esc).join(", ")+'</div>';
  h+='<div class="sign"><div>Établi par<br>'+esc(sess.email)+'</div><div>Le Chef d\'établissement</div></div>';
  $("#rapport").innerHTML=h;
  const st=document.createElement("style");st.id="pg-land";st.textContent="@page{size:A4 "+orientAuto()+";margin:10mm}";document.head.appendChild(st);
  const ancien=document.title;document.title="Point-"+slug(D.etab)+"-S"+D.s;
  document.body.classList.add("mode-rapport");
  const fin=()=>{document.body.classList.remove("mode-rapport");document.title=ancien;const e=document.getElementById("pg-land");if(e)e.remove();window.removeEventListener("afterprint",fin)};
  window.addEventListener("afterprint",fin);
  setTimeout(()=>window.print(),50);
}
async function majStatut(ids,st){
  try{
    for(let i=0;i<ids.length;i+=20){
      const lot=ids.slice(i,i+20);
      await rest("soumissions?id=in.("+lot.join(",")+")",{method:"PATCH",headers:{Prefer:"return=minimal"},body:{statut:st}});
    }
    aeValider();
  }catch(e){note($("#m"),e.message)}
}
function lienWA(n,t){return "https://wa.me/229"+tel(n)+"?text="+encodeURIComponent(t)}

async function aeSaisir(){
  const z=$("#zone"),c=AE.cur;
  await chargerMat(c.matiere);
  if(!listeClasses(c.matiere).length){z.innerHTML='<div class="msg err">Discipline non prise en charge.</div>';return}
  z.innerHTML='<div class="card">Chargement…</div>';
  try{
    const ens=await rest(`enseignants?select=id,nom,matricule&etablissement_id=eq.${c.etablissement_id}&matiere=eq.${c.matiere}&actif=eq.true&order=nom`);
    if(!ens.length){z.innerHTML='<div class="msg info">Ajoutez d\'abord vos collègues dans l\'onglet « Enseignants ».</div>';return}
    z.innerHTML=`<div class="card"><h3>Saisir le point d'un collègue</h3>
    <label>2. Enseignant</label><select id="en">${ens.map(e=>`<option value="${e.id}" ${AE.pre===e.id?"selected":""}>${esc(e.nom)}</option>`).join("")}</select>
    <label>3. Classe (niveau)</label><select id="cl">${listeClasses(c.matiere).map(x=>`<option value="${x.code}">${esc(x.nom)}</option>`).join("")}</select>
    <div class="row"><div><label>4. Numéro de la classe</label><select id="dv">${Array.from({length:15},(_,i)=>`<option value="${i+1}">${i+1}</option>`).join("")}</select></div>
    <div><label>5. Classe dans le formulaire de la Direction <span class="mut">(doit correspondre au niveau choisi en 3)</span></label><select id="fc">${FORM_CLASSES.map(x=>`<option>${x}</option>`).join("")}</select></div></div>
    <label>6. Contrôlez, puis ouvrez les notions</label><p class="mut" id="rec"></p>
    <button id="ouv">Ouvrir les notions</button><div id="m"></div></div><div id="ck"></div>`;
    const sw=SEMAINES_REF.find(x=>x[0]===+AE.sem);
    const rec=()=>{const nv=$("#cl").selectedOptions[0].textContent;$("#rec").innerHTML="Semaine "+esc(AE.sem)+(sw?" ("+esc(periodeSemaine(+AE.sem))+")":"")+" · <b>"+esc($("#en").selectedOptions[0].textContent)+"</b> · "+esc(nv)+" · classe n° "+$("#dv").value+" · formulaire : "+esc($("#fc").value)};
    const majFc=()=>{$("#fc").value=formDefaut($("#cl").value);rec()};majFc();$("#cl").onchange=majFc;["en","dv","fc"].forEach(i=>$("#"+i).onchange=rec);
    $("#ouv").onclick=async()=>{
      const eid=$("#en").value,code=$("#cl").value,dv=normDiv($("#dv").value),fc=$("#fc").value;
      if(!classeCoherente(code,fc))return note($("#m"),"Incohérence : vous avez choisi « "+$("#cl").selectedOptions[0].textContent+" » au point 3 mais « "+fc+" » au point 5. Corrigez avant de continuer.");
      let C={},motif="";
      try{
        const prev=await rest(`soumissions?select=coches,motif&enseignant_id=eq.${eid}&classe_code=eq.${encodeURIComponent(code)}&division=eq.${encodeURIComponent(dv)}&coches=not.is.null&order=semaine.desc&limit=1`);
        if(prev[0]&&prev[0].coches)C=prev[0].coches;
      }catch(e){}
      composantCoches({mat:c.matiere,classe:code,coches:C,motif,el:$("#ck"),bouton:"Enregistrer (déjà validé)",...(sw?{date:sw[2],dateFixe:true}:{}),
        onSave:async r=>{
          try{
            await rest("soumissions?on_conflict=enseignant_id,classe_code,division,semaine",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},
              body:{enseignant_id:eid,etablissement_id:c.etablissement_id,matiere:c.matiere,classe_code:code,division:dv,classe_formulaire:fc,semaine:r.semaine,date_situation:r.date,
              taux_prevu:r.prevu,taux_realise:r.realise,ecart:r.ecart,etat:r.etat,motif:r.motif,coches:r.coches,statut:"valide",saisi_par:"ae",valide_le:new Date().toISOString(),valide_par:sess.email}});
            note($("#ckm"),"Enregistré et validé pour la semaine "+r.semaine,"good");
          }catch(e){note($("#ckm"),e.message)}
        }});
      $("#ck").scrollIntoView();
    };
  }catch(e){z.innerHTML=`<div class="msg err">${esc(e.message)}</div>`}
}

async function aeEns(){
  const z=$("#zone"),c=AE.cur;
  z.innerHTML='<div class="card">Chargement…</div>';
  try{
    const ens=await rest(`enseignants?select=id,nom,matricule,whatsapp,email&etablissement_id=eq.${c.etablissement_id}&matiere=eq.${c.matiere}&actif=eq.true&order=nom`);
    z.innerHTML=`<div class="card"><h3>Ajouter un collègue</h3>
    <label>Nom et prénoms</label><input id="n"><label>Matricule</label><input id="mt">
    <label>Numéro WhatsApp</label><input id="w" inputmode="tel"><label>E-mail (facultatif)</label><input id="e" type="email">
    <button id="ad">Ajouter et créer son code</button><div id="m"></div></div>
    <div class="card"><h3>Mes collègues (${ens.length})</h3>${ens.map(e=>`<div style="padding:8px 0;border-top:1px solid var(--br)"><b>${esc(e.nom)}</b> <span class="mut">${esc(e.matricule)} · ${esc(e.whatsapp)}</span><br>
    <button class="sec sm" data-code="${e.id}" data-n="${esc(e.nom)}" data-w="${esc(e.whatsapp)}">Nouveau code</button><button class="ko sm" data-del="${e.id}" data-n="${esc(e.nom)}">Retirer</button><div id="cd-${e.id}"></div></div>`).join("")||'<p class="mut">Aucun collègue pour l\'instant.</p>'}</div>`;
    $("#ad").onclick=async()=>{
      const n=$("#n").value.trim(),mt=$("#mt").value.trim(),w=tel($("#w").value),em=$("#e").value.trim();
      if(n.length<3||!mt||w.length<8)return note($("#m"),"Nom, matricule et numéro WhatsApp sont obligatoires");
      try{
        const r=await rest("enseignants?select=id",{method:"POST",headers:{Prefer:"return=representation"},body:{etablissement_id:c.etablissement_id,matiere:c.matiere,matricule:mt,nom:n,whatsapp:w,email:em||null}});
        await donnerCode(r[0].id,n,w,true);
      }catch(e){note($("#m"),e.message.includes("duplicate")?"Ce matricule ou ce numéro existe déjà":e.message)}
    };
    z.querySelectorAll("[data-code]").forEach(b=>b.onclick=()=>donnerCode(b.dataset.code,b.dataset.n,b.dataset.w,false));
    z.querySelectorAll("[data-del]").forEach(b=>b.onclick=async()=>{
      if(!confirm("Retirer "+b.dataset.n+" ? Ses points déjà envoyés seront aussi supprimés."))return;
      try{await rest("enseignants?id=eq."+b.dataset.del,{method:"DELETE",headers:{Prefer:"return=minimal"}});aeEns()}catch(e){note($("#m"),e.message)}
    });
  }catch(e){z.innerHTML=`<div class="msg err">${esc(e.message)}</div>`}
}
async function donnerCode(id,nom,w,nouveau){
  const code=String(Math.floor(100000+Math.random()*900000));
  try{
    await rpc("definir_code",{p_ens:id,p_code:code});
    const txt=`Bonjour ${nom}, voici votre accès à la plateforme de suivi de progression (Donga) : numéro ${w}, code personnel ${code}. Ne le partagez pas.`;
    const html=`<div class="msg good">Code de ${esc(nom)} : <b style="font-size:20px">${code}</b><br>Notez-le ou envoyez-le maintenant (il ne sera plus affiché).<br><a href="${lienWA(w,txt)}" target="_blank" rel="noopener"><button class="ok sm">Envoyer par WhatsApp</button></a></div>`;
    if(nouveau){await aeEns();const m=$("#m");if(m)m.innerHTML=html}
    else{const b=$("#cd-"+id);if(b)b.innerHTML=html}
  }catch(e){const m=$("#m");if(m)note(m,e.message)}
}


