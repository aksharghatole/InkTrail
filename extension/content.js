(()=>{
 if(globalThis.__inkTrailRunning)return;
 globalThis.__inkTrailRunning=true;
 let key="",seconds=0,last="";
 async function tick(){
  if(document.visibilityState!=="visible")return;
  const r=detect({url:location.href,title:document.title,headings:[...document.querySelectorAll("h1,h2")].slice(0,8).map(x=>x.textContent),readerImages:document.querySelectorAll("main img,article img,.reader img,.reading-content img").length});
  if(!r){key="";seconds=0;return;}
  const next=r.url+"|"+r.title+"|"+r.chapter;
  if(key!==next){key=next;seconds=0;last="";}else seconds+=5;
  const root=document.scrollingElement||document.documentElement;
  const distance=root.scrollHeight-innerHeight;
  const progress=distance>100?Math.max(0,Math.min(100,Math.round(root.scrollTop/distance*100))):0;
  const completed=seconds>=20&&progress>=90;
  const signature=next+"|"+Math.floor(progress/5)+"|"+completed;
  if(seconds<10||signature===last)return;
  try{const result=await chrome.runtime.sendMessage({type:"reading",reading:{...r,progress,completed}});if(result?.ok)last=signature;}catch{}
 }
 setInterval(tick,5000);tick();
})();
