importScripts("core.js","analytics-core.js","history-core.js","rules-core.js","release-core.js","backup-core.js","release-service.js");
let queue=Promise.resolve();
chrome.runtime.onMessage.addListener((msg,sender,reply)=>{
 const fullBackup=msg?.type==="fullBackup";
 const analytics=msg?.type==="analyticsAction";
 const management=msg?.type==="libraryEdit"||msg?.type==="libraryImport";
 const manual=msg?.type==="manualSave";
 const historyImport=msg?.type==="historyImport";
 const rules=msg?.type==="siteRule";
 if(fullBackup){
  if(sender.id!==chrome.runtime.id||sender.url!==chrome.runtime.getURL("backup.html"))return;
 }else if(analytics){
  if(sender.id!==chrome.runtime.id||sender.url!==chrome.runtime.getURL("analytics.html"))return;
 }else if(management){
  if(sender.id!==chrome.runtime.id||sender.url!==chrome.runtime.getURL("library.html"))return;
 }else if(historyImport){
  if(sender.id!==chrome.runtime.id||sender.url!==chrome.runtime.getURL("history.html"))return;
 }else if(rules){
  if(sender.id!==chrome.runtime.id||![chrome.runtime.getURL("popup.html"),chrome.runtime.getURL("rules.html")].includes(sender.url))return;
 }else if(manual){
  if(sender.id!==chrome.runtime.id||sender.url!==chrome.runtime.getURL("popup.html"))return;
 }else if(!["reading","resumeLookup","manualLookup"].includes(msg?.type)||!sender.tab||!sender.url||sender.frameId!==0)return;
 queue=queue.catch(()=>{}).then(async()=>{
  if(fullBackup){
   if(msg.op!=="import")throw Error("Unsupported backup action");
   const incoming=validatePortable(msg.data);
   // Serialize with both reading writes and release checks to prevent lost updates.
   return releaseTask(async()=>{
    const current=await chrome.storage.local.get(["library","siteRules","follows","readingActivity","readingGoal","releaseNotifications"]);
    const merged=mergePortable(current,incoming);
    await chrome.storage.local.set(merged);
    await refreshReleaseBadge(merged.follows).catch(()=>{});
    await ensureReleaseAlarm().catch(()=>{});
    return {ok:true,counts:backupCounts(merged)};
   });
  }
  if(analytics){
   if(msg.op==="goal"){
    if(!Number.isInteger(msg.minutes)||msg.minutes<1||msg.minutes>1440)throw Error("Enter a daily goal from 1 to 1440 minutes");
    await chrome.storage.local.set({readingGoal:msg.minutes});return {ok:true};
   }
   if(msg.op==="clear"){await chrome.storage.local.set({readingActivity:{}});return {ok:true};}
   throw Error("Unknown analytics action");
  }
  if(historyImport){
   const {library={}}=await chrome.storage.local.get("library");
   const result=importHistory(library,msg.rows);
   await chrome.storage.local.set({library:result.library});return {ok:true,added:result.added,skipped:result.skipped};
  }
  if(management){
   const {library={}}=await chrome.storage.local.get("library");
   const updated=msg.type==="libraryEdit"?editLibrary(library,msg.action,Date.now()):combineLibraries(library,validateBackup(msg.data));
   await chrome.storage.local.set({library:updated});return {ok:true};
  }
  if(rules){
   const {siteRules={}}=await chrome.storage.local.get("siteRules");
   if(msg.op==="save"){
    const rule=validateRule(msg.rule);
    if(!Number.isInteger(msg.tabId))throw Error("No active reading tab");
    const tab=await chrome.tabs.get(msg.tabId);
    if(!tab.active||!tab.url||!ruleApplies(rule,tab.url))throw Error("Open a matching reading page first");
    if(!Object.hasOwn(siteRules,rule.origin)&&Object.keys(siteRules).length>=200)throw Error("Maximum 200 rules");
    siteRules[rule.origin]=rule;
   }else if(msg.op==="delete"){
    if(typeof msg.origin!=="string"||!Object.hasOwn(siteRules,msg.origin))throw Error("Rule not found");
    delete siteRules[msg.origin];
   }else if(msg.op==="import"){
    const incoming=validateRulesBackup(msg.data);
    const merged={...incoming,...siteRules};
    if(Object.keys(merged).length>200)throw Error("Maximum 200 rules");
    await chrome.storage.local.set({siteRules:merged});return {ok:true};
   }else throw Error("Unknown rule action");
   await chrome.storage.local.set({siteRules});return {ok:true};
  }
  if(manual){
   if(!Number.isInteger(msg.tabId))throw Error("No active reading tab");
   const tab=await chrome.tabs.get(msg.tabId);
   if(!tab.active||!tab.url||tab.url!==msg.url)throw Error("Reading tab changed; reopen InkTrail");
   const {library={}}=await chrome.storage.local.get("library");
   const updated=saveManual(library,{title:msg.title,chapter:msg.chapter,url:tab.url,completed:msg.completed},Date.now());
   await chrome.storage.local.set({library:updated});return {ok:true};
  }
  const documentUrl=new URL(sender.url);
  const u=new URL(sender.tab.url||sender.url);
  if(!["http:","https:"].includes(u.protocol)||u.origin!==documentUrl.origin)return {ok:false};
  const pattern=u.protocol+"//"+u.hostname+"/*";
  if(!await chrome.permissions.contains({origins:[pattern]}))return {ok:false};
  const registered=await chrome.scripting.getRegisteredContentScripts();
  if(!registered.some(s=>s.matches.includes(pattern)))return {ok:false};
  const {library={}}=await chrome.storage.local.get("library");
  const url=canonicalReaderUrl(u);
  const assignment=(!u.search||url.includes("?"))?manualMatch(library,url):null;
  if(msg.type==="manualLookup"){const {siteRules={}}=await chrome.storage.local.get("siteRules");return {ok:true,assignment,rule:siteRules[u.origin]||null};}
  const r=msg.reading;
  if(r?.url!==url)return {ok:false};
  if(!r||typeof r.title!=="string"||!r.title.trim()||r.title.length>180||typeof r.chapter!=="string"||!/^\d+(?:\.\d+)?$/.test(r.chapter)||!Number.isFinite(Number(r.chapter))||!Number.isFinite(r.progress))return {ok:false};
  const reading={title:assignment?.title||r.title.trim(),chapter:assignment?.chapter||String(Number(r.chapter)),origin:u.origin,url,progress:Math.max(0,Math.min(100,Math.round(r.progress))),completed:!cleanPage(r.page)&&r.completed===true&&r.progress>=90,page:cleanPage(r.page),position:cleanPage(r.page)?undefined:cleanPosition(r.position),seconds:typeof r.seconds==="number"?Math.min(15,Math.max(0,r.seconds)):0};
  const key=keyFor(reading);
  if(msg.type==="resumeLookup"){
   const entry=library[key], corrected=resolveReading(entry,reading), c=entry?.chapters?.[corrected.chapter];
   return {ok:true,position:c?.url===reading.url?cleanPosition(c.position):undefined,completed:Boolean(c?.completed)};
  }
  const now=Date.now();
  const {readingActivity={}}=await chrome.storage.local.get("readingActivity");
  await chrome.storage.local.set({library:{...library,[key]:mergeEntry(library[key],reading,now)},readingActivity:recordActivity(readingActivity,key,reading.seconds,now)});
  return {ok:true};
 });
 queue.then(reply,e=>reply({ok:false,error:String(e.message||e)}));return true;
});

chrome.runtime.onInstalled.addListener(async details=>{if(details.reason!=="update")return;try{const scripts=await chrome.scripting.getRegisteredContentScripts();const updates=scripts.filter(s=>s.id.startsWith("site-")&&s.js?.includes("content.js")).map(s=>({id:s.id,js:["core.js","rules-core.js","content.js"]}));if(updates.length)await chrome.scripting.updateContentScripts(updates)}catch(e){console.warn("InkTrail registration update failed",e)}});

chrome.runtime.onMessage.addListener((msg,sender,reply)=>{
 if(msg?.type!=="pickerDraft"||sender.id!==chrome.runtime.id||sender.frameId!==0||!sender.tab||!sender.url)return;
 (async()=>{
  const u=new URL(sender.url);
  if(!["http:","https:"].includes(u.protocol))throw Error("Unsupported page");
  const parts=u.pathname.split("/").filter(Boolean);
  const path=parts.length>1?"/"+parts[0]+"/":"/";
  const rule=validateRule({origin:u.origin,path,titleSelector:msg.titleSelector,chapterSelector:msg.chapterSelector});
  await chrome.storage.session.set({["picker:"+sender.tab.id]:{rule,createdAt:Date.now()}});
  return {ok:true};
 })().then(reply,e=>reply({ok:false,error:String(e.message||e)}));
 return true;
});
chrome.tabs.onRemoved.addListener(id=>{chrome.storage.session.remove("picker:"+id).catch(()=>{})});
