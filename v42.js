/* ====== Version 42 : 63 collèges officiels, filtres AE, niveaux de couleur, code unique, guides ====== */
const COLLEGES_OFFICIELS=[["Bassila", "CEG AKPAO-OGOU"], ["Bassila", "CEG ALEDJO"], ["Bassila", "CEG ALEDJO-PARTAGO"], ["Bassila", "CEG AORO"], ["Bassila", "CEG BIGUINA"], ["Bassila", "CEG BODI"], ["Bassila", "CEG IGBERE"], ["Bassila", "CEG IGBO-DOGUE"], ["Bassila", "CEG KIKELE"], ["Bassila", "CEG KODOWARI"], ["Bassila", "CEG KOÏWALI"], ["Bassila", "CEG KPREKETE"], ["Bassila", "CEG LANTAL"], ["Bassila", "CEG MANIGRI"], ["Bassila", "CEG NAGAYILE"], ["Bassila", "CEG PENESSOULOU"], ["Bassila", "CEG WANNOU"], ["Bassila", "CEG 1 BASSILA"], ["Bassila", "CEG 2 BASSILA"], ["Copargo", "CEG ANANDANA"], ["Copargo", "CEG COPARGO"], ["Copargo", "CEG PABEGOU"], ["Copargo", "CEG TANEKA KOKO"], ["Djougou", "CEG PARTAGO"], ["Djougou", "CEG ANOUM"], ["Djougou", "CEG ASSOLINGA"], ["Djougou", "CEG BAKOU"], ["Djougou", "CEG BAREI"], ["Djougou", "CEG BARIENOU"], ["Djougou", "CEG BATOULOU"], ["Djougou", "CEG BELLEFOUNGOU"], ["Djougou", "CEG BOUGOU"], ["Djougou", "CEG DARINGA"], ["Djougou", "CEG DJAKPINGOU"], ["Djougou", "CEG DONGA"], ["Djougou", "CEG FOUMBEA"], ["Djougou", "CEG FOUNGA"], ["Djougou", "CEG GAOUGA"], ["Djougou", "CEG KOLOKONDE"], ["Djougou", "CEG KPATOUGOU"], ["Djougou", "CEG KPEBOUKO"], ["Djougou", "CEG MONE"], ["Djougou", "CEG ONKLOU"], ["Djougou", "CEG PAPARAPANGA"], ["Djougou", "CEG PELEBINA"], ["Djougou", "CEG SEROU"], ["Djougou", "CEG SOUBROUKOU"], ["Djougou", "CEG TOKO-TOKO"], ["Djougou", "CEG VANHOUI"], ["Djougou", "CEG1 DJOUGOU"], ["Djougou", "CEG2 DJOUGOU"], ["Djougou", "CEG3 DJOUGOU"], ["Ouaké", "CEG AGUE GARBA"], ["Ouaké", "CEG ALINDAOU"], ["Ouaké", "CEG ASSODE"], ["Ouaké", "CEG CP DOMPAGO"], ["Ouaké", "CEG GBAOU"], ["Ouaké", "CEG KASSOUA-ALLAH"], ["Ouaké", "CEG KOMDE"], ["Ouaké", "CEG OUAKE"], ["Ouaké", "CEG SEMERE"], ["Ouaké", "CEG TCHALINGA"], ["Ouaké", "CEG 2 DOMPAGO"]];

const normNom=s=>String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/\s+/g," ").trim().toUpperCase();
const GUIDES={ens:["Guide-Enseignant-Mon-point-de-la-semaine.pdf","Guide de l'enseignant"],ae:["Guide-AE-Point-de-la-semaine.pdf","Guide de l'AE"],cens:["Guide-Censeurs-Directeurs-Smartphone.pdf","Guide du censeur et du directeur"]};
const blocGuide=k=>`<a href="guides/${GUIDES[k][0]}" target="_blank" rel="noopener" download><button class="sec sm" type="button">📘 Télécharger : ${GUIDES[k][1]}</button></a><div id="grp"></div>`;
const blocSemaine=()=>{const n=+semCourante(),p=(typeof periodeSemaine==="function"?String(periodeSemaine(n)||""):"").replace(/^Semaine\s+/i,"");return `<div class="semb"><span>Semaine en cours</span><b>Semaine ${n}</b>${p?`<small>${esc(p)}</small>`:""}${typeof themeSemaine==="function"&&themeSemaine(n)?`<div class="theme">Thème : ${esc(themeSemaine(n))}</div>`:""}</div>`};

/* ---- Niveaux de couleur des classes (AE) ---- */
const niveauPoint=r=>{const e=+r.ecart;if(isNaN(e))return "g";return e>=-4.5?"v":e>-10?"o":"r"};
const clsNiveau=r=>"niv-"+niveauPoint(r);
function plusNiveaux(rows,sans){
  const z=document.getElementById("niv");if(!z)return;
  const c={v:0,o:0,r:0};rows.forEach(r=>c[niveauPoint(r)]=(c[niveauPoint(r)]||0)+1);
  const tot=rows.length+sans.length;
  z.innerHTML=`<div class="nivbar"><span class="nv v">🟢 ${c.v} à jour</span><span class="nv o">🟠 ${c.o} en retard léger</span><span class="nv r">🔴 ${c.r} en retard important</span><span class="nv g">⚪ ${sans.length} sans point</span></div>
  <p class="mut" style="margin:4px 0">${rows.length} point(s) reçus pour ${tot} attendus.</p>
  <label style="display:flex;gap:8px;align-items:center;margin:6px 0"><input type="checkbox" id="mv" style="width:auto"> Masquer les classes à jour (vert) pour voir ce qui reste</label>`;
  document.getElementById("mv").onchange=e=>document.querySelectorAll(".niv-v").forEach(x=>x.style.display=e.target.checked?"none":"");
}

/* ---- Actualiser la semaine si l'application reste ouverte d'une semaine à l'autre ---- */
let _semAuto=semCourante();
document.addEventListener("visibilitychange",()=>{
  if(document.visibilityState!=="visible")return;
  const n=semCourante();if(n===_semAuto)return;
  if(typeof AE!=="undefined"&&AE&&String(AE.sem)===_semAuto){AE.sem=n;if(AE.cur&&document.getElementById("zone")&&typeof aeEcran==="function")aeEcran()}
  _semAuto=n;const b=document.querySelector(".semb");if(b)b.outerHTML=blocSemaine();
});

/* ---- Encouragements ---- */
function encourager(ev){
  const e=+ev.ecart;
  if(ev.statut==="non_commence")return "";
  if(e>=20)return "🏆 Bravo ! Vous avez dépassé le programme de plus de 20 %. Votre engagement est un exemple pour vos collègues.";
  if(e>0.5)return "👏 Vous êtes en avance sur le calendrier. Continuez ainsi !";
  if(e>=-0.5)return "✅ Vous suivez bien le programme. Continuez ainsi.";
  if(e>-5)return "💪 Léger retard : un petit effort et vous rattraperez. Indiquez la raison ci-dessous.";
  if(e>-10)return "💪 Vous avez entre 5 et 10 points de retard. Courage : prévoyez des séances de rattrapage. Indiquez la raison ci-dessous.";
  return "🤝 Retard important : expliquez la cause ci-dessous afin que la Direction puisse vous soutenir. Courage !";
}

/* ---- Collèges : les 63 collèges officiels ---- */
async function dirCol(){
  const z=$("#zone");z.innerHTML='<div class="card">Chargement…</div>';
  try{
    const [a,af]=await Promise.all([rest("etablissements?select=id,nom,commune&order=nom"),rest("affectations?select=etablissement_id")]);
    const nbAE={};af.forEach(x=>nbAE[x.etablissement_id]=(nbAE[x.etablissement_id]||0)+1);
    const off=COLLEGES_OFFICIELS.map(([com,nom])=>({com,nom,k:normNom(nom)}));
    const offK=new Map(off.map(o=>[o.k,o]));
    const dbK=new Map(a.map(x=>[normNom(x.nom),x]));
    const L=off.map(o=>{const d=dbK.get(o.k);return {nom:d?d.nom:o.nom,id:d?d.id:null,commune:d?d.commune:null,comOff:o.com,nb:d?(nbAE[d.id]||0):0,officiel:true}});
    a.filter(x=>!offK.has(normNom(x.nom))).forEach(x=>L.push({nom:x.nom,id:x.id,commune:x.commune,comOff:null,nb:nbAE[x.id]||0,officiel:false}));
    L.sort((p,q)=>p.nom.localeCompare(q.nom));
    z.innerHTML=`<div class="card"><h3>Collèges et communes <span id="cnt"></span></h3>
    <p class="mut">La liste officielle des ${off.length} collèges de la Donga est affichée. Un collège sans AE inscrit porte la mention « Aucun AE inscrit » ; il est créé tout seul dès qu'un AE s'y inscrit. Pour les collèges existants, indiquez la commune : elle détermine ce que voit chaque Conseiller Pédagogique. Le changement est enregistré dès que vous choisissez.</p>
    <label><input type="checkbox" id="sa1" style="width:auto"> Seulement les collèges sans AE</label>
    <label><input type="checkbox" id="sc" style="width:auto"> Seulement les collèges sans commune</label>
    <input id="fq" placeholder="Rechercher un collège"><div id="lst"></div><div id="m"></div></div>`;
    const rend=()=>{
      const q=normNom($("#fq").value||""),sa=$("#sa1").checked,sc=$("#sc").checked;
      const f=L.filter(x=>(!q||normNom(x.nom).includes(q))&&(!sa||!x.nb)&&(!sc||(x.id&&!x.commune)));
      const sans=L.filter(x=>x.officiel&&!x.nb).length,avec=L.filter(x=>x.officiel&&x.nb).length;
      $("#cnt").textContent="("+off.length+" officiels · "+avec+" avec AE · "+sans+" sans AE"+(L.length>off.length?" · "+(L.length-off.length)+" hors liste":"")+")";
      $("#lst").innerHTML=f.map(x=>`<p style="border-top:1px solid var(--br);padding-top:6px"><b>${esc(x.nom)}</b> ${x.nb?`<span class="tag t-conforme">${x.nb} AE</span>`:'<span class="tag t-retard">Aucun AE inscrit</span>'}${x.officiel?"":' <span class="tag t-non_commence">Hors liste officielle</span>'}<br>${x.id?`<select data-c="${x.id}"><option value="">— commune non renseignée —</option>${COMMUNES.map(c=>`<option${x.commune===c?" selected":""}>${c}</option>`).join("")}</select>`:`<span class="mut">Commune : ${esc(x.comOff||"")}</span>`}</p>`).join("")||'<p class="mut">Aucun collège.</p>';
      $("#lst").querySelectorAll("[data-c]").forEach(s=>s.onchange=async()=>{
        try{
          await rest("etablissements?id=eq."+s.dataset.c,{method:"PATCH",headers:{Prefer:"return=minimal"},body:{commune:s.value||null}});
          const e=L.find(x=>x.id===s.dataset.c);if(e)e.commune=s.value||null;
          note($("#m"),"Enregistré","good");
        }catch(er){note($("#m"),er.message)}
      });
    };
    rend();$("#fq").oninput=rend;$("#sa1").onchange=rend;$("#sc").onchange=rend;
  }catch(e){z.innerHTML=`<div class="msg err">${esc(e.message)}</div>`}
}

/* ---- Enseignant : plusieurs collèges / disciplines avec un seul code ---- */
function ensCle(){return ENS.w+(ENS.cible?"#"+ENS.cible:"")}
function ensChoixAffect(){
  const A=ENS.aff||[];let h="";
  if(A.length>1)h+=`<label>Je rends mon point pour :</label><select id="affs">${A.map(x=>`<option value="${x.id}" ${x.id===ENS.cible?"selected":""}>${esc(x.etablissement)} – ${esc(NOM_MAT[x.matiere]||x.matiere)}</option>`).join("")}</select>`;
  if(ENS.autres>0)h+=`<div class="msg info">Vous avez ${ENS.autres} autre(s) inscription(s) avec un autre code. <button class="sec sm" id="lier" type="button">Les relier à ce code</button></div><div id="lz"></div>`;
  return h;
}
function ensBrancherAffect(){
  const s=document.getElementById("affs");
  if(s)s.onchange=async()=>{
    const x=ENS.aff.find(y=>y.id===s.value);if(!x)return;
    ENS.cible=x.id;ENS.nom=x.nom;ENS.matricule=x.matricule;ENS.matiere=x.matiere;ENS.etab=x.etablissement;ENS.lignes=[];
    try{await chargerMat(x.matiere);ensEcran()}catch(e){alert(e.message)}
  };
  const l=document.getElementById("lier");
  if(l)l.onclick=()=>{
    document.getElementById("lz").innerHTML=`<label>Ancien code de l'autre collège</label><input id="anc" type="password" inputmode="numeric"><button class="ok sm" id="lok" type="button">Relier</button><div id="lm"></div>`;
    document.getElementById("lok").onclick=async()=>{
      const m=document.getElementById("lm");
      try{const r=await rpc("relier_affectations",{p_whatsapp:ENS.w,p_code:ENS.c,p_ancien:document.getElementById("anc").value},false);
        if(!r.ok)return note(m,r.message);
        note(m,r.n+" inscription(s) reliée(s). Vous utilisez désormais le même code partout.","good");
        const c=await rpc("connexion_enseignant",{p_whatsapp:ENS.w,p_code:ENS.c},false);if(c.ok){ENS.aff=c.affectations||[];ENS.autres=c.autres||0;setTimeout(ensEcran,1200)}
      }catch(e){note(m,e.message)}
    };
  };
}
