const $=id=>document.getElementById(id);
let candidates=[],selection=new Set(),busy=false;
function el(tag,text){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n}
function updateCount(){$("count").textContent=selection.size+" selected / "+candidates.length+" candidates";$("save").disabled=busy||!selection.size;for(const id of ["origin","days","all","none","revoke"])$(id).disabled=busy;$("scan").querySelector("button[type=submit]").disabled=busy;for(const check of $("list").querySelectorAll("input[type=checkbox]"))check.disabled=busy;}
function render(){
 $("preview").hidden=!candidates.length;$("list").replaceChildren();
 for(const [i,r] of candidates.entries()){
  const row=el("label");row.className="chapter";
  const check=el("input");check.type="checkbox";check.checked=selection.has(i);check.onchange=()=>{if(check.checked)selection.add(i);else selection.delete(i);updateCount()};
  row.append(check,el("strong",r.title+" · Chapter "+r.chapter),el("small",new Date(r.visitedAt).toLocaleDateString()));$("list").append(row);
 }
 updateCount();
}
$("scan").onsubmit=async e=>{
 e.preventDefault();if(busy)return;busy=true;candidates=[];selection.clear();render();
 try{
  const origin=historyOrigin($("origin").value.trim()),days=Number($("days").value);
  if(![30,90,365].includes(days))throw Error("Invalid time window");
  if(!await chrome.permissions.request({permissions:["history"]}))throw Error("History access declined");
  const items=await chrome.history.search({text:new URL(origin).hostname,startTime:Date.now()-days*86400000,maxResults:1000});
  candidates=historyCandidates(items,origin);
  $("notice").textContent=candidates.length?"Review detected chapters and select those to import.":"No recognizable chapters found for this website.";
 }catch(e){$("notice").textContent=e.message}finally{busy=false;render()}
};
$("all").onclick=()=>{selection=new Set(candidates.map((_,i)=>i));render()};
$("none").onclick=()=>{selection.clear();render()};
$("save").onclick=async()=>{
 if(busy||!selection.size)return;busy=true;updateCount();
 try{
  const response=await chrome.runtime.sendMessage({type:"historyImport",rows:[...selection].map(i=>candidates[i])});
  if(!response?.ok)throw Error(response?.error||"Import failed");
  $("notice").textContent="Imported "+response.added+" visited chapters; skipped "+response.skipped+" existing chapters.";
  candidates=[];selection.clear();
 }catch(e){$("notice").textContent=e.message}finally{busy=false;render()}
};
$("revoke").onclick=async()=>{
 if(busy)return;busy=true;updateCount();try{await chrome.permissions.remove({permissions:["history"]});candidates=[];selection.clear();render();$("notice").textContent="History permission removed. Imported chapters retained."}catch(e){$("notice").textContent=e.message}finally{busy=false;updateCount()}
};
