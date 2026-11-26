function mangaId(input){
 const raw=String(input||"").trim();
 const uuid=/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;
 if(uuid.test(raw))return raw.toLowerCase();
 let u;try{u=new URL(raw)}catch{return null}
 if(u.protocol!=="https:"||!["mangadex.org","www.mangadex.org"].includes(u.hostname)||u.username||u.password||u.port)return null;
 const parts=u.pathname.split("/").filter(Boolean);
 return parts[0]==="title"&&uuid.test(parts[1]||"")?parts[1].toLowerCase():null;
}

function followKey(id,lang){return id+":"+lang}

function chapterNumber(raw){
 if(typeof raw!=="string"||!/^\d+(?:\.\d+)?$/.test(raw)||!Number.isFinite(Number(raw)))return null;
 return String(Number(raw));
}

function feedChapters(body,language){
 if(body?.result!=="ok"||!Array.isArray(body.data))throw Error("Unexpected MangaDex response");
 const chapters=new Map();
 for(const row of body.data){
  const a=row?.attributes;
  if(row?.type!=="chapter"||typeof row.id!=="string"||!/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(row.id)||a?.translatedLanguage!==language)continue;
  const chapter=chapterNumber(a.chapter);
  if(chapter===null)continue;
  const published=Date.parse(a.publishAt);
  if(!Number.isFinite(published)||published>Date.now())continue;
  const previous=chapters.get(chapter);
  if(!previous||published>previous.published)chapters.set(chapter,{chapter,id:row.id,published});
 }
 return [...chapters.values()].sort((a,b)=>Number(b.chapter)-Number(a.chapter));
}

function unseenChapters(follow,library={}){
 const threshold=Number(follow.readThrough);
 const completed=completedForFollow(follow,library);
 return (follow.chapters||[]).filter(c=>Number(c.chapter)>threshold&&!completed.has(c.chapter));
}

function applyFeed(follow,chapters,now,library={}){
 const previous=new Set((follow.chapters||[]).map(c=>c.chapter));
 const latest=chapters[0]?.chapter;
 const high=follow.highest===undefined?undefined:Number(follow.highest);
 const completed=completedForFollow(follow,library);
 const newCount=follow.checkedAt?chapters.filter(c=>!previous.has(c.chapter)&&high!==undefined&&Number(c.chapter)>high&&Number(c.chapter)>Number(follow.readThrough)&&!completed.has(c.chapter)).length:0;
 return {...follow,chapters,checkedAt:now,error:"",highest:latest===undefined?follow.highest:String(Math.max(high??-1,Number(latest))),pending:Math.min(999,(follow.pending||0)+newCount)};
}

function nextDue(follows,now){
 return Object.values(follows).filter(f=>now-(f.attemptAt||0)>=6*3600000).sort((a,b)=>(a.attemptAt||0)-(b.attemptAt||0))[0];
}


function completedForFollow(follow,library){
 const key=follow.libraryKey;
 if(typeof key!=="string"||!Object.hasOwn(library,key))return new Set();
 const source=library[key];
 const sources=source.groupId?Object.values(library).filter(s=>s.groupId===source.groupId):[source];
 return new Set(sources.flatMap(s=>Object.values(s.chapters||{}).filter(c=>c.completed===true).map(c=>c.chapter)));
}

function followSuggestions(follow,library){
 const norm=s=>String(s||"").normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();
 const label=norm(follow.title);
 return Object.values(library).sort((a,b)=>Number(norm(b.title)===label||norm(b.groupTitle)===label)-Number(norm(a.title)===label||norm(a.groupTitle)===label)||a.title.localeCompare(b.title));
}

function validateFollowsBackup(data){
 if(!data||data.version!==1||!Array.isArray(data.subscriptions)||data.subscriptions.length>100)throw Error("Invalid release backup");
 const out={};
 for(const f of data.subscriptions){
  if(!f||typeof f!=="object")throw Error("Invalid subscription");
  const id=mangaId(f.id),language=f.language,title=typeof f.title==="string"?f.title.trim():"",readThrough=chapterNumber(f.readThrough);
  if(!id||typeof language!=="string"||!/^[a-z]{2,3}(?:-[a-z]{2,4})?$/.test(language)||!title||title.length>180||readThrough===null)throw Error("Invalid subscription");
  const key=followKey(id,language);
  if(Object.hasOwn(out,key))throw Error("Duplicate subscription");
  out[key]={id,language,title,readThrough,chapters:[],pending:0,...(typeof f.libraryKey==="string"&&f.libraryKey.length<=2048?{libraryKey:f.libraryKey}:{})};
 }
 return out;
}

function exportFollows(follows){
 return {version:1,subscriptions:Object.values(follows).map(({id,language,title,readThrough,libraryKey})=>({id,language,title,readThrough,...(libraryKey?{libraryKey}:{})}))};
}

function mergeFollows(current,incoming){
 const merged={...incoming,...current};
 if(Object.keys(merged).length>100)throw Error("Maximum 100 follows; remove subscriptions before importing");
 return merged;
}
if(typeof module!=='undefined')module.exports={mangaId,followKey,chapterNumber,feedChapters,unseenChapters,applyFeed,nextDue,completedForFollow,followSuggestions,validateFollowsBackup,exportFollows,mergeFollows};
