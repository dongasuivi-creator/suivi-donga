/* ====== Enseignant ====== */
let ENS=null;
function ensConnexion(){
  app.innerHTML=`<div class="card">${entete("Enseignant",true)}
  <label>Votre numéro WhatsApp</label><input id="w" inputmode="tel" placeholder="01 97 89 09 52">
  <label>Votre code personnel (donné par votre AE)</label><input id="c" type="password" inputmode="numeric">
  <button id="go">Entrer</button><div id="m"></div></div>`;
  lierRetour();
  $("#go").onclick=async()=>{
    const w=tel($("#w").value),c=$("#c").value;
    try{const r=await rpc("connexion_enseignant",{p_whatsapp:w,p_code:c},false);
      if(!r.ok)return note($("#m"),r.message);
      ENS={w,c,nom:r.nom,matricule:r.matricule,matiere:r.matiere,etab:r.etablissement,lignes:[],aff:r.affectations||[],autres:r.autres||0,cible:r.id||null};await chargerMat(r.matiere);ensEcran();
    }catch(e){note($("#m"),e.message)}
  };
}
function ensEcran(){
  const cl=listeClasses(ENS.matiere);
  if(!cl.length){app.innerHTML='<div class="card"><div class="msg err">Discipline non prise en charge : '+esc(ENS.matiere)+'</div><button id="sort">Quitter</button></div>';$("#sort").onclick=()=>{ENS=null;accueil()};return}
  const dernier=(()=>{try{return JSON.parse(localStorage.getItem("sdh.ens.sel."+ensCle())||"null")}catch(e){return null}})()||{};
  app.innerHTML=`<div class="card">${entete("Bonjour "+ENS.nom,false)}
  <p class="mut">${esc(NOM_MAT[ENS.matiere]||ENS.matiere)} · ${esc(ENS.etab)}</p>
  ${ensChoixAffect()}${blocSemaine()}${blocGuide("ens")}
  <label>1. Classe (niveau)</label><select id="cl">${cl.map(c=>`<option value="${c.code}">${esc(c.nom)}</option>`).join("")}</select>
  <div class="row"><div><label>2. Numéro de la classe</label><select id="dv">${Array.from({length:15},(_,i)=>`<option value="${i+1}">${i+1}</option>`).join("")}</select></div>
  <div><label>3. Classe dans le formulaire de la Direction</label><select id="fc">${FORM_CLASSES.map(c=>`<option>${c}</option>`).join("")}</select></div></div>
  <label>4. Ouvrez vos notions</label><button id="ouv">Ouvrir mes notions</button><button class="sec" id="sev">Statistiques des évaluations</button><button class="sec" id="prg">Ma progression (courbes)</button><div id="m"></div></div>
  <div id="hc"></div><div id="pg"></div><div id="ck"></div><div id="sts"></div>
  <div class="card"><h3>Communiqués de la Direction</h3><div id="coms"><p class="mut">Chargement…</p></div></div>
  <div class="card"><h3>À envoyer à mon AE</h3><div id="liste"></div>
  <button class="ok" id="env" disabled>Envoyer à mon AE</button><button class="sec" id="sort">Quitter</button><div id="m2"></div></div>`;
  if(dernier.cl&&cl.some(c=>c.code===dernier.cl))$("#cl").value=dernier.cl;
  {const n=String(dernier.dv||"").replace(/\D/g,"");$("#dv").value=(+n>=1&&+n<=15)?String(+n):"1"}
  const majFc=()=>{$("#fc").value=(dernier.fc&&$("#cl").value===dernier.cl)?dernier.fc:formDefaut($("#cl").value)};
  majFc();$("#cl").onchange=()=>{dernier.cl=null;majFc()};
  $("#sort").onclick=()=>{ENS=null;accueil()};ensBrancherAffect();
  const rend=()=>{
    $("#liste").innerHTML=ENS.lignes.length?ENS.lignes.map((l,i)=>`<p>${esc(l.classe_formulaire)} ${esc(l.division)} · S${l.semaine} · ${l.taux_realise}% / ${l.taux_prevu}% <span class="tag t-${l.etat}">${ETAT[l.etat]||""}</span> <button class="ko sm" data-i="${i}">✕</button></p>`).join(""):'<p class="mut">Aucune classe ajoutée.</p>';
    $("#env").disabled=!ENS.lignes.length;
    document.querySelectorAll("[data-i]").forEach(b=>b.onclick=()=>{ENS.lignes.splice(+b.dataset.i,1);rend()});
  };
  rend();
  rpc("communiques_enseignant",{p_whatsapp:ensCle(),p_code:ENS.c},false).then(r=>{
    const z=$("#coms");if(!z)return;
    z.innerHTML=(r.ok&&r.chaine&&chaineValide(r.chaine)?blocChaine(r.chaine).replace(/^<div class="card"[^>]*>/,"<div>").replace(/<h3>.*?<\/h3>/,"<b>Chaîne WhatsApp de la Direction</b>"):"")+((r.ok&&r.liste.length)?r.liste.map(c=>`<details style="margin:6px 0"><summary><b>${esc(c.titre)}</b> <span class="mut">${esc(new Date(c.cree_le).toLocaleDateString("fr-FR"))}</span></summary><p style="white-space:pre-wrap">${esc(c.texte)}</p>${c.pdf_nom?`<p><button class="sec sm" data-epdf="${c.id}">📎 ${esc(c.pdf_nom)}</button></p>`:""}</details>`).join(""):'<p class="mut">Aucun communiqué.</p>');
    brancherChaine(z);
    z.querySelectorAll("[data-epdf]").forEach(b=>b.onclick=async()=>{
      const t=b.textContent;b.disabled=true;b.textContent="Ouverture…";
      try{const q=await rpc("lire_pdf_communique",{p_id:b.dataset.epdf,p_whatsapp:ensCle(),p_code:ENS.c},false);if(!q.ok)throw new Error(q.message);ouvrirPDF(q.nom,q.contenu);b.textContent=t}
      catch(e){b.textContent="Échec : "+e.message}
      b.disabled=false;
    });
  }).catch(()=>{const z=$("#coms");if(z)z.innerHTML='<p class="mut">Communiqués indisponibles.</p>'});
  $("#ouv").onclick=()=>{
    const code=$("#cl").value,dv=normDiv($("#dv").value),fc=$("#fc").value;
    if(!classeCoherente(code,fc))return note($("#m"),"Incohérence : le niveau choisi en 1 ne correspond pas à la classe du formulaire en 3. Corrigez.");
    try{localStorage.setItem("sdh.ens.sel."+ensCle(),JSON.stringify({cl:code,dv,fc}))}catch(e){}
    const cle="sdh.coches."+ensCle()+"."+ENS.matiere+"."+code+"."+dv;
    let C={};try{C=JSON.parse(localStorage.getItem(cle)||"{}")}catch(e){}
    composantCoches({mat:ENS.matiere,classe:code,coches:C,el:$("#ck"),bouton:"Ajouter cette classe à l'envoi",
      persist:c=>{try{localStorage.setItem(cle,JSON.stringify(c))}catch(e){}},
      onSave:r=>{
        ENS.lignes=ENS.lignes.filter(l=>!(l.classe_code===code&&l.division===dv&&l.semaine===r.semaine));
        ENS.lignes.push({classe_code:code,division:dv,classe_formulaire:fc,semaine:r.semaine,date_situation:r.date,taux_prevu:r.prevu,taux_realise:r.realise,ecart:r.ecart,etat:r.etat,motif:r.motif,coches:r.coches});
        $("#ck").innerHTML="";rend();window.scrollTo(0,document.body.scrollHeight);
      }});
    $("#ck").scrollIntoView();
  };
  $("#sev").onclick=ensStats;$("#prg").onclick=ensProgression;fileMajEtat();fileEssayer();
  $("#env").onclick=async()=>{
    try{const r=await rpc("soumettre_point",{p_whatsapp:ensCle(),p_code:ENS.c,p_lignes:ENS.lignes},false);
      if(!r.ok)return note($("#m2"),r.message);
      ENS.lignes=[];rend();note($("#m2"),"Envoyé à votre AE ("+r.n+" classe(s)). Il le validera.","good");
    }catch(e){
      if(e.message==="Pas de connexion Internet"){fileAjouter(ensCle(),ENS.c,ENS.lignes);ENS.lignes=[];rend();fileMajEtat();note($("#m2"),"Pas de réseau : votre point est gardé sur ce téléphone et partira tout seul dès que la connexion revient. Ne désinstallez pas l'application.","good")}
      else note($("#m2"),e.message)}
  };
}

