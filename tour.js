/* ====== Visite guidée (v45) : pas à pas sur l'écran réel, pour enseignant, AE, censeur et directeur ====== */
(function(){
  const st=document.createElement("style");
  st.textContent=`.tr-hl{position:fixed;z-index:100000;border-radius:10px;box-shadow:0 0 0 9999px rgba(10,20,40,.62);pointer-events:none;transition:all .25s}
  .tr-card{position:fixed;left:10px;right:10px;bottom:10px;z-index:100001;background:#fff;border-radius:14px;padding:14px 16px;box-shadow:0 6px 28px rgba(0,0,0,.35);max-width:460px;margin:0 auto}
  .tr-card h3{margin:0 0 6px;font-size:16px;color:#14284a}.tr-card p{margin:0 0 10px;font-size:14px;line-height:1.4}
  .tr-card .tr-bar{display:flex;gap:8px;align-items:center}.tr-card .tr-bar span{flex:1;font-size:12px;color:#6b7686}
  .tr-card button{margin:0;padding:8px 12px;font-size:14px}.tr-card .tr-skip{background:none;border:none;color:#6b7686;text-decoration:underline;padding:8px 4px}
  .tr-center{position:fixed;inset:0;z-index:100000;background:rgba(10,20,40,.62)}`;
  document.head.appendChild(st);

  const $q=s=>document.querySelector(s);
  const onglet=t=>()=>new Promise(r=>{const b=$q('.tabs button[data-t="'+t+'"]');if(b)b.click();setTimeout(r,700)});
  const guide='a[href^="guides/"]';
  const E={
    ens:[
      {s:".semb",t:"La semaine est proposée pour vous",x:"Le numéro de la semaine et ses dates s'affichent tout seuls : vous n'avez rien à saisir."},
      {s:"#affs",t:"Vous enseignez à plusieurs endroits ?",x:"Choisissez ici le collège et la discipline pour lesquels vous rendez votre point. Un seul code suffit pour tout."},
      {s:guide,t:"Le guide, toujours sous la main",x:"Touchez ce bouton pour télécharger le guide et le relire quand vous voulez."},
      {s:"#grp",t:"Le groupe de votre discipline",x:"Rejoignez le groupe WhatsApp de vos collègues pour échanger et partager vos expériences. Si rien n'apparaît ici, le lien n'a pas encore été ajouté."},
      {s:"#cl",t:"1. Choisissez votre classe",x:"Commencez par le niveau, puis le numéro de la classe (ex. : 1, 2, B) et la classe du formulaire de la Direction."},
      {s:"#ouv",t:"2. Ouvrez vos notions",x:"Cochez toutes les séquences déjà faites, y compris celles des semaines passées. En cas de retard, le motif est obligatoire."},
      {s:"#prg",t:"Votre progression",x:"Voyez votre avancement semaine après semaine sous forme de courbes."},
      {s:"#env",t:"3. Envoyez à votre AE avant le jeudi",x:"Quand la ligne apparaît dans « À envoyer à mon AE », touchez ce bouton. Votre AE validera votre point."},
      {t:"C'est tout !",x:"Chaque semaine : choisissez la classe, cochez, envoyez avant jeudi. Vous pouvez relancer cette visite à tout moment avec le bouton « Visite guidée »."}],
    ae:[
      {s:".semb",t:"La semaine est proposée pour vous",x:"Le numéro de la semaine et ses dates s'affichent tout seuls."},
      {s:"#sa",t:"Plusieurs disciplines ou collèges ?",x:"Choisissez ici la discipline et le collège dont vous voulez valider les points."},
      {s:"#grp",t:"Groupe de ma discipline",x:"Rejoignez le groupe WhatsApp de la discipline. Vous pouvez aussi y enregistrer le lien du groupe de votre collège."},
      {s:"#sem",t:"La semaine à valider",x:"Elle est déjà remplie. Pour une autre semaine, changez le numéro puis touchez « Afficher »."},
      {s:'.tabs button[data-t="ens"]',t:"Vos enseignants",x:"Ajoutez ici chaque collègue (et vous-même) avec son numéro WhatsApp : un code à lui envoyer est créé."},
      {s:"#niv",pre:onglet("valider"),t:"À valider : les couleurs",x:"Vert : à jour. Orange : léger retard. Rouge : retard important. Gris : pas encore de point. Cochez « Masquer les classes à jour » pour ne voir que ce qui reste."},
      {s:'.tabs button[data-t="saisir"]',t:"Un collègue sans réseau ?",x:"Saisissez son point à sa place. Il est validé directement."},
      {t:"Votre rythme chaque semaine",x:"Avant le jeudi, les enseignants envoient. Vous validez, puis vous envoyez le PDF au Directeur et au forum WhatsApp de la discipline."}],
    cens:[
      {s:".semb",t:"La semaine est proposée pour vous",x:"Le numéro de la semaine et ses dates s'affichent tout seuls."},
      {s:guide,t:"Le guide",x:"Téléchargez-le ici pour le relire."},
      {s:'.tabs button[data-t="suivi"]',t:"Suivi du collège",x:"Voyez qui a envoyé, qui est validé, les alertes de retard, et relancez les AE par WhatsApp."},
      {s:'.tabs button[data-t="synth"]',t:"Synthèse mensuelle",x:"L'état de chaque discipline sur le mois, à télécharger en PDF ou en Excel."},
      {s:'.tabs button[data-t="aes"]',t:"Vos AE",x:"Ajoutez et retrouvez les AE (et censeurs) de votre collège."},
      {s:"#grp",t:"Les groupes de discipline",x:"Les groupes WhatsApp de toutes les disciplines de votre collège, quand ils sont enregistrés."},
      {t:"C'est tout !",x:"Vous pouvez relancer cette visite à tout moment avec le bouton « Visite guidée »."}]
  };

  let T=null;
  function fin(){if(!T)return;T.els.forEach(e=>e.remove());window.removeEventListener("resize",T.rs);T=null}
  async function montrer(){
    const d=T.steps[T.i];if(!d)return fin();
    T.busy=true;if(d.pre)await d.pre();if(!T)return;T.busy=false;
    let el=d.s?$q(d.s):null;
    if(d.s&&(!el||!el.offsetParent&&getComputedStyle(el).position!=="fixed")){T.i++;return T.i<T.steps.length?montrer():fin()}
    T.els.forEach(e=>e.remove());T.els=[];
    const n=T.steps.length;
    const card=document.createElement("div");card.className="tr-card";
    card.innerHTML=`<h3>${d.t}</h3><p>${d.x}</p><div class="tr-bar"><span>${T.i+1} / ${n}</span><button class="tr-skip">Passer</button>${T.i>0?'<button class="sec tr-prev">Précédent</button>':""}<button class="tr-next">${T.i===n-1?"Terminer":"Suivant"}</button></div>`;
    if(el){
      el.scrollIntoView({block:"center",behavior:"instant"});
      const hl=document.createElement("div");hl.className="tr-hl";document.body.appendChild(hl);T.els.push(hl);
      const place=()=>{const r=el.getBoundingClientRect();Object.assign(hl.style,{left:r.left-6+"px",top:r.top-6+"px",width:r.width+12+"px",height:r.height+12+"px"})};
      place();T.place=place;
    }else{const c=document.createElement("div");c.className="tr-center";document.body.appendChild(c);T.els.push(c);T.place=null}
    document.body.appendChild(card);T.els.push(card);
    /* si la carte cache l'élément, on remonte l'élément au-dessus */
    if(el){const r=el.getBoundingClientRect(),h=card.offsetHeight;if(r.bottom>innerHeight-h-16){window.scrollBy(0,r.bottom-(innerHeight-h-16));T.place()}}
    card.querySelector(".tr-skip").onclick=fin;
    card.querySelector(".tr-next").onclick=()=>{if(T.busy)return;T.i++;T.i<n?montrer():fin()};
    const p=card.querySelector(".tr-prev");if(p)p.onclick=()=>{if(T.busy)return;T.i=Math.max(0,T.i-1);montrer()};
  }
  window.tourLancer=function(qui){
    fin();window.scrollTo(0,0);
    try{localStorage.setItem("sdh.tour."+qui,"1")}catch(e){}
    T={steps:E[qui],i:0,els:[],rs:()=>{T&&T.place&&T.place()}};
    window.addEventListener("resize",T.rs);montrer();
  };
  const vu=q=>{try{return localStorage.getItem("sdh.tour."+q)==="1"}catch(e){return true}};
  document.addEventListener("click",e=>{const b=e.target.closest("[data-tour]");if(b){e.preventDefault();tourLancer(b.dataset.tour)}});

  /* première connexion : la visite démarre toute seule (une seule fois par rôle et par appareil) */
  const auto=q=>{if(!vu(q))setTimeout(()=>{if(document.querySelector('[data-tour="'+q+'"]'))tourLancer(q)},1200)};
  const eba=ensBrancherAffect;ensBrancherAffect=function(){eba();auto("ens")};
  const ae=aeEcran;aeEcran=function(){ae();auto(AE&&AE.cur?"ae":"cens")};
})();
