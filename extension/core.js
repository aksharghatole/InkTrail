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
  for(const k of ["title_no","episode_no"]){const v=u.searchParams.get(k);if(v&&/^\d{1,15}$/.test(v)&&Number(v)>0&&u.searchParams.getAll(k).length===1)parts.push(k+"="+v);}
  return u.origin+u.pathname+(parts.length===2?"?"+parts.join("&"):"");
 }
 return u.origin+u.pathname;
}

function readerPath(u){
 try{return decodeURIComponent(u.pathname)}catch{return u.pathname}
}
function chapterPathMatch(path){
 return path.match(/(?:^|[\/_-])(?:chapter|chapitre|cap[ií]tulo|capitolo|kapitel|chap|ch|[eé]pisode|epis[oó]dio|ep)[\/_.:#-]*(\d+(?:[.,]\d+)?)(?=$|[\/_-])/i);
}

function detect(input){
 let u;try{u=new URL(input.url)}catch{return null}
 if(!["http:","https:"].includes(u.protocol)||u.username||u.password)return null;
 const path=readerPath(u);
 const kind=readerKind(u);
 const clean=s=>String(s||"").normalize("NFKC").replace(/\s+/g," ").trim();
 const headings=(input.headings||[]).slice(0,8).map(clean),title=clean(input.title);
 const re=/(?:(?<![\p{Script=Latin}\d_])(?:chapter|chapitre|cap[ií]tulo|capitolo|kapitel|chap|ch|[eé]pisode|epis[oó]dio|ep)[\s._:#-]*|第\s*)(\d+(?:[.,]\d+)?)(?:\s*[話话章回])?(?![\d.,])/iu;
 const p=chapterPathMatch(path);
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
  if(!/^\/chapter\/[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}(?:\/[1-9]\d*)?\/?$/i.test(path))return null;
  chapter=matches[0]?.m[1];
 }else{
  const context=[u.hostname,path,title,...headings].join(" ");
  const readerEvidence=input.readerImages>=2;
  if(!/(manga|manhua|manhwa|webtoon|comic)/i.test(context)&&!(p&&readerEvidence))return null;
  if(!p&&!readerEvidence&&!re.test(title))return null;
  chapter=p?.[1]||matches[0]?.m[1];
  if(p&&re.test(title)&&number(title.match(re)[1])!==number(chapter))return null;
 }
 if(chapter===undefined||!Number.isFinite(number(chapter))||number(chapter)>1000000||!/^\d+(?:\.\d+)?$/.test(String(number(chapter))))return null;
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
 const page=cleanPage(r.page);
 const position=page?undefined:cleanPosition(r.position)||(prev?.url===r.url&&!prev.page?prev.position:undefined);
 const delta=Number.isFinite(r.seconds)?Math.min(15,Math.max(0,r.seconds)):0;
 return {...s,title:r.title,lastChapter:r.chapter,updatedAt:now,chapters:{...s.chapters,[r.chapter]:{chapter:r.chapter,url:r.url,...(page?{page}:{}),...(r.manual===true||prev?.manual===true&&prev.url===r.url?{manual:true}:{}),...(position?{position}:{}),readingSeconds:Math.min(1e9,(prev?.readingSeconds||0)+delta),progress:Math.max(prev?.progress||0,r.progress),completed:typeof prev?.manualCompletion==='boolean'?prev.manualCompletion:Boolean(prev?.completed||r.completed),...(typeof prev?.manualCompletion==='boolean'?{manualCompletion:prev.manualCompletion}:{}),updatedAt:now}}};
}


function editLibrary(library,action,now){
 const key=action.key;
 if(typeof key!=="string"||!Object.hasOwn(library,key))throw Error("Series not found");
 if(["link","unlink","renameGroup"].includes(action.op))return groupEdit(library,action);
 const s=library[key], next={...library}, chapters={...s.chapters};
 if(action.op==="deleteSeries"){delete next[key];return next;}
 if(action.op==="catalog"){
  if(!["anilist","mal"].includes(action.provider))throw Error("Unsupported catalog");
  const catalog={...cleanCatalog(s.catalog),[action.provider]:catalogReference(action.provider,action.input,action.progress)};
  next[key]={...s,catalog};return next;
 }
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
   chapters[c.chapter]={chapter:c.chapter,url:canonicalReaderUrl(url),progress:c.progress,completed:c.completed,updatedAt:c.updatedAt,...(cleanPage(c.page)?{page:cleanPage(c.page)}:{}),...(c.manual===true?{manual:true}:{}),...(cleanPosition(c.position)?{position:cleanPosition(c.position)}:{}),readingSeconds:Number.isFinite(c.readingSeconds)?Math.max(0,Math.min(1e9,c.readingSeconds)):0,...(typeof c.manualCompletion==="boolean"?{manualCompletion:c.manualCompletion}:{})};
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
  safe[key]={...group,catalog:cleanCatalog(s.catalog),key,title:s.title,origin:s.origin,chapters,lastChapter:s.lastChapter,updatedAt:s.updatedAt,corrections,status:["reading","completed","paused","planned","dropped"].includes(s.status)?s.status:"reading"};
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
   chapters[id]={...latest,...(prev.url===c.url&&(prev.manual===true||c.manual===true)?{manual:true}:{}),readingSeconds:Math.max(prev.readingSeconds||0,c.readingSeconds||0),progress:Math.max(prev.progress,c.progress),completed:typeof manual==="boolean"?manual:prev.completed||c.completed,...(typeof manual==="boolean"?{manualCompletion:manual}:{})};
  }
  const latest=s.updatedAt>old.updatedAt?s:old;
  result[key]={...latest,catalog:{...cleanCatalog(s.catalog),...cleanCatalog(old.catalog)},...(old.groupId?{groupId:old.groupId,groupTitle:old.groupTitle}:s.groupId?{groupId:s.groupId,groupTitle:s.groupTitle}:{}),chapters,corrections:{...s.corrections,...old.corrections}};
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


function cleanPosition(p){
 if(!p||!Number.isFinite(p.top)||!Number.isFinite(p.range)||p.top<0||p.range<0||p.range>1e8||p.top>p.range+2)return undefined;
 return {top:Math.min(p.range,Math.round(p.top)),range:Math.round(p.range)};
}

function resumeOffset(p,range){
 const pos=cleanPosition(p);
 if(!pos||!Number.isFinite(range)||range<=0||pos.range<=0)return 0;
 return Math.round(Math.min(range,Math.abs(range-pos.range)<=Math.max(100,pos.range*.05)?pos.top:pos.top/pos.range*range));
}

function sessionDelta(previous,current,eligible){
 if(!eligible||!Number.isFinite(previous)||!Number.isFinite(current)||current<=previous)return 0;
 const delta=(current-previous)/1000;
 return delta<=6?delta:0;
}

function formatReadingTime(seconds){
 const m=Math.floor(Math.max(0,Number(seconds)||0)/60);
 return m>=60?Math.floor(m/60)+"h "+m%60+"m":m+"m";
}


function manualReading(input){
 const title=typeof input?.title==="string"?input.title.normalize("NFKC").replace(/\s+/g," ").trim():"";
 const raw=String(input?.chapter??"").trim();
 if(!title||title.length>180||!titleIdentity(title))throw Error("Enter a series title (1–180 characters)");
 if(!/^\d+(?:\.\d+)?$/.test(raw)||!Number.isFinite(Number(raw))||!/^\d+(?:\.\d+)?$/.test(String(Number(raw))))throw Error("Enter a numeric chapter");
 let u;try{u=new URL(input.url)}catch{throw Error("Enter a valid website URL")}
 if(!["http:","https:"].includes(u.protocol)||u.username||u.password)throw Error("Only ordinary HTTP(S) URLs are supported");
 if(u.search&&!canonicalReaderUrl(u).includes("?"))throw Error("This URL contains query parameters. For privacy, use a chapter-specific URL without them.");
 return {title,chapter:String(Number(raw)),url:canonicalReaderUrl(u),origin:u.origin,progress:input.completed===true?100:0,completed:input.completed===true,manual:true};
}

function manualMatch(library,url){
 let found=null;
 for(const s of Object.values(library)){
  for(const c of Object.values(s.chapters)){
   if(c.manual===true&&c.url===url){
    if(found)return null;
    found={title:s.title,chapter:c.chapter,url:c.url,origin:s.origin};
   }
  }
 }
 return found;
}

function saveManual(library,input,now){
 const reading=manualReading(input),key=keyFor(reading);
 for(const s of Object.values(library))for(const c of Object.values(s.chapters)){
  if(c.manual===true&&c.url===reading.url&&(s.key!==key||c.chapter!==reading.chapter))throw Error("This URL already has a manual chapter assignment; correct or delete the existing entry first");
 }
 const s=library[key];
 const prev=s?.chapters[reading.chapter];
 if(prev&&prev.url!==reading.url)throw Error("This chapter already has a different URL in this source. No existing data was overwritten.");
 const next=mergeEntry(s,reading,now);
 const c=next.chapters[next.lastChapter];
 if(input.completed===true){c.completed=true;c.manualCompletion=true;}
 return {...library,[key]:next};
}
function chapterRoute(url){
 let u;try{u=new URL(url)}catch{return url}
 if(readerKind(u)==="mangadex"){
  const m=u.pathname.match(/^(\/chapter\/[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12})(?:\/\d+)?\/?$/i);
  if(m)return u.origin+m[1];
 }
 return canonicalReaderUrl(u);
}

function cleanPage(p){
 if(!p||!Number.isInteger(p.current)||p.current<1||p.current>10000)return undefined;
 if(p.total===undefined||p.total===null)return {current:p.current};
 if(!Number.isInteger(p.total)||p.total<p.current||p.total>10000)return undefined;
 return {current:p.current,total:p.total};
}

function readerPage(url,labels=[]){
 let u;try{u=new URL(url)}catch{return undefined}
 let routePage;
 if(readerKind(u)==="mangadex"){
  const m=u.pathname.match(/^\/chapter\/[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}\/(\d+)\/?$/i);
  if(m)routePage=cleanPage({current:Number(m[1])});
 }
 for(const raw of labels.slice(0,20)){
  const text=String(raw||"").normalize("NFKC").trim();
  const match=text.match(/^page\s+(\d+)\s*(?:of|\/)\s*(\d+)$/i);
  if(!match)continue;
  const p=cleanPage({current:Number(match[1]),total:Number(match[2])});
  if(p&&(!routePage||routePage.current===p.current))return p;
 }
 return routePage;
}

function pageProgress(p){
 p=cleanPage(p);
 return p?.total?Math.round(p.current/p.total*100):0;
}

function progressLabel(c){
 if(c.page)return "Page "+c.page.current+(c.page.total?" / "+c.page.total:"");
 return c.progress+"% scrolled";
}
function catalogId(provider,input){
 if(!["anilist","mal"].includes(provider))throw Error("Unsupported catalog");
 const raw=String(input??"").trim();
 if(!raw)return null;
 let id=raw;
 if(!/^\d+$/.test(raw)){
  let u;try{u=new URL(raw)}catch{throw Error("Enter a manga catalog ID or URL")}
  const hosts=provider==="anilist"?["anilist.co","www.anilist.co"]:["myanimelist.net","www.myanimelist.net"];
  if(u.protocol!=="https:"||!hosts.includes(u.hostname)||u.username||u.password||u.port)throw Error("Invalid catalog URL");
  const m=u.pathname.match(/^\/manga\/(\d+)(?:\/|$)/);
  if(!m)throw Error("Use a manga entry URL, not an anime or search page");
  id=m[1];
 }
 if(!/^\d{1,10}$/.test(id)||Number(id)<1||Number(id)>2147483647)throw Error("Invalid manga catalog ID");
 return String(Number(id));
}
function catalogUrl(provider,id){
 if(!["anilist","mal"].includes(provider)||typeof id!=="string"||!/^[1-9]\d{0,9}$/.test(id)||Number(id)>2147483647)return null;
 return (provider==="anilist"?"https://anilist.co/manga/":"https://myanimelist.net/manga/")+id;
}
function catalogSearch(provider,title){
 if(provider==="anilist")return "https://anilist.co/search/manga?search="+encodeURIComponent(title);
 if(provider==="mal")return "https://myanimelist.net/manga.php?q="+encodeURIComponent(title);
 throw Error("Unsupported catalog");
}
function catalogReference(provider,input,progress){
 const id=catalogId(provider,input);
 if(id===null)return null;
 const raw=String(progress??"").trim();
 if(raw&&!/^\d+(?:\.\d+)?$/.test(raw))throw Error("Enter a non-negative numeric reference chapter");
 const value=raw?String(Number(raw)):null;
 if(value!==null&&(!/^\d+(?:\.\d+)?$/.test(value)||Number(value)>1000000))throw Error("Invalid reference chapter");
 return {id,progress:value};
}
function cleanCatalog(input){
 const out={};
 if(!input||typeof input!=="object"||Array.isArray(input))return out;
 for(const provider of ["anilist","mal"]){
  if(!Object.hasOwn(input,provider))continue;
  const ref=input[provider];
  if(ref===null){out[provider]=null;continue}
  try{if(typeof ref?.id==="string"&&/^\d+$/.test(ref.id))out[provider]=catalogReference(provider,ref.id,ref.progress)}catch{}
 }
 return out;
}

if(typeof module!=='undefined')module.exports={detect,readerPath,chapterPathMatch,keyFor,mergeEntry,canonicalReaderUrl,editLibrary,validateBackup,combineLibraries,titleIdentity,groupedLibrary,cleanPosition,resumeOffset,sessionDelta,formatReadingTime,manualReading,manualMatch,saveManual,chapterRoute,cleanPage,readerPage,pageProgress,progressLabel,catalogId,catalogUrl,catalogSearch,catalogReference,cleanCatalog};
