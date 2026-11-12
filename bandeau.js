/* ====== Bande d'annonces défilante ====== */
async function chargerBandeau(){
  const b=document.getElementById("bandeau");if(!b)return;
  let l=[];
  try{l=await rest("bandeau?select=texte&actif=eq.true&order=ordre,maj_le",{auth:false});try{localStorage.setItem("sdh.bd",JSON.stringify(l))}catch(e){}}
  catch(e){try{l=JSON.parse(localStorage.getItem("sdh.bd")||"[]")}catch(x){l=[]}}
  l=(l||[]).map(x=>String(x.texte||"").trim()).filter(Boolean);
  if(!l.length){b.hidden=true;return}
  const un=l.map(t=>`<span class="bd-i">${esc(t)}</span>`).join('<span class="bd-s">◆</span>')+'<span class="bd-s">◆</span>';
  const t=document.getElementById("bdt");t.innerHTML=un+un;
  t.style.animationDuration=Math.max(18,Math.round(l.join(" ").length*0.22))+"s";
  b.hidden=false;
}
/* ---- Direction : gérer les messages ---- */
async function dirBandeau(){
  const z=$("#zone");z.innerHTML='<div class="card">Chargement…</div>';
  let l;try{l=await rest("bandeau?select=*&order=ordre,maj_le")}catch(e){z.innerHTML=`<div class="msg err">${esc(e.message)}</div>`;return}
  z.innerHTML=`<div class="card"><h3>Bande d'annonces</h3><p class="mut">Les messages actifs défilent en haut du site, pour tout le monde (8 maximum, 200 caractères chacun).</p>
    <label>Nouveau message</label><textarea id="bt" rows="2" maxlength="200" placeholder="Ex. : Les points de la semaine sont à envoyer avant vendredi 12 h."></textarea>
    <button id="badd" ${l.length>=8?"disabled":""}>Ajouter à la bande</button><div id="bm"></div></div>
    <div class="card"><h3>Messages (${l.length})</h3>${l.length?l.map(x=>`<div style="padding:8px 0;border-top:1px solid var(--br)"><div>${esc(x.texte)}</div>
      <span class="mut">${x.actif?"affiché":"masqué"}</span> <button class="sec sm" data-a="${x.id}" data-v="${x.actif?0:1}">${x.actif?"Masquer":"Afficher"}</button><button class="sec sm" data-u="${x.id}">↑ Monter</button><button class="ko sm" data-d="${x.id}">Supprimer</button></div>`).join(""):'<p class="mut">Aucun message.</p>'}</div>`;
  const m=$("#bm"),go=async(f)=>{try{await f();await chargerBandeau();dirBandeau()}catch(e){note($("#bm")||m,e.message)}};
  $("#badd").onclick=()=>{const t=$("#bt").value.trim();if(t.length<3)return note(m,"Écrivez le message.");go(()=>rest("bandeau",{method:"POST",headers:{Prefer:"return=minimal"},body:{texte:t,ordre:(l.reduce((a,x)=>Math.max(a,x.ordre||0),0)+1)}}))};
  z.querySelectorAll("[data-a]").forEach(b=>b.onclick=()=>go(()=>rest("bandeau?id=eq."+b.dataset.a,{method:"PATCH",headers:{Prefer:"return=minimal"},body:{actif:b.dataset.v==="1"}})));
  z.querySelectorAll("[data-d]").forEach(b=>b.onclick=()=>go(()=>rest("bandeau?id=eq."+b.dataset.d,{method:"DELETE",headers:{Prefer:"return=minimal"}})));
  z.querySelectorAll("[data-u]").forEach(b=>b.onclick=()=>{const i=l.findIndex(x=>x.id===b.dataset.u);if(i<1)return;
    const a=l[i],p=l[i-1];go(async()=>{await rest("bandeau?id=eq."+a.id,{method:"PATCH",headers:{Prefer:"return=minimal"},body:{ordre:i-1}});await rest("bandeau?id=eq."+p.id,{method:"PATCH",headers:{Prefer:"return=minimal"},body:{ordre:i}});
      for(let k=0;k<l.length;k++){if(k!==i&&k!==i-1&&l[k].ordre!==k)await rest("bandeau?id=eq."+l[k].id,{method:"PATCH",headers:{Prefer:"return=minimal"},body:{ordre:k}})}})});
}
chargerBandeau();
