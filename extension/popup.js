const $=id=>document.getElementById(id);
let tab,pattern,enabled=false,library={};
const scriptId=p=>"site-"+Array.from(p,c=>c.charCodeAt(0).toString(16).padStart(2,"0")).join("");
function el(tag,text){const node=document.createElement(tag);node.textContent=text;return node}
async function refresh(){({library={}}=await chrome.storage.local.get("library"));render()}
function render(){
 const all=groupedLibrary(library);$("count").textContent=String(all.length);
 const q=$("search").value.trim().toLowerCase();const list=all.filter(x=>x.title.toLowerCase().includes(q)||x.aliases.some(t=>t.toLowerCase().includes(q)));$("library").replaceChildren();
 if(!list.length){const p=el("p",all.length?"No matching series.":"Enable a reading site and open a chapter.");p.className="empty";$("library").append(p);return}
 for(const s of list){const c=s.last;if(!c)continue;const a=el("article","");a.append(el("strong",s.title),el("p",(s.sources.length>1?s.sources.length+" linked sources":new URL(s.sources[0].origin).hostname)+" · Chapter "+c.chapter+" · "+(c.completed?"Read":c.progress+"% scrolled")+" · "+formatReadingTime(c.readingSeconds)+" active"));const bar=document.createElement("progress");bar.max=100;bar.value=c.progress;bar.setAttribute("aria-label","Chapter scroll progress");a.append(bar);const link=el("a","Resume chapter");link.href=c.url;link.target="_blank";link.rel="noopener noreferrer";a.append(link);$("library").append(a)}
}
async function init(){
 await refresh();[tab]=await chrome.tabs.query({active:true,currentWindow:true});
 try{const u=new URL(tab.url);if(!["http:","https:"].includes(u.protocol))throw Error();pattern=u.protocol+"//"+u.hostname+"/*";$("manualSave").disabled=false;$("ruleTest").disabled=false;const {siteRules={}}=await chrome.storage.local.get("siteRules");const saved=siteRules[u.origin];if(saved){$("rulePath").value=saved.path;$("ruleTitle").value=saved.titleSelector;$("ruleChapter").value=saved.chapterSelector;}const guess=detect({url:tab.url,title:tab.title||""});if(guess){$("manualTitle").value=guess.title;$("manualChapter").value=guess.chapter;}$("site").textContent=u.hostname;const registered=await chrome.scripting.getRegisteredContentScripts({ids:[scriptId(pattern)]});enabled=registered.length>0&&await chrome.permissions.contains({origins:[pattern]});$("toggle").textContent=enabled?"Disable tracking":"Enable tracking";$("toggle").disabled=false}catch{$("site").textContent="Open a reading website to enable tracking."}
}
$("toggle").addEventListener("click",async()=>{
 if(!pattern)return;$("toggle").disabled=true;
 try{const id=scriptId(pattern);if(enabled){const scripts=await chrome.scripting.getRegisteredContentScripts({ids:[id]});if(scripts.length)await chrome.scripting.unregisterContentScripts({ids:[id]});enabled=false;await chrome.permissions.remove({origins:[pattern]});$("status").textContent="Tracking disabled. History retained."}
 else{if(!await chrome.permissions.request({origins:[pattern]})){$("status").textContent="Permission not granted.";return}
 const scripts=await chrome.scripting.getRegisteredContentScripts({ids:[id]});if(!scripts.length)await chrome.scripting.registerContentScripts([{id,matches:[pattern],js:["core.js","rules-core.js","content.js"],runAt:"document_idle",persistAcrossSessions:true}]);enabled=true;
 try{await chrome.scripting.executeScript({target:{tabId:tab.id},files:["core.js","rules-core.js","content.js"]});$("status").textContent="Tracking enabled. Read for at least 10 seconds."}catch{$("status").textContent="Tracking enabled. Reload this page to start."}}}
 catch(e){$("status").textContent="Could not change tracking: "+e.message}finally{$("toggle").textContent=enabled?"Disable tracking":"Enable tracking";$("toggle").disabled=false}
});
$("manualForm").addEventListener("submit",async e=>{
 e.preventDefault();if(!tab?.url)return;
 const b=$("manualSave");b.disabled=true;
 try{
  const input={title:$("manualTitle").value,chapter:$("manualChapter").value,completed:$("manualRead").checked,url:tab.url};
  manualReading(input);
  const result=await chrome.runtime.sendMessage({type:"manualSave",tabId:tab.id,...input});
  if(!result?.ok)throw Error(result?.error||"Could not save");
  $("status").textContent="Chapter saved. Enable site tracking for automatic progress on this URL.";
  await refresh();
 }catch(e){$("status").textContent=e.message}finally{b.disabled=false}
});
let tested=null;
function draftRule(){return validateRule({origin:new URL(tab.url).origin,path:$("rulePath").value,titleSelector:$("ruleTitle").value,chapterSelector:$("ruleChapter").value})}
for(const id of ["rulePath","ruleTitle","ruleChapter"]){$(id).addEventListener("input",()=>{tested=null;$("ruleSave").disabled=true;$("ruleResult").textContent="Test the rule before saving."})}
$("ruleTest").onclick=async()=>{
 tested=null;$("ruleSave").disabled=true;
 try{
  const rule=draftRule();if(!ruleApplies(rule,tab.url))throw Error("Current page does not match the path prefix");
  const [result]=await chrome.scripting.executeScript({target:{tabId:tab.id},func:(t,c)=>{
   try{return {url:location.href,title:document.querySelector(t)?.textContent?.slice(0,1000)||"",chapter:document.querySelector(c)?.textContent?.slice(0,1000)||""}}catch{return {error:"Invalid CSS selector"}}
  },args:[rule.titleSelector,rule.chapterSelector]});
  if(result.result?.error)throw Error(result.result.error);
  if(result.result?.url!==tab.url)throw Error("Page changed; reopen InkTrail");
  const reading=parseRuleReading(rule,result.result.url,result.result.title,result.result.chapter);
  if(!reading)throw Error("No valid title and numeric chapter found. Check selectors and URL.");
  tested=JSON.stringify(rule);$("ruleResult").textContent="Detected: "+reading.title+" · Chapter "+reading.chapter;$("ruleSave").disabled=false;
 }catch(e){$("ruleResult").textContent=e.message}
};
$("ruleSave").onclick=async()=>{
 try{
  const rule=draftRule();if(JSON.stringify(rule)!==tested)throw Error("Test the rule again");
  const response=await chrome.runtime.sendMessage({type:"siteRule",op:"save",rule,tabId:tab.id});
  if(!response?.ok)throw Error(response?.error||"Could not save");
  $("ruleResult").textContent="Rule saved. Enable site tracking and reload the reading page.";
 }catch(e){$("ruleResult").textContent=e.message}
};
$("search").addEventListener("input",render);
$("export").addEventListener("click",()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({version:1,library},null,2)],{type:"application/json"}));const a=document.createElement("a");a.href=url;a.download="inktrail-library.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});
chrome.storage.onChanged.addListener((changes,area)=>{if(area==="local"&&changes.library)refresh().catch(()=>{})});
init().catch(e=>{$("status").textContent=e.message});
