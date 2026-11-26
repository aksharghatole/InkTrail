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
 r=resolveReading(s,r);
 const prev=s.chapters[r.chapter];
 return {...s,title:r.title,lastChapter:r.chapter,updatedAt:now,chapters:{...s.chapters,[r.chapter]:{chapter:r.chapter,url:r.url,progress:Math.max(prev?.progress||0,r.progress),completed:typeof prev?.manualCompletion==='boolean'?prev.manualCompletion:Boolean(prev?.completed||r.completed),...(typeof prev?.manualCompletion==='boolean'?{manualCompletion:prev.manualCompletion}:{}),updatedAt:now}}};
}


function editLibrary(library,action,now){
 const key=action.key;
 if(typeof key!=="string"||!Object.hasOwn(library,key))throw Error("Series not found");
 if(["link","unlink","renameGroup"].includes(action.op))return groupEdit(library,action);
 const s=library[key], next={...library}, chapters={...s.chapters};
 if(action.op==="deleteSeries"){delete next[key];return next;}
 if(action.op==="status"){
  if(!["reading","completed","paused","planned","dropped"].includes(action.status))throw Error("Invalid status");
  next[key]={...s,status:action.status};return next;
 }
 const chapter=action.chapter;
 if(typeof chapter!=="string"||!Object.hasOwn(chapters,chapter))throw Error("Chapter not found");
 const c=chapters[chapter];
 let last=s.lastChapter, corrections={...s.corrections};
 if(action.op==="complete"){
  if(typeof action.completed!=="boolean")throw Error("Invalid completion");
  chapters[chapter]={...c,completed:action.completed,manualCompletion:action.completed};
 }else if(action.op==="correct"){
  const raw=String(action.newChapter??"").trim();
  if(!/^\d+(?:\.\d+)?$/.test(raw)||!Number.isFinite(Number(raw)))throw Error("Enter a numeric chapter");
  const target=String(Number(raw));
  if(target===chapter)return library;
  if(Object.hasOwn(chapters,target))throw Error("Chapter already exists; no data was overwritten");
  delete chapters[chapter];chapters[target]={...c,chapter:target};
  for(const url of Object.keys(corrections))if(corrections[url]===chapter)corrections[url]=target;
  corrections[c.url]=target;
  if(last===chapter)last=target;
 }else if(action.op==="deleteChapter"){
  delete chapters[chapter];
  for(const url of Object.keys(corrections))if(corrections[url]===chapter)delete corrections[url];
  const remaining=Object.values(chapters).sort((a,b)=>b.updatedAt-a.updatedAt);
  if(!remaining.length){delete next[key];return next;}
  if(last===chapter)last=remaining[0].chapter;
 }else throw Error("Unsupported action");
 next[key]={...s,chapters,lastChapter:last,corrections,updatedAt:now};return next;
}

function resolveReading(series,reading){
 const chapter=series?.corrections?.[reading.url];
 return typeof chapter==="string"&&Object.hasOwn(series.chapters,chapter)?{...reading,chapter}:reading;
}

function validateBackup(data){
 if(!data||data.version!==1||!data.library||typeof data.library!=="object"||Array.isArray(data.library))throw Error("Invalid InkTrail backup");
 const safe={};
 const entries=Object.values(data.library);
 if(entries.length>5000)throw Error("Backup has too many series");
 let total=0;
 for(const s of entries){
  if(!s||typeof s.title!=="string"||!s.title.trim()||s.title.length>180||!s.chapters||typeof s.chapters!=="object"||Array.isArray(s.chapters))throw Error("Invalid series");
  const origin=new URL(s.origin);
  if(!["http:","https:"].includes(origin.protocol)||origin.origin!==s.origin)throw Error("Invalid origin");
  const chapters={};
  for(const c of Object.values(s.chapters)){
   if(++total>50000)throw Error("Backup has too many chapters");
   if(!c||typeof c.chapter!=="string"||!/^\d+(?:\.\d+)?$/.test(c.chapter)||!Number.isFinite(Number(c.chapter))||String(Number(c.chapter))!==c.chapter||!Number.isFinite(c.progress)||c.progress<0||c.progress>100||!Number.isFinite(c.updatedAt)||typeof c.completed!=="boolean")throw Error("Invalid chapter");
   const url=new URL(c.url);
   if(url.origin!==s.origin||url.username||url.password)throw Error("Invalid chapter URL");
   chapters[c.chapter]={chapter:c.chapter,url:canonicalReaderUrl(url),progress:c.progress,completed:c.completed,updatedAt:c.updatedAt,...(typeof c.manualCompletion==="boolean"?{manualCompletion:c.manualCompletion}:{})};
  }
  if(!Object.hasOwn(chapters,s.lastChapter)||!Number.isFinite(s.updatedAt))throw Error("Invalid last chapter");
  const key=keyFor(s);
  if(Object.hasOwn(safe,key))throw Error("Duplicate series");
  const corrections={};
  for(const [url,chapter] of Object.entries(s.corrections||{})){
   const parsed=new URL(url);
   if(parsed.origin===s.origin&&!parsed.username&&!parsed.password&&Object.hasOwn(chapters,chapter))corrections[canonicalReaderUrl(parsed)]=chapter;
  }
  const group=typeof s.groupId==="string"&&s.groupId.startsWith("linked:")&&s.groupId.length<=2048&&typeof s.groupTitle==="string"&&s.groupTitle.trim()&&s.groupTitle.length<=180?{groupId:s.groupId,groupTitle:s.groupTitle.trim()}:{};
  safe[key]={...group,key,title:s.title,origin:s.origin,chapters,lastChapter:s.lastChapter,updatedAt:s.updatedAt,corrections,status:["reading","completed","paused","planned","dropped"].includes(s.status)?s.status:"reading"};
 }
 return safe;
}

function combineLibraries(current, incoming){
 const result={...current};
 for(const [key,s] of Object.entries(incoming)){
  if(!Object.hasOwn(result,key)){result[key]=s;continue;}
  const old=result[key], chapters={...old.chapters};
  for(const [id,c] of Object.entries(s.chapters)){
   const prev=chapters[id];
   if(!prev){chapters[id]=c;continue;}
   const latest=c.updatedAt>prev.updatedAt?c:prev;
   const manual=typeof latest.manualCompletion==="boolean"?latest.manualCompletion:typeof prev.manualCompletion==="boolean"?prev.manualCompletion:c.manualCompletion;
   chapters[id]={...latest,progress:Math.max(prev.progress,c.progress),completed:typeof manual==="boolean"?manual:prev.completed||c.completed,...(typeof manual==="boolean"?{manualCompletion:manual}:{})};
  }
  const latest=s.updatedAt>old.updatedAt?s:old;
  result[key]={...latest,...(old.groupId?{groupId:old.groupId,groupTitle:old.groupTitle}:s.groupId?{groupId:s.groupId,groupTitle:s.groupTitle}:{}),chapters,corrections:{...s.corrections,...old.corrections}};
 }
 return result;
}


function titleIdentity(title){return title.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim()}

function groupEdit(library,action){
 const s=library[action.key];
 if(!Object.hasOwn(library,action.key))throw Error("Series not found");
 const result={...library};
 if(action.op==="unlink"){
  const {groupId,groupTitle,...rest}=s;result[action.key]=rest;return result;
 }
 if(action.op==="renameGroup"){
  if(!s.groupId)throw Error("Link sources first");
  const label=String(action.title||"").trim();
  if(!label||label.length>180)throw Error("Enter a group title (1–180 characters)");
  for(const [key,entry] of Object.entries(result))if(entry.groupId===s.groupId)result[key]={...entry,groupTitle:label};
  return result;
 }
 if(action.op!=="link"||action.key===action.target||!Object.hasOwn(library,action.target))throw Error("Choose another source");
 const target=library[action.target];
 if(s.groupId&&s.groupId===target.groupId)return result;
 let id=target.groupId;
 if(!id){
  const used=new Set(Object.values(library).map(e=>e.groupId));
  const prefix="linked:"+target.key;
  id=prefix;let i=1;while(used.has(id))id=prefix+":"+i++;
 }
 const label=target.groupTitle||target.title;
 for(const [key,entry] of Object.entries(result)){
  if(key===action.key||key===action.target||(s.groupId&&entry.groupId===s.groupId)||(target.groupId&&entry.groupId===target.groupId)){
   result[key]={...entry,groupId:id,groupTitle:label};
  }
 }
 return result;
}

function groupedLibrary(library){
 const groups=new Map();
 for(const s of Object.values(library)){
  const id=s.groupId?"group:"+s.groupId:"source:"+s.key;
  if(!groups.has(id))groups.set(id,{id,title:s.groupTitle||s.title,sources:[],chapters:new Map(),updatedAt:0});
  const g=groups.get(id);
  g.sources.push(s);g.updatedAt=Math.max(g.updatedAt,s.updatedAt);
  for(const c of Object.values(s.chapters)){
   const row=g.chapters.get(c.chapter)||{chapter:c.chapter,completed:false,progress:0,links:[]};
   row.completed ||= c.completed;
   row.progress=Math.max(row.progress,c.progress);
   row.links.push({key:s.key,title:s.title,origin:s.origin,...c});
   g.chapters.set(c.chapter,row);
  }
 }
 return [...groups.values()].map(g=>{
  g.sources.sort((a,b)=>b.updatedAt-a.updatedAt);
  const latest=g.sources[0];
  const chapters=[...g.chapters.values()].sort((a,b)=>Number(b.chapter)-Number(a.chapter));
  return {...g,title:latest.groupTitle||latest.title,chapters,last:latest.chapters[latest.lastChapter],readCount:chapters.filter(c=>c.completed).length,aliases:[...new Set(g.sources.map(s=>s.title))]};
 }).sort((a,b)=>b.updatedAt-a.updatedAt);
}
if(typeof module!=='undefined')module.exports={detect,keyFor,mergeEntry,canonicalReaderUrl,editLibrary,validateBackup,combineLibraries,titleIdentity,groupedLibrary};
