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
  <div class="tabs"><button data-t="points">Points validés</button><button data-t="com">Communiqués</button><button data-t="cens">Censeurs</button><button data-t="aes">AE inscrits</button><button data-t="enc">Encadreurs</button><button data-t="col">Collèges</button><button data-t="adm">Administrateurs</button></div><div id="zone"></div>`;
  $("#q").onclick=deconnexion;
  document.querySelectorAll(".tabs button").forEach(b=>b.onclick=()=>{DIR.tab=b.dataset.t;dirOnglet()});
  dirOnglet();
}
function dirOnglet(){
  document.querySelectorAll(".tabs button").forEach(b=>b.classList.toggle("on",b.dataset.t===DIR.tab));
  ({points:dirPoints,com:dirCom,cens:dirCens,aes:dirAes,enc:dirEnc,col:dirCol,adm:dirAdm})[DIR.tab]();
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
      let etabs=[];try{etabs=(await rest("etablissements?select=nom&order=nom")).map(x=>x.nom)}catch(e){}
      if(!rows.length){res.innerHTML='<p class="mut">Aucun point validé pour cette semaine.</p>';return}
      const dEnc=aujourdhui();
      res.innerHTML=`<p><b>${rows.length}</b> point(s) validé(s) · ${new Set(rows.map(r=>r.etablissement)).size} collège(s)</p>
      <div class="row"><div><label>Date du point</label><input id="dt" type="date" value="${dEnc}"></div><div><label>Établi par (facultatif)</label><input id="eb" placeholder="Nom du responsable"></div></div>
      <button class="ok" id="bx">Télécharger en Excel</button><button class="ko" id="bp">Télécharger en PDF</button><button class="sec" id="ex">Détail (CSV)</button>
      <h3 style="margin-top:14px">Tableau du ministère</h3><div class="scroll" id="tm"></div><p class="mut">Faites glisser le tableau pour voir toutes les colonnes.</p>
      <div id="mq"></div>
      ${blocEtabs()}
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
      calc();brancherEtabs(rows,s,true);
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
    const c=await rest("censeurs?select=email,nom,whatsapp,etablissements(nom)&order=email");
    z.innerHTML=`<div class="card"><h3>Ajouter des censeurs</h3>
    <p class="mut">Une ligne par censeur : <b>e-mail ; nom ; collège ; numéro WhatsApp</b></p>
    <textarea id="t" rows="5" placeholder="censeur1@gmail.com ; KOFFI Jean ; CEG Barei ; 01 97 89 09 52&#10;censeur2@gmail.com ; ADJO Marie ; CEG Djougou 1 ; 01 90 00 00 00"></textarea>
    <button id="ad">Enregistrer</button><div id="m"></div></div>
    <div class="card"><h3>Censeurs enregistrés (${c.length})</h3>${c.map(x=>`<p style="border-top:1px solid var(--br);padding-top:6px"><b>${esc(x.etablissements.nom)}</b> · ${esc(x.nom||"")} <span class="mut">${esc(x.email)} · ${x.whatsapp?esc(x.whatsapp):"numéro manquant"}</span> <button class="ko sm" data-d="${esc(x.email)}">Retirer</button></p>`).join("")||'<p class="mut">Aucun censeur.</p>'}</div>`;
    $("#ad").onclick=async()=>{
      const l=$("#t").value.split(/\r?\n/).map(x=>x.split(/[;\t]/).map(y=>y.trim())).filter(x=>x[0]).map(x=>({email:x[0],nom:x[1]||"",etablissement:x[2]||"",whatsapp:x[3]||""}));
      if(!l.length)return note($("#m"),"Rien à enregistrer");
      try{const r=await rpc("ajouter_censeurs",{p_lignes:l});if(r.ok)dirCens();else note($("#m"),r.message)}catch(e){note($("#m"),e.message)}
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
    const SEL="affectations?select=id,nom,email,whatsapp,matiere,etablissements(nom)&order=matiere";
    let a=await rest(SEL);
    z.innerHTML=`<div class="card"><h3>Ajouter des AE en lot</h3>
    <p class="mut">Une ligne par AE : <b>e-mail ; nom ; collège ; discipline ; numéro WhatsApp ; commune</b> (la commune est facultative : Djougou, Bassila, Copargo ou Ouaké). Collez directement des lignes copiées depuis Excel, ou choisissez un fichier CSV ou texte. Le collège est créé s'il n'existe pas encore.</p>
    <textarea id="t" rows="6" placeholder="ae1@gmail.com ; KOFFI Jean ; CEG Barei ; Mathématiques ; 01 97 89 09 52&#10;ae2@gmail.com ; ADJO Marie ; CEG Djougou 1 ; PCT ; 01 90 00 00 00"></textarea>
    <label>Ou choisir un fichier (.csv, .txt)</label><input type="file" id="fi" accept=".csv,.txt,text/csv,text/plain">
    <button id="ad">Enregistrer les AE</button><div id="m"></div></div>
    <div class="card"><h3>AE inscrits <span id="cnt"></span></h3><input id="fq" placeholder="Rechercher (nom, collège, discipline, e-mail)"><div id="lst"></div></div>`;
    const rend=()=>{
      const q=($("#fq").value||"").toLowerCase();
      const f=a.filter(x=>!q||[x.nom,x.email,x.matiere,NOM_MAT[x.matiere],x.etablissements.nom].join(" ").toLowerCase().includes(q));
      $("#cnt").textContent="("+(q?f.length+" sur "+a.length:a.length)+")";
      $("#lst").innerHTML=f.map(x=>`<p style="border-top:1px solid var(--br);padding-top:6px"><b>${esc(x.nom||"")}</b> <span class="mut">${esc(x.email)}${x.whatsapp?" · "+esc(x.whatsapp):""}</span><br>${esc(NOM_MAT[x.matiere]||x.matiere)} – ${esc(x.etablissements.nom)} <button class="ko sm" data-d="${x.id}">Retirer</button></p>`).join("")||'<p class="mut">Aucun AE.</p>';
      $("#lst").querySelectorAll("[data-d]").forEach(b=>b.onclick=async()=>{
        if(!confirm("Retirer cet AE ?"))return;
        try{await rest("affectations?id=eq."+b.dataset.d,{method:"DELETE",headers:{Prefer:"return=minimal"}});a=await rest(SEL);rend()}catch(e){note($("#m"),e.message)}
      });
    };
    rend();
    $("#fq").oninput=rend;
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
const ROLE_ENC={CP:"Conseiller pédagogique",INSPECTEUR:"Inspecteur",IPD:"Inspecteur Pédagogique Départemental"};
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
    <ul class="mut"><li><b>CP</b> : discipline et commune obligatoires (Djougou, Bassila, Copargo, Ouaké).</li><li><b>Inspecteur</b> : discipline obligatoire, toute la Donga.</li><li><b>IPD</b> (Inspecteur Pédagogique Départemental) : ni discipline ni commune, il voit tout.</li></ul>
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
async function dirCol(){
  const z=$("#zone");z.innerHTML='<div class="card">Chargement…</div>';
  try{
    let a=await rest("etablissements?select=id,nom,commune&order=nom");
    z.innerHTML=`<div class="card"><h3>Collèges et communes <span id="cnt"></span></h3>
    <p class="mut">Indiquez la commune de chaque collège : elle détermine ce que voit chaque Conseiller Pédagogique. Le changement est enregistré dès que vous choisissez.</p>
    <label><input type="checkbox" id="sc" style="width:auto"> Afficher seulement les collèges sans commune</label>
    <input id="fq" placeholder="Rechercher un collège"><div id="lst"></div><div id="m"></div></div>`;
    const rend=()=>{
      const q=($("#fq").value||"").toLowerCase(),sc=$("#sc").checked;
      const f=a.filter(x=>(!q||x.nom.toLowerCase().includes(q))&&(!sc||!x.commune));
      const sans=a.filter(x=>!x.commune).length;
      $("#cnt").textContent="("+a.length+" collèges, "+sans+" sans commune)";
      $("#lst").innerHTML=f.map(x=>`<p style="border-top:1px solid var(--br);padding-top:6px"><b>${esc(x.nom)}</b><br><select data-c="${x.id}"><option value="">— commune non renseignée —</option>${COMMUNES.map(c=>`<option${x.commune===c?" selected":""}>${c}</option>`).join("")}</select></p>`).join("")||'<p class="mut">Aucun collège.</p>';
      $("#lst").querySelectorAll("[data-c]").forEach(s=>s.onchange=async()=>{
        try{
          await rest("etablissements?id=eq."+s.dataset.c,{method:"PATCH",headers:{Prefer:"return=minimal"},body:{commune:s.value||null}});
          const e=a.find(x=>x.id===s.dataset.c);if(e)e.commune=s.value||null;
          note($("#m"),"Enregistré","good");$("#cnt").textContent="("+a.length+" collèges, "+a.filter(x=>!x.commune).length+" sans commune)";
        }catch(er){note($("#m"),er.message)}
      });
    };
    rend();$("#fq").oninput=rend;$("#sc").onchange=rend;
  }catch(e){z.innerHTML=`<div class="msg err">${esc(e.message)}</div>`}
}
