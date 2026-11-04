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
  <div class="tabs"><button data-t="points">Points validés</button><button data-t="com">Communiqués</button></div><div id="zone"></div>`;
  $("#q").onclick=deconnexion;
  document.querySelectorAll(".tabs button").forEach(b=>b.onclick=()=>{ENC.tab=b.dataset.t;encOnglet()});
  encOnglet();
}
function encOnglet(){
  document.querySelectorAll(".tabs button").forEach(b=>b.classList.toggle("on",b.dataset.t===ENC.tab));
  ({points:encPoints,com:encCom})[ENC.tab]();
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
  z.innerHTML=`<div class="card"><label>Semaine n°</label><div class="row"><input id="s" inputmode="numeric" value="${esc(ENC.sem)}" style="flex:2"><button id="oks" class="sec" style="margin:0">Afficher</button></div><div id="res"></div></div>`;
  const majS=()=>{ENC.sem=$("#s").value;semSauve(ENC.sem);charger()};
  $("#oks").onclick=majS;$("#s").onkeydown=e=>{if(e.key==="Enter")majS()};
  async function charger(){
    const s=parseInt(ENC.sem,10),res=$("#res");
    if(!(s>=1&&s<=45)){res.innerHTML='<div class="msg err">Semaine entre 1 et 45</div>';return}
    res.innerHTML="<p>Chargement…</p>";
    try{
      const r=await rpc("points_encadreur",{p_semaine:s}),rows=r.rows,etabs=r.etabs||[];
      if(!rows.length){res.innerHTML='<p class="mut">Aucun point validé pour cette semaine dans votre périmètre.</p>'+(etabs.length?`<p class="mut"><b>Collèges concernés :</b> ${etabs.map(esc).join(", ")}</p>`:"");return}
      const dEnc=aujourdhui();
      res.innerHTML=`<p><b>${rows.length}</b> point(s) validé(s) · ${new Set(rows.map(x=>x.etablissement)).size} collège(s)</p>
      <div class="row"><div><label>Date du point</label><input id="dt" type="date" value="${dEnc}"></div><div><label>Établi par (facultatif)</label><input id="eb" value="${esc(ENC.p.nom||"")}" placeholder="Nom"></div></div>
      <button class="ok" id="bx">Télécharger en Excel</button><button class="ko" id="bp">Télécharger en PDF</button><button class="sec" id="ex">Détail (CSV)</button>
      <h3 style="margin-top:14px">Tableau de synthèse</h3><div class="scroll" id="tm"></div><p class="mut">Faites glisser le tableau pour voir toutes les colonnes.</p>
      <div id="mq"></div>
      <h3 style="margin-top:14px">Détail</h3><div class="scroll"><table><tr><th>Collège</th><th>Disc.</th><th>Enseignant</th><th>Classe</th><th>Prévu</th><th>Réalisé</th><th>État</th><th>Motif</th></tr>
      ${rows.map(x=>`<tr><td>${esc(x.etablissement)}</td><td>${esc(x.matiere)}</td><td>${esc(x.enseignant)}</td><td>${esc(x.classe_formulaire)} ${esc(x.division)}</td><td>${x.taux_prevu}</td><td>${x.taux_realise}</td><td>${esc(ETAT[x.etat]||"")}</td><td>${esc(x.motif)}</td></tr>`).join("")}</table></div>`;
      const calc=()=>{
        const iso=$("#dt").value||dEnc;
        const dateFr=new Date(iso+"T12:00:00").toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"});
        const S=synthese(rows,s,dateFr,$("#eb").value.trim(),etabs);
        if(ENC.p.role!=="IPD")S.tab=S.tab.filter(r=>r.d);
        $("#tm").innerHTML=tableauMinistere(S);
        $("#mq").innerHTML=S.manquants.length?`<p class="mut"><b>Collèges sans point validé :</b> ${S.manquants.map(esc).join(", ")}</p>`:"";
        return S;
      };
      calc();$("#dt").onchange=calc;$("#eb").oninput=calc;
      $("#bx").onclick=()=>dirExcel(calc());
      $("#bp").onclick=()=>dirPDF(calc());
      $("#ex").onclick=()=>telecharger("points-valides-S"+s+".csv",csv([["Collège","Discipline","Matricule","Enseignant","Classe","Division","Semaine","Prévu %","Réalisé %","Écart","État","Motif"]].concat(rows.map(x=>[x.etablissement,x.matiere,x.matricule,x.enseignant,x.classe_formulaire,x.division,x.semaine,x.taux_prevu,x.taux_realise,x.ecart,ETAT[x.etat]||"",x.motif]))));
    }catch(e){res.innerHTML=`<div class="msg err">${esc(e.message)}</div>`}
  }
  charger();
}
