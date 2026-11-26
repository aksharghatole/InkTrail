(()=>{
 if(globalThis.__inkTrailRunning)return;
 globalThis.__inkTrailRunning=true;
 let lookupUrl="",assignment=null,rule=null,lookupAt=0;
 let key="",lastTime=performance.now(),active=false,visibleSeconds=0,pending=0,lastSaved="",busy=false,offer=null,offerUntil=0,interacted=false,awaitingChoice=false,scrollEvidence=false,lastActivity=performance.now();
 const removeOffer=()=>{offer?.remove();offer=null;offerUntil=0};
 function current(){
  if(rule&&ruleApplies(rule,location.href)){
   try{return parseRuleReading(rule,location.href,document.querySelector(rule.titleSelector)?.textContent,document.querySelector(rule.chapterSelector)?.textContent)}catch{return null;}
  }
  return detect({url:location.href,title:document.title,headings:[...document.querySelectorAll("h1,h2")].slice(0,8).map(x=>x.textContent),readerImages:document.querySelectorAll("main img,article img,.reader img,.reading-content img").length});
 }
 function position(){
  const root=document.scrollingElement||document.documentElement;
  const range=Math.max(0,root.scrollHeight-innerHeight);
  return {top:Math.max(0,Math.min(range,root.scrollTop)),range};
 }
 function showOffer(pos,identity){
  if(interacted||key!==identity||!pos||pos.top<150)return;
  const host=document.createElement("div");host.style.cssText="position:fixed;right:16px;bottom:16px;z-index:2147483647";
  const shadow=host.attachShadow({mode:"closed"}),box=document.createElement("div"),label=document.createElement("span"),go=document.createElement("button"),dismiss=document.createElement("button");
  box.style.cssText="display:flex;align-items:center;gap:8px;padding:12px;background:#24202d;color:#fff;border:1px solid #ab8bc5;border-radius:12px;font:14px system-ui;box-shadow:0 4px 20px #0005";
  label.textContent="InkTrail · Continue from "+Math.round(pos.top/Math.max(1,pos.range)*100)+"%?";
  go.textContent="Resume";dismiss.textContent="Start here";
  for(const b of [go,dismiss])b.style.cssText="font:inherit;background:#e4c7fa;color:#231a2c;border:0;border-radius:6px;padding:8px;cursor:pointer";
  go.onclick=()=>{if(key===identity){const p=position();window.scrollTo({top:resumeOffset(pos,p.range),behavior:"instant"});interacted=true;awaitingChoice=false;scrollEvidence=false;}removeOffer()};
  dismiss.onclick=()=>{interacted=true;awaitingChoice=false;removeOffer()};
  box.append(label,go,dismiss);shadow.append(box);document.documentElement.append(host);offer=host;awaitingChoice=true;offerUntil=performance.now()+30000;
 }
 for(const event of ["pointerdown","keydown","wheel","touchmove"]){
  addEventListener(event,e=>{if(!e.isTrusted)return;lastActivity=performance.now();if(event==="wheel"||event==="touchmove"||(event==="keydown"&&["ArrowDown","ArrowUp","PageDown","PageUp"," ","End","Home"].includes(e.key)))scrollEvidence=true;
   if(!offer){interacted=true;awaitingChoice=false;}
  },{passive:true,capture:true});
 }
 async function tick(){
  if(busy)return;busy=true;
  try{
   const now=performance.now(),eligible=document.visibilityState==="visible"&&document.hasFocus()&&now-lastActivity<120000;
   const delta=sessionDelta(lastTime,now,eligible&&active);lastTime=now;active=eligible;
   if(!eligible)return;
   if(lookupUrl!==location.href||now-lookupAt>=15000){
    const requested=location.href;
    const result=await chrome.runtime.sendMessage({type:"manualLookup"});
    if(location.href!==requested)return;
    lookupUrl=requested;lookupAt=now;assignment=result?.ok?result.assignment:null;rule=result?.ok?result.rule:null;
    if(!result?.ok){key="";removeOffer();return;}
   }
   const r=assignment||current();
   if(!r){key="";visibleSeconds=0;pending=0;removeOffer();return;}
   const next=r.url+"|"+r.title+"|"+r.chapter;
   if(key!==next){
    key=next;visibleSeconds=0;pending=0;lastSaved="";interacted=false;awaitingChoice=false;scrollEvidence=false;removeOffer();
    const lookup=await chrome.runtime.sendMessage({type:"resumeLookup",reading:{...r,progress:0}});
    if(lookup?.ok&&!lookup.completed&&position().top<150)showOffer(lookup.position,next);
    return;
   }
   visibleSeconds+=delta;pending=Math.min(15,pending+delta);
   if(offer&&now>=offerUntil)removeOffer();
   if(offer||awaitingChoice)return;
   const p=position(),progress=p.range>100?Math.round(p.top/p.range*100):0;
   const completed=visibleSeconds>=30&&progress>=90&&scrollEvidence;
   const signature=next+"|"+Math.round(p.top/20)+"|"+progress+"|"+completed;
   if(visibleSeconds<10||(signature===lastSaved&&pending<10))return;
   const result=await chrome.runtime.sendMessage({type:"reading",reading:{...r,progress,completed,position:p,seconds:pending}});
   if(result?.ok){lastSaved=signature;pending=0;}
  }catch{}finally{busy=false;}
 }
 document.addEventListener("visibilitychange",()=>{active=false;lastTime=performance.now()});
 addEventListener("blur",()=>{active=false;lastTime=performance.now()});
 setInterval(tick,2000);tick();
})();
