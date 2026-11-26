const $=id=>document.getElementById(id);
let follows={},library={},busy=false;
function el(tag,text){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n}
function btn(text,fn){const b=el("button",text);b.disabled=busy;b.onclick=fn;return b}
function chapterLink(c){const a=el("a","Chapter "+c.chapter);a.href="https://mangadex.org/chapter/"+c.id;a.target="_blank";a.rel="noopener noreferrer";return a}
async function load(){({follows={},library={}}=await chrome.storage.local.get(["follows","library"]));render()}
function render(){
 $("list").replaceChildren();
 const rows=Object.entries(follows).sort((a,b)=>a[1].title.localeCompare(b[1].title));
 if(!rows.length){$("list").append(el("p","No followed titles yet."));return}
 for(const [key,f] of rows){
  const a=el("article"),unseen=unseenChapters(f,library);
  a.append(el("h2",f.title+" · "+f.language),el("p",f.checkedAt?"Latest in feed: "+(f.chapters[0]?.chapter||"No numbered chapters")+" · "+unseen.length+" unread in feed · "+(f.pending||0)+" new alerts":"Not checked yet"));
  if(f.checkedAt)a.append(el("small","Last successful check: "+new Date(f.checkedAt).toLocaleString()));
  if(f.error)a.append(el("p","Check failed: "+f.error));
  const controls=el("div");controls.className="actions";
  const input=el("input");input.value=f.readThrough;input.inputMode="decimal";input.setAttribute("aria-label","Read through chapter for "+f.title);
  controls.append(input,btn("Set read-through",()=>send({op:"readThrough",key,value:input.value})),btn("Check now",()=>send({op:"check",key})),btn("Unfollow",()=>{if(confirm("Unfollow "+f.title+"?"))send({op:"unfollow",key})}));a.append(controls);
  const linking=el("div");linking.className="actions";
  const linked=typeof f.libraryKey==="string"&&Object.hasOwn(library,f.libraryKey)?library[f.libraryKey]:null;
  if(f.libraryKey)linking.append(el("small",linked?"Linked to "+(linked.groupTitle||linked.title)+" · "+completedForFollow(f,library).size+" recorded read chapters":"Linked source missing — choose another source"),btn("Unlink",()=>send({op:"unlinkLibrary",key})));
  const picker=el("select");picker.setAttribute("aria-label","Link reading source for "+f.title);
  const placeholder=el("option","Choose a reading source");placeholder.value="";picker.append(placeholder);
  for(const s of followSuggestions(f,library)){const option=el("option",(s.groupTitle||s.title)+" · "+new URL(s.origin).hostname);option.value=s.key;picker.append(option)}
  if(linked)picker.value=linked.key;
  if(Object.keys(library).length)linking.append(picker,btn("Link reading progress",()=>{if(picker.value&&confirm("Link this reading source? Its completed chapters (including linked websites) will be excluded from unread counts."))send({op:"linkLibrary",key,libraryKey:picker.value})}));
  a.append(linking);
  const detail=el("details");detail.append(el("summary","Unread chapters in returned feed (up to 100 entries)"));
  for(const c of unseen){const row=el("div");row.className="chapter";row.append(chapterLink(c),el("small",new Date(c.published).toLocaleDateString()));detail.append(row)}
  a.append(detail);$("list").append(a);
 }
}
async function send(msg){
 if(busy)return;busy=true;$("notice").textContent="Working…";render();
 try{const r=await chrome.runtime.sendMessage({type:"releaseAction",...msg});if(!r?.ok)throw Error(r?.error||"Request failed");$("notice").textContent="Saved.";await load();}
 catch(e){$("notice").textContent=e.message;await load().catch(()=>{});}
 finally{busy=false;render()}
}
$("follow").onsubmit=async e=>{
 e.preventDefault();
 if(busy)return;
 const input=$("url").value,title=$("title").value,language=$("lang").value.trim().toLowerCase(),readThrough=$("through").value;
 if(!mangaId(input)){ $("notice").textContent="Enter a valid MangaDex title URL or UUID.";return; }
 try{
  if(!await chrome.permissions.request({origins:["https://api.mangadex.org/*"]})){ $("notice").textContent="API access declined.";return; }
  await send({op:"follow",input,title,language,readThrough});
 }catch(e){$("notice").textContent=e.message;}
};
$("backup").onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(exportFollows(follows),null,2)],{type:"application/json"}));const a=el("a");a.href=url;a.download="inktrail-subscriptions.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
$("restore").onclick=async()=>{
 try{if(await chrome.permissions.request({origins:["https://api.mangadex.org/*"]}))$("backupFile").click();else $("notice").textContent="API access declined."}catch(e){$("notice").textContent=e.message}
};
$("backupFile").onchange=async()=>{
 const file=$("backupFile").files[0];$("backupFile").value="";if(!file)return;
 if(file.size>1024*1024){$("notice").textContent="Subscription backup exceeds 1 MB.";return}
 try{const data=JSON.parse(await file.text());validateFollowsBackup(data);if(confirm("Import subscriptions? Existing follows are retained; restored follows will check MangaDex again."))await send({op:"import",data})}catch(e){$("notice").textContent=e.message}
};
$("ack").onclick=()=>send({op:"ackAll"});
chrome.storage.onChanged.addListener((changes,area)=>{if(area==="local"&&(changes.follows||changes.library))load().catch(()=>{})});
load().catch(e=>$("notice").textContent=e.message);
