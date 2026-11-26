importScripts("core.js");
let queue=Promise.resolve();
chrome.runtime.onMessage.addListener((msg,sender,reply)=>{
 const management=msg?.type==="libraryEdit"||msg?.type==="libraryImport";
 if(management){
  if(sender.id!==chrome.runtime.id||sender.url!==chrome.runtime.getURL("library.html"))return;
 }else if(msg?.type!=="reading"||!sender.tab||!sender.url)return;
 queue=queue.catch(()=>{}).then(async()=>{
  if(management){
   const {library={}}=await chrome.storage.local.get("library");
   const updated=msg.type==="libraryEdit"?editLibrary(library,msg.action,Date.now()):combineLibraries(library,validateBackup(msg.data));
   await chrome.storage.local.set({library:updated});return {ok:true};
  }
  const u=new URL(sender.url);
  if(!["http:","https:"].includes(u.protocol))return {ok:false};
  const pattern=u.protocol+"//"+u.hostname+"/*";
  if(!await chrome.permissions.contains({origins:[pattern]}))return {ok:false};
  const registered=await chrome.scripting.getRegisteredContentScripts();
  if(!registered.some(s=>s.matches.includes(pattern)))return {ok:false};
  const r=msg.reading;
  if(!r||typeof r.title!=="string"||!r.title.trim()||r.title.length>180||typeof r.chapter!=="string"||!/^\d+(?:\.\d+)?$/.test(r.chapter)||!Number.isFinite(Number(r.chapter))||!Number.isFinite(r.progress))return {ok:false};
  const reading={title:r.title.trim(),chapter:String(Number(r.chapter)),origin:u.origin,url:canonicalReaderUrl(u),progress:Math.max(0,Math.min(100,Math.round(r.progress))),completed:r.completed===true&&r.progress>=90};
  const {library={}}=await chrome.storage.local.get("library");
  const key=keyFor(reading);
  await chrome.storage.local.set({library:{...library,[key]:mergeEntry(library[key],reading,Date.now())}});
  return {ok:true};
 });
 queue.then(reply,e=>reply({ok:false,error:String(e.message||e)}));return true;
});
