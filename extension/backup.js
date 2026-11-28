const $=id=>document.getElementById(id);
const keys=["library","siteRules","follows","readingActivity","readingGoal","releaseNotifications"];
let selected=null,busy=false,previewGeneration=0;
function el(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n}
function renderCounts(id,counts){
 $(id).replaceChildren(...Object.entries(counts).map(([label,value])=>{const n=el("div",undefined,"stat");n.append(el("strong",value),el("span",label));return n}));
}
async function load(){renderCounts("current",backupCounts(await chrome.storage.local.get(keys)))}
function reset(){previewGeneration++;selected=null;$("file").value="";$("preview").hidden=true}
$("export").onclick=async()=>{
 try{
  const data=portableBackup(await chrome.storage.local.get(keys));
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));const a=el("a");a.href=url;a.download="inktrail-full-"+new Date().toISOString().slice(0,10)+".json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  $("notice").textContent="Backup prepared.";
 }catch(e){$("notice").textContent=e.message}
};
$("file").onchange=async()=>{
 if(busy)return;const generation=++previewGeneration;selected=null;$("preview").hidden=true;
 const f=$("file").files[0];if(!f)return;
 try{
  if(f.size>20*1024*1024)throw Error("Backup exceeds 20 MB");
  const data=JSON.parse(await f.text());if(generation!==previewGeneration)return;const validated=validatePortable(data);
  renderCounts("counts",backupCounts(validated));selected=data;$("preview").hidden=false;$("notice").textContent="Backup validated. Review the counts before merging.";
 }catch(e){if(generation===previewGeneration)$("notice").textContent=e.message}
};
$("cancel").onclick=()=>{reset();$("notice").textContent="Backup selection cleared."};
$("restore").onclick=async()=>{
 if(busy||!selected||!confirm("Merge this backup with your existing local data? Restored subscriptions may check MangaDex if API permission is already granted."))return;
 busy=true;$("restore").disabled=true;$("file").disabled=true;$("cancel").disabled=true;
 try{
  const r=await chrome.runtime.sendMessage({type:"fullBackup",op:"import",data:selected});
  if(!r?.ok)throw Error(r?.error||"Restore failed");
  reset();await load();$("notice").textContent="Backup merged successfully.";
 }catch(e){$("notice").textContent=e.message}
 finally{busy=false;$("restore").disabled=false;$("file").disabled=false;$("cancel").disabled=false}
};
load().catch(e=>$("notice").textContent=e.message);
