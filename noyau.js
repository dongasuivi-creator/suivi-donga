/* ====== Configuration du projet (clés publiques, faites pour être visibles) ====== */
const CFG={url:"https://wjjwlmqlzizbgmboyggp.supabase.co",key:"sb_publishable_l2QHESU7V6Ap_41NtW7oLA_aA0Z0lG6"};
const MATIERES=["MATHS","PCT","SVT","ESPAGNOL","ANGLAIS","ALLEMAND","FRANCAIS","HG","PHILO","EPS","ECONOMIE"];
const CLASSES=["6ème","5ème","4ème","3ème","2nde","1ère","Tle"];

/* ====== Petit client Supabase (sans bibliothèque externe) ====== */
let sess=null;
try{sess=JSON.parse(localStorage.getItem("sdh.sess")||"null")}catch(e){}
function saveSess(s){sess=s;try{s?localStorage.setItem("sdh.sess",JSON.stringify(s)):localStorage.removeItem("sdh.sess")}catch(e){}}
async function http(path,o={}){
  const h={apikey:CFG.key,"Content-Type":"application/json",...(o.headers||{})};
  if(o.auth!==false&&sess&&sess.access_token)h.Authorization="Bearer "+sess.access_token;
  let r;
  try{r=await fetch(CFG.url+path,{method:o.method||"GET",headers:h,body:o.body?JSON.stringify(o.body):undefined})}
  catch(e){throw new Error("Pas de connexion Internet")}
  let j=null;const t=await r.text();try{j=t?JSON.parse(t):null}catch(e){}
  if(r.status===401&&o.auth!==false&&sess&&sess.refresh_token&&!o._retry){
    if(await rafraichir())return http(path,{...o,_retry:true});
  }
  if(!r.ok){const m=(j&&(j.message||j.msg||j.error_description||j.error))||("Erreur "+r.status);const er=new Error(m);er.status=r.status;throw er}
  return j;
}
async function rafraichir(){
  try{
    const r=await fetch(CFG.url+"/auth/v1/token?grant_type=refresh_token",{method:"POST",headers:{apikey:CFG.key,"Content-Type":"application/json"},body:JSON.stringify({refresh_token:sess.refresh_token})});
    if(!r.ok){saveSess(null);return false}
    const j=await r.json();saveSess({access_token:j.access_token,refresh_token:j.refresh_token,email:(j.user&&j.user.email)||sess.email});return true;
  }catch(e){return false}
}
const rest=(p,o)=>http("/rest/v1/"+p,o);
const rpc=(n,b,auth)=>http("/rest/v1/rpc/"+n,{method:"POST",body:b,auth});
async function envoyerCode(email){await http("/auth/v1/otp",{method:"POST",auth:false,body:{email,create_user:true}})}
async function verifierCode(email,code){
  const j=await http("/auth/v1/verify",{method:"POST",auth:false,body:{type:"email",email,token:code}});
  saveSess({access_token:j.access_token,refresh_token:j.refresh_token,email:(j.user&&j.user.email)||email});
}

/* ====== Utilitaires ====== */
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const app=$("#app");
const num=v=>{const n=parseFloat(String(v).replace(",","."));return isNaN(n)?null:n};
function tel(v){let d=String(v||"").replace(/\D/g,"");if(d.length===13&&d.startsWith("229"))d=d.slice(3);return d}
function etatDe(prevu,real){
  if(real===0&&prevu>0)return "non_commence";
  const e=real-prevu;return e<-0.5?"retard":e>0.5?"avance":"conforme";
}
const ETAT={retard:"Retard",conforme:"Conforme",avance:"En avance",non_commence:"Non commencé"};
const STAT={en_attente:"À valider",valide:"Validé",rejete:"Rejeté"};
function note(el,txt,type){el.innerHTML=txt?`<div class="msg ${type||"err"}">${esc(txt)}</div>`:""}
function aujourdhui(){return new Date().toISOString().slice(0,10)}
const SITE_URL="https://suivi-donga.ddes-donga.workers.dev";
/* Semaines de cours (numéro, début, fin) : sert à proposer la semaine en cours par défaut */
const SEMAINES_REF=[[1,"2026-09-14","2026-09-18"],[2,"2026-09-21","2026-09-25"],[3,"2026-09-28","2026-10-02"],[4,"2026-10-05","2026-10-09"],[5,"2026-10-12","2026-10-16"],[6,"2026-10-19","2026-10-23"],[7,"2026-10-26","2026-10-30"],[8,"2026-11-02","2026-11-06"],[9,"2026-11-23","2026-11-27"],[10,"2026-11-30","2026-12-04"],[11,"2026-12-07","2026-12-11"],[12,"2026-12-14","2026-12-17"],[13,"2027-01-04","2027-01-08"],[14,"2027-01-25","2027-01-29"],[15,"2027-02-01","2027-02-05"],[16,"2027-02-08","2027-02-12"],[17,"2027-02-15","2027-02-18"],[18,"2027-03-01","2027-03-05"],[19,"2027-03-22","2027-03-23"],[19,"2027-04-08","2027-04-09"],[20,"2027-04-12","2027-04-16"],[21,"2027-04-19","2027-04-23"],[22,"2027-04-26","2027-04-30"]];
function semCourante(){
  const d=aujourdhui();let n=1;
  for(const w of SEMAINES_REF){if(w[1]<=d)n=w[0];else break}
  return String(n);
}
function semDefaut(){return semCourante()}
function semSauve(v){}
function csv(rows){return rows.map(r=>r.map(c=>`"${String(c==null?"":c).replace(/"/g,'""')}"`).join(";")).join("\r\n")}
function telecharger(nom,txt){const b=new Blob(["﻿"+txt],{type:"text/csv;charset=utf-8"});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=nom;a.click()}
function entete(titre,retour){return `<div class="row" style="align-items:center"><h2 style="flex:3">${esc(titre)}</h2>${retour?`<button class="sec sm" id="btn-retour" style="flex:0 0 auto">← Accueil</button>`:""}</div>`}
function lierRetour(){const b=$("#btn-retour");if(b)b.onclick=accueil}


/* ====== Export Excel (.xlsx écrit à la main, sans bibliothèque) ====== */
const CRC_T = (function(){ const t=[]; for(let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c = (c&1) ? (0xEDB88320^(c>>>1)) : (c>>>1); t[n]=c>>>0; } return t; })();
function crc32(b){ let c=0xFFFFFFFF; for(let i=0;i<b.length;i++) c = CRC_T[(c^b[i])&255]^(c>>>8); return (c^0xFFFFFFFF)>>>0; }
function zipStore(files){
  const enc = new TextEncoder(); const parts=[], central=[]; let offset=0;
  files.forEach(function(f){
    const nameB = enc.encode(f.name), data = enc.encode(f.text), crc = crc32(data);
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0,0x04034b50,true); lh.setUint16(4,20,true); lh.setUint16(6,0x0800,true); lh.setUint16(8,0,true); lh.setUint16(10,0,true); lh.setUint16(12,0x21,true);
    lh.setUint32(14,crc,true); lh.setUint32(18,data.length,true); lh.setUint32(22,data.length,true); lh.setUint16(26,nameB.length,true); lh.setUint16(28,0,true);
    parts.push(new Uint8Array(lh.buffer), nameB, data);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0,0x02014b50,true); ch.setUint16(4,20,true); ch.setUint16(6,20,true); ch.setUint16(8,0x0800,true); ch.setUint16(10,0,true); ch.setUint16(12,0,true); ch.setUint16(14,0x21,true);
    ch.setUint32(16,crc,true); ch.setUint32(20,data.length,true); ch.setUint32(24,data.length,true); ch.setUint16(28,nameB.length,true); ch.setUint32(42,offset,true);
    central.push(new Uint8Array(ch.buffer), nameB);
    offset += 30 + nameB.length + data.length;
  });
  let csize = 0; central.forEach(function(c){ csize += c.length; });
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0,0x06054b50,true); end.setUint16(8,files.length,true); end.setUint16(10,files.length,true); end.setUint32(12,csize,true); end.setUint32(16,offset,true);
  return new Blob(parts.concat(central, [new Uint8Array(end.buffer)]), {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}
function xmlEsc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,''); }
function colName(i){ let s=''; i++; while(i>0){ const r=(i-1)%26; s=String.fromCharCode(65+r)+s; i=Math.floor((i-1)/26); } return s; }
function feuilleXML(rows, largeurs, fusions){
  let x = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>';
  if(largeurs) x += '<cols>' + largeurs.map(function(w,i){ return '<col min="' + (i+1) + '" max="' + (i+1) + '" width="' + w + '" customWidth="1"/>'; }).join('') + '</cols>';
  x += '<sheetData>';
  rows.forEach(function(row, r){
    const gras = !Array.isArray(row); const cells = gras ? row.v : row;
    x += '<row r="' + (r+1) + '"' + (row && row.h ? ' ht="' + row.h + '" customHeight="1"' : '') + '>';
    cells.forEach(function(v, c){
      let sty = gras ? 1 : 0;
      if(v && typeof v==='object'){ sty = v.s; v = v.v; }
      if(v===null || v===undefined || v==='') { if(sty){ x += '<c r="' + colName(c) + (r+1) + '" s="' + sty + '"/>'; } return; }
      const ref = colName(c) + (r+1), st = sty ? ' s="' + sty + '"' : '';
      if(typeof v==='number') x += '<c r="' + ref + '"' + st + '><v>' + v + '</v></c>';
      else x += '<c r="' + ref + '"' + st + ' t="inlineStr"><is><t xml:space="preserve">' + xmlEsc(v) + '</t></is></c>';
    });
    x += '</row>';
  });
  x += '</sheetData>';
  if(fusions && fusions.length) x += '<mergeCells count="' + fusions.length + '">' + fusions.map(function(m){ return '<mergeCell ref="' + m + '"/>'; }).join('') + '</mergeCells>';
  return x + '<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/><pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/></worksheet>';
}
function classeurXLSX(feuilles){
  const E = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const files = [
    {name:'[Content_Types].xml', text:E+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' + feuilles.map(function(f,i){ return '<Override PartName="/xl/worksheets/sheet' + (i+1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'; }).join('') + '</Types>'},
    {name:'_rels/.rels', text:E+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'},
    {name:'xl/workbook.xml', text:E+'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' + feuilles.map(function(f,i){ return '<sheet name="' + xmlEsc(f.nom) + '" sheetId="' + (i+1) + '" r:id="rId' + (i+1) + '"/>'; }).join('') + '</sheets></workbook>'},
    {name:'xl/_rels/workbook.xml.rels', text:E+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + feuilles.map(function(f,i){ return '<Relationship Id="rId' + (i+1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i+1) + '.xml"/>'; }).join('') + '<Relationship Id="rId' + (feuilles.length+1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'},
    {name:'xl/styles.xml', text:E+'<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="14"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE8EDF3"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color auto="1"/></left><right style="thin"><color auto="1"/></right><top style="thin"><color auto="1"/></top><bottom style="thin"><color auto="1"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs></styleSheet>'}
  ];
  feuilles.forEach(function(f,i){ files.push({name:'xl/worksheets/sheet' + (i+1) + '.xml', text:feuilleXML(f.rows, f.larg, f.fusions)}); });
  return zipStore(files);
}
function telechargerBlob(blob,nom){const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=nom;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500)}
const fr=n=>String(Math.round(n*10)/10).replace(".",",");
const slug=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"");
const estExamen=c=>c==="3ème"||String(c).indexOf("Tle")===0;
const NOM_MAT={MATHS:"Mathématiques",PCT:"PCT",SVT:"SVT",ESPAGNOL:"Espagnol",ANGLAIS:"Anglais",ALLEMAND:"Allemand",FRANCAIS:"Français",HG:"Histoire-Géo",PHILO:"Philosophie",ECONOMIE:"Économie",EPS:"EPS"};
const ORDRE=[["ALLEMAND","ALLEMAND"],["ANGLAIS","ANGLAIS"],["ECONOMIE","ECONOMIE"],["EPS","EPS"],["ESPAGNOL","ESPAGNOL"],["FRANCAIS","FRANCAIS"],["HIST-GEO","HG"],["MATHEMATIQUES","MATHS"],["PCT","PCT"],["PHILOSOPHIE","PHILO"],["SVT","SVT"]];

/* Synthèse départementale à partir des points validés (vue points_valides) */
function synthese(rows,sem,dateFr,nom,tousEtabs){
  const lignes=rows.map(r=>({etab:r.etablissement,ae:r.ae||"",matCode:r.matiere,mat:NOM_MAT[r.matiere]||r.matiere,matricule:r.matricule,nom:r.enseignant,cls:r.classe_formulaire,div:r.division,real:Number(r.taux_realise),prev:Number(r.taux_prevu),ecart:Number(r.ecart),stat:r.etat,motif:r.motif||""}))
    .filter(o=>!isNaN(o.real)&&!isNaN(o.prev));
  const discs={};lignes.forEach(o=>{(discs[o.matCode]=discs[o.matCode]||{mat:o.mat,l:[]}).l.push(o)});
  const lignesDisc=[];const obs=[];
  Object.keys(discs).sort((a,b)=>discs[a].mat.localeCompare(discs[b].mat)).forEach(code=>{
    const d=discs[code],L=d.l;
    const prevs=L.map(o=>o.prev).sort((a,b)=>a-b),prevu=prevs[Math.floor(prevs.length/2)];
    const moy=L.reduce((a,o)=>a+o.real,0)/L.length;
    const bas=Math.min(...L.map(o=>o.real)),haut=Math.max(...L.map(o=>o.real));
    const qui=(v,ex)=>{const g={};L.filter(o=>o.real===v&&estExamen(o.cls)===ex).forEach(o=>{const k=(o.etab||"").toUpperCase(),lab=o.cls+(o.div?" "+o.div:"");g[k]=g[k]||[];if(g[k].indexOf(lab)<0)g[k].push(lab)});const ks=Object.keys(g);return ks.length?ks.map(k=>k+" ("+g[k].join(", ")+")").join("\n"):"Néant"};
    const etabs={};L.forEach(o=>{etabs[slug(o.etab)]=1});
    const motifs=[];L.filter(o=>o.motif&&(o.stat==="retard"||o.stat==="non_commence"||o.real===bas)).forEach(o=>{const t=o.etab+" — "+o.cls+(o.div?" "+o.div:"")+" : "+o.motif;if(motifs.indexOf(t)<0)motifs.push(t)});
    motifs.forEach(t=>obs.push([d.mat,t]));
    lignesDisc.push({code,mat:d.mat,nbEtab:Object.keys(etabs).length,nbL:L.length,prevu,moy,bas,basEx:qui(bas,true),basIn:qui(bas,false),haut,hautEx:qui(haut,true),hautIn:qui(haut,false),retards:L.filter(o=>o.stat==="retard"||o.stat==="non_commence").length,motifs});
  });
  const codes=lignesDisc.map(d=>d.code),mat={};
  lignes.forEach(o=>{const k=slug(o.etab);mat[k]=mat[k]||{etab:o.etab,v:{}};(mat[k].v[o.matCode]=mat[k].v[o.matCode]||[]).push(o.real)});
  const matrice=Object.keys(mat).sort((a,b)=>mat[a].etab.localeCompare(mat[b].etab)).map(k=>({etab:mat[k].etab,cells:codes.map(c=>{const a=mat[k].v[c];return a?a.reduce((x,y)=>x+y,0)/a.length:null})}));
  const recus={};lignes.forEach(o=>{recus[slug(o.etab)]=1});
  const manquants=(tousEtabs||[]).filter(n=>!recus[slug(n)]);
  const tab=ORDRE.map(o=>({nom:o[0],d:lignesDisc.find(x=>x.code===o[1]),horsApp:o[1]===null}));
  return {sem,nom,dateFr,tab,lignesDisc,matrice,codes,lignes,obs,manquants,nbColleges:Object.keys(recus).length};
}
function tableauMinistere(S){
  const b=x=>esc(x).replace(/\n/g,"<br>");
  let h='<table class="tm"><thead><tr><th rowspan="2">Disciplines</th><th rowspan="2">Taux d\'exécution prévu (%)</th><th rowspan="2">Taux d\'exécution plus bas (%)</th><th colspan="2">Classes concernées</th><th rowspan="2">Taux d\'exécution plus élevé (%)</th><th colspan="2">Classes concernées</th><th rowspan="2">OBS.</th></tr><tr><th>Classes d\'examen</th><th>Classes intermédiaires</th><th>Classes d\'examen</th><th>Classes intermédiaires</th></tr></thead><tbody>';
  S.tab.forEach(r=>{const d=r.d;
    if(!d){h+='<tr><td class="disc">'+esc(r.nom)+'</td><td colspan="7" style="color:#777;font-style:italic">'+(r.horsApp?"Discipline pas encore prise en charge par l\'application":"Aucune donnée reçue")+'</td><td></td></tr>';return}
    h+='<tr><td class="disc">'+esc(r.nom)+'</td><td><b>'+fr(d.prevu)+'</b></td><td><b>'+fr(d.bas)+'</b></td><td>'+b(d.basEx)+'</td><td>'+b(d.basIn)+'</td><td><b>'+fr(d.haut)+'</b></td><td>'+b(d.hautEx)+'</td><td>'+b(d.hautIn)+'</td><td class="obs">'+b(d.motifs.join("\n"))+'</td></tr>';
  });
  return h+"</tbody></table>";
}
function dirExcel(S){
  const H=v=>({v,s:3}),C=v=>({v,s:2}),D=v=>({v,s:4});
  const t0=[{v:[{v:"Point de l'exécution des programmes d'études à la date du "+S.dateFr,s:5}],h:24},[{v:"Point de l'exécution des programmes d'études dans l'ESG — "+(S.portee||"Département de la Donga")+" — Semaine "+S.sem,s:1}],[],
    {v:[H("Disciplines"),H("Taux d'exécution prévu (%)"),H("Taux d'exécution plus bas (%)"),H("Classes concernées"),H(""),H("Taux d'exécution plus élevé (%)"),H("Classes concernées"),H(""),H("OBS.")],h:34},
    {v:[H(""),H(""),H(""),H("Classes d'examen"),H("Classes intermédiaires"),H(""),H("Classes d'examen"),H("Classes intermédiaires"),H("")],h:30}];
  S.tab.forEach(r=>{const d=r.d;
    if(!d)t0.push({v:[D(r.nom),C(""),C(""),C(""),C(""),C(""),C(""),C(""),C(r.horsApp?"Non pris en charge":"Aucune donnée")],h:30});
    else t0.push({v:[D(r.nom),C(d.prevu),C(d.bas),C(d.basEx),C(d.basIn),C(d.haut),C(d.hautEx),C(d.hautIn),C(d.motifs.join("\n"))],h:Math.max(30,15*Math.max(d.basEx.split("\n").length,d.basIn.split("\n").length,d.hautEx.split("\n").length,d.hautIn.split("\n").length,1)+6)});
  });
  if(S.nom){t0.push([]);t0.push(["Établi par : "+S.nom])}
  const e2=[{v:["Collège"].concat(S.lignesDisc.map(d=>d.mat+" (%)"))}];
  S.matrice.forEach(r=>e2.push([r.etab].concat(r.cells.map(v=>v==null?"":Math.round(v*10)/10))));
  const avecAE=S.lignes.some(o=>o.ae);
  const e3=[{v:["Collège","Discipline"].concat(avecAE?["AE"]:[]).concat(["Matricule","Nom et prénom","Classe","Division","Semaine","Taux prévu (%)","Taux réalisé (%)","Écart (points)","État","Motif"])}];
  S.lignes.forEach(o=>e3.push([o.etab,o.mat].concat(avecAE?[o.ae]:[]).concat([o.matricule,o.nom,o.cls,o.div,S.sem,o.prev,o.real,o.ecart,ETAT[o.stat]||"",o.motif])));
  const f=[{nom:"Point d'exécution",rows:t0,larg:[20,13,13,34,34,13,34,34,40],fusions:["A4:A5","B4:B5","C4:C5","D4:E4","F4:F5","G4:H4","I4:I5"]},{nom:"Base de données",rows:e3,larg:[26,18,12,28,14,10,9,12,13,12,12,36]},{nom:"Collèges x disciplines",rows:e2,larg:[30].concat(S.lignesDisc.map(()=>16))}];
  if(S.manquants.length)f.push({nom:"Sans réponse",rows:[{v:["Collèges sans point validé pour la semaine "+S.sem]}].concat(S.manquants.map(x=>[x])),larg:[40]});
  telechargerBlob(classeurXLSX(f),"Point-execution-programmes-"+(S.slugp||"Donga")+"-S"+S.sem+".xlsx");
}
function dirPDF(S){
  let h='<h2 style="font-size:17px;margin:0 0 4px">Point de l\'exécution des programmes d\'études à la date du '+esc(S.dateFr)+'</h2><div style="font-weight:700;font-style:italic;margin-bottom:8px">Point de l\'exécution des programmes d\'études dans l\'ESG — '+esc(S.portee||'Département de la Donga')+' — Semaine '+S.sem+'</div>';
  h+=tableauMinistere(S);
  if(S.manquants.length)h+='<div style="margin-top:8px"><b>Collèges sans point validé :</b> '+S.manquants.map(esc).join(", ")+"</div>";
  h+='<div class="sign"><div>Établi par<br>'+esc(S.nom||"")+'</div><div>Le Directeur Départemental</div></div>';
  $("#rapport").innerHTML=h;
  const st=document.createElement("style");st.id="pg-land";st.textContent="@page{size:A4 "+orientAuto()+";margin:10mm}";document.head.appendChild(st);
  const ancien=document.title;document.title="Point-execution-programmes-"+(S.slugp||"Donga")+"-S"+S.sem;
  document.body.classList.add("mode-rapport");
  const fin=()=>{document.body.classList.remove("mode-rapport");document.title=ancien;const s=document.getElementById("pg-land");if(s)s.remove();window.removeEventListener("afterprint",fin)};
  window.addEventListener("afterprint",fin);
  setTimeout(()=>window.print(),50);
}


const FORM_CLASSES = ['6ème','5ème','4ème','3ème','2nde A2','2nde B','2nde C','2nde D','2nde STT','2nde STI','1ère A2','1ère B','1ère C','1ère D','1ère STT','1ère STI','Tle A2','Tle B','Tle C','Tle D','Tle STT','Tle STI'];
function classeCoherente(code,fc){const a=String(formDefaut(code)).split(" ")[0],b=String(fc).split(" ")[0];return a===b}
function formDefaut(code){
  const m = {'6E':'6ème','5E':'5ème','4E':'4ème','3E':'3ème'};
  if(m[code]) return m[code];
  const pre = code.indexOf('2NDE')===0 ? '2nde ' : code.indexOf('1ERE')===0 ? '1ère ' : code.indexOf('TLE')===0 ? 'Tle ' : '';
  if(!pre) return FORM_CLASSES[0];
  const suf = code.split('_')[1] || '';
  let serie = 'A2';
  if(/^CD|^C$|^S$/.test(suf)) serie = 'C';
  else if(/^AB/.test(suf)) serie = 'A2';
  else if(/^D$|^EFG/.test(suf)) serie = 'D';
  return pre + serie;
}

/* ====== Données de référence : un fichier par discipline (donnees/MATHS.js, ...), chargé à la demande ====== */
const VERSION_SITE="36"
const normDiv=s=>{const t=String(s||"").replace(/\s+/g,"").toUpperCase();return t};;
const REF_MAT = {};
function chargerScript(url){
  return new Promise(res=>{
    const s=document.createElement("script");
    s.src=url+"?v="+VERSION_SITE;
    s.onload=()=>res(true);s.onerror=()=>res(false);
    document.head.appendChild(s);
  });
}
/* Une discipline = donnees/CODE.js. Si ce fichier déclare "parts" (ex. Mathématiques : une progression par classe),
   chaque partie est chargée depuis donnees/CODE_PARTIE.js. */
function chargerMat(code){
  if(REF_MAT[code]&&REF_MAT[code].chargee)return Promise.resolve(true);
  return chargerScript("donnees/"+code+".js").then(async ok=>{
    if(!ok||!REF_MAT[code])return false;
    const parts=REF_MAT[code].parts||[];
    const r=await Promise.all(parts.map(p=>chargerScript("donnees/"+code+"_"+p+".js")));
    REF_MAT[code].partsOk=r.every(x=>x);
    REF_MAT[code].chargee=true;
    return true;
  });
}

/* ====== Moteur de calcul (identique à l'application de départ) ====== */
function round1(n){return Math.round(n*10)/10}
function refPour(mat,classe){
  const D=REF_MAT[mat].data,contenu=D.progressions[classe]||{};
  return D.calendar.semaines.map(s=>{
    const ex=contenu[s.id]||null,sa=ex?ex.sa:null,act=ex?ex.activite:null;
    let items=(ex&&Array.isArray(ex.items))?ex.items.slice():decouperItems(act);
    if(!items.length&&sa)items=[sa];
    return Object.assign({},s,{sa,activite:act,items});
  });
}
function decouperItems(a){if(!a)return[];const t=String(a).trim();if(!t)return[];const m=t.split(".").map(x=>x.trim()).filter(x=>x);return m.length?m:[t]}
function cumulPrevuADate(ref,d){let r=0;ref.forEach(s=>{if(s.type==="cours"&&typeof s.cumulPrevu==="number"&&s.debut<=d)r=s.cumulPrevu});return r}
function evaluerStatut(prevu,real){
  const e=round1(real-prevu);
  if(real===0&&prevu===0)return{statut:"non_commence",ecart:0};
  if(e>0.5)return{statut:"avance",ecart:e};
  if(e<-0.5)return{statut:"retard",ecart:e};
  return{statut:"conforme",ecart:e};
}
function fmtNb(n){const r=round1(Math.abs(n));return Number.isInteger(r)?String(r):String(r).replace(".",",")}
function messageEcart(st,ec,vol){
  const h=(typeof vol==="number"&&vol>0)?round1(ec/100*vol):null;
  const d=h!==null?fmtNb(h)+" heure"+(Math.abs(h)>1?"s":""):fmtNb(ec)+" point"+(Math.abs(ec)>1?"s":"")+" de %";
  if(st==="retard")return"Retard de "+d+" sur le calendrier prévu.";
  if(st==="avance")return"En avance de "+d+" sur le calendrier prévu.";
  if(st==="non_commence")return"Aucune progression saisie pour le moment.";
  return"Progression conforme au calendrier prévu.";
}
function semaineRef(ref,date){
  const cours=ref.filter(s=>s.type==="cours");
  const act=ref.find(s=>date>=s.debut&&date<=s.fin);
  if(act&&act.type==="cours")return act;
  let d=null;for(const s of cours){if(s.fin<=date)d=s;else break}
  return d||cours[0];
}
const ddmm=iso=>{const p=iso.split("-");return p[2]+"/"+p[1]};

/* Composant « cases à cocher » : utilisé par l'enseignant et par l'AE.
   o = {mat, classe, coches, date, dateFixe, motif, el, bouton, persist(C), onSave(res)} */
function composantCoches(o){
  const D=REF_MAT[o.mat].data,ref=refPour(o.mat,o.classe),cours=ref.filter(s=>s.type==="cours");
  const C=JSON.parse(JSON.stringify(o.coches||{}));
  const vol=D.volumes[o.classe];
  let date=o.date||aujourdhui();
  const nb=id=>Array.isArray(C[id])?C[id].filter(Boolean).length:0;
  const el=o.el;
  el.innerHTML=`<div class="ck"><div class="card"><div class="row"><div><label>Date de référence</label><input type="date" id="ckd" value="${esc(date)}" ${o.dateFixe?"disabled":""}></div><div><label>Semaine</label><div id="cksem" style="padding:11px 0;font-weight:700"></div></div></div>
  <div class="nums"><div>Prévu<b id="ckp"></b></div><div>Réalisé<b id="ckr"></b></div><div>Écart<b id="cke"></b></div></div>
  <div id="cka" class="msg info"></div>
  <label>Motif (obligatoire en cas de retard)</label><textarea id="ckmo" rows="2">${esc(o.motif||"")}</textarea></div>
  <p class="mut" style="margin:8px 4px">Cochez les notions déjà traitées. Les semaines à venir cochées comptent comme avance.</p>
  <div id="ckw">${cours.map(s=>`<details data-w="${s.id}"><summary id="sm-${s.id}"></summary>
    ${s.sa?`<div class="sa">${esc(s.sa)}</div>`:""}
    ${s.items.length?`<ul>${s.items.map((it,i)=>`<li><input type="checkbox" id="ck-${s.id}-${i}" data-w="${s.id}" data-i="${i}" ${Array.isArray(C[s.id])&&C[s.id][i]?"checked":""}><label for="ck-${s.id}-${i}">${esc(it)}</label></li>`).join("")}</ul>`:'<p class="mut" style="padding:6px 12px">Aucun contenu renseigné pour cette semaine.</p>'}</details>`).join("")}</div>
  <div class="card"><button class="ok" id="cks">${esc(o.bouton||"Enregistrer")}</button><div id="ckm"></div></div></div>`;
  let cur=null;
  function calc(){
    const sais={};cours.forEach(s=>{const n=nb(s.id);sais[s.id]=(n>0&&s.items.length&&typeof s.prevu==="number")?round1(n/s.items.length*s.prevu):null});
    let real=0;cours.forEach(s=>{if(typeof sais[s.id]==="number")real+=sais[s.id]});real=round1(real);
    const prev=cumulPrevuADate(ref,date),ev=evaluerStatut(prev,real),wk=semaineRef(ref,date);
    cur={prev,real,ev,wk,sem:parseInt(wk.id.replace(/^S0?/,""),10)};
    $("#ckp").textContent=fmtNb(prev)+"%";$("#ckr").textContent=fmtNb(real)+"%";
    $("#cke").textContent=(ev.ecart>0?"+":ev.ecart<0?"−":"")+fmtNb(ev.ecart);
    $("#cksem").textContent="S"+cur.sem+" ("+ddmm(wk.debut)+" – "+ddmm(wk.fin)+")";
    const a=$("#cka");a.className="msg "+(ev.statut==="retard"?"err":ev.statut==="avance"?"info":"good");a.textContent=messageEcart(ev.statut,ev.ecart,vol);
    cours.forEach(s=>{
      const n=nb(s.id),r=sais[s.id];
      $("#sm-"+s.id).innerHTML="S"+s.id.replace(/^S0?/,"")+" · "+ddmm(s.debut)+" – "+ddmm(s.fin)+" · "+n+"/"+s.items.length+(r!=null?" · "+fmtNb(r)+"%":"")+(s.id===wk.id?' <span class="actif">← en cours</span>':"");
    });
  }
  calc();
  const w0=el.querySelector('details[data-w="'+cur.wk.id+'"]');if(w0)w0.open=true;
  el.querySelectorAll('input[type=checkbox]').forEach(cb=>cb.onchange=()=>{
    const w=cb.dataset.w,i=+cb.dataset.i,tot=cours.find(s=>s.id===w).items.length;
    if(!Array.isArray(C[w]))C[w]=new Array(tot).fill(false);
    C[w][i]=cb.checked;calc();if(o.persist)o.persist(C);
  });
  $("#ckd").onchange=e=>{if(e.target.value){date=e.target.value;calc()}};
  $("#cks").onclick=()=>{
    const mo=$("#ckmo").value.trim();
    if((cur.ev.statut==="retard"||cur.ev.statut==="non_commence")&&!mo)return note($("#ckm"),"Indiquez le motif du retard");
    o.onSave({semaine:cur.sem,date,prevu:cur.prev,realise:cur.real,ecart:cur.ev.ecart,etat:cur.ev.statut,motif:mo,coches:C});
  };
}
function listeClasses(mat){return REF_MAT[mat]?REF_MAT[mat].data.classes:[]}


/* ====== Communiqués ====== */
const CLE_CHAINE="chaine_whatsapp";
const chaineValide=u=>/^https:\/\/(www\.)?whatsapp\.com\/channel\/[A-Za-z0-9_-]+\/?$/.test(u);
async function lireChaine(){try{const r=await rest("parametres?select=valeur&cle=eq."+CLE_CHAINE);return r[0]?r[0].valeur:""}catch(e){return ""}}
function blocChaine(url){
  return url?`<div class="card" style="border-color:#3d6b55"><h3>Chaîne WhatsApp de la Direction</h3><p class="mut">Rejoignez la chaîne pour recevoir les communiqués directement.</p>
  <a href="${esc(url)}" target="_blank" rel="noopener"><button class="ok">Rejoindre la chaîne</button></a><button class="sec" data-cl="${esc(url)}">Copier le lien</button></div>`:"";
}
function brancherChaine(z){z.querySelectorAll("[data-cl]").forEach(b=>b.onclick=async()=>{try{await navigator.clipboard.writeText(b.dataset.cl);b.textContent="Lien copié ✓"}catch(e){b.textContent="Copie impossible"}})}
function texteCom(c){return "📢 *"+c.titre+"*\n\n"+(c.texte?c.texte+"\n\n":"")+(c.pdf_nom?"📎 Document PDF : "+c.pdf_nom+" (à joindre au message)\n\n":"")+"— Direction Départementale, Donga"}
/* PDF des communiqués : lecture du fichier (base64) et ouverture / téléchargement */
function ouvrirPDF(nom,b64){
  const bin=atob(b64),u=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);
  telechargerBlob(new Blob([u],{type:"application/pdf"}),nom);
}
function fichierBase64(f){
  return new Promise((ok,ko)=>{const r=new FileReader();r.onload=()=>ok(String(r.result).split(",")[1]||"");r.onerror=()=>ko(new Error("Lecture du fichier impossible"));r.readAsDataURL(f)});
}
function ciblesCom(c){return c==="TOUS"?"Tous les enseignants":(NOM_MAT[c]||c)}
function boutonsCom(c){return `<button class="v sm" data-wa="${c.id}">Relayer sur WhatsApp</button><button class="sec sm" data-cp="${c.id}">Copier</button>`}
function brancherCom(z,liste){
  z.querySelectorAll("[data-pdf]").forEach(b=>b.onclick=async()=>{
    const t=b.textContent;b.disabled=true;b.textContent="Ouverture…";
    try{const r=await rpc("lire_pdf_communique",{p_id:b.dataset.pdf});if(!r.ok)throw new Error(r.message);ouvrirPDF(r.nom,r.contenu);b.textContent=t}
    catch(e){b.textContent="Échec : "+e.message}
    b.disabled=false;
  });
  z.querySelectorAll("[data-wa]").forEach(b=>b.onclick=()=>{
    const c=liste.find(x=>x.id===b.dataset.wa);if(!c)return;
    window.open("https://wa.me/?text="+encodeURIComponent(texteCom(c)),"_blank","noopener");
  });
  z.querySelectorAll("[data-cp]").forEach(b=>b.onclick=async()=>{
    const c=liste.find(x=>x.id===b.dataset.cp);if(!c)return;
    try{await navigator.clipboard.writeText(texteCom(c));b.textContent="Copié ✓"}catch(e){b.textContent="Copie impossible"}
  });
}
function carteCom(c){
  return `<div class="card"><b>${esc(c.titre)}</b><div class="mut">${esc(new Date(c.cree_le).toLocaleDateString("fr-FR"))} · ${esc(ciblesCom(c.cible))}</div>
  ${c.texte?`<p style="white-space:pre-wrap">${esc(c.texte)}</p>`:""}
  ${c.pdf_nom?`<p><button class="sec sm" data-pdf="${c.id}">📎 ${esc(c.pdf_nom)}</button></p>`:""}`;
}
async function aeCom(){
  const z=$("#zone");z.innerHTML='<div class="card">Chargement…</div>';
  try{
    const [l,ch]=await Promise.all([rest("communiques?select=*&order=cree_le.desc&limit=30"),lireChaine()]);
    z.innerHTML=blocChaine(ch)+(l.length?'<p class="mut">Touchez « Relayer sur WhatsApp », puis choisissez le groupe des enseignants de votre collège.</p>'+l.map(c=>carteCom(c)+boutonsCom(c)+"</div>").join(""):'<div class="card"><p class="mut">Aucun communiqué pour l\'instant.</p></div>');
    brancherCom(z,l);brancherChaine(z);
  }catch(e){z.innerHTML=`<div class="msg err">${esc(e.message)}</div>`}
}
async function dirCom(opt){
  opt=opt||{};const IPD=!!opt.ipd;
  const z=$("#zone");z.innerHTML='<div class="card">Chargement…</div>';
  try{
    const [l,ch]=await Promise.all([rest("communiques?select=*&order=cree_le.desc&limit=50"),lireChaine()]);
    z.innerHTML=`${IPD?"":`<div class="card"><h3>Chaîne WhatsApp de la Direction</h3>
    <p class="mut">Collez le lien de votre chaîne (https://whatsapp.com/channel/…). Il sera proposé à tous les enseignants et AE.</p>
    <input id="lc" value="${esc(ch)}" placeholder="https://whatsapp.com/channel/..."><button id="sc">Enregistrer le lien</button><div id="mc"></div></div>`}
    <div class="card"><h3>Nouveau communiqué</h3>
    <label>Titre</label><input id="ct" maxlength="120">
    <label>Message (facultatif si vous joignez un PDF)</label><textarea id="cx" rows="5" maxlength="2000"></textarea>
    <label>Document PDF (facultatif, 3 Mo maximum)</label><input type="file" id="cf" accept="application/pdf,.pdf">
    <label>Destinataires</label><select id="cc"><option value="TOUS">Tous les enseignants</option>${MATIERES.map(m=>`<option value="${m}">${esc(NOM_MAT[m]||m)}</option>`).join("")}</select>
    <button class="ok" id="cp">Publier</button><div id="m"></div></div>
    ${l.map(c=>carteCom(c)+boutonsCom(c)+(IPD?"":`<button class="ok sm" data-pub="${c.id}">Copier et ouvrir la chaîne</button>`)+((!IPD||String(c.auteur||"").toLowerCase()===String(sess.email||"").toLowerCase())?`<button class="ko sm" data-del="${c.id}">Supprimer</button>`:"")+"</div>").join("")||'<div class="card"><p class="mut">Aucun communiqué publié.</p></div>'}`;
    $("#cp").onclick=async()=>{
      const t=$("#ct").value.trim(),x=$("#cx").value.trim(),f=$("#cf").files[0];
      if(t.length<3)return note($("#m"),"Le titre est obligatoire");
      if(!f&&x.length<3)return note($("#m"),"Écrivez un message ou joignez un PDF");
      if(f&&f.size>3*1024*1024)return note($("#m"),"PDF trop lourd (3 Mo maximum)");
      if(f&&!/\.pdf$/i.test(f.name)&&f.type!=="application/pdf")return note($("#m"),"Le fichier doit être un PDF");
      $("#cp").disabled=true;
      try{
        if(f){
          note($("#m"),"Envoi du PDF en cours…","info");
          const r=await rpc("publier_communique_pdf",{p_titre:t,p_texte:x,p_cible:$("#cc").value,p_nom:f.name,p_contenu:await fichierBase64(f)});
          if(!r.ok){$("#cp").disabled=false;return note($("#m"),r.message)}
        }else await rest("communiques",{method:"POST",headers:{Prefer:"return=minimal"},body:{titre:t,texte:x,cible:$("#cc").value,auteur:sess.email}});
        dirCom(opt);
      }catch(e){$("#cp").disabled=false;note($("#m"),e.message)}
    };
    if($("#sc"))$("#sc").onclick=async()=>{
      const u=$("#lc").value.trim();
      if(u&&!chaineValide(u))return note($("#mc"),"Lien invalide : il doit commencer par https://whatsapp.com/channel/");
      try{
        if(!u)await rest("parametres?cle=eq."+CLE_CHAINE,{method:"DELETE",headers:{Prefer:"return=minimal"}});
        else await rest("parametres?on_conflict=cle",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:{cle:CLE_CHAINE,valeur:u}});
        note($("#mc"),u?"Lien enregistré":"Lien supprimé","good");
      }catch(e){note($("#mc"),e.message)}
    };
    z.querySelectorAll("[data-pub]").forEach(b=>b.onclick=async()=>{
      const c=l.find(x=>x.id===b.dataset.pub);if(!c)return;
      try{await navigator.clipboard.writeText(texteCom(c))}catch(e){}
      const u=($("#lc")||{value:""}).value.trim();
      if(chaineValide(u)){window.open(u,"_blank","noopener");b.textContent="Texte copié : collez-le dans la chaîne"}
      else note($("#mc"),"Enregistrez d'abord le lien de la chaîne");
    });
    z.querySelectorAll("[data-del]").forEach(b=>b.onclick=async()=>{
      if(!confirm("Supprimer ce communiqué ?"))return;
      try{await rest("communiques?id=eq."+b.dataset.del,{method:"DELETE",headers:{Prefer:"return=minimal"}});dirCom(opt)}catch(e){note($("#m"),e.message)}
    });
    brancherCom(z,l);
  }catch(e){z.innerHTML=`<div class="msg err">${esc(e.message)}</div>`}
}

/* ====== Accueil ====== */
function accueil(){
  app.innerHTML=`
  <div class="card"><h2>Bienvenue</h2>
  <p class="mut">Plateforme gratuite de suivi de l'exécution des programmes – Département de la Donga.</p>
  <button class="big b1" id="a-ens">👩‍🏫 Je suis enseignant<br><small>Envoyer mon point de la semaine</small></button>
  <button class="big b2" id="a-ae">✅ AE, Censeur ou Directeur<br><small>Valider les points, suivre et gérer mon collège</small></button>
  <button class="big b3" id="a-dir">🏛️ Direction Départementale<br><small>Tableaux de synthèse</small></button>
  <button class="big b4" id="a-enc">🎓 CCIP, Conseiller pédagogique, Inspecteur<br><small>Consulter les points, publier (CCIP)</small></button>
  </div>`;
  $("#a-ens").onclick=ensConnexion;$("#a-ae").onclick=()=>connexionRole("ae");$("#a-dir").onclick=()=>connexionRole("dir");$("#a-enc").onclick=()=>connexionRole("enc");
}

/* ====== Connexion par e-mail (AE et Direction) ====== */
function connexionRole(role){
  const DEMARRER={ae:aeDemarrer,dir:dirDemarrer,enc:encDemarrer};
  if(sess&&sess.access_token){return DEMARRER[role]()}
  app.innerHTML=`<div class="card">${entete(role==="ae"?"Connexion AE, Censeur ou Directeur":role==="enc"?"Connexion CCIP, CP ou Inspecteur":"Connexion Direction",true)}
  <label>Votre adresse e-mail</label><input id="em" type="email" autocomplete="email" inputmode="email" placeholder="exemple@gmail.com">
  <button id="go">Recevoir mon code</button><div id="m"></div>
  <div id="bloc2" style="display:none"><label>Code à 6 chiffres reçu par e-mail</label>
  <input id="cd" inputmode="numeric" maxlength="8" placeholder="123456"><button class="ok" id="ok">Me connecter</button></div></div>`;
  lierRetour();
  $("#go").onclick=async()=>{
    const em=$("#em").value.trim().toLowerCase();
    if(!/^\S+@\S+\.\S+$/.test(em))return note($("#m"),"Adresse e-mail invalide");
    $("#go").disabled=true;
    try{
      await envoyerCode(em);
      note($("#m"),"Code envoyé. Il peut mettre quelques minutes à arriver : regardez votre boîte e-mail et les courriers indésirables (spam). Ne redemandez pas tout de suite.","good");
      $("#bloc2").style.display="block";
      let t=60;const bt=$("#go");bt.disabled=true;
      const iv=setInterval(()=>{t--;if(t<=0){clearInterval(iv);bt.disabled=false;bt.textContent="Recevoir un nouveau code"}else bt.textContent="Nouveau code possible dans "+t+" s"},1000);
      return;
    }catch(e){note($("#m"),/rate|limit|seconds/i.test(e.message)?"Trop de demandes. Attendez une minute puis réessayez, ou utilisez le dernier code reçu.":e.message)}
    $("#go").disabled=false;
  };
  $("#ok").onclick=async()=>{
    const em=$("#em").value.trim().toLowerCase(),cd=$("#cd").value.replace(/\D/g,"");
    if(cd.length<6)return note($("#m"),"Entrez le code à 6 chiffres");
    try{await verifierCode(em,cd);DEMARRER[role]()}
    catch(e){note($("#m"),"Code incorrect ou expiré")}
  };
}
function deconnexion(){saveSess(null);accueil()}


/* ====== Point des établissements ayant renseigné, par matière ====== */
const MOIS_FR=["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
function periodeSemaine(n){
  const w=SEMAINES_REF.find(x=>x[0]===n);if(!w)return "";
  const a=w[1].split("-"),b=w[2].split("-"),j=x=>x.length&&x;
  const da=a[2],db=b[2];
  if(a[1]===b[1])return "Semaine du "+da+" au "+db+" "+MOIS_FR[+b[1]-1]+" "+b[0];
  return "Semaine du "+da+" "+MOIS_FR[+a[1]-1]+" au "+db+" "+MOIS_FR[+b[1]-1]+" "+b[0];
}
function orientAuto(){
  const r=$("#rapport"),a=r.getAttribute("style");
  r.style.cssText="display:block;position:absolute;left:-9999px;top:0;width:718px;font-size:9px";
  document.body.classList.add("mode-rapport-mesure");
  let large=false;r.querySelectorAll("table").forEach(t=>{const n=Math.max(0,...[...t.rows].map(x=>x.cells.length));if(t.scrollWidth>718||n>6)large=true});
  document.body.classList.remove("mode-rapport-mesure");
  if(a===null)r.removeAttribute("style");else r.setAttribute("style",a);
  return large?"landscape":"portrait";
}
function tableauEtabs(rows,sem,toutes){
  const par={};
  rows.forEach(r=>{const g=par[r.matiere]=par[r.matiere]||{};g[slug(r.etablissement)]=r.etablissement});
  let cols=ORDRE.map(o=>({nom:o[0],etabs:Object.values(par[o[1]]||{}).sort((a,b)=>a.localeCompare(b,"fr"))}));
  if(!toutes)cols=cols.filter(c=>c.etabs.length);
  const n=new Date(),p2=x=>String(x).padStart(2,"0");
  const stamp=p2(n.getDate())+"/"+p2(n.getMonth()+1)+"/"+String(n.getFullYear()).slice(2)+" à "+p2(n.getHours())+"h"+p2(n.getMinutes())+"min";
  return {sem,cols,max:Math.max(0,...cols.map(c=>c.etabs.length)),periode:periodeSemaine(sem),stamp};
}
function etabsHTML(T){
  if(!T.cols.length)return '<p class="mut">Aucun collège n\'a renseigné cette semaine dans votre périmètre.</p>';
  let h='<table class="te"><thead><tr>'+T.cols.map(c=>'<th>'+esc(c.nom)+' <span class="mut">('+c.etabs.length+')</span></th>').join("")+'</tr></thead><tbody>';
  for(let i=0;i<T.max;i++)h+='<tr>'+T.cols.map(c=>'<td>'+esc(c.etabs[i]||"")+'</td>').join("")+'</tr>';
  return h+'</tbody></table>';
}
function etabsEntete(T){return {t:"Semaine N°"+T.sem,s:"POINT DES ETABLISSEMENTS AYANT RENSEIGNE PAR MATIERE ESG",p:T.periode,e:"(point établi le "+T.stamp+")"}}
function etabsExcel(T){
  const E=etabsEntete(T),H=v=>({v,s:3}),C=v=>({v,s:2});
  const rows=[[{v:E.t,s:1}],[{v:E.s,s:1}],[E.p],[E.e],[],{v:T.cols.map(c=>H(c.nom)),h:24}];
  for(let i=0;i<T.max;i++)rows.push(T.cols.map(c=>C(c.etabs[i]||"")));
  rows.push([]);rows.push(["Total collèges"].concat([]));
  rows.pop();rows.push({v:T.cols.map(c=>({v:c.etabs.length+" collège(s)",s:3})),h:20});
  telechargerBlob(classeurXLSX([{nom:"Établissements par matière",rows,larg:T.cols.map(()=>24)}]),"Etablissements-par-matiere-S"+T.sem+".xlsx");
}
function etabsPDF(T){
  const E=etabsEntete(T);
  let h='<div style="text-align:center;margin-bottom:8px"><div style="font-size:20px;font-weight:700">'+esc(E.t)+'</div><div style="font-size:11px;font-weight:700">'+esc(E.s)+'</div><div style="font-size:10px;font-weight:700">'+esc(E.p)+'</div><div style="font-size:10px;font-weight:700">'+esc(E.e)+'</div></div>'+etabsHTML(T);
  $("#rapport").innerHTML=h;
  const st=document.createElement("style");st.id="pg-land";st.textContent="@page{size:A4 "+orientAuto()+";margin:8mm}";document.head.appendChild(st);
  const ancien=document.title;document.title="Etablissements-par-matiere-S"+T.sem;
  document.body.classList.add("mode-rapport");
  const fin=()=>{document.body.classList.remove("mode-rapport");document.title=ancien;const s=document.getElementById("pg-land");if(s)s.remove();window.removeEventListener("afterprint",fin)};
  window.addEventListener("afterprint",fin);
  setTimeout(()=>window.print(),50);
}
function blocEtabs(){
  return '<h3 style="margin-top:14px">Établissements ayant renseigné, par matière</h3><div class="scroll" id="te"></div><button class="ok" id="tx">Télécharger en Excel</button><button class="ko" id="tp">Télécharger en PDF</button>';
}
function brancherEtabs(rows,s,toutes){
  const T=tableauEtabs(rows,s,toutes);
  $("#te").innerHTML=etabsHTML(T);
  $("#tx").onclick=()=>etabsExcel(tableauEtabs(rows,s,toutes));
  $("#tp").onclick=()=>etabsPDF(tableauEtabs(rows,s,toutes));
}

/* ===== Collèges sans point validé (v15) ===== */
function donneesSansPoint(sem,rows,etabs){
  const fait={};rows.forEach(r=>{fait[slug(r.etablissement)]=1});
  const manq=etabs.filter(e=>!fait[slug(e.nom)]).sort((a,b)=>a.nom.localeCompare(b.nom,"fr"));
  const total=etabs.length,ok=total-manq.length,taux=total?Math.round(1000*ok/total)/10:0;
  const cm={};etabs.forEach(e=>{const c=e.commune||"Non précisée";const g=cm[c]=cm[c]||{c,t:0,m:0};g.t++;if(!fait[slug(e.nom)])g.m++});
  const communes=Object.values(cm).sort((a,b)=>a.c.localeCompare(b.c,"fr"));
  const n=new Date(),p2=x=>String(x).padStart(2,"0");
  const stamp=p2(n.getDate())+"/"+p2(n.getMonth()+1)+"/"+String(n.getFullYear()).slice(2)+" à "+p2(n.getHours())+"h"+p2(n.getMinutes())+"min";
  return {sem,manq,total,ok,taux,communes,aCommune:communes.some(c=>c.c!=="Non précisée"),periode:periodeSemaine(sem),stamp};
}
function sansPointExcel(D){
  const H=v=>({v,s:3}),C=v=>({v,s:2}),B=v=>({v,s:4});
  const rows=[[{v:"Semaine N°"+D.sem,s:1}],[{v:"COLLÈGES SANS POINT VALIDÉ",s:1}],[D.periode],[{v:"(point établi le "+D.stamp+")"}],[],
   {v:[H("Statistiques"),H("Valeur")],h:22},
   [B("Collèges inscrits"),C(D.total)],[B("Collèges avec au moins un point validé"),C(D.ok)],[B("Collèges sans point validé"),C(D.manq.length)],[B("Taux de collèges ayant renseigné"),C(D.taux+" %")],[]];
  if(D.aCommune){rows.push({v:[H("Commune"),H("Collèges inscrits"),H("Sans point validé"),H("Taux renseigné")],h:22});
    D.communes.forEach(c=>rows.push([B(c.c),C(c.t),C(c.m),C(c.t?Math.round(1000*(c.t-c.m)/c.t)/10+" %":"")]));rows.push([])}
  rows.push({v:[H("N°"),H("Collège"),H("Commune")],h:22});
  const com={};
  D.manq.forEach((e,i)=>rows.push([C(i+1),B(e.nom),C(e.commune||"")]));
  telechargerBlob(classeurXLSX([{nom:"Collèges sans point",rows,larg:[40,40,24,20]}]),"Colleges-sans-point-valide-S"+D.sem+".xlsx");
}
function sansPointPDF(D){
  const t=(h,b)=>'<table class="te"><thead><tr>'+h.map(x=>'<th>'+esc(x)+'</th>').join("")+'</tr></thead><tbody>'+b.map(r=>'<tr>'+r.map(x=>'<td>'+esc(x)+'</td>').join("")+'</tr>').join("")+'</tbody></table>';
  let h='<div style="text-align:center;margin-bottom:10px"><div style="font-size:20px;font-weight:700">Semaine N°'+D.sem+'</div><div style="font-size:12px;font-weight:700">COLLÈGES SANS POINT VALIDÉ</div><div style="font-size:11px;font-weight:700">'+esc(D.periode)+'</div><div style="font-size:11px;font-weight:700">(point établi le '+esc(D.stamp)+')</div></div>';
  h+=t(["Statistiques","Valeur"],[["Collèges inscrits",D.total],["Collèges avec au moins un point validé",D.ok],["Collèges sans point validé",D.manq.length],["Taux de collèges ayant renseigné",D.taux+" %"]]);
  if(D.aCommune)h+='<div style="height:10px"></div>'+t(["Commune","Collèges inscrits","Sans point validé","Taux renseigné"],D.communes.map(c=>[c.c,c.t,c.m,c.t?Math.round(1000*(c.t-c.m)/c.t)/10+" %":""]));
  h+='<div style="height:10px"></div>'+(D.manq.length?t(["N°","Collège","Commune"],D.manq.map((e,i)=>[i+1,e.nom,e.commune||""])):'<p>Tous les collèges inscrits ont au moins un point validé.</p>');
  $("#rapport").innerHTML=h;
  const st=document.createElement("style");st.id="pg-land";st.textContent="@page{size:A4 "+orientAuto()+";margin:10mm}";document.head.appendChild(st);
  const ancien=document.title;document.title="Colleges-sans-point-valide-S"+D.sem;
  document.body.classList.add("mode-rapport");
  const fin=()=>{document.body.classList.remove("mode-rapport");document.title=ancien;const s=document.getElementById("pg-land");if(s)s.remove();window.removeEventListener("afterprint",fin)};
  window.addEventListener("afterprint",fin);
  setTimeout(()=>window.print(),50);
}
function blocSansPoint(){
  return '<h3 style="margin-top:14px">Collèges sans point validé</h3><div id="sp"></div><button class="ok" id="spx">Télécharger en Excel</button><button class="ko" id="spp">Télécharger en PDF</button>';
}
function brancherSansPoint(sem,rows,etabs){
  const D=donneesSansPoint(sem,rows,etabs);
  $("#sp").innerHTML='<p><b>'+D.manq.length+'</b> collège(s) sans point validé sur <b>'+D.total+'</b> inscrit(s) · taux renseigné <b>'+D.taux+' %</b></p>'+(D.manq.length?'<p class="mut">'+D.manq.map(e=>esc(e.nom)).join(", ")+'</p>':"");
  $("#spx").onclick=()=>sansPointExcel(D);$("#spp").onclick=()=>sansPointPDF(D);
}
