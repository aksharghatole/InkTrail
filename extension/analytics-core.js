function localDay(now){
 const d=new Date(now);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
}
function dayOffset(day,offset){
 const d=new Date(day+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+offset);return d.toISOString().slice(0,10);
}
function recordActivity(activity,key,seconds,now){
 if(!Number.isFinite(seconds)||seconds<=0)return activity;
 const day=localDay(now),prior=activity[day]||{seconds:0,stories:{}};
 const delta=Math.min(15,seconds);
 const stories={...prior.stories};
 // Bounded per-day detail; overall time still includes all tracked stories.
 if(Object.hasOwn(stories,key)||Object.keys(stories).length<200)stories[key]=(stories[key]||0)+delta;
 const out={...activity,[day]:{seconds:Math.min(86400,prior.seconds+delta),stories}};
 const cutoff=dayOffset(day,-729);
 for(const date of Object.keys(out))if(date<cutoff)delete out[date];
 return out;
}
function activitySummary(activity,today,goalMinutes=20){
 const seconds=day=>activity[day]?.seconds||0;
 const sum=n=>Array.from({length:n},(_,i)=>seconds(dayOffset(today,-i))).reduce((a,b)=>a+b,0);
 const active=Object.keys(activity).filter(d=>d<=today&&seconds(d)>=60).sort();
 let longest=0,run=0,last=null;
 for(const d of active){run=last&&dayOffset(last,1)===d?run+1:1;longest=Math.max(longest,run);last=d;}
 let current=0,d=seconds(today)>=60?today:dayOffset(today,-1);
 while(seconds(d)>=60&&current<730){current++;d=dayOffset(d,-1);}
 const calendar=Array.from({length:84},(_,i)=>{const day=dayOffset(today,i-83);return {day,seconds:seconds(day)}});
 return {today:seconds(today),week:sum(7),month:sum(30),total:Object.entries(activity).filter(([d])=>d<=today).reduce((n,[,v])=>n+v.seconds,0),activeDays:active.length,current,longest,goal:goalMinutes*60,calendar};
}
function topStories(activity,library,today){
 const sums=new Map();
 for(const [day,entry] of Object.entries(activity)){
  if(day>today||day<dayOffset(today,-29))continue;
  for(const [key,seconds] of Object.entries(entry.stories||{})){
   const s=Object.hasOwn(library,key)?library[key]:null;
   if(!s)continue;
   const id=s.groupId||key;
   const prev=sums.get(id)||{title:s.groupTitle||s.title,seconds:0};
   prev.seconds+=seconds;sums.set(id,prev);
  }
 }
 return [...sums.values()].sort((a,b)=>b.seconds-a.seconds||a.title.localeCompare(b.title)).slice(0,10);
}
if(typeof module!=="undefined")module.exports={localDay,dayOffset,recordActivity,activitySummary,topStories};
