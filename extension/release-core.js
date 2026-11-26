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

function unseenChapters(follow){
 const threshold=Number(follow.readThrough);
 return (follow.chapters||[]).filter(c=>Number(c.chapter)>threshold);
}

function applyFeed(follow,chapters,now){
 const previous=new Set((follow.chapters||[]).map(c=>c.chapter));
 const latest=chapters[0]?.chapter;
 const high=follow.highest===undefined?undefined:Number(follow.highest);
 const newCount=follow.checkedAt?chapters.filter(c=>!previous.has(c.chapter)&&high!==undefined&&Number(c.chapter)>high&&Number(c.chapter)>Number(follow.readThrough)).length:0;
 return {...follow,chapters,checkedAt:now,error:"",highest:latest===undefined?follow.highest:String(Math.max(high??-1,Number(latest))),pending:Math.min(999,(follow.pending||0)+newCount)};
}

function nextDue(follows,now){
 return Object.values(follows).filter(f=>now-(f.attemptAt||0)>=6*3600000).sort((a,b)=>(a.attemptAt||0)-(b.attemptAt||0))[0];
}
if(typeof module!=='undefined')module.exports={mangaId,followKey,chapterNumber,feedChapters,unseenChapters,applyFeed,nextDue};
