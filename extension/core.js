function detect(input){
 let u;try{u=new URL(input.url)}catch{return null}
 if(!["http:","https:"].includes(u.protocol))return null;
 let path;try{path=decodeURIComponent(u.pathname)}catch{path=u.pathname}
 const clean=s=>String(s||"").replace(/\s+/g," ").trim();
 const headings=(input.headings||[]).slice(0,8).map(clean), title=clean(input.title);
 const re=/\b(?:chapter|chap|ch)[\s._:-]*(\d+(?:\.\d+)?)(?![\d.])\b/i;
 const p=path.match(/(?:^|[\/_-])(?:chapter|chap|ch)[\/_.:-]*(\d+(?:\.\d+)?)(?=$|[\/_-])/i);
 if(!/(manga|manhua|manhwa|webtoon|comic)/i.test([u.hostname,path,title,...headings].join(" ")))return null;
 if(!p&&!re.test(title)&&!(input.readerImages>=2))return null;
 const matches=[...headings,title].map(s=>({s,m:s.match(re)})).filter(x=>x.m);
 const chapter=p?.[1]||matches[0]?.m[1];
 if(chapter===undefined||!Number.isFinite(Number(chapter)))return null;
 let name="";
 for(const {s,m} of matches){
  if(Number(m[1])!==Number(chapter))continue;
  const prefix=clean(s.slice(0,m.index).replace(/[\s|:–—-]+$/g,"")).replace(/^read\s+/i,"");
  if(prefix&&!/^(read|manga|manhwa|manhua|comic)$/i.test(prefix)){name=prefix;break}
 }
 if(!name)name=headings.find(s=>s&&!re.test(s)&&!/^(read|manga|manhwa|manhua|comic|comments|navigation|next|previous)$/i.test(s))||"";
 if(!name&&p){const slug=path.slice(0,p.index).split("/").filter(Boolean).pop()||"";if(!/^(manga|manhwa|manhua|comic|read|reader|webtoon)$/i.test(slug)&&!/^[\da-f-]{20,}$/i.test(slug))name=clean(slug.replace(/[-_]+/g," "))}
 if(!name||name.length>180||!/[\p{L}\p{N}]/u.test(name))return null;
 return {title:name,chapter:String(Number(chapter)),origin:u.origin,url:u.origin+u.pathname};
}

function keyFor(r){return r.origin+"|"+r.title.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim()}

function mergeEntry(old,r,now){
 const s=old||{key:keyFor(r),origin:r.origin,chapters:{}};
 const prev=s.chapters[r.chapter];
 return {...s,title:r.title,lastChapter:r.chapter,updatedAt:now,chapters:{...s.chapters,[r.chapter]:{chapter:r.chapter,url:r.url,progress:Math.max(prev?.progress||0,r.progress),completed:Boolean(prev?.completed||r.completed),updatedAt:now}}};
}
if(typeof module!=='undefined')module.exports={detect,keyFor,mergeEntry};
