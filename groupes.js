/* ====== Groupe de ma discipline (v43) : liens des groupes WhatsApp par discipline et par collège ====== */
const GRP_RE=/^https:\/\/(chat\.whatsapp\.com\/|whatsapp\.com\/channel\/)[A-Za-z0-9_-]+/i;
const grpNom=m=>NOM_MAT[m]||m;

/* ---- Direction : onglet « Groupes » ---- */
async function dirGroupes(){
  const z=$("#zone");z.innerHTML='<div class="card">Chargement…</div>';
  let liste,etabs;
  try{
    [liste,etabs]=await Promise.all([rest("groupes_discipline?select=id,matiere,etablissement_id,lien,maj_le,etablissements(nom)&order=matiere"),rest("etablissements?select=id,nom&order=nom")]);
  }catch(e){z.innerHTML=`<div class="card"><div class="msg err">${esc(e.message)}</div><p class="mut">Si le message parle d'une table absente, exécutez supabase-ajout20.sql dans Supabase.</p></div>`;return}
  const mats=Object.keys(NOM_MAT);
  z.innerHTML=`<div class="card"><h3>Groupes WhatsApp par discipline</h3>
    <p class="mut">Choisissez la discipline et le collège, collez le lien du groupe, puis enregistrez. Les enseignants et l'AE de cette discipline verront le bouton « Groupe de ma discipline ». « Tout le département » sert aux collèges qui n'ont pas leur propre groupe.</p>
    <label>Discipline</label><select id="gm">${mats.map(m=>`<option value="${m}">${esc(NOM_MAT[m])}</option>`).join("")}</select>
    <label>Collège</label><select id="ge"><option value="">Tout le département</option>${etabs.map(e=>`<option value="${e.id}">${esc(e.nom)}</option>`).join("")}</select>
    <label>Lien du groupe WhatsApp</label><input id="gl" placeholder="https://chat.whatsapp.com/…" autocomplete="off">
    <button id="gok">Enregistrer le lien</button><div id="gmsg"></div></div>
    <div class="card"><h3>Liens enregistrés (${liste.length})</h3>
    <label>Filtrer par discipline</label><select id="gf"><option value="">Toutes</option>${mats.map(m=>`<option value="${m}">${esc(NOM_MAT[m])}</option>`).join("")}</select>
    <div id="glist"></div></div>`;
  const aff=()=>{
    const f=$("#gf").value,l=liste.filter(x=>!f||x.matiere===f);
    $("#glist").innerHTML=l.length?l.map(x=>`<div style="padding:8px 0;border-top:1px solid var(--br)"><b>${esc(grpNom(x.matiere))}</b> · ${x.etablissement_id?esc(x.etablissements?.nom||"Collège"):"Tout le département"}
      <div class="mut" style="word-break:break-all">${esc(x.lien)}</div>
      <a href="${esc(x.lien)}" target="_blank" rel="noopener"><button class="sec sm" type="button">Ouvrir</button></a>
      <button class="sec sm" data-m="${x.id}">Modifier</button><button class="sec sm" data-x="${x.id}">Supprimer</button></div>`).join(""):'<p class="mut">Aucun lien enregistré.</p>';
    z.querySelectorAll("[data-m]").forEach(b=>b.onclick=()=>{const x=liste.find(y=>y.id===b.dataset.m);$("#gm").value=x.matiere;$("#ge").value=x.etablissement_id||"";$("#gl").value=x.lien;window.scrollTo(0,0)});
    z.querySelectorAll("[data-x]").forEach(b=>b.onclick=async()=>{
      if(!confirm("Supprimer ce lien ?"))return;
      try{await rpc("supprimer_groupe",{p_id:b.dataset.x});dirGroupes()}catch(e){note($("#gmsg"),e.message)}});
  };
  $("#gf").onchange=aff;aff();
  $("#gok").onclick=async()=>{
    const lien=$("#gl").value.trim(),m=$("#gmsg");
    if(!GRP_RE.test(lien))return note(m,"Collez un lien qui commence par https://chat.whatsapp.com/");
    try{await rpc("definir_groupe",{p_matiere:$("#gm").value,p_etab:$("#ge").value||null,p_lien:lien});dirGroupes()}catch(e){note(m,e.message)}
  };
}

/* ---- Enseignants, AE, censeurs, directeurs : bouton « Groupe de ma discipline » ---- */
function grpBoutons(l,titre){
  return l.map(g=>`<a href="${esc(g.lien)}" target="_blank" rel="noopener"><button class="sec sm" type="button">💬 ${esc(titre||"Groupe de ma discipline")}${titre?" – "+esc(grpNom(g.matiere)):""}</button></a>`).join("");
}
async function groupeCharger(qui){
  const z=document.getElementById("grp");if(!z)return;
  try{
    let l,c=null;
    if(qui==="ens"){l=await rpc("groupes_enseignant",{p_whatsapp:ensCle(),p_code:ENS.c},false)}
    else{
      c=AE.cur;
      const cc=AE.cens[0];
      l=await rpc("groupes_ae",{p_etab:c?c.etablissement_id:cc.etablissement_id,p_matiere:c?c.matiere:null});
    }
    if(!document.getElementById("grp"))return;
    let h=(qui==="ens"||c)?grpBoutons(l):grpBoutons(l,"Groupe");
    if(c&&qui==="ae"){
      const mien=l.find(g=>g.portee==="college");
      h+=`<details style="margin-top:6px"><summary class="mut">${mien?"Modifier":"Ajouter"} le lien du groupe de mon collège</summary>
        <input id="gal" placeholder="https://chat.whatsapp.com/…" value="${esc(mien?mien.lien:"")}" autocomplete="off">
        <button class="sec sm" id="gas" type="button">Enregistrer</button><div id="gam"></div></details>`;
    }
    z.innerHTML=h;
    if(c&&qui==="ae"&&$("#gas"))$("#gas").onclick=async()=>{
      const v=$("#gal").value.trim(),m=$("#gam");
      if(!GRP_RE.test(v))return note(m,"Collez un lien qui commence par https://chat.whatsapp.com/");
      try{await rpc("definir_groupe",{p_matiere:c.matiere,p_etab:c.etablissement_id,p_lien:v});groupeCharger("ae")}catch(e){note(m,e.message)}
    };
  }catch(e){/* silencieux : table absente ou pas de connexion */}
}
(function(){
  const eba=ensBrancherAffect;ensBrancherAffect=function(){eba();groupeCharger("ens")};
  const ae=aeEcran;aeEcran=function(){ae();groupeCharger("ae")};
})();
