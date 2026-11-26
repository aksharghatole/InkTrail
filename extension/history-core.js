const historyCore=typeof module!=="undefined"?require("./core.js"):null;
function historyOrigin(input){
 let u;try{u=new URL(input)}catch{throw Error("Enter a full website origin, such as https://example.org")}
 if(!["http:","https:"].includes(u.protocol)||u.username||u.password||u.pathname!=="/"||u.search||u.hash)throw Error("Enter only the website origin, without a chapter path");
 return u.origin;
}
function historyCandidates(items,origin){
 const detectReading=historyCore?.detect||detect;
 const identity=historyCore?.keyFor||keyFor;
 const target=historyOrigin(origin), result=new Map();
 for(const item of items.slice(0,1000)){
  let u;try{u=new URL(item.url)}catch{continue}
  if(u.origin!==target||u.username||u.password||!Number.isFinite(item.lastVisitTime)||item.lastVisitTime<=0)continue;
  const known=u.hostname==="mangadex.org"||u.hostname.endsWith(".mangadex.org")||u.hostname==="webtoons.com"||u.hostname.endsWith(".webtoons.com");
  if(!known&&!/(?:^|[\/_-])(?:chapter|chapitre|capitulo|kapitel|chap|ch|episode|ep)[\/_.:#-]*\d+(?:[.,]\d+)?(?=$|[\/_-])/i.test(u.pathname))continue;
  const reading=detectReading({url:u.href,title:String(item.title||"").slice(0,500)});
  if(!reading||!(/^\d+(?:\.\d+)?$/.test(reading.chapter))||u.search&&!reading.url.includes("?"))continue;
  const key=identity(reading)+"|"+reading.chapter;
  const prior=result.get(key);
  if(!prior||item.lastVisitTime>prior.visitedAt)result.set(key,{...reading,visitedAt:item.lastVisitTime});
 }
 return [...result.values()].sort((a,b)=>b.visitedAt-a.visitedAt);
}
function importHistory(library,rows){
 const identity=historyCore?.keyFor||keyFor, canonical=historyCore?.canonicalReaderUrl||canonicalReaderUrl;
 if(!Array.isArray(rows)||rows.length>1000)throw Error("Invalid history selection");
 const next={...library};let added=0,skipped=0;
 for(const r of rows){
  if(!r||typeof r.title!=="string"||!r.title.trim()||r.title.length>180||!/\p{L}|\p{N}/u.test(r.title)||typeof r.chapter!=="string"||!/^\d+(?:\.\d+)?$/.test(r.chapter)||String(Number(r.chapter))!==r.chapter||!Number.isFinite(r.visitedAt)||r.visitedAt<=0||r.visitedAt>Date.now()+60000)throw Error("Invalid history chapter");
  const u=new URL(r.url);
  if(!["http:","https:"].includes(u.protocol)||u.origin!==r.origin||u.username||u.password||canonical(u)!==r.url)throw Error("Invalid history URL");
  const key=identity(r),s=next[key]||{key,title:r.title,origin:r.origin,chapters:{},updatedAt:0};
  if(Object.hasOwn(s.chapters,r.chapter)||Object.values(s.chapters).some(c=>c.url===r.url)){skipped++;continue;}
  const chapter={chapter:r.chapter,url:r.url,progress:0,completed:false,readingSeconds:0,updatedAt:r.visitedAt};
  const newer=r.visitedAt>s.updatedAt;
  next[key]={...s,chapters:{...s.chapters,[r.chapter]:chapter},lastChapter:newer?r.chapter:s.lastChapter,updatedAt:Math.max(s.updatedAt,r.visitedAt)};added++;
 }
 return {library:next,added,skipped};
}
if(typeof module!=="undefined")module.exports={historyOrigin,historyCandidates,importHistory};
