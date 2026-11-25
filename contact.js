/* ====== v49 : écrire directement à un AE (e-mail ou WhatsApp) ====== */
const CTC={l:null};
async function ctcCharger(){
  if(CTC.l)return CTC.l;
  try{CTC.l=await rpc("contacts_ae",{})}catch(e){CTC.l=[]}
  return CTC.l;
}
const ctcCle=(e,m)=>String(e||"")+"|"+String(m||"");
function ctcLiens(x,txt,sujet){
  const o=[];
  if(x.whatsapp&&tel(x.whatsapp))o.push(`<a class="ctc-b" href="${lienWA(x.whatsapp,txt)}" target="_blank" rel="noopener" title="WhatsApp ${esc(x.nom||"")}">💬 WhatsApp</a>`);
  if(x.email)o.push(`<a class="ctc-b" href="mailto:${encodeURIComponent(x.email).replace(/%40/g,"@")}?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(txt)}" title="E-mail ${esc(x.nom||"")}">✉️ E-mail</a>`);
  return o.join(" ")||'<span class="mut">Pas de contact</span>';
}
/* Remplit les cellules <td class="ctc" data-e="collège" data-m="discipline"> d'un tableau Détail.
   auteur : texte de signature ; sem : numéro de semaine */
async function ctcRemplir(zone,auteur,sem){
  const cells=[...zone.querySelectorAll("td.ctc")];if(!cells.length)return;
  const l=await ctcCharger(),ix={};
  l.forEach(x=>{(ix[ctcCle(x.etablissement,x.matiere)]=ix[ctcCle(x.etablissement,x.matiere)]||[]).push(x)});
  const vu=new Set();
  cells.forEach(td=>{
    const k=ctcCle(td.dataset.e,td.dataset.m),a=ix[k];
    if(!a||!a.length){td.innerHTML='<span class="mut">—</span>';return}
    if(vu.has(k)){td.innerHTML='<span class="mut">idem ↑</span>';return}
    vu.add(k);
    const disc=(typeof NOM_MAT!=="undefined"&&NOM_MAT[td.dataset.m])||td.dataset.m;
    td.innerHTML=a.map(x=>{
      const txt="Bonjour "+(x.nom||"")+", c'est "+auteur+". Au sujet du point de la semaine "+sem+" ("+disc+", "+td.dataset.e+") sur la plateforme de suivi : ";
      return `<div class="ctc-l"><b>${esc(x.nom||x.email)}</b><br>${ctcLiens(x,txt,"Point de la semaine "+sem+" – "+disc)}</div>`;
    }).join("");
  });
}
(function(){const s=document.createElement("style");s.textContent=".ctc-b{display:inline-block;margin:2px 6px 2px 0;padding:3px 8px;border:1px solid var(--br,#ccc);border-radius:14px;font-size:12px;text-decoration:none;white-space:nowrap}.ctc-l{margin-bottom:4px}";document.head.appendChild(s)})();
