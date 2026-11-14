/* ====== Direction ====== */
let DIR={tab:"points",sem:semDefaut()};
async function dirDemarrer(){
  app.innerHTML='<div class="card">Chargement…</div>';
  try{
    const ok=await rpc("est_direction",{});
    if(ok!==true){app.innerHTML=`<div class="card"><div class="msg err">Cette adresse (${esc(sess.email)}) n'est pas autorisée pour la Direction.</div><button id="d">Se déconnecter</button></div>`;$("#d").onclick=deconnexion;return}
    DIR.tab="points";dirEcran();
  }catch(e){
    if(e.status===401){saveSess(null);return connexionRole("dir")}
    app.innerHTML=`<div class="card"><div class="msg err">${esc(e.message)}</div><button id="d">Retour</button></div>`;$("#d").onclick=accueil;
  }
}
function dirEcran(){
  app.innerHTML=`<div class="card"><div class="row" style="align-items:center"><div style="flex:3"><h2>Direction Départementale</h2><div class="mut">${esc(sess.email)}</div></div><button class="sec sm" id="q" style="flex:0 0 auto">Quitter</button></div></div>
  <div class="tabs"><button data-t="points">Points validés</button><button data-t="tab">Tableau de bord</button><button data-t="usage">Usage</button><button data-t="cmp">Comparer</button><button data-t="rap">Rapport</button><button data-t="stats">Statistiques</button><button data-t="mer">Enseignants méritants</button><button data-t="com">Communiqués</button><button data-t="ban">Bandeau</button><button data-t="cens">Censeurs</button><button data-t="aes">AE inscrits</button><button data-t="enc">Encadreurs</button><button data-t="col">Collèges</button><button data-t="adm">Administrateurs</button><button data-t="sau">Sauvegarde</button></div><div id="rpz">${plusRappelSauv()}</div><div id="zone"></div>`;
  if($("#rpS"))$("#rpS").onclick=()=>{DIR.tab="sau";dirOnglet()};
  $("#q").onclick=deconnexion;
  document.querySelectorAll(".tabs button").forEach(b=>b.onclick=()=>{DIR.tab=b.dataset.t;dirOnglet()});
  dirOnglet();
}
function dirOnglet(){
  document.querySelectorAll(".tabs button").forEach(b=>b.classList.toggle("on",b.dataset.t===DIR.tab));
  ({points:dirPoints,com:dirCom,cens:dirCens,aes:dirAes,enc:dirEnc,col:dirCol,adm:dirAdm,sau:dirSauv,stats:dirStats,mer:dirMerite,ban:dirBandeau,tab:dirTableau,usage:dirUsage,cmp:dirComparer,rap:dirRapport})[DIR.tab]();
}
async function dirPoints(){
  const z=$("#zone");
  z.innerHTML=`<div class="card"><label>Semaine n°</label><div class="row"><input id="s" inputmode="numeric" value="${esc(DIR.sem)}" style="flex:2"><button id="oks" class="sec" style="margin:0">Afficher</button></div><div id="res"></div></div>`;
  const majS=()=>{DIR.sem=$("#s").value;semSauve(DIR.sem);charger()};
  $("#oks").onclick=majS;$("#s").onkeydown=e=>{if(e.key==="Enter")majS()};
  async function charger(){
    const s=parseInt(DIR.sem,10),res=$("#res");
    if(!(s>=1&&s<=45)){res.innerHTML='<div class="msg err">Semaine entre 1 et 45</div>';return}
    res.innerHTML="<p>Chargement…</p>";
    try{
      const rows=await rest(`points_valides?select=*&semaine=eq.${s}&order=matiere,etablissement,classe_formulaire`);
      let etabsF=[];try{etabsF=await rest("etablissements?select=nom,commune&order=nom")}catch(e){try{etabsF=(await rest("etablissements?select=nom&order=nom"))}catch(e2){}}
      const etabs=etabsF.map(x=>x.nom);
      if(!rows.length){res.innerHTML='<p class="mut">Aucun point validé pour cette semaine.</p>'+blocSansPoint();brancherSansPoint(s,rows,etabsF);return}
      const dEnc=aujourdhui();
      res.innerHTML=`<p><b>${rows.length}</b> point(s) validé(s) · ${new Set(rows.map(r=>r.etablissement)).size} collège(s)</p>
      <div class="row"><div><label>Date du point</label><input id="dt" type="date" value="${dEnc}"></div><div><label>Établi par (facultatif)</label><input id="eb" placeholder="Nom du responsable"></div></div>
      <button class="ok" id="bx">Télécharger en Excel</button><button class="ko" id="bp">Télécharger en PDF</button><button class="sec" id="ex">Détail (CSV)</button>
      <h3 style="margin-top:14px">Tableau du ministère</h3><div class="scroll" id="tm"></div><p class="mut">Faites glisser le tableau pour voir toutes les colonnes.</p>
      <div id="mq"></div>
      ${blocEtabs()}
      ${blocSansPoint()}
      <h3 style="margin-top:14px">Détail</h3><div class="scroll"><table><tr><th>Collège</th><th>Disc.</th><th>Enseignant</th><th>Classe</th><th>Prévu</th><th>Réalisé</th><th>État</th><th>Motif</th></tr>
      ${rows.map(r=>`<tr><td>${esc(r.etablissement)}</td><td>${esc(r.matiere)}</td><td>${esc(r.enseignant)}</td><td>${esc(r.classe_formulaire)} ${esc(r.division)}</td><td>${r.taux_prevu}</td><td>${r.taux_realise}</td><td>${esc(ETAT[r.etat]||"")}</td><td>${esc(r.motif)}</td></tr>`).join("")}</table></div>`;
      const calc=()=>{
        const iso=$("#dt").value||dEnc;
        const dateFr=new Date(iso+"T12:00:00").toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"});
        const S=synthese(rows,s,dateFr,$("#eb").value.trim(),etabs);
        $("#tm").innerHTML=tableauMinistere(S);
        $("#mq").innerHTML=S.manquants.length?`<p class="mut"><b>Collèges sans point validé :</b> ${S.manquants.map(esc).join(", ")}</p>`:"";
        return S;
      };
      calc();brancherEtabs(rows,s,true);brancherSansPoint(s,rows,etabsF);
      $("#dt").onchange=calc;$("#eb").oninput=calc;
      $("#bx").onclick=()=>dirExcel(calc());
      $("#bp").onclick=()=>dirPDF(calc());
      $("#ex").onclick=()=>telecharger("points-valides-S"+s+".csv",csv([["Collège","Discipline","Matricule","Enseignant","Classe","Division","Semaine","Prévu %","Réalisé %","Écart","État","Motif"]].concat(rows.map(r=>[r.etablissement,r.matiere,r.matricule,r.enseignant,r.classe_formulaire,r.division,r.semaine,r.taux_prevu,r.taux_realise,r.ecart,ETAT[r.etat]||"",r.motif]))));
    }catch(e){res.innerHTML=`<div class="msg err">${esc(e.message)}</div>`}
  }
  charger();
}
async function dirCens(){
  const z=$("#zone");z.innerHTML='<div class="card">Chargement…</div>';
  try{
    const [c,etabs]=await Promise.all([rest("censeurs?select=email,nom,whatsapp,role,etablissements(nom)&order=email"),rest("etablissements?select=nom")]);
    const connus=new Set(etabs.map(e=>e.nom.trim().toLowerCase()));
    z.innerHTML=`<div class="card"><h3>Ajouter des censeurs ou des directeurs</h3>
    <label>Ces personnes sont</label><select id="rl"><option value="CENSEUR">Censeurs</option><option value="DIRECTEUR">Directeurs de CEG (suivi du collège, ajout de censeurs et d'AE)</option></select>
    <p class="mut">Une ligne par personne : <b>e-mail ; nom ; collège ; numéro WhatsApp</b></p>
    <label>Ou importer un fichier CSV / TXT</label><input type="file" id="f" accept=".csv,.txt,text/csv,text/plain"><div id="fm"></div>
    <textarea id="t" rows="5" placeholder="censeur1@gmail.com ; KOFFI Jean ; CEG Barei ; 01 97 89 09 52&#10;censeur2@gmail.com ; ADJO Marie ; CEG Djougou 1 ; 01 90 00 00 00"></textarea>
    <button id="ad">Enregistrer</button><div id="m"></div></div>
    <div class="card"><h3>Censeurs et directeurs enregistrés (${c.length})</h3>${c.map(x=>`<p style="border-top:1px solid var(--br);padding-top:6px"><b>${esc(x.etablissements.nom)}</b> · ${x.role==="DIRECTEUR"?'<span class="tag t-valide">Directeur</span> ':""}${esc(x.nom||"")} <span class="mut">${esc(x.email)} · ${x.whatsapp?esc(x.whatsapp):"numéro manquant"}</span> <button class="ko sm" data-d="${esc(x.email)}">Retirer</button></p>`).join("")||'<p class="mut">Aucun censeur.</p>'}</div>`;
    const analyser=txt=>{
      txt=txt.replace(/^﻿/,"");
      const prem=(txt.split(/\r?\n/).find(x=>x.trim())||"");
      const sep=[";","\t",","].map(s=>[s,prem.split(s).length]).sort((x,y)=>y[1]-x[1])[0][0];
      const R=[];let row=[],cur="",q=false;
      for(let i=0;i<txt.length;i++){const ch=txt[i];
        if(q){if(ch==='"'){if(txt[i+1]==='"'){cur+='"';i++}else q=false}else cur+=ch}
        else if(ch==='"')q=true;
        else if(ch===sep){row.push(cur.trim());cur=""}
        else if(ch==="\n"||ch==="\r"){if(ch==="\r"&&txt[i+1]==="\n")i++;row.push(cur.trim());cur="";if(row.some(x=>x))R.push(row);row=[]}
        else cur+=ch}
      row.push(cur.trim());if(row.some(x=>x))R.push(row);
      let idx={e:0,n:1,c:2,w:3,r:4};
      if(R.length&&!R[0].some(x=>x.includes("@"))){
        const H=R.shift().map(x=>x.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,""));
        const t=f=>H.findIndex(f);
        const ie=t(h=>h.includes("mail")),inn=t(h=>/nom|prenom/.test(h)&&!/etab|colleg|cem|ceg/.test(h)),ic=t(h=>/colleg|etab|ceg|cem/.test(h)),iw=t(h=>/whats|tel|contact|numero/.test(h)),ir=t(h=>/fonction|role|poste|statut|qualite/.test(h));
        if(ie>=0)idx={e:ie,n:inn,c:ic,w:iw,r:ir};
      }
      const g=(x,i)=>i>=0&&x[i]!=null?x[i]:"";
      return R.filter(x=>g(x,idx.e).includes("@")).map(x=>({email:g(x,idx.e).toLowerCase(),nom:g(x,idx.n),etablissement:g(x,idx.c),whatsapp:g(x,idx.w),role:g(x,idx.r)}));
    };
    const roleDe=(x,defaut)=>x.role?(/direct|chef.*etab|proviseur/i.test(x.role.normalize("NFD").replace(/[̀-ͯ]/g,""))?"DIRECTEUR":"CENSEUR"):defaut;
    $("#f").onchange=async e=>{
      const f=e.target.files[0];if(!f)return;
      let t=await f.text();if(t.includes("�"))t=new TextDecoder("windows-1252").decode(await f.arrayBuffer());
      const l=analyser(t);
      $("#t").value=l.map(x=>[x.email,x.nom,x.etablissement,x.whatsapp].concat(x.role?[x.role]:[]).join(" ; ")).join("\n");
      const nd=l.filter(x=>roleDe(x,"")==="DIRECTEUR").length;
      note($("#fm"),l.length+" ligne(s) lues"+(l.some(x=>x.role)?" ("+nd+" directeur(s), "+(l.length-nd)+" censeur(s) d'après la colonne Fonction)":" : tous seront enregistrés comme « "+($("#rl").value==="DIRECTEUR"?"Directeurs":"Censeurs")+" » (menu ci-dessus)")+". Vérifiez puis cliquez sur Enregistrer.","good");
    };
    $("#ad").onclick=async()=>{
      const l=analyser($("#t").value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean).join("\n")).map(x=>({...x,role:roleDe(x,$("#rl").value)}));
      if(!l.length)return note($("#m"),"Rien à enregistrer (chaque ligne doit contenir une adresse e-mail)");
      const inconnus=[...new Set(l.map(x=>x.etablissement.trim()).filter(n=>n&&!connus.has(n.toLowerCase())))];
      if(inconnus.length&&!confirm("Ces collèges n'existent pas encore et seront CRÉÉS :\n\n"+inconnus.join("\n")+"\n\nSi c'est une faute d'orthographe, annulez et corrigez le nom. Continuer ?"))return;
      try{
        for(const role of ["CENSEUR","DIRECTEUR"]){
          const lot=l.filter(x=>x.role===role).map(x=>({email:x.email,nom:x.nom,etablissement:x.etablissement,whatsapp:x.whatsapp}));
          if(lot.length){const r=await rpc("ajouter_censeurs",{p_lignes:lot,p_role:role});if(!r.ok)return note($("#m"),r.message)}
        }
        dirCens();
      }catch(e){note($("#m"),e.message)}
    };
    z.querySelectorAll("[data-d]").forEach(b=>b.onclick=async()=>{
      if(!confirm("Retirer ce censeur ?"))return;
      try{await rest("censeurs?email=eq."+encodeURIComponent(b.dataset.d),{method:"DELETE",headers:{Prefer:"return=minimal"}});dirCens()}catch(e){note($("#m"),e.message)}
    });
  }catch(e){z.innerHTML=`<div class="msg err">${esc(e.message)}</div>`}
}
async function dirAes(){
  const z=$("#zone");z.innerHTML='<div class="card">Chargement…</div>';
  try{
    const SEL="affectations?select=id,nom,email,whatsapp,matiere,etablissements(nom,commune)&order=matiere";
    let a=await rest(SEL);
    z.innerHTML=`<div class="card"><h3>Ajouter des AE en lot</h3>
    <p class="mut">Une ligne par AE : <b>e-mail ; nom ; collège ; discipline ; numéro WhatsApp ; commune</b> (la commune est facultative : Djougou, Bassila, Copargo ou Ouaké). Collez directement des lignes copiées depuis Excel, ou choisissez un fichier CSV ou texte. Le collège est créé s'il n'existe pas encore.</p>
    <textarea id="t" rows="6" placeholder="ae1@gmail.com ; KOFFI Jean ; CEG Barei ; Mathématiques ; 01 97 89 09 52&#10;ae2@gmail.com ; ADJO Marie ; CEG Djougou 1 ; PCT ; 01 90 00 00 00"></textarea>
    <label>Ou choisir un fichier (.csv, .txt)</label><input type="file" id="fi" accept=".csv,.txt,text/csv,text/plain">
    <button id="ad">Enregistrer les AE</button><div id="m"></div></div>
    <div class="card"><h3>AE inscrits <span id="cnt"></span></h3><input id="fq" placeholder="Rechercher (nom, collège, discipline, e-mail)"><div class="row"><div><label>Commune</label><select id="f-com"></select></div><div><label>Discipline</label><select id="f-mat"></select></div></div><label>Collège</label><select id="f-col"></select><button class="sec sm" id="f-raz" type="button">Effacer les filtres</button><div id="lst"></div></div>`;
    const opts=(id,vals,tout)=>{const cur=$(id).value;$(id).innerHTML=`<option value="">${tout}</option>`+[...new Set(vals.filter(Boolean))].sort((p,q)=>p.localeCompare(q)).map(v=>`<option>${esc(v)}</option>`).join("");$(id).value=cur};
    const rend=()=>{
      const q=($("#fq").value||"").toLowerCase(),fc=$("#f-com").value,fm=$("#f-mat").value,fl=$("#f-col").value;
      const f=a.filter(x=>(!q||[x.nom,x.email,x.matiere,NOM_MAT[x.matiere],x.etablissements.nom].join(" ").toLowerCase().includes(q))&&(!fc||x.etablissements.commune===fc)&&(!fm||(NOM_MAT[x.matiere]||x.matiere)===fm)&&(!fl||x.etablissements.nom===fl));
      $("#cnt").textContent="("+(f.length!==a.length?f.length+" sur "+a.length:a.length)+")";
      $("#lst").innerHTML=f.map(x=>`<p style="border-top:1px solid var(--br);padding-top:6px"><b>${esc(x.nom||"")}</b> <span class="mut">${esc(x.email)}${x.whatsapp?" · "+esc(x.whatsapp):""}</span><br>${esc(NOM_MAT[x.matiere]||x.matiere)} – ${esc(x.etablissements.nom)} <button class="ko sm" data-d="${x.id}">Retirer</button></p>`).join("")||'<p class="mut">Aucun AE.</p>';
      $("#lst").querySelectorAll("[data-d]").forEach(b=>b.onclick=async()=>{
        if(!confirm("Retirer cet AE ?"))return;
        try{await rest("affectations?id=eq."+b.dataset.d,{method:"DELETE",headers:{Prefer:"return=minimal"}});a=await rest(SEL);rend()}catch(e){note($("#m"),e.message)}
      });
    };
    opts("#f-com",a.map(x=>x.etablissements.commune),"Toutes");opts("#f-mat",a.map(x=>NOM_MAT[x.matiere]||x.matiere),"Toutes");opts("#f-col",a.map(x=>x.etablissements.nom),"Tous les collèges");
    rend();
    $("#fq").oninput=rend;["#f-com","#f-mat","#f-col"].forEach(i=>$(i).onchange=rend);
    $("#f-raz").onclick=()=>{$("#fq").value="";["#f-com","#f-mat","#f-col"].forEach(i=>$(i).value="");rend()};
    $("#fi").onchange=e=>{
      const f=e.target.files[0];if(!f)return;
      const r=new FileReader();
      r.onload=()=>{
        const buf=r.result;let t;
        try{t=new TextDecoder("utf-8",{fatal:true}).decode(buf)}catch(x){t=new TextDecoder("windows-1252").decode(buf)}
        $("#t").value=t.replace(/^﻿/,"");
      };
      r.readAsArrayBuffer(f);
    };
    $("#ad").onclick=async()=>{
      const m=$("#m");let ign=0;const l=[];
      $("#t").value.split(/\r?\n/).forEach(r=>{
        r=r.trim();if(!r)return;
        const c=(/[;\t]/.test(r)?r.split(/[;\t]/):r.split(",")).map(y=>y.trim().replace(/^"|"$/g,""));
        if(!c[0]||c[0].indexOf("@")<0){ign++;return}
        l.push({email:c[0],nom:c[1]||"",etablissement:c[2]||"",matiere:c[3]||"",whatsapp:c[4]||"",commune:c[5]||""});
      });
      if(!l.length)return note(m,"Rien à enregistrer : aucune ligne avec une adresse e-mail");
      $("#ad").disabled=true;note(m,"Enregistrement en cours…","info");
      let n=0;const rejets=[],nouveaux=[];
      try{
        for(let i=0;i<l.length;i+=150){
          const r=await rpc("ajouter_aes",{p_lignes:l.slice(i,i+150)});
          if(!r.ok){note(m,r.message);$("#ad").disabled=false;return}
          n+=r.n;(r.rejets||[]).forEach(x=>rejets.push({ligne:x.ligne+i,motif:x.motif}));(r.nouveaux||[]).forEach(x=>nouveaux.push(x));
        }
        let h=`<div class="msg good">${n} AE enregistré(s) sur ${l.length} ligne(s).${ign?" "+ign+" ligne(s) ignorée(s) (sans e-mail, par exemple l'en-tête).":""}</div>`;
        if(rejets.length)h+=`<div class="msg err"><b>Lignes refusées :</b><br>${rejets.map(x=>"ligne "+x.ligne+" : "+esc(x.motif)).join("<br>")}</div>`;
        if(nouveaux.length)h+=`<div class="msg info"><b>Collèges créés :</b> ${nouveaux.map(esc).join(", ")}.<br>Vérifiez l'orthographe : une faute crée un collège en double.</div>`;
        m.innerHTML=h;
        a=await rest(SEL);rend();
      }catch(e){note(m,e.message)}
      $("#ad").disabled=false;
    };
  }catch(e){z.innerHTML=`<div class="msg err">${esc(e.message)}</div>`}
}
async function dirAdm(){
  const z=$("#zone");z.innerHTML='<div class="card">Chargement…</div>';
  try{
    const l=await rpc("lister_administrateurs",{});
    const moi=(sess.email||"").toLowerCase();
    z.innerHTML=`<div class="card"><h3>Ajouter des administrateurs</h3>
    <p class="mut">Un administrateur a le même accès que la Direction : tableau, communiqués, censeurs, AE et administrateurs. Il se connecte avec son adresse e-mail (code à 6 chiffres) par le bouton « Direction Départementale ». Une ligne par personne : <b>e-mail ; nom</b></p>
    <textarea id="t" rows="3" placeholder="admin1@gmail.com ; KOFFI Jean&#10;admin2@gmail.com ; ADJO Marie"></textarea>
    <button id="ad">Ajouter</button><div id="m"></div></div>
    <div class="card"><h3>Administrateurs (${l.length})</h3>${l.map(x=>`<p style="border-top:1px solid var(--br);padding-top:6px"><b>${esc(x.nom||"")}</b> <span class="mut">${esc(x.email)}</span> ${x.email.toLowerCase()===moi?'<span class="mut">(vous)</span>':`<button class="ko sm" data-d="${esc(x.email)}">Retirer</button>`}</p>`).join("")}</div>`;
    $("#ad").onclick=async()=>{
      const m=$("#m");
      const ls=$("#t").value.split(/\r?\n/).map(x=>x.split(/[;\t]/).map(y=>y.trim())).filter(x=>x[0]).map(x=>({email:x[0],nom:x[1]||""}));
      if(!ls.length)return note(m,"Rien à enregistrer");
      try{
        const r=await rpc("ajouter_administrateurs",{p_lignes:ls});
        if(!r.ok)return note(m,r.message);
        await dirAdm();
        note($("#m"),r.n+" administrateur(s) enregistré(s)."+(r.refuses?" "+r.refuses+" adresse(s) invalide(s) refusée(s).":""),r.refuses?"info":"good");
      }catch(e){note(m,e.message)}
    };
    z.querySelectorAll("[data-d]").forEach(b=>b.onclick=async()=>{
      if(!confirm("Retirer cet administrateur ?"))return;
      try{const r=await rpc("retirer_administrateur",{p_email:b.dataset.d});if(r.ok)dirAdm();else note($("#m"),r.message)}catch(e){note($("#m"),e.message)}
    });
  }catch(e){z.innerHTML=`<div class="msg err">${esc(e.message)}</div>`}
}


/* Encadreurs : Conseillers Pédagogiques (par commune et discipline), Inspecteurs (par discipline), IPD (toutes disciplines) */
const ROLE_ENC={CP:"Conseiller pédagogique",INSPECTEUR:"Inspecteur",IPD:"CCIP · Inspecteur Pédagogique Départemental"};
function libPortee(x){
  if(x.role==="IPD")return "toutes les disciplines, toute la Donga";
  return (NOM_MAT[x.matiere]||x.matiere)+(x.commune?" – commune de "+x.commune:" – toute la Donga");
}
async function dirEnc(){
  const z=$("#zone");z.innerHTML='<div class="card">Chargement…</div>';
  try{
    let a=await rpc("lister_encadreurs",{});
    z.innerHTML=`<div class="card"><h3>Ajouter des encadreurs</h3>
    <p class="mut">Ils consultent en lecture seule les points validés et les communiqués de leur périmètre. Ils se connectent avec leur adresse e-mail (code à 6 chiffres) par le bouton « Conseiller pédagogique, Inspecteur ». Une ligne par personne : <b>e-mail ; nom ; rôle ; discipline ; commune</b>.</p>
    <ul class="mut"><li><b>CP</b> : discipline et commune obligatoires (Djougou, Bassila, Copargo, Ouaké).</li><li><b>Inspecteur</b> : discipline obligatoire, toute la Donga.</li><li><b>IPD</b> = membre du CCIP (Inspecteur Pédagogique Départemental) : ni discipline ni commune, il voit tout.</li></ul>
    <textarea id="t" rows="5" placeholder="cp1@gmail.com ; KOFFI Jean ; CP ; Mathématiques ; Djougou&#10;insp1@gmail.com ; ADJO Marie ; Inspecteur ; PCT&#10;ipd@gmail.com ; TOKO Paul ; IPD"></textarea>
    <label>Ou choisir un fichier (.csv, .txt)</label><input type="file" id="fi" accept=".csv,.txt,text/csv,text/plain">
    <button id="ad">Enregistrer</button><div id="m"></div></div>
    <div class="card"><h3>Encadreurs inscrits <span id="cnt"></span></h3><input id="fq" placeholder="Rechercher (nom, rôle, discipline, commune, e-mail)"><div id="lst"></div></div>`;
    const rend=()=>{
      const q=($("#fq").value||"").toLowerCase();
      const f=a.filter(x=>!q||[x.nom,x.email,ROLE_ENC[x.role],NOM_MAT[x.matiere],x.commune].join(" ").toLowerCase().includes(q));
      $("#cnt").textContent="("+(q?f.length+" sur "+a.length:a.length)+")";
      $("#lst").innerHTML=f.map(x=>`<p style="border-top:1px solid var(--br);padding-top:6px"><b>${esc(x.nom||"")}</b> <span class="mut">${esc(x.email)}</span><br>${esc(ROLE_ENC[x.role])} · ${esc(libPortee(x))} <button class="ko sm" data-d="${esc(x.email)}">Retirer</button></p>`).join("")||'<p class="mut">Aucun encadreur.</p>';
      $("#lst").querySelectorAll("[data-d]").forEach(b=>b.onclick=async()=>{
        if(!confirm("Retirer cet encadreur ?"))return;
        try{await rpc("retirer_encadreur",{p_email:b.dataset.d});a=await rpc("lister_encadreurs",{});rend()}catch(e){note($("#m"),e.message)}
      });
    };
    rend();$("#fq").oninput=rend;
    $("#fi").onchange=e=>{
      const f=e.target.files[0];if(!f)return;
      const r=new FileReader();
      r.onload=()=>{let t;try{t=new TextDecoder("utf-8",{fatal:true}).decode(r.result)}catch(x){t=new TextDecoder("windows-1252").decode(r.result)}$("#t").value=t.replace(/^﻿/,"")};
      r.readAsArrayBuffer(f);
    };
    $("#ad").onclick=async()=>{
      const m=$("#m");let ign=0;const l=[];
      $("#t").value.split(/\r?\n/).forEach(r=>{
        r=r.trim();if(!r)return;
        const c=(/[;\t]/.test(r)?r.split(/[;\t]/):r.split(",")).map(y=>y.trim().replace(/^"|"$/g,""));
        if(!c[0]||c[0].indexOf("@")<0){ign++;return}
        l.push({email:c[0],nom:c[1]||"",role:c[2]||"",matiere:c[3]||"",commune:c[4]||""});
      });
      if(!l.length)return note(m,"Rien à enregistrer : aucune ligne avec une adresse e-mail");
      $("#ad").disabled=true;
      try{
        const r=await rpc("ajouter_encadreurs",{p_lignes:l});
        if(!r.ok){note(m,r.message);$("#ad").disabled=false;return}
        let h=`<div class="msg good">${r.n} encadreur(s) enregistré(s) sur ${l.length} ligne(s).${ign?" "+ign+" ligne(s) ignorée(s) (sans e-mail, par exemple l'en-tête).":""}</div>`;
        if((r.rejets||[]).length)h+=`<div class="msg err"><b>Lignes refusées :</b><br>${r.rejets.map(x=>"ligne "+x.ligne+" : "+esc(x.motif)).join("<br>")}</div>`;
        a=await rpc("lister_encadreurs",{});rend();m.innerHTML=h;
      }catch(e){note(m,e.message)}
      $("#ad").disabled=false;
    };
  }catch(e){z.innerHTML=`<div class="msg err">${esc(e.message)}</div>`}
}

/* Collèges et communes (la commune détermine le périmètre des CP) */
const COMMUNES=["Djougou","Bassila","Copargo","Ouaké"];
const SAUV_TABLES=["etablissements","direction_users","affectations","enseignants","soumissions","stats_evaluations","notations_enseignants","demandes_ae","censeurs","communiques","communique_pdf","parametres","encadreurs"];
const SAUV_TITRE={etablissements:"Collèges",direction_users:"Administrateurs",affectations:"AE",enseignants:"Enseignants",soumissions:"Points",stats_evaluations:"Statistiques des évaluations",notations_enseignants:"Enseignants méritants",demandes_ae:"Demandes AE",censeurs:"Censeurs et directeurs",communiques:"Communiqués",communique_pdf:"PDF des communiqués",parametres:"Paramètres",encadreurs:"Encadreurs"};
async function sauvLire(t,depuis,jusqua,secret){
  const taille=t==="communique_pdf"?10:500;let tout=[],off=0;
  for(;;){
    let r;
    try{r=await rpc("sauvegarde_table",{p_table:t,p_depuis:depuis||null,p_jusqua:jusqua||null,p_decalage:off,p_taille:taille,p_secret:!!secret})}
    catch(e){if(/does not exist|n'existe pas/i.test(String(e.message))){window.SAUV_MANQUE=(window.SAUV_MANQUE||[]).concat(t);return []}throw e}
    tout=tout.concat(r||[]);if(!r||r.length<taille)break;off+=taille;
  }
  return tout;
}
function sauvDate(d){return d.toISOString().slice(0,10)}
function sauvPeriode(type){
  const j=new Date();j.setHours(12,0,0,0);
  if(type==="sem"){const l=new Date(j);l.setDate(j.getDate()-((j.getDay()+6)%7));const d=new Date(l);d.setDate(l.getDate()+6);return[sauvDate(l),sauvDate(d)]}
  if(type==="mois"){return[sauvDate(new Date(j.getFullYear(),j.getMonth(),1,12)),sauvDate(new Date(j.getFullYear(),j.getMonth()+1,0,12))]}
  const a=j.getMonth()>=8?j.getFullYear():j.getFullYear()-1;return[a+"-09-01",(a+1)+"-08-31"];
}
function sauvDernier(){try{return localStorage.getItem("sdh.sauv")||""}catch(e){return""}}
function sauvMarquer(){try{localStorage.setItem("sdh.sauv",new Date().toISOString())}catch(e){}}
function sauvRappel(){
  const d=sauvDernier();
  if(!d)return '<div class="msg err">Aucune sauvegarde complète faite depuis cet appareil. Pensez à en faire une régulièrement.</div>';
  const n=Math.floor((Date.now()-new Date(d).getTime())/86400000);
  const q=new Date(d).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"});
  return `<div class="msg ${n>7?"err":"ok"}">Dernière sauvegarde complète (depuis cet appareil) : ${q}, il y a ${n} jour${n>1?"s":""}.${n>7?" Pensez à en refaire une.":""}</div>`;
}
async function dirSauv(){
  const z=$("#zone"),p0=sauvPeriode("mois");
  z.innerHTML=`<div class="card"><h3>Sauvegarde par période (Excel)</h3>
  <p class="mut">Un classeur Excel avec les points de la période, les enseignants, les AE, les censeurs et directeurs, les collèges et les communiqués. Pour consulter ou archiver.</p>
  <div class="row"><button class="sec sm" data-p="sem">Cette semaine</button><button class="sec sm" data-p="mois">Ce mois</button><button class="sec sm" data-p="an">Année scolaire</button></div>
  <div class="row"><div><label>Du</label><input id="sd" type="date" value="${p0[0]}"></div><div><label>Au</label><input id="sf" type="date" value="${p0[1]}"></div></div>
  <button class="ok" id="sx">Télécharger la sauvegarde Excel</button><div id="sm1"></div></div>
  <div class="card"><h3>Sauvegarde complète (pour restaurer)</h3>
  <p class="mut">Un fichier contenant <b>toutes</b> les données de la plateforme, avec les codes d’accès cryptés des enseignants. Il permet de tout remettre en place après un incident.</p>
  <div class="msg err">Ce fichier est confidentiel : ne le partagez pas et gardez-le en lieu sûr.</div>
  ${sauvRappel()}
  <button class="ok" id="sc">Télécharger la sauvegarde complète</button><div id="sm2"></div></div>
  <div class="card"><h3>Restaurer une sauvegarde complète</h3>
  <p class="mut">Choisissez un fichier de sauvegarde complète. Les données du fichier sont <b>ajoutées ou mises à jour</b> ; rien n’est effacé.</p>
  <input id="sf2" type="file" accept=".json,application/json"><button class="ko" id="sr">Restaurer</button><div id="sm3"></div></div>`;
  z.querySelectorAll("[data-p]").forEach(b=>b.onclick=()=>{const p=sauvPeriode(b.dataset.p);$("#sd").value=p[0];$("#sf").value=p[1]});
  $("#sx").onclick=sauvExcel;$("#sc").onclick=sauvComplete;$("#sr").onclick=sauvRestaurer;
}
async function sauvExcel(){
  const m=$("#sm1"),b=$("#sx"),d=$("#sd").value,f=$("#sf").value;
  if(!d||!f||d>f){note(m,"Choisissez une période valide.");return}
  b.disabled=true;note(m,"Préparation de la sauvegarde…","ok");
  try{
    const T={};
    for(const t of SAUV_TABLES.filter(x=>x!=="communique_pdf")){note(m,"Lecture : "+SAUV_TITRE[t]+"…","ok");T[t]=await sauvLire(t,d,f,false)}
    const E={};(T.etablissements||[]).forEach(e=>E[e.id]=e);
    const EN={};(T.enseignants||[]).forEach(e=>EN[e.id]=e);
    const nm=id=>E[id]?E[id].nom:"";
    const dateFr=x=>x?new Date(x).toLocaleDateString("fr-FR"):"";
    const pts=[{v:["Collège","Commune","Discipline","Enseignant","Matricule","Classe","Division","Semaine","Date du point","Prévu (%)","Réalisé (%)","Écart","État","Motif","Statut","Saisi par","Validé le","Validé par"]}];
    (T.soumissions||[]).slice().sort((a,b)=>String(nm(a.etablissement_id)).localeCompare(nm(b.etablissement_id))||String(a.matiere).localeCompare(b.matiere)||a.semaine-b.semaine).forEach(r=>{const en=EN[r.enseignant_id]||{};
      pts.push([nm(r.etablissement_id),(E[r.etablissement_id]||{}).commune||"",r.matiere,en.nom||"",en.matricule||"",r.classe_formulaire,r.division,r.semaine,dateFr(r.date_situation),r.taux_prevu,r.taux_realise,r.ecart,(typeof ETAT!=="undefined"&&ETAT[r.etat])||r.etat||"",r.motif,r.statut,r.saisi_par,dateFr(r.valide_le),r.valide_par||""])});
    const generique=(t,titre)=>{
      const lg=T[t]||[];const cles=[];lg.forEach(r=>Object.keys(r).forEach(k=>{if(cles.indexOf(k)<0&&k!=="id"&&k!=="etablissement_id"&&k!=="code_hash")cles.push(k)}));
      const avecE=lg.some(r=>r.etablissement_id);
      const rows=[{v:(avecE?["Collège"]:[]).concat(cles)}];
      lg.forEach(r=>rows.push((avecE?[nm(r.etablissement_id)]:[]).concat(cles.map(k=>{const v=r[k];return v==null?"":(typeof v==="object"?JSON.stringify(v):v)}))));
      return{nom:titre,rows,larg:(avecE?[26]:[]).concat(cles.map(()=>20))};
    };
    const feuilles=[{nom:"Points",rows:pts,larg:[26,16,12,26,12,10,9,8,12,9,9,8,12,30,10,10,12,26]},
      generique("enseignants","Enseignants"),generique("affectations","AE"),generique("censeurs","Censeurs et directeurs"),
      generique("etablissements","Collèges"),generique("communiques","Communiqués"),generique("encadreurs","Encadreurs")];
    telechargerBlob(classeurXLSX(feuilles),"Sauvegarde-Donga-"+d+"-au-"+f+".xlsx");
    note(m,`Sauvegarde téléchargée : ${(T.soumissions||[]).length} point(s) du ${dateFr(d)} au ${dateFr(f)}.`,"ok");
  }catch(e){note(m,e.message)}
  b.disabled=false;
}
async function sauvComplete(){
  const m=$("#sm2"),b=$("#sc");b.disabled=true;
  try{
    const T={};let n=0;
    for(const t of SAUV_TABLES){note(m,"Lecture : "+SAUV_TITRE[t]+"…","ok");T[t]=await sauvLire(t,null,null,true);n+=T[t].length}
    const fich={application:"suivi-hebdo-donga",version:1,date:new Date().toISOString(),tables:T};
    const dt=aujourdhui();
    telechargerBlob(new Blob([JSON.stringify(fich)],{type:"application/json"}),"Sauvegarde-complete-Donga-"+dt+".json");
    sauvMarquer();
    note(m,`Sauvegarde complète téléchargée (${n} lignes). Gardez ce fichier en lieu sûr.`,"ok");
  }catch(e){note(m,e.message)}
  b.disabled=false;
}
async function sauvRestaurer(){
  const m=$("#sm3"),fi=$("#sf2").files[0];
  if(!fi){note(m,"Choisissez d’abord un fichier de sauvegarde complète.");return}
  let F;try{F=JSON.parse(await fi.text())}catch(e){note(m,"Ce fichier n’est pas une sauvegarde valide.");return}
  if(!F||F.application!=="suivi-hebdo-donga"||!F.tables){note(m,"Ce fichier n’est pas une sauvegarde de cette plateforme.");return}
  const n=SAUV_TABLES.reduce((s,t)=>s+((F.tables[t]||[]).length),0);
  const dt=F.date?new Date(F.date).toLocaleDateString("fr-FR"):"date inconnue";
  if(!confirm("Restaurer la sauvegarde du "+dt+" ("+n+" lignes) ?\n\nLes données du fichier seront ajoutées ou mises à jour. Rien ne sera effacé."))return;
  const b=$("#sr");b.disabled=true;
  try{
    let fait=0;
    for(const t of SAUV_TABLES){
      const lg=F.tables[t]||[];const taille=t==="communique_pdf"?3:200;
      for(let i=0;i<lg.length;i+=taille){
        note(m,`Restauration : ${SAUV_TITRE[t]} (${Math.min(i+taille,lg.length)}/${lg.length})…`,"ok");
        await rpc("restaurer_table",{p_table:t,p_lignes:lg.slice(i,i+taille)});fait+=Math.min(taille,lg.length-i);
      }
    }
    note(m,`Restauration terminée : ${fait} ligne(s) traitée(s).`,"ok");
  }catch(e){note(m,"Restauration interrompue : "+e.message+" — vous pouvez relancer, rien n’est dupliqué.")}
  b.disabled=false;
}
