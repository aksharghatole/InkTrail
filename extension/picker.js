(()=>{
 if(globalThis.__inkTrailPicker)return;
 globalThis.__inkTrailPicker=true;
 const originalUrl=location.href;
 let stage=0,titleSelector="",hovered=null;
 const host=document.createElement("div");
 host.id="inktrail-picker";
 host.style.cssText="position:fixed;inset:0;z-index:2147483647;pointer-events:none";
 const shadow=host.attachShadow({mode:"open"}),panel=document.createElement("div"),label=document.createElement("span"),cancel=document.createElement("button"),outline=document.createElement("div");
 panel.style.cssText="position:absolute;top:12px;left:50%;transform:translateX(-50%);max-width:90vw;display:flex;align-items:center;gap:12px;background:#24202d;color:white;padding:12px;border-radius:10px;font:14px system-ui;pointer-events:auto";
 outline.style.cssText="position:fixed;border:2px solid #e4c7fa;background:#e4c7fa22;pointer-events:none;display:none;box-sizing:border-box";
 cancel.textContent="Cancel";label.textContent="InkTrail: click the series title";
 panel.append(label,cancel);shadow.append(outline,panel);document.documentElement.append(host);
 function unique(s,el){try{const hits=document.querySelectorAll(s);return hits.length===1&&hits[0]===el}catch{return false}}
 function selector(el){
  const parts=[];
  for(let n=el;n&&n.nodeType===1;n=n.parentElement){
   const tag=CSS.escape(n.localName);
   if(n.id&&n.id.length<100){const id="#"+CSS.escape(n.id);if(unique(id,n)){parts.unshift(id);break}}
   const cls=[...n.classList].filter(c=>c.length<60).slice(0,3).map(c=>"."+CSS.escape(c)).join("");
   let simple=tag+cls;
   if(n===el&&unique(simple,n))return simple;
   const siblings=n.parentElement?[...n.parentElement.children].filter(x=>x.localName===n.localName):[];
   if(siblings.length>1)simple+=":nth-of-type("+(siblings.indexOf(n)+1)+")";
   parts.unshift(simple);
   if(parts.join(" > ").length>240)return null;
   if(unique(parts.join(" > "),el))break;
  }
  const s=parts.join(" > ");return s.length<=240&&unique(s,el)?s:null;
 }
 function target(e){const el=e.target;return el instanceof Element&&el!==host&&!e.composedPath().includes(host)?el:null}
 function move(e){
  hovered=target(e);if(!hovered){outline.style.display="none";return}
  const r=hovered.getBoundingClientRect();Object.assign(outline.style,{display:"block",left:r.left+"px",top:r.top+"px",width:r.width+"px",height:r.height+"px"});
 }
 function cleanup(){clearTimeout(timeout);removeEventListener("pointermove",move,true);removeEventListener("click",pick,true);removeEventListener("keydown",key,true);host.remove();globalThis.__inkTrailPicker=false}
 function key(e){if(e.key==="Escape"){e.preventDefault();e.stopImmediatePropagation();cleanup()}}
 async function pick(e){
  const el=target(e);if(!el||!e.isTrusted)return;
  e.preventDefault();e.stopImmediatePropagation();
  if(location.href!==originalUrl){cleanup();return}
  const s=selector(el),text=el.textContent.trim();
  if(!s||!text||text.length>1000){label.textContent="Choose a smaller, identifiable text element";return}
  if(stage===0){titleSelector=s;stage=1;label.textContent="InkTrail: click the chapter number";return}
  if(s===titleSelector){label.textContent="Choose a different element for the chapter number";return}
  stage=2;label.textContent="Saving draft…";
  try{
   const result=await chrome.runtime.sendMessage({type:"pickerDraft",titleSelector,chapterSelector:s});
   if(!result?.ok)throw Error(result?.error||"Unable to save draft");
   label.textContent="Draft saved. Reopen InkTrail, test and save the rule.";outline.style.display="none";
   removeEventListener("click",pick,true);removeEventListener("pointermove",move,true);
   cancel.textContent="Close";setTimeout(cleanup,10000);
  }catch(e){stage=1;label.textContent=e.message}
 }
 cancel.onclick=cleanup;
 addEventListener("pointermove",move,true);addEventListener("click",pick,true);addEventListener("keydown",key,true);
 const timeout=setTimeout(cleanup,120000);
})();
