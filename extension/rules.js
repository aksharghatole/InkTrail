const $=id=>document.getElementById(id);
let rules={},busy=false;
function el(tag,text){const n=document.createElement(tag);n.textContent=text;return n}
async function load(){({siteRules:rules={}}=await chrome.storage.local.get("siteRules"));render()}
function render(){
 $("list").replaceChildren();
 if(!Object.keys(rules).length)$("list").append(el("p","No custom website rules yet."));
 for(const rule of Object.values(rules).sort((a,b)=>a.origin.localeCompare(b.origin))){
  const a=document.createElement("article"),b=el("button","Delete rule");b.disabled=busy;b.onclick=()=>{if(confirm("Delete custom rule for "+rule.origin+"?"))send({op:"delete",origin:rule.origin})};
  a.append(el("h2",rule.origin),el("p","Path: "+rule.path),el("p","Title selector: "+rule.titleSelector),el("p","Chapter selector: "+rule.chapterSelector),b);$("list").append(a)
 }
}
async function send(msg){if(busy)return;busy=true;render();try{const r=await chrome.runtime.sendMessage({type:"siteRule",...msg});if(!r?.ok)throw Error(r?.error||"Unable to save");await load();$("notice").textContent="Saved."}catch(e){$("notice").textContent=e.message}finally{busy=false;render()}}
$("export").onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({version:1,rules:Object.values(rules)},null,2)],{type:"application/json"}));const a=document.createElement("a");a.href=url;a.download="inktrail-site-rules.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
$("import").onclick=()=>$("file").click();
$("file").onchange=async()=>{const f=$("file").files[0];$("file").value="";if(!f)return;if(f.size>1024*1024){$("notice").textContent="Backup exceeds 1 MB.";return}try{const data=JSON.parse(await f.text());validateRulesBackup(data);if(confirm("Import rules? Existing website rules are kept. Imported selectors are not tested against live pages."))await send({op:"import",data})}catch(e){$("notice").textContent=e.message}};
chrome.storage.onChanged.addListener((changes,area)=>{if(area==="local"&&changes.siteRules)load().catch(()=>{})});load().catch(e=>$("notice").textContent=e.message);
