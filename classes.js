/* ====== Groupes pédagogiques (v46) : nombre de classes par niveau, numéro de classe corrigeable ====== */
const NBG={etab:null,m:{},ok:false};
const NBG_DEFAUT=15;
async function nbgCharger(qui){
  try{
    let l;
    if(qui==="ens"){l=await rpc("nb_groupes_enseignant",{p_whatsapp:ensCle(),p_code:ENS.c},false);NBG.etab=null}
    else{
      if(!AE||!AE.cur)return;
      if(NBG.ok&&NBG.etab===AE.cur.etablissement_id)return;
      l=await rpc("nb_groupes_ae",{p_etab:AE.cur.etablissement_id});NBG.etab=AE.cur.etablissement_id;
    }
    NBG.m={};(l||[]).forEach(x=>{NBG.m[x.classe_code]=+x.nb});NBG.ok=true;
  }catch(e){NBG.m={};NBG.ok=false}
}
const nbgN=c=>NBG.m[c]||NBG_DEFAUT;
function nbgOpts(classe,val){
  const n=nbgN(classe),v=normDiv(val);let h="";
  if(v&&!(/^\d+$/.test(v)&&+v>=1&&+v<=n))h+=`<option value="${esc(v)}">${esc(v)} (hors plage)</option>`;
  for(let i=1;i<=n;i++)h+=`<option value="${i}">${i}</option>`;
  return h;
}
/* le menu « Numéro de la classe » suit le niveau choisi : de 1 à n */
function nbgBrancher(){
  const cl=document.getElementById("cl"),dv=document.getElementById("dv");if(!cl||!dv||dv.dataset.nbg)return;
  dv.dataset.nbg="1";
  const maj=()=>{const cur=dv.value;dv.innerHTML=nbgOpts(cl.value,cur);if(dv.querySelector('option[value="'+cur+'"]'))dv.value=cur;dv.dispatchEvent(new Event("change"))};
  cl.addEventListener("change",maj);maj();
}
/* AE : carte « Groupes pédagogiques de mon collège » (onglet Enseignants) */
function nbgCarte(){
  const z=document.getElementById("zone"),c=AE&&AE.cur;if(!z||!c||document.getElementById("nbgc"))return;
  const niv=listeClasses(c.matiere);if(!niv.length)return;
  const d=document.createElement("div");d.className="card";d.id="nbgc";
  d.innerHTML=`<h3>Groupes pédagogiques de mon collège</h3>
  <p class="mut">Pour chaque niveau, indiquez le nombre de classes (de 1 à n). Les enseignants ne verront alors que les numéros de 1 à n. Laissez vide pour garder la liste complète (1 à ${NBG_DEFAUT}).</p>
  ${niv.map(x=>`<div class="row" style="align-items:center"><div style="flex:2">${esc(x.nom)}</div><div style="flex:1"><input type="number" min="1" max="30" inputmode="numeric" data-nbg="${esc(x.code)}" value="${NBG.m[x.code]||""}" placeholder="—"></div></div>`).join("")}
  <button id="nbgs" type="button">Enregistrer</button><div id="nbgm"></div>`;
  z.appendChild(d);
  document.getElementById("nbgs").onclick=async()=>{
    const m=document.getElementById("nbgm");let ch=0;
    try{
      for(const i of d.querySelectorAll("[data-nbg]")){
        const code=i.dataset.nbg,v=i.value.trim()===""?null:Math.round(+i.value);
        if(v!==null&&(!(v>=1)||v>30))return note(m,"Le nombre de groupes doit être entre 1 et 30.");
        if((v||0)!==(NBG.m[code]||0)){await rpc("definir_nb_groupes",{p_etab:c.etablissement_id,p_classe:code,p_nb:v});if(v===null)delete NBG.m[code];else NBG.m[code]=v;ch++}
      }
      note(m,ch?"Enregistré : "+ch+" niveau(x) mis à jour.":"Aucun changement.","good");
    }catch(e){note(m,e.message)}
  };
}
/* AE : « Corriger » avec changement du numéro de la classe */
function dvEditeur(r){
  return `<div class="card" id="dvx-${r.id}" style="margin:6px 0"><label>Numéro de la classe</label><select id="dvs-${r.id}">${nbgOpts(r.classe_code,r.division)}</select>
  <label style="display:block;font-weight:normal;margin-top:6px"><input type="checkbox" id="dvt-${r.id}" checked style="width:auto"> Corriger aussi les autres semaines de cette classe</label></div>`;
}
async function dvAppliquer(r){
  const s=document.getElementById("dvs-"+r.id);if(!s)return;
  const nv=normDiv(s.value),ancien=normDiv(r.division);if(nv===ancien)return;
  const tous=document.getElementById("dvt-"+r.id).checked&&r.enseignant_id;
  const f=tous?`enseignant_id=eq.${r.enseignant_id}&classe_code=eq.${encodeURIComponent(r.classe_code)}&division=eq.${encodeURIComponent(r.division)}`:`id=eq.${r.id}`;
  try{await rest("soumissions?"+f,{method:"PATCH",headers:{Prefer:"return=minimal"},body:{division:nv}})}
  catch(e){
    if(/duplicate|unique|23505|409/i.test(String(e.message)))throw new Error("Le numéro "+nv+" existe déjà pour ce collègue dans cette classe (même semaine). Choisissez un autre numéro, ou décochez « autres semaines ».");
    throw e;
  }
  r.division=nv;
}
(function(){
  const eba=ensBrancherAffect;ensBrancherAffect=function(){eba();nbgCharger("ens").then(nbgBrancher)};
  const as=aeSaisir;aeSaisir=async function(){await as();await nbgCharger("ae");nbgBrancher()};
  const ae=aeEns;aeEns=async function(){await ae();if(AE&&AE.cur){await chargerMat(AE.cur.matiere);await nbgCharger("ae");nbgCarte()}};
})();
