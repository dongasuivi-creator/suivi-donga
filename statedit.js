/* ====== Statistiques d'évaluations : l'AE peut corriger la classe et les chiffres, ou supprimer (v48) ====== */
async function statEditer(g,apres){
  const c=AE&&AE.cur;if(!c)return;
  await chargerMat(c.matiere);await nbgCharger("ae");
  let evs=EVALS.filter(e=>g.evals[e[0]]);if(!evs.length)return;
  const r0=g.evals[evs[0][0]],niv=listeClasses(c.matiere);
  const CH=[["g_sup","≥10 G"],["f_sup","≥10 F"],["g_inf","<10 G"],["f_inf","<10 F"],["g_max","Max G"],["f_max","Max F"],["g_min","Min G"],["f_min","Min F"]];
  const ov=document.createElement("div");
  ov.style.cssText="position:fixed;inset:0;z-index:100002;background:rgba(10,20,40,.6);overflow:auto;padding:12px";
  const fermer=()=>ov.remove();
  const rendEvals=()=>evs.map(([t,n])=>{const r=g.evals[t];
    const inp=k=>`<input data-ed="${t}.${k}" inputmode="decimal" value="${r[k]==null?"":String(r[k]).replace(".",",")}" style="width:100%;margin:0;padding:6px;text-align:center">`;
    return `<div style="margin:12px 0"><table class="st" style="width:100%"><tr><th>${esc(n)}</th><th>G</th><th>F</th></tr>
    <tr><td>Moy ≥ 10</td><td>${inp("g_sup")}</td><td>${inp("f_sup")}</td></tr>
    <tr><td>Moy &lt; 10</td><td>${inp("g_inf")}</td><td>${inp("f_inf")}</td></tr>
    <tr><td>Max</td><td>${inp("g_max")}</td><td>${inp("f_max")}</td></tr>
    <tr><td>Min</td><td>${inp("g_min")}</td><td>${inp("f_min")}</td></tr></table>
    <button class="ko sm" data-sup="${t}" type="button">Supprimer cette évaluation</button></div>`}).join("");
  ov.innerHTML=`<div class="card" style="max-width:480px;margin:0 auto"><h3>Modifier les statistiques</h3>
    <p class="mut">${esc(g.ens)} · ${esc(g.etab)}<br>La correction sera visible par la Direction, avec la mention « modifié par l'AE ».</p>
    <label>Niveau</label><select id="edn">${niv.map(x=>`<option value="${esc(x.code)}" ${x.code===r0.classe_code?"selected":""}>${esc(x.nom)}</option>`).join("")}</select>
    <label>Numéro de la classe</label><select id="edd"></select>
    <label>Classe dans le formulaire de la Direction</label><select id="edf">${FORM_CLASSES.map(x=>`<option ${x===r0.classe_formulaire?"selected":""}>${esc(x)}</option>`).join("")}</select>
    <div id="edv">${rendEvals()}</div>
    <button class="ok" id="edok" type="button">Enregistrer la correction</button><button class="sec" id="edx" type="button">Annuler</button><div id="edm"></div></div>`;
  document.body.appendChild(ov);
  const n=ov.querySelector("#edn"),d=ov.querySelector("#edd"),f=ov.querySelector("#edf"),m=ov.querySelector("#edm");
  const majD=cur=>{d.innerHTML=nbgOpts(n.value,cur);if(d.querySelector('option[value="'+cur+'"]'))d.value=cur};
  majD(r0.division);
  n.onchange=()=>{majD(d.value);const fd=formDefaut(n.value);if(FORM_CLASSES.includes(fd))f.value=fd};
  ov.querySelector("#edx").onclick=fermer;
  const rebrancher=()=>ov.querySelectorAll("[data-sup]").forEach(b=>b.onclick=async()=>{
    if(!confirm("Supprimer cette évaluation ? Cette action est définitive."))return;
    try{await rest("stats_evaluations?id=eq."+g.evals[b.dataset.sup].id,{method:"DELETE",headers:{Prefer:"return=minimal"}});
      delete g.evals[b.dataset.sup];evs=evs.filter(e=>e[0]!==b.dataset.sup);
      if(!evs.length){fermer();apres();return}
      ov.querySelector("#edv").innerHTML=rendEvals();rebrancher();
    }catch(e){note(m,e.message)}});
  rebrancher();
  ov.querySelector("#edok").onclick=async()=>{
    if(!classeCoherente(n.value,f.value))return note(m,"Incohérence : le niveau choisi ne correspond pas à la classe du formulaire de la Direction. Corrigez.");
    const ups=[];
    for(const [t,nom] of evs){
      const o={classe_code:n.value,division:normDiv(d.value),classe_formulaire:f.value};
      for(const [k] of CH){
        const el=ov.querySelector(`[data-ed="${t}.${k}"]`),x=nbS(el.value),sup=/_(sup|inf)$/.test(k);
        if(sup){if(x!=null&&(x<0||!Number.isInteger(x)))return note(m,nom+" : l'effectif doit être un nombre entier.");o[k]=x||0}
        else{if(x!=null&&(x<0||x>20))return note(m,nom+" : les notes vont de 0 à 20.");o[k]=x==null?null:x}
      }
      for(const gg of ["g","f"]){
        if(o[gg+"_sup"]+o[gg+"_inf"]>0&&(o[gg+"_max"]===null||o[gg+"_min"]===null))return note(m,nom+" : indiquez le Max et le Min des "+(gg==="g"?"garçons":"filles")+".");
        if(o[gg+"_max"]!==null&&o[gg+"_min"]!==null&&o[gg+"_min"]>o[gg+"_max"])return note(m,nom+" : le Min des "+(gg==="g"?"garçons":"filles")+" dépasse le Max.");
      }
      ups.push([g.evals[t].id,o]);
    }
    try{
      for(const [id,o] of ups)await rest("stats_evaluations?id=eq."+id,{method:"PATCH",headers:{Prefer:"return=minimal"},body:o});
      fermer();apres();
    }catch(e){
      if(/duplicate|unique|23505|409/i.test(String(e.message)))note(m,"Cette classe a déjà des statistiques pour ce semestre et cette évaluation. Choisissez une autre classe, ou supprimez d'abord la ligne en double.");
      else note(m,e.message);
    }
  };
}
