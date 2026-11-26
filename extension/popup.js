const $=id=>document.getElementById(id);
let tab,pattern,enabled=false,library={};
const scriptId=p=>"site-"+Array.from(p,c=>c.charCodeAt(0).toString(16).padStart(2,"0")).join("");
function el(tag,text){const node=document.createElement(tag);node.textContent=text;return node}
async function refresh(){({library={}}=await chrome.storage.local.get("library"));render()}
function render(){
 const all=Object.values(library).sort((a,b)=>b.updatedAt-a.updatedAt);$("count").textContent=String(all.length);
 const q=$("search").value.trim().toLowerCase();const list=all.filter(x=>x.title.toLowerCase().includes(q));$("library").replaceChildren();
 if(!list.length){const p=el("p",all.length?"No matching series.":"Enable a reading site and open a chapter.");p.className="empty";$("library").append(p);return}
 for(const s of list){const c=s.chapters[s.lastChapter];if(!c)continue;const a=el("article","");a.append(el("strong",s.title),el("p",new URL(s.origin).hostname+" · Chapter "+c.chapter+" · "+(c.completed?"Read":c.progress+"% scrolled")));const bar=document.createElement("progress");bar.max=100;bar.value=c.progress;bar.setAttribute("aria-label","Chapter scroll progress");a.append(bar);const link=el("a","Resume chapter");link.href=c.url;link.target="_blank";link.rel="noopener noreferrer";a.append(link);$("library").append(a)}
}
async function init(){
 await refresh();[tab]=await chrome.tabs.query({active:true,currentWindow:true});
 try{const u=new URL(tab.url);if(!["http:","https:"].includes(u.protocol))throw Error();pattern=u.protocol+"//"+u.hostname+"/*";$("site").textContent=u.hostname;const registered=await chrome.scripting.getRegisteredContentScripts({ids:[scriptId(pattern)]});enabled=registered.length>0&&await chrome.permissions.contains({origins:[pattern]});$("toggle").textContent=enabled?"Disable tracking":"Enable tracking";$("toggle").disabled=false}catch{$("site").textContent="Open a reading website to enable tracking."}
}
$("toggle").addEventListener("click",async()=>{
 if(!pattern)return;$("toggle").disabled=true;
 try{const id=scriptId(pattern);if(enabled){const scripts=await chrome.scripting.getRegisteredContentScripts({ids:[id]});if(scripts.length)await chrome.scripting.unregisterContentScripts({ids:[id]});enabled=false;await chrome.permissions.remove({origins:[pattern]});$("status").textContent="Tracking disabled. History retained."}
 else{if(!await chrome.permissions.request({origins:[pattern]})){$("status").textContent="Permission not granted.";return}
 const scripts=await chrome.scripting.getRegisteredContentScripts({ids:[id]});if(!scripts.length)await chrome.scripting.registerContentScripts([{id,matches:[pattern],js:["core.js","content.js"],runAt:"document_idle",persistAcrossSessions:true}]);enabled=true;
 try{await chrome.scripting.executeScript({target:{tabId:tab.id},files:["core.js","content.js"]});$("status").textContent="Tracking enabled. Read for at least 10 seconds."}catch{$("status").textContent="Tracking enabled. Reload this page to start."}}}
 catch(e){$("status").textContent="Could not change tracking: "+e.message}finally{$("toggle").textContent=enabled?"Disable tracking":"Enable tracking";$("toggle").disabled=false}
});
$("search").addEventListener("input",render);
$("export").addEventListener("click",()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({version:1,library},null,2)],{type:"application/json"}));const a=document.createElement("a");a.href=url;a.download="inktrail-library.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});
chrome.storage.onChanged.addListener((changes,area)=>{if(area==="local"&&changes.library)refresh().catch(()=>{})});
init().catch(e=>{$("status").textContent=e.message});
