async function censAE(){
  const z=$("#zone"),ids=AE.cens.map(x=>x.etablissement_id);
  z.innerHTML='<div class="card">Chargement…</div>';
  try{
    const a=await rest("affectations?select=id,nom,email,whatsapp,matiere,etablissement_id,etablissements(nom)&etablissement_id=in.("+ids.join(",")+")&order=matiere");
    z.innerHTML=`<div class="card"><h3>Ajouter un AE</h3><p class="mut">L'AE se connectera ensuite avec cet e-mail (code reçu par e-mail).</p>
    ${AE.cens.length>1?`<label>Collège</label><select id="ce">${AE.cens.map(x=>`<option value="${x.etablissement_id}">${esc(x.etablissements.nom)}</option>`).join("")}</select>`:""}
    <label>Nom et prénoms</label><input id="n"><label>E-mail de l'AE (pour sa connexion)</label><input id="e" type="email" inputmode="email">
    <label>Numéro WhatsApp de l'AE</label><input id="w" inputmode="tel" placeholder="01 97 89 09 52">
    <label>Discipline</label><select id="d">${MATIERES.map(m=>`<option>${m}</option>`).join("")}</select>
    <button id="ad">Ajouter cet AE</button><div id="m"></div></div>
    <div class="card"><h3>Mon numéro WhatsApp</h3><div class="row"><input id="mw" inputmode="tel" value="${esc(AE.cens[0].whatsapp||"")}" placeholder="01 97 89 09 52" style="flex:2"><button class="sec" id="svw" style="margin:0">Enregistrer</button></div><div id="mw2"></div></div>
    <div class="card"><h3>AE de mon collège (${a.length})</h3>${a.map(x=>`<p style="border-top:1px solid var(--br);padding-top:6px"><b>${esc(x.matiere)}</b> · ${esc(x.nom||"")} <span class="mut">${esc(x.email)}${x.whatsapp?" · "+esc(x.whatsapp):""}</span> ${x.whatsapp?`<a href="${lienWA(x.whatsapp,"Bonjour "+(x.nom||"")+", vous êtes enregistré comme AE sur la plateforme de suivi de progression (Donga). Connectez-vous avec votre e-mail.")}" target="_blank" rel="noopener">WhatsApp</a> `:""}<button class="ko sm" data-d="${x.id}">Retirer</button></p>`).join("")||'<p class="mut">Aucun AE pour l\'instant.</p>'}</div>`;
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

