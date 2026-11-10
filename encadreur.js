/* ====== Encadreur : Conseiller Pédagogique, Inspecteur, IPD (lecture seule) ====== */
let ENC={tab:"points",sem:semDefaut(),p:null};
async function encDemarrer(){
  app.innerHTML='<div class="card">Chargement…</div>';
  try{
    const r=await rpc("mon_profil_encadreur",{});
    if(!r.ok){app.innerHTML=`<div class="card"><div class="msg err">Cette adresse (${esc(sess.email)}) n'est pas enregistrée comme Conseiller Pédagogique ou Inspecteur. Demandez à la Direction de l'ajouter.</div><button id="d">Se déconnecter</button></div>`;$("#d").onclick=deconnexion;return}
    ENC.p=r;ENC.tab="points";encEcran();
  }catch(e){
    if(e.status===401){saveSess(null);return connexionRole("enc")}
    app.innerHTML=`<div class="card"><div class="msg err">${esc(e.message)}</div><button id="d">Retour</button></div>`;$("#d").onclick=accueil;
  }
}
function encEcran(){
  const p=ENC.p;
  app.innerHTML=`<div class="card"><div class="row" style="align-items:center"><div style="flex:3"><h2>${esc(ROLE_ENC[p.role])}</h2><div class="mut">${esc(p.nom||"")} · ${esc(sess.email)}</div><div class="mut">${esc(libPortee(p))}</div></div><button class="sec sm" id="q" style="flex:0 0 auto">Quitter</button></div></div>
  <div class="tabs"><button data-t="points">Points validés</button><button data-t="stats">Statistiques</button><button data-t="com">Communiqués</button></div><div id="zone"></div>`;
  $("#q").onclick=deconnexion;
  document.querySelectorAll(".tabs button").forEach(b=>b.onclick=()=>{ENC.tab=b.dataset.t;encOnglet()});
  encOnglet();
}
function encOnglet(){
  document.querySelectorAll(".tabs button").forEach(b=>b.classList.toggle("on",b.dataset.t===ENC.tab));
  if(ENC.tab==="com"&&ENC.p.role==="IPD")return dirCom({ipd:true});
  ({points:encPoints,stats:encStats,com:encCom})[ENC.tab]();
}
async function encCom(){
  const z=$("#zone");z.innerHTML='<div class="card">Chargement…</div>';
  try{
    const [l,ch]=await Promise.all([rest("communiques?select=*&order=cree_le.desc&limit=30"),lireChaine()]);
    z.innerHTML=blocChaine(ch)+(l.length?l.map(c=>carteCom(c)+"</div>").join(""):'<div class="card"><p class="mut">Aucun communiqué pour l\'instant.</p></div>');
    brancherCom(z,l);brancherChaine(z);
  }catch(e){z.innerHTML=`<div class="msg err">${esc(e.message)}</div>`}
}
async function encPoints(){
  const z=$("#zone");
  z.innerHTML=`<div class="card"><label>Semaine n°</label><div class="row"><input id="s" inputmode="numeric" value="${esc(ENC.sem)}" style="flex:2"><button id="oks" class="sec" style="margin:0">Afficher</button></div><div id="per"></div><div id="res"></div></div>`;
  const majS=()=>{ENC.sem=$("#s").value;semSauve(ENC.sem);charger()};
  $("#oks").onclick=majS;$("#s").onkeydown=e=>{if(e.key==="Enter")majS()};
  async function charger(){
    const s=parseInt(ENC.sem,10),res=$("#res");
    if(!(s>=1&&s<=45)){res.innerHTML='<div class="msg err">Semaine entre 1 et 45</div>';return}
    res.innerHTML="<p>Chargement…</p>";
    try{
      const r=await rpc("points_encadreur",{p_semaine:s}),all=r.rows,etabsAll=r.etabs||[];
      const IPD=ENC.p.role==="IPD";let rows=all,etabs=etabsAll,portee="",slugp="";
      if(IPD){
        if(!ENC.cm){ENC.cm={};try{(await rest("etablissements?select=nom,commune")).forEach(x=>ENC.cm[x.nom]=(x.commune||"").trim())}catch(er){}}
        const cm=ENC.cm,noms=[...new Set(etabsAll.concat(all.map(x=>x.etablissement)))].sort((a,b)=>a.localeCompare(b));
        const coms=[...new Set(noms.map(n=>cm[n]||"Commune non renseignée"))].sort();
        const P=ENC.pm=ENC.pm||{niv:"DEP"};
        if(!coms.includes(P.commune))P.commune=coms[0];
        if(!noms.includes(P.etab))P.etab=noms[0];
        const mats=[...new Set(all.filter(x=>x.etablissement===P.etab).map(x=>x.matiere))];
        if(!mats.includes(P.mat))P.mat=mats[0]||"";
        const opt=(l,v)=>l.map(x=>`<option value="${esc(x)}" ${x===v?"selected":""}>${esc(x)}</option>`).join("");
        $("#per").innerHTML=`<div class="card" style="background:#f6f8fb"><label>Imprimer le point de</label><select id="pn">${[["DEP","Tout le département"],["COM","Une commune"],["ETAB","Un établissement"],["AE","Un AE (établissement + discipline)"]].map(o=>`<option value="${o[0]}" ${P.niv===o[0]?"selected":""}>${o[1]}</option>`).join("")}</select>
          ${P.niv==="COM"?`<label>Commune</label><select id="pc">${opt(coms,P.commune)}</select>`:""}
          ${P.niv==="ETAB"||P.niv==="AE"?`<label>Établissement</label><select id="pe">${opt(noms,P.etab)}</select>`:""}
          ${P.niv==="AE"?(mats.length?`<label>Discipline (AE)</label><select id="pd">${mats.map(m=>{const a=(all.find(x=>x.etablissement===P.etab&&x.matiere===m)||{}).ae;return `<option value="${m}" ${m===P.mat?"selected":""}>${esc(NOM_MAT[m]||m)}${a?" — AE : "+esc(a):""}</option>`}).join("")}</select>`:'<p class="mut">Aucun point validé pour cet établissement cette semaine.</p>'):""}</div>`;
        const rec=()=>{charger()};
        $("#pn").onchange=e=>{P.niv=e.target.value;rec()};
        if($("#pc"))$("#pc").onchange=e=>{P.commune=e.target.value;rec()};
        if($("#pe"))$("#pe").onchange=e=>{P.etab=e.target.value;P.mat="";rec()};
        if($("#pd"))$("#pd").onchange=e=>{P.mat=e.target.value;rec()};
        const lib=n=>cm[n]||"Commune non renseignée";
        if(P.niv==="COM"){rows=all.filter(x=>lib(x.etablissement)===P.commune);etabs=noms.filter(n=>lib(n)===P.commune);portee="Commune de "+P.commune;slugp="commune-"+slug(P.commune)}
        else if(P.niv==="ETAB"){rows=all.filter(x=>x.etablissement===P.etab);etabs=[P.etab];portee=P.etab;slugp=slug(P.etab)}
        else if(P.niv==="AE"){rows=all.filter(x=>x.etablissement===P.etab&&x.matiere===P.mat);etabs=[P.etab];portee="AE "+(NOM_MAT[P.mat]||P.mat)+(rows[0]&&rows[0].ae?" ("+rows[0].ae+")":"")+" — "+P.etab;slugp="AE-"+slug(P.mat)+"-"+slug(P.etab)}
      }
      if(!rows.length){res.innerHTML='<p class="mut">Aucun point validé pour cette semaine dans votre périmètre.</p>'+(etabs.length?`<p class="mut"><b>Collèges concernés :</b> ${etabs.map(esc).join(", ")}</p>`:"");return}
      const dEnc=aujourdhui();
      res.innerHTML=`<p>${portee?"<b>"+esc(portee)+"</b> · ":""}<b>${rows.length}</b> point(s) validé(s) · ${new Set(rows.map(x=>x.etablissement)).size} collège(s)</p>
      <div class="row"><div><label>Date du point</label><input id="dt" type="date" value="${dEnc}"></div><div><label>Établi par (facultatif)</label><input id="eb" value="${esc(ENC.p.nom||"")}" placeholder="Nom"></div></div>
      <button class="ok" id="bx">Télécharger en Excel</button><button class="ko" id="bp">Télécharger en PDF</button><button class="sec" id="ex">Détail (CSV)</button>
      <h3 style="margin-top:14px">Tableau de synthèse</h3><div class="scroll" id="tm"></div><p class="mut">Faites glisser le tableau pour voir toutes les colonnes.</p>
      <div id="mq"></div>
      ${blocEtabs()}
      <h3 style="margin-top:14px">Détail</h3><div class="scroll"><table><tr><th>Collège</th><th>Disc.</th>${rows.some(x=>x.ae)?"<th>AE</th>":""}<th>Enseignant</th><th>Classe</th><th>Prévu</th><th>Réalisé</th><th>État</th><th>Motif</th></tr>
      ${rows.map(x=>`<tr><td>${esc(x.etablissement)}</td><td>${esc(x.matiere)}</td>${rows.some(y=>y.ae)?`<td>${esc(x.ae||"")}</td>`:""}<td>${esc(x.enseignant)}</td><td>${esc(x.classe_formulaire)} ${esc(x.division)}</td><td>${x.taux_prevu}</td><td>${x.taux_realise}</td><td>${esc(ETAT[x.etat]||"")}</td><td>${esc(x.motif)}</td></tr>`).join("")}</table></div>`;
      const calc=()=>{
        const iso=$("#dt").value||dEnc;
        const dateFr=new Date(iso+"T12:00:00").toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"});
        const S=synthese(rows,s,dateFr,$("#eb").value.trim(),etabs);S.portee=portee;S.slugp=slugp;
        if(!IPD||(ENC.pm&&ENC.pm.niv==="AE"))S.tab=S.tab.filter(r=>r.d);
        $("#tm").innerHTML=tableauMinistere(S);
        $("#mq").innerHTML=S.manquants.length?`<p class="mut"><b>Collèges sans point validé :</b> ${S.manquants.map(esc).join(", ")}</p>`:"";
        return S;
      };
      calc();brancherEtabs(rows,s,ENC.p.role==='IPD');$("#dt").onchange=calc;$("#eb").oninput=calc;
      $("#bx").onclick=()=>dirExcel(calc());
      $("#bp").onclick=()=>dirPDF(calc());
      $("#ex").onclick=()=>telecharger("points-valides-S"+s+".csv",csv([["Collège","Discipline","AE","Matricule","Enseignant","Classe","Division","Semaine","Prévu %","Réalisé %","Écart","État","Motif"]].concat(rows.map(x=>[x.etablissement,x.matiere,x.ae||"",x.matricule,x.enseignant,x.classe_formulaire,x.division,x.semaine,x.taux_prevu,x.taux_realise,x.ecart,ETAT[x.etat]||"",x.motif]))));
    }catch(e){res.innerHTML=`<div class="msg err">${esc(e.message)}</div>`}
  }
  charger();
}
