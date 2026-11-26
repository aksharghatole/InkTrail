const $=id=>document.getElementById(id);
let activity={},library={},goal=20,selected=null;
function el(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n}
function duration(seconds){const m=Math.floor(seconds/60);return m>=60?Math.floor(m/60)+"h "+m%60+"m":m?m+"m":Math.floor(seconds)+"s"}
function level(s){return s===0?0:s<600?1:s<1800?2:s<3600?3:4}
function showDay(day){selected=day;$("dayDetail").textContent=day+" · "+duration(activity[day]?.seconds||0)+" active reading"}
function render(){
 const today=localDay(Date.now()),s=activitySummary(activity,today,goal);
 $("stats").replaceChildren(...[["Today",duration(s.today)],["Last 7 days",duration(s.week)],["Last 30 days",duration(s.month)],["Recorded activity",duration(s.total)],["Current streak",s.current+" days"],["Longest streak",s.longest+" days"],["Active days",s.activeDays]].map(([label,value])=>{const n=el("div",undefined,"stat");n.append(el("strong",value),el("span",label));return n}));
 if(document.activeElement!==$("goal"))$("goal").value=goal;
 $("goalText").textContent=duration(s.today)+" of "+duration(s.goal)+" · "+Math.round(s.today/s.goal*100)+"%";
 $("goalProgress").value=Math.min(100,s.today/s.goal*100);
 $("calendar").replaceChildren(...s.calendar.map(d=>{const b=el("button");b.dataset.level=level(d.seconds);b.title=d.day+" · "+duration(d.seconds);b.setAttribute("aria-label",b.title);b.onclick=()=>showDay(d.day);return b}));
 showDay(selected||today);
 const top=topStories(activity,library,today);
 $("top").replaceChildren(...top.map(r=>{const row=el("div",undefined,"rank"),bar=el("progress");bar.max=top[0].seconds;bar.value=r.seconds;bar.setAttribute("aria-label","Reading time");row.append(el("span",r.title),bar,el("small",duration(r.seconds)));return row}));
 if(!top.length)$("top").append(el("p","No recorded story activity yet.","muted"));
 const days=Object.entries(activity).filter(([day])=>day<=today).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,30);
 $("history").replaceChildren(...days.map(([day,v])=>{const row=el("div",undefined,"chapter");row.append(el("strong",day),el("span",duration(v.seconds)));return row}));
 if(!days.length)$("history").append(el("p","Read a tracked chapter to begin collecting activity.","muted"));
}
async function load(){const data=await chrome.storage.local.get(["readingActivity","readingGoal","library"]);activity=data.readingActivity||{};library=data.library||{};goal=data.readingGoal||20;render()}
async function send(msg){try{const result=await chrome.runtime.sendMessage({type:"analyticsAction",...msg});if(!result?.ok)throw Error(result?.error||"Could not save");await load();$("notice").textContent="Saved."}catch(e){$("notice").textContent=e.message}}
$("goalForm").onsubmit=e=>{e.preventDefault();send({op:"goal",minutes:Number($("goal").value)})};
$("clear").onclick=()=>{if(confirm("Clear all daily reading activity? Your library and lifetime chapter reading time are retained."))send({op:"clear"})};
chrome.storage.onChanged.addListener((changes,area)=>{if(area==="local"&&(changes.readingActivity||changes.readingGoal||changes.library))load().catch(()=>{})});
load().catch(e=>$("notice").textContent=e.message);
