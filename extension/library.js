const $=id=>document.getElementById(id);
let library={},busy=false;
const opened=new Set(),catalogOpened=new Set();
const statuses=["reading","completed","paused","planned","dropped"];
function node(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n}
function button(text,fn,cls="secondary"){const b=node("button",text,cls);b.disabled=busy;b.addEventListener("click",fn);return b}
function link(url,text){const a=node("a",text);try{const u=new URL(url);if(["http:","https:"].includes(u.protocol)){a.href=u.href;a.target="_blank";a.rel="noopener noreferrer"}}catch{}return a}
async function load(){({library={}}=await chrome.storage.local.get("library"));render()}
async function send(message){
 if(busy)return;busy=true;$("notice").textContent="Saving…";render();
 try{const r=await chrome.runtime.sendMessage(message);if(!r?.ok)throw Error(r?.error||"Could not save");await load();$("notice").textContent="Saved."}
 catch(e){$("notice").textContent=e.message}finally{busy=false;render()}
}
const edit=(key,op,fields={})=>send({type:"libraryEdit",action:{key,op,...fields}});
function render(){
 const sort=$("sort").value, unread=s=>Object.values(s.chapters).filter(c=>!c.completed).length;
 const compare=(a,b)=>sort==="title"?a.title.localeCompare(b.title):sort==="unread"?unread(b)-unread(a)||b.updatedAt-a.updatedAt:b.updatedAt-a.updatedAt;
 const all=Object.values(library).sort(compare), groups=groupedLibrary(library), chapters=groups.flatMap(g=>g.chapters);
 $("stats").replaceChildren(...[["Stories",groups.length],["Sources",all.length],["Unique chapters",chapters.length],["Chapters read",chapters.filter(c=>c.completed).length],["Active reading",formatReadingTime(all.flatMap(s=>Object.values(s.chapters)).reduce((n,c)=>n+(c.readingSeconds||0),0))]].map(([label,count])=>{const n=node("div",undefined,"stat");n.append(node("strong",count),node("span",label));return n}));
 const q=$("search").value.trim().toLowerCase(),filter=$("filter").value;
 const entries=all.filter(s=>(s.title.toLowerCase().includes(q)||(s.groupTitle||"").toLowerCase().includes(q)||new URL(s.origin).hostname.toLowerCase().includes(q))&&(!filter||(s.status||"reading")===filter));
 const visible=new Set(entries.map(s=>s.key));
 $("groups").replaceChildren();
 for(const g of groups.filter(g=>g.sources.length>1&&g.sources.some(s=>visible.has(s.key)))){
  const card=node("article",undefined,"group-card");
  card.append(node("h2",g.title),node("p",g.sources.length+" linked sources · "+g.chapters.length+" unique chapters · "+g.readCount+" read · Highest tracked: "+g.chapters[0]?.chapter),node("small","Aliases: "+g.aliases.join(" / ")));
  const resume=node("div",undefined,"actions");resume.append(link(g.last.url,"Resume last opened chapter "+g.last.chapter));
  for(const s of g.sources)resume.append(link(s.chapters[s.lastChapter].url,new URL(s.origin).hostname+" · "+s.lastChapter));
  const name=node("input");name.value=g.title;name.maxLength=180;name.setAttribute("aria-label","Linked story name");resume.append(name,button("Rename story",()=>edit(g.sources[0].key,"renameGroup",{title:name.value})));
  card.append(resume);
  const detail=node("details");detail.append(node("summary","Unified chapter history"));
  for(const c of g.chapters){const row=node("div",undefined,"chapter");row.append(node("strong","Chapter "+c.chapter+" · "+(c.completed?"Read":c.progress+"% progress")));const links=node("div",undefined,"actions");for(const source of c.links)links.append(link(source.url,new URL(source.origin).hostname+" · "+source.title));row.append(links);detail.append(row)}
  card.append(detail);$("groups").append(card);
 }
 $("list").replaceChildren();if(!entries.length){$("list").append(node("p",all.length?"No matching stories.":"Your library is empty. Enable tracking on a reading site to begin.","empty"));return}
 for(const s of entries){
  const article=node("article"),head=node("div",undefined,"series-head"),info=node("div"),actions=node("div",undefined,"actions");
  info.append(node("h2",s.title),node("small",new URL(s.origin).hostname+" · "+Object.keys(s.chapters).length+" chapters · Last: "+s.lastChapter));
  const select=node("select");select.setAttribute("aria-label","Status for "+s.title);for(const status of statuses){const o=node("option",status);o.value=status;select.append(o)}select.value=s.status||"reading";select.disabled=busy;select.onchange=()=>edit(s.key,"status",{status:select.value});
  actions.append(select,link(s.chapters[s.lastChapter].url,"Resume"),button("Delete series",()=>{if(confirm("Delete this series and its chapter history? Tracking can add it again."))edit(s.key,"deleteSeries")},"danger"));head.append(info,actions);article.append(head);
  const candidates=all.filter(t=>t.key!==s.key&&!(s.groupId&&t.groupId===s.groupId)).sort((a,b)=>Number(titleIdentity(b.title)===titleIdentity(s.title))-Number(titleIdentity(a.title)===titleIdentity(s.title))||a.title.localeCompare(b.title));
  const linking=node("div",undefined,"actions link-controls");
  if(s.groupId)linking.append(node("small","Linked to: "+s.groupTitle),button("Unlink source",()=>edit(s.key,"unlink")));
  if(candidates.length){const picker=node("select");picker.setAttribute("aria-label","Link another source to "+s.title);const empty=node("option","Choose another source");empty.value="";picker.append(empty);
   for(const t of candidates){const o=node("option",(titleIdentity(t.title)===titleIdentity(s.title)?"Suggested · ":"")+t.title+" ("+new URL(t.origin).hostname+")");o.value=t.key;picker.append(o)}
   const join=button("Link stories",()=>{if(picker.value&&confirm("Link these stories and their existing groups? Original source histories are kept."))edit(s.key,"link",{target:picker.value})});
   linking.append(picker,join);
  }
  article.append(linking);
  const catalog=node("details");catalog.open=catalogOpened.has(s.key);catalog.ontoggle=()=>{if(catalog.open)catalogOpened.add(s.key);else catalogOpened.delete(s.key)};catalog.append(node("summary","External catalog references"));
  catalog.append(node("small","Optional local references. No account sync. Reference chapters do not change tracked progress."));
  for(const [provider,label] of [["anilist","AniList"],["mal","MyAnimeList"]]){
   const ref=s.catalog?.[provider],row=node("div",undefined,"actions link-controls"),id=node("input"),progress=node("input");
   id.value=ref?.id||"";id.placeholder=label+" manga ID or URL";id.setAttribute("aria-label",label+" manga ID or URL for "+s.title);id.maxLength=300;id.disabled=busy;
   progress.value=ref?.progress??"";progress.placeholder="Reference chapter";progress.inputMode="decimal";progress.setAttribute("aria-label",label+" reference chapter for "+s.title);progress.maxLength=16;progress.disabled=busy;
   row.append(link(catalogSearch(provider,s.title),"Find on "+label),id,progress,button("Save "+label,()=>edit(s.key,"catalog",{provider,input:id.value,progress:progress.value})));
   if(ref&&catalogUrl(provider,ref.id))row.append(link(catalogUrl(provider,ref.id),"Open "+label),button("Remove "+label,()=>edit(s.key,"catalog",{provider,input:""})));
   catalog.append(row);
  }
  article.append(catalog);
  const details=node("details");details.open=opened.has(s.key);details.ontoggle=()=>{if(details.open)opened.add(s.key);else opened.delete(s.key)};details.append(node("summary","Chapter history"));
  for(const c of Object.values(s.chapters).sort((a,b)=>Number(b.chapter)-Number(a.chapter))){
   const row=node("div",undefined,"chapter"),label=node("div"),controls=node("div",undefined,"chapter-actions");label.append(link(c.url,"Chapter "+c.chapter),node("div",(c.completed?"Read":c.progress+"% progress")+" · "+formatReadingTime(c.readingSeconds)+" active"));
   const bar=node("progress");bar.max=100;bar.value=c.progress;bar.setAttribute("aria-label","Chapter progress");label.append(bar);
   controls.append(button(c.completed?"Mark unread":"Mark read",()=>edit(s.key,"complete",{chapter:c.chapter,completed:!c.completed})));
   const field=node("input");field.type="text";field.inputMode="decimal";field.value=c.chapter;field.setAttribute("aria-label","Correct chapter "+c.chapter);field.disabled=busy;
   controls.append(field,button("Correct",()=>edit(s.key,"correct",{chapter:c.chapter,newChapter:field.value})),button("Delete",()=>{if(confirm("Delete chapter "+c.chapter+"? Tracking can add it again."))edit(s.key,"deleteChapter",{chapter:c.chapter})},"danger"));
   row.append(label,controls);details.append(row);
  }
  article.append(details);$("list").append(article)
 }
}
$("search").oninput=render;$("filter").onchange=render;$("sort").onchange=render;
$("export").onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({version:1,library},null,2)],{type:"application/json"}));const a=node("a");a.href=url;a.download="inktrail-library.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
$("import").onclick=()=>$("file").click();
$("file").onchange=async()=>{const file=$("file").files[0];$("file").value="";if(!file)return;if(file.size>10*1024*1024){$("notice").textContent="Backup exceeds 10 MB.";return}try{const data=JSON.parse(await file.text());if(confirm("Merge this backup into your library? Existing series are retained."))await send({type:"libraryImport",data})}catch(e){$("notice").textContent="Invalid backup: "+e.message}};
chrome.storage.onChanged.addListener((changes,area)=>{if(area==="local"&&changes.library)load().catch(()=>{})});
load().catch(e=>$("notice").textContent=e.message);
