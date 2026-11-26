function readerKind(u){
 const host=u.hostname.toLowerCase();
 if(host==="webtoons.com"||host.endsWith(".webtoons.com"))return "webtoon";
 if(host==="mangadex.org"||host.endsWith(".mangadex.org"))return "mangadex";
 return "generic";
}

function canonicalReaderUrl(u){
 const kind=readerKind(u);
 if(kind==="webtoon"&&/\/viewer\/?$/.test(u.pathname)){
  const parts=[];
  for(const k of ["title_no","episode_no"]){const v=u.searchParams.get(k);if(v&&/^\d+$/.test(v))parts.push(k+"="+v);}
  return u.origin+u.pathname+(parts.length===2?"?"+parts.join("&"):"");
 }
 return u.origin+u.pathname;
}

function detect(input){
 let u;try{u=new URL(input.url)}catch{return null}
 if(!["http:","https:"].includes(u.protocol))return null;
 let path;try{path=decodeURIComponent(u.pathname)}catch{path=u.pathname}
 const kind=readerKind(u);
 const clean=s=>String(s||"").normalize("NFKC").replace(/\s+/g," ").trim();
 const headings=(input.headings||[]).slice(0,8).map(clean),title=clean(input.title);
 const re=/(?:\b(?:chapter|chapitre|cap[ií]tulo|kapitel|chap|ch|episode|ep)[\s._:#-]*|第\s*)(\d+(?:[.,]\d+)?)(?:\s*[話话章回])?(?![\d.,])/i;
 const p=path.match(/(?:^|[\/_-])(?:chapter|chapitre|capitulo|kapitel|chap|ch|episode|ep)[\/_.:#-]*(\d+(?:[.,]\d+)?)(?=$|[\/_-])/i);
 const matches=[...headings,title].map(s=>({s,m:s.match(re)})).filter(x=>x.m);
 const number=s=>Number(String(s).replace(",","."));
 const slugName=s=>clean(s.replace(/[-_]+/g," "));
 const generic=s=>/^(?:read|manga|manhwa|manhua|comic|webtoon|comments|navigation|next|previous|home|chapter|episode)$/i.test(s);
 let chapter,name="";
 if(kind==="webtoon"){
  if(!/\/viewer\/?$/.test(path)||!canonicalReaderUrl(u).includes("?"))return null;
  // Episode ID can differ from the displayed chapter: prefer the heading.
  chapter=matches[0]?.m[1]||u.searchParams.get("episode_no");
  const parts=path.split("/").filter(Boolean);
  name=slugName(parts[2]||"");
 }else if(kind==="mangadex"){
  if(!/^\/chapter\/[a-f0-9-]{36}(?:\/\d+)?\/?$/i.test(path))return null;
  chapter=matches[0]?.m[1];
 }else{
  const context=[u.hostname,path,title,...headings].join(" ");
  const readerEvidence=input.readerImages>=2;
  if(!/(manga|manhua|manhwa|webtoon|comic)/i.test(context)&&!(p&&readerEvidence))return null;
  if(!p&&!readerEvidence&&!re.test(title))return null;
  chapter=p?.[1]||matches[0]?.m[1];
  if(p&&re.test(title)&&number(title.match(re)[1])!==number(chapter))return null;
 }
 if(chapter===undefined||!Number.isFinite(number(chapter)))return null;
 for(const {s,m} of matches){
  if(number(m[1])!==number(chapter))continue;
  const prefix=clean(s.slice(0,m.index).replace(/[\s|:–—-]+$/g,"")).replace(/^read\s+/i,"");
  if(prefix&&!generic(prefix)){name=prefix;break;}
 }
 if(!name)name=headings.find(s=>s&&!re.test(s)&&!generic(s))||"";
 if(!name&&p&&kind==="generic"){
  const before=path.slice(0,p.index).split("/").filter(Boolean).pop()||"";
  if(!generic(before)&&!/^(?:reader|series|title|read)$|^[\da-f-]{20,}$/i.test(before))name=slugName(before);
 }
 if(!name||generic(name)||name.length>180||!/[\p{L}\p{N}]/u.test(name))return null;
 return {title:name,chapter:String(number(chapter)),origin:u.origin,url:canonicalReaderUrl(u)};
}

function keyFor(r){return r.origin+"|"+r.title.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim()}

function mergeEntry(old,r,now){
 const s=old||{key:keyFor(r),origin:r.origin,chapters:{}};
 const prev=s.chapters[r.chapter];
 return {...s,title:r.title,lastChapter:r.chapter,updatedAt:now,chapters:{...s.chapters,[r.chapter]:{chapter:r.chapter,url:r.url,progress:Math.max(prev?.progress||0,r.progress),completed:Boolean(prev?.completed||r.completed),updatedAt:now}}};
}
if(typeof module!=='undefined')module.exports={detect,keyFor,mergeEntry,canonicalReaderUrl};
