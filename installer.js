/* Invitation à installer l'application (raccourci sur le bureau / l'écran d'accueil) */
(function(){
  var evt=null,K="donga_install_masque";
  function lire(){try{return parseInt(localStorage.getItem(K)||"0",10)}catch(e){return 0}}
  function ecrire(){try{localStorage.setItem(K,String(Date.now()))}catch(e){}}
  function installee(){return (window.matchMedia&&matchMedia("(display-mode: standalone)").matches)||navigator.standalone===true}
  var ua=navigator.userAgent||"";
  var iOS=/iphone|ipad|ipod/i.test(ua)&&!window.MSStream;
  if(installee())return;
  if("serviceWorker" in navigator){window.addEventListener("load",function(){navigator.serviceWorker.register("sw.js").catch(function(){})})}
  function afficher(){
    if(document.getElementById("inst")||installee())return;
    var t=lire();if(t&&Date.now()-t<3*24*3600*1000)return;
    var b=document.createElement("div");b.id="inst";
    b.setAttribute("style","position:fixed;left:0;right:0;bottom:0;z-index:99999;background:#1f3b5c;color:#fff;padding:14px 16px;box-shadow:0 -4px 16px rgba(0,0,0,.25);display:flex;gap:12px;align-items:center;flex-wrap:wrap");
    var msg=evt?"Installez l'application : un raccourci sera créé sur votre bureau ou votre écran d'accueil.":
      iOS?"Pour créer un raccourci : touchez le bouton Partager, puis « Sur l'écran d'accueil ».":
      "Pour créer un raccourci : ouvrez le menu de votre navigateur (⋮), puis « Installer l'application » ou « Ajouter à l'écran d'accueil ».";
    b.innerHTML='<img src="icon-192.png" alt="" width="44" height="44" style="border-radius:10px"><div style="flex:1 1 220px;font-size:15px;line-height:1.35"><b>Suivi Hebdo Progression – Donga</b><br>'+msg+'</div>';
    var z=document.createElement("div");z.style.cssText="display:flex;gap:8px";
    if(evt){var i=document.createElement("button");i.textContent="Installer";i.style.cssText="background:#4fae7b;color:#fff;border:0;border-radius:10px;padding:11px 16px;font:inherit;font-weight:700;cursor:pointer";
      i.onclick=function(){var e=evt;evt=null;b.remove();e.prompt();e.userChoice.then(function(){}).catch(function(){})};z.appendChild(i)}
    var p=document.createElement("button");p.textContent=evt?"Plus tard":"J'ai compris";p.style.cssText="background:#ffffff26;color:#fff;border:0;border-radius:10px;padding:11px 16px;font:inherit;font-weight:600;cursor:pointer";
    p.onclick=function(){ecrire();b.remove()};z.appendChild(p);b.appendChild(z);document.body.appendChild(b);
  }
  window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();evt=e;var o=document.getElementById("inst");if(o)o.remove();afficher()});
  window.addEventListener("appinstalled",function(){var o=document.getElementById("inst");if(o)o.remove();ecrire()});
  window.addEventListener("load",function(){setTimeout(afficher,2500)});
})();
