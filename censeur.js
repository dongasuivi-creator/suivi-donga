async function censAE(){
  const z=$("#zone"),ids=AE.cens.map(x=>x.etablissement_id);
  z.innerHTML='<div class="card">Chargement…</div>';
  try{
    const estDir=AE.cens.some(x=>x.role==="DIRECTEUR");
    const dids=AE.cens.filter(x=>x.role==="DIRECTEUR").map(x=>x.etablissement_id);
    const [a,cl]=await Promise.all([
      rest("affectations?select=id,nom,email,whatsapp,matiere,etablissement_id,etablissements(nom)&etablissement_id=in.("+ids.join(",")+")&order=matiere"),
      estDir?rest("censeurs?select=email,nom,whatsapp,role,etablissement_id,etablissements(nom)&etablissement_id=in.("+dids.join(",")+")&order=role,nom"):Promise.resolve([])]);
    z.innerHTML=`${estDir?`<div class="card"><h3>Ajouter un censeur</h3><p class="mut">Le censeur se connecte avec cet e-mail (code reçu par e-mail) et peut gérer les AE du collège.</p>
    ${dids.length>1?`<label>Collège</label><select id="dce">${AE.cens.filter(x=>x.role==="DIRECTEUR").map(x=>`<option value="${x.etablissement_id}">${esc(x.etablissements.nom)}</option>`).join("")}</select>`:""}
    <label>Nom et prénoms</label><input id="dn"><label>E-mail du censeur</label><input id="de" type="email" inputmode="email"><label>Numéro WhatsApp</label><input id="dw" inputmode="tel" placeholder="01 97 89 09 52">
    <button id="dad">Ajouter ce censeur</button><div id="dm"></div></div>
    <div class="card"><h3>Directeur et censeurs (${cl.length})</h3>${cl.map(x=>`<p style="border-top:1px solid var(--br);padding-top:6px"><b>${x.role==="DIRECTEUR"?"Directeur":"Censeur"}</b> · ${esc(x.nom||"")} <span class="mut">${esc(x.email)}${x.whatsapp?" · "+esc(x.whatsapp):""}</span> ${x.role==="CENSEUR"?`<button class="ko sm" data-dc="${esc(x.email)}" data-de="${x.etablissement_id}">Retirer</button>`:""}</p>`).join("")}</div>`:""}
    <div class="card"><h3>Ajouter un AE</h3><p class="mut">L'AE se connectera ensuite avec cet e-mail (code reçu par e-mail).</p>
    ${AE.cens.length>1?`<label>Collège</label><select id="ce">${AE.cens.map(x=>`<option value="${x.etablissement_id}">${esc(x.etablissements.nom)}</option>`).join("")}</select>`:""}
    <label>Nom et prénoms</label><input id="n"><label>E-mail de l'AE (pour sa connexion)</label><input id="e" type="email" inputmode="email">
    <label>Numéro WhatsApp de l'AE</label><input id="w" inputmode="tel" placeholder="01 97 89 09 52">
    <label>Discipline</label><select id="d">${MATIERES.map(m=>`<option>${m}</option>`).join("")}</select>
    <button id="ad">Ajouter cet AE</button><div id="m"></div></div>
    <div class="card"><h3>Mon numéro WhatsApp</h3><div class="row"><input id="mw" inputmode="tel" value="${esc(AE.cens[0].whatsapp||"")}" placeholder="01 97 89 09 52" style="flex:2"><button class="sec" id="svw" style="margin:0">Enregistrer</button></div><div id="mw2"></div></div>
    <div class="card"><h3>AE de mon collège (${a.length})</h3>${a.map(x=>`<p style="border-top:1px solid var(--br);padding-top:6px"><b>${esc(x.matiere)}</b> · ${esc(x.nom||"")} <span class="mut">${esc(x.email)}${x.whatsapp?" · "+esc(x.whatsapp):""}</span> ${x.whatsapp?`<a href="${lienWA(x.whatsapp,"Bonjour "+(x.nom||"")+", vous êtes enregistré comme AE sur la plateforme de suivi de progression (Donga). Connectez-vous avec votre e-mail.")}" target="_blank" rel="noopener">WhatsApp</a> `:""}<button class="ko sm" data-d="${x.id}">Retirer</button></p>`).join("")||'<p class="mut">Aucun AE pour l\'instant.</p>'}</div>`;
    if($("#dad"))$("#dad").onclick=async()=>{
      const n=$("#dn").value.trim(),e=$("#de").value.trim().toLowerCase();
      if(n.length<3||!/^\S+@\S+\.\S+$/.test(e))return note($("#dm"),"Nom et e-mail valides obligatoires");
      try{await rest("censeurs",{method:"POST",headers:{Prefer:"return=minimal"},body:{email:e,nom:n,whatsapp:tel($("#dw").value)||null,etablissement_id:$("#dce")?$("#dce").value:dids[0]}});censAE()}
      catch(er){note($("#dm"),er.message.includes("duplicate")?"Cette personne est déjà enregistrée dans ce collège":er.message)}
    };
    z.querySelectorAll("[data-dc]").forEach(b=>b.onclick=async()=>{
      if(!confirm("Retirer ce censeur ?"))return;
      try{await rest("censeurs?email=eq."+encodeURIComponent(b.dataset.dc)+"&etablissement_id=eq."+b.dataset.de+"&role=eq.CENSEUR",{method:"DELETE",headers:{Prefer:"return=minimal"}});censAE()}catch(er){note($("#dm"),er.message)}
    });
    $("#svw").onclick=async()=>{
      const w=tel($("#mw").value);if(w.length<8)return note($("#mw2"),"Numéro invalide");
      try{await rest("censeurs?email=eq."+encodeURIComponent(sess.email),{method:"PATCH",headers:{Prefer:"return=minimal"},body:{whatsapp:w}});AE.cens.forEach(x=>x.whatsapp=w);note($("#mw2"),"Numéro enregistré","good")}catch(er){note($("#mw2"),er.message)}
    };
    $("#ad").onclick=async()=>{
      const n=$("#n").value.trim(),e=$("#e").value.trim().toLowerCase();
      if(n.length<3||!/^\S+@\S+\.\S+$/.test(e))return note($("#m"),"Nom et e-mail valides obligatoires");
      try{await rest("affectations",{method:"POST",headers:{Prefer:"return=minimal"},body:{email:e,nom:n,whatsapp:tel($("#w").value)||null,etablissement_id:$("#ce")?$("#ce").value:ids[0],matiere:$("#d").value}});censAE()}
      catch(er){note($("#m"),er.message.includes("duplicate")?"Cet AE est déjà enregistré pour cette discipline":er.message)}
    };
    z.querySelectorAll("[data-d]").forEach(b=>b.onclick=async()=>{
      if(!confirm("Retirer cet AE ?"))return;
      try{await rest("affectations?id=eq."+b.dataset.d,{method:"DELETE",headers:{Prefer:"return=minimal"}});censAE()}catch(er){note($("#m"),er.message)}
    });
  }catch(e){z.innerHTML=`<div class="msg err">${esc(e.message)}</div>`}
}


/* ====== Directeur : suivi du collège ====== */
let DS={sem:null,idx:0};
async function dirSuivi(){
  const z=$("#zone"),dl=AE.cens.filter(x=>x.role==="DIRECTEUR");
  if(!DS.sem)DS.sem=AE.sem;
  const et=dl[Math.min(DS.idx,dl.length-1)],s=parseInt(DS.sem,10);
  const tete=`<div class="card"><h3>Suivi du collège</h3>${dl.length>1?`<label>Collège</label><select id="dsc">${dl.map((x,i)=>`<option value="${i}" ${i===DS.idx?"selected":""}>${esc(x.etablissements.nom)}</option>`).join("")}</select>`:`<div class="mut">${esc(et.etablissements.nom)}</div>`}
    <label>Semaine n°</label><div class="row"><input id="dss" inputmode="numeric" value="${esc(DS.sem)}" style="flex:2"><button id="dsok" class="sec" style="margin:0">Afficher</button></div></div><div id="dsz"></div>`;
  z.innerHTML=tete;
  if($("#dsc"))$("#dsc").onchange=e=>{DS.idx=+e.target.value;dirSuivi()};
  const go=()=>{DS.sem=$("#dss").value;dirSuivi()};$("#dsok").onclick=go;$("#dss").onkeydown=e=>{if(e.key==="Enter")go()};
  const zz=$("#dsz");
  if(!(s>=1&&s<=45)){zz.innerHTML='<div class="msg err">Indiquez une semaine entre 1 et 45</div>';return}
  zz.innerHTML='<div class="card">Chargement…</div>';
  try{
    const id=et.etablissement_id;
    const [aff,ens,sou]=await Promise.all([
      rest("affectations?select=nom,email,whatsapp,matiere&etablissement_id=eq."+id),
      rest("enseignants?select=id,nom,matricule,whatsapp,matiere&actif=eq.true&etablissement_id=eq."+id+"&order=nom"),
      rest("soumissions?select=*,enseignants(nom,matricule)&etablissement_id=eq."+id+"&semaine=eq."+s+"&order=matiere,classe_formulaire")]);
    const mats=[...new Set(aff.map(x=>x.matiere).concat(ens.map(x=>x.matiere)).concat(sou.map(x=>x.matiere)))].sort();
    const D=mats.map(m=>{
      const e=ens.filter(x=>x.matiere===m),r=sou.filter(x=>x.matiere===m),envoi=new Set(r.map(x=>x.enseignant_id));
      return {m,nom:NOM_MAT[m]||m,ae:aff.filter(x=>x.matiere===m),nbE:e.length,env:envoi.size,val:r.filter(x=>x.statut==="valide").length,att:r.filter(x=>x.statut==="en_attente").length,sans:e.filter(x=>!envoi.has(x.id)).map(x=>x.nom)};
    });
    const tot={e:D.reduce((a,x)=>a+x.nbE,0),env:D.reduce((a,x)=>a+x.env,0),val:D.reduce((a,x)=>a+x.val,0),att:D.reduce((a,x)=>a+x.att,0)};
    const msgAE=(x,d)=>"Bonjour "+(x.nom||"")+", merci de "+(d.att?"valider les "+d.att+" point(s) en attente":"relancer vos collègues")+(d.sans.length?" et de relancer ceux qui n'ont pas encore envoyé ("+d.sans.length+")":"")+" pour la semaine "+s+" ("+d.nom+") sur la plateforme de suivi : https://suivi-donga.ddes-donga.workers.dev. Merci. – Le Directeur";
    zz.innerHTML=`<div class="card"><p><b>Semaine ${s}</b> · ${tot.env} enseignant(s) ont envoyé sur ${tot.e} · ${tot.val} point(s) validé(s) · ${tot.att} à valider</p>
      ${sou.length?'<div class="mut">Télécharger le point du collège :</div><button class="sec sm" id="dsx">Excel</button><button class="sec sm" id="dsp">PDF</button>':""}</div>
      ${D.map(d=>{const pb=d.att>0||d.sans.length>0;return `<div class="card"><div class="row" style="align-items:center"><div style="flex:3"><b>${esc(d.nom)}</b><div class="mut">AE : ${d.ae.length?d.ae.map(x=>esc(x.nom||x.email)).join(", "):"aucun"}</div></div><div style="flex:0 0 auto"><span class="tag ${pb?"t-en_attente":"t-valide"}">${pb?"À relancer":"À jour"}</span></div></div>
        <p>Enseignants : ${d.nbE} · ont envoyé : ${d.env} · validés : ${d.val} · à valider : ${d.att}</p>
        ${d.sans.length?`<p class="mut">Sans point : ${d.sans.map(esc).join(", ")}</p>`:""}
        ${pb?d.ae.filter(x=>x.whatsapp).map(x=>`<a href="${lienWA(x.whatsapp,msgAE(x,d))}" target="_blank" rel="noopener"><button class="ok sm">Relancer ${esc(x.nom||"l'AE")} (WhatsApp)</button></a>`).join("")+(d.ae.some(x=>x.whatsapp)?"":'<p class="mut">Aucun numéro WhatsApp d\'AE enregistré.</p>'):""}</div>`}).join("")||'<div class="msg info">Aucune discipline enregistrée pour ce collège.</div>'}`;
    if($("#dsx"))$("#dsx").onclick=()=>dirSuiviExcel(et,s,sou,D);
    if($("#dsp"))$("#dsp").onclick=()=>dirSuiviPDF(et,s,sou,D);
  }catch(e){zz.innerHTML=`<div class="msg err">${esc(e.message)}</div>`}
}
const DS_ENT=["Discipline","Enseignant","Matricule","Classe","Taux prévu (%)","Taux réalisé (%)","Écart (points)","Situation","Statut","Motif"];
function dsLignes(sou){return sou.map(r=>{const en=r.enseignants||{};return [NOM_MAT[r.matiere]||r.matiere,en.nom||"",en.matricule||"",(r.classe_formulaire||"")+" "+(r.division||""),r.taux_prevu,r.taux_realise,r.ecart,ETAT[r.etat]||"",STAT[r.statut]||"",r.motif||""]})}
function dirSuiviExcel(et,s,sou,D){
  const H=v=>({v,s:3}),C=v=>({v,s:2}),nom=et.etablissements.nom;
  const t=[{v:[{v:"Point de la semaine "+s+" — "+nom,s:5}],h:24},[typeof periodeSemaine==="function"?periodeSemaine(s):""],[],{v:DS_ENT.map(H),h:32}].concat(dsLignes(sou).map(l=>({v:l.map(C),h:22})));
  t.push([]);t.push(["Établi par : "+sess.email]);
  const r=[{v:["Discipline","Enseignants","Ont envoyé","Validés","À valider","Sans point"].map(H),h:30}].concat(D.map(d=>({v:[d.nom,d.nbE,d.env,d.val,d.att,d.sans.join(", ")].map(C),h:22})));
  telechargerBlob(classeurXLSX([{nom:"Résumé",rows:r,larg:[22,12,12,10,10,50]},{nom:"Point de la semaine",rows:t,larg:[18,28,12,16,12,12,12,14,12,36],fusions:["A1:J1"]}]),"Point-"+slug(nom)+"-S"+s+".xlsx");
}
function dirSuiviPDF(et,s,sou,D){
  const nom=et.etablissements.nom;
  let h='<div style="text-align:center;margin-bottom:10px"><div style="font-size:18px;font-weight:700">Point de la semaine '+s+'</div><div style="font-weight:700">'+esc(nom)+'</div><div style="font-size:11px">'+esc(typeof periodeSemaine==="function"?periodeSemaine(s):"")+'</div></div>';
  h+='<table class="te" style="font-size:11px;margin-bottom:10px"><thead><tr>'+["Discipline","Enseignants","Ont envoyé","Validés","À valider"].map(x=>'<th>'+x+'</th>').join("")+'</tr></thead><tbody>'+D.map(d=>'<tr><td>'+esc(d.nom)+'</td><td>'+d.nbE+'</td><td>'+d.env+'</td><td>'+d.val+'</td><td>'+d.att+'</td></tr>').join("")+'</tbody></table>';
  h+='<table class="te" style="font-size:11px"><thead><tr>'+DS_ENT.map(x=>'<th>'+esc(x)+'</th>').join("")+'</tr></thead><tbody>'+dsLignes(sou).map(l=>'<tr>'+l.map(v=>'<td>'+esc(v)+'</td>').join("")+'</tr>').join("")+'</tbody></table>';
  h+='<div class="sign"><div>Établi par<br>'+esc(sess.email)+'</div><div>Le Directeur</div></div>';
  $("#rapport").innerHTML=h;
  const st=document.createElement("style");st.id="pg-land";st.textContent="@page{size:A4 "+orientAuto()+";margin:10mm}";document.head.appendChild(st);
  const ancien=document.title;document.title="Point-"+slug(nom)+"-S"+s;
  document.body.classList.add("mode-rapport");
  const fin=()=>{document.body.classList.remove("mode-rapport");document.title=ancien;const e=document.getElementById("pg-land");if(e)e.remove();window.removeEventListener("afterprint",fin)};
  window.addEventListener("afterprint",fin);
  setTimeout(()=>window.print(),50);
}
