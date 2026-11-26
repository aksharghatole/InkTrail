const releaseOrigin="https://api.mangadex.org/*";
const releaseAlarm="inktrail-release-check";
let releaseQueue=Promise.resolve();
function releaseTask(fn){const job=releaseQueue.catch(()=>{}).then(fn);releaseQueue=job;return job;}
async function readFollows(){const {follows={}}=await chrome.storage.local.get("follows");return follows;}
async function refreshReleaseBadge(follows){
 const n=Object.values(follows).reduce((sum,f)=>sum+(f.pending||0),0);
 await chrome.action.setBadgeBackgroundColor({color:"#7954a0"});
 await chrome.action.setBadgeText({text:n?String(Math.min(n,99))+(n>99?"+":""):""});
}
async function saveFollows(follows){await chrome.storage.local.set({follows});await refreshReleaseBadge(follows);}
async function ensureReleaseAlarm(){
 if(!await chrome.alarms.get(releaseAlarm))await chrome.alarms.create(releaseAlarm,{periodInMinutes:15});
}
async function fetchFeed(f){
 if(!await chrome.permissions.contains({origins:[releaseOrigin]}))throw Error("MangaDex API permission is not enabled");
 const u=new URL("https://api.mangadex.org/manga/"+f.id+"/feed");
 u.searchParams.set("limit","100");u.searchParams.set("translatedLanguage[]",f.language);u.searchParams.set("order[chapter]","desc");
 const response=await fetch(u,{credentials:"omit",redirect:"error",signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error("MangaDex returned HTTP "+response.status);
 return feedChapters(await response.json(),f.language);
}
async function checkRelease(follows,key){
 const f=follows[key];if(!f)throw Error("Follow not found");
 if(Date.now()-(f.attemptAt||0)<60000)throw Error("Wait one minute between checks");
 const attemptAt=Date.now();
 // Store the attempt before networking to enforce cooldown after worker restarts.
 follows[key]={...f,attemptAt};await saveFollows(follows);
 try{
  const chapters=await fetchFeed(f);
  follows[key]={...applyFeed(f,chapters,Date.now()),attemptAt};
 }catch(e){follows[key]={...f,attemptAt,error:String(e.message||e).slice(0,240)};}
 await saveFollows(follows);
 return follows[key];
}
async function releaseAction(msg){
 const follows=await readFollows();
 if(msg.op==="follow"){
  const id=mangaId(msg.input),language=String(msg.language||""),title=String(msg.title||"").trim(),readThrough=chapterNumber(String(msg.readThrough||"0"));
  if(!id||!/^[a-z]{2,3}(?:-[a-z]{2,4})?$/.test(language)||!title||title.length>180||readThrough===null)throw Error("Enter a title, MangaDex title URL, valid language and chapter");
  const key=followKey(id,language);
  if(Object.hasOwn(follows,key))throw Error("Already following this title and language");
  if(Object.keys(follows).length>=100)throw Error("Maximum 100 follows");
  if(!await chrome.permissions.contains({origins:[releaseOrigin]}))throw Error("Enable API access first");
  follows[key]={id,language,title,readThrough,chapters:[],pending:0};
  await saveFollows(follows);await ensureReleaseAlarm();
  return {ok:true};
 }
 if(msg.op==="ackAll"){
  for(const f of Object.values(follows))f.pending=0;
  await saveFollows(follows);return {ok:true};
 }
 const key=msg.key;
 if(typeof key!=="string"||!Object.hasOwn(follows,key))throw Error("Follow not found");
 if(msg.op==="unfollow"){delete follows[key];await saveFollows(follows);return {ok:true};}
 if(msg.op==="readThrough"){
  const value=chapterNumber(String(msg.value));if(value===null)throw Error("Enter a numeric chapter");
  follows[key]={...follows[key],readThrough:value};await saveFollows(follows);return {ok:true};
 }
 if(msg.op==="check"){const f=await checkRelease(follows,key);return f.error?{ok:false,error:f.error}:{ok:true};}
 throw Error("Unknown release action");
}
chrome.runtime.onMessage.addListener((msg,sender,reply)=>{
 if(msg?.type!=="releaseAction"||sender.id!==chrome.runtime.id||sender.url!==chrome.runtime.getURL("releases.html"))return;
 releaseTask(()=>releaseAction(msg)).then(reply,e=>reply({ok:false,error:String(e.message||e)}));return true;
});
chrome.alarms.onAlarm.addListener(alarm=>{
 if(alarm.name!==releaseAlarm)return;
 releaseTask(async()=>{
  if(!await chrome.permissions.contains({origins:[releaseOrigin]}))return;
  const follows=await readFollows();
  // At most five requests per alarm, sequential, to keep traffic low.
  for(let i=0;i<5;i++){
   const due=nextDue(follows,Date.now());if(!due)break;
   const f=await checkRelease(follows,followKey(due.id,due.language));
   if(f.error)break;
   if(i<4)await new Promise(resolve=>setTimeout(resolve,1000));
  }
 }).catch(()=>{});
});
chrome.runtime.onInstalled.addListener(()=>{ensureReleaseAlarm().catch(()=>{});readFollows().then(refreshReleaseBadge).catch(()=>{});});
chrome.runtime.onStartup.addListener(()=>{ensureReleaseAlarm().catch(()=>{});readFollows().then(refreshReleaseBadge).catch(()=>{});});
