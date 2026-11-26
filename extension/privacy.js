const $=id=>document.getElementById(id);
let busy=false,rows=[];
function el(tag,text){const n=document.createElement(tag);n.textContent=text;return n}
async function load(){
 const [scripts,permissions]=await Promise.all([chrome.scripting.getRegisteredContentScripts(),chrome.permissions.getAll()]);
 rows=permissionRows(scripts,permissions.origins||[]);render();
}
function render(){
 $("stop").disabled=busy||!rows.some(r=>r.ids.length);$("refresh").disabled=busy;
 $("list").replaceChildren();
 if(!rows.length){$("list").append(el("p","No persistent website permissions or tracking registrations."));return}
 for(const row of rows){
  const a=document.createElement("article"),actions=document.createElement("div");actions.className="actions";
  a.append(el("h2",row.pattern),el("p",row.ids.length?"Reading tracking registered":"No reading tracking registered"),el("small",row.granted?"Persistent permission listed":"No exact persistent permission listed"));
  if(row.release)a.append(el("p","MangaDex release API access; removing it stops release checks until access is granted again."));
  if(row.ids.length){const b=el("button","Stop reading tracking");b.disabled=busy;b.onclick=()=>run(async()=>{await chrome.scripting.unregisterContentScripts({ids:row.ids})});actions.append(b)}
  if(row.granted){const b=el("button","Revoke website permission");b.className="danger";b.disabled=busy;b.onclick=()=>{if(confirm("Remove access for "+row.pattern+"? Existing reading data is retained."))run(async()=>{if(row.ids.length)await chrome.scripting.unregisterContentScripts({ids:row.ids});if(!await chrome.permissions.remove({origins:[row.pattern]}))throw Error("Permission could not be removed; review browser extension settings")})};actions.append(b)}
  a.append(actions);$("list").append(a);
 }
}
async function run(fn){
 if(busy)return;busy=true;render();
 try{await fn();$("notice").textContent="Updated. Existing library data retained."}catch(e){$("notice").textContent=e.message}
 finally{busy=false;await load().catch(e=>$("notice").textContent=e.message)}
}
$("refresh").onclick=()=>load().catch(e=>$("notice").textContent=e.message);
$("stop").onclick=()=>{if(confirm("Stop automatic reading tracking on every website? Website permissions, reading history and release checks are retained."))run(async()=>{const scripts=trackingScripts(await chrome.scripting.getRegisteredContentScripts());if(scripts.length)await chrome.scripting.unregisterContentScripts({ids:scripts.map(s=>s.id)})})};
chrome.permissions.onAdded.addListener(() => load().catch(()=>{}));chrome.permissions.onRemoved.addListener(()=>load().catch(()=>{}));load().catch(e=>$("notice").textContent=e.message);
