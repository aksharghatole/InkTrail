const backupLib=typeof module!=="undefined"?require("./core.js"):null;
const backupRules=typeof module!=="undefined"?require("./rules-core.js"):null;
const backupRelease=typeof module!=="undefined"?require("./release-core.js"):null;
const backupAnalytics=typeof module!=="undefined"?require("./analytics-core.js"):null;
function portableBackup(state,now=Date.now()){
 const exportSubscriptions=backupRelease?.exportFollows||exportFollows;
 return {format:"inktrail-full",version:1,exportedAt:new Date(now).toISOString(),library:state.library||{},rules:Object.values(state.siteRules||{}),subscriptions:exportSubscriptions(state.follows||{}).subscriptions,activity:state.readingActivity||{},preferences:{readingGoal:state.readingGoal||20,releaseNotifications:{enabled:state.releaseNotifications?.enabled===true,showTitles:state.releaseNotifications?.showTitles===true}}};
}
function validActivity(input,now=Date.now()){
 if(!input||typeof input!=="object"||Array.isArray(input)||Object.keys(input).length>731)throw Error("Invalid activity history");
 const day=backupAnalytics?.localDay||localDay,offset=backupAnalytics?.dayOffset||dayOffset;
 const cutoff=offset(day(now),-729),last=offset(day(now),1),out={};
 for(const [date,entry] of Object.entries(input)){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+"T12:00:00Z"))||new Date(date+"T12:00:00Z").toISOString().slice(0,10)!==date)throw Error("Invalid activity date");
  if(!entry||!Number.isFinite(entry.seconds)||entry.seconds<0||entry.seconds>86400||!entry.stories||typeof entry.stories!=="object"||Array.isArray(entry.stories)||Object.keys(entry.stories).length>200)throw Error("Invalid activity day");
  const stories={};
  for(const [key,seconds] of Object.entries(entry.stories)){
   if(!/^https?:\/\/[^|]+\|.+$/u.test(key)||key.length>2048||!Number.isFinite(seconds)||seconds<0||seconds>86400)throw Error("Invalid activity story");
   stories[key]=seconds;
  }
  if(date>=cutoff&&date<=last)out[date]={seconds:entry.seconds,stories};
 }
 return out;
}
function validatePortable(data,now=Date.now()){
 if(!data||data.format!=="inktrail-full"||data.version!==1)throw Error("Unsupported full backup format");
 const validateLibrary=backupLib?.validateBackup||validateBackup,validateRules=backupRules?.validateRulesBackup||validateRulesBackup,validateSubscriptions=backupRelease?.validateFollowsBackup||validateFollowsBackup;
 const p=data.preferences;
 if(!p||!Number.isInteger(p.readingGoal)||p.readingGoal<1||p.readingGoal>1440||typeof p.releaseNotifications?.enabled!=="boolean"||typeof p.releaseNotifications?.showTitles!=="boolean")throw Error("Invalid backup preferences");
 return {library:validateLibrary({version:1,library:data.library}),siteRules:validateRules({version:1,rules:data.rules}),follows:validateSubscriptions({version:1,subscriptions:data.subscriptions}),readingActivity:validActivity(data.activity,now),readingGoal:p.readingGoal,releaseNotifications:{enabled:false,showTitles:p.releaseNotifications.showTitles}};
}
function mergePortable(current,incoming,now=Date.now()){
 const combine=backupLib?.combineLibraries||combineLibraries,mergeSubscriptions=backupRelease?.mergeFollows||mergeFollows;
 const siteRules={...incoming.siteRules,...current.siteRules};
 if(Object.keys(siteRules).length>200)throw Error("Merged rules exceed 200 website limit");
 const readingActivity={...incoming.readingActivity};
 // Daily aggregates overlap across backups; prefer the larger recorded day, never add.
 for(const [day,entry] of Object.entries(current.readingActivity||{})){
  if(!readingActivity[day]||entry.seconds>=readingActivity[day].seconds)readingActivity[day]=entry;
 }
 const local=backupAnalytics?.localDay||localDay,offset=backupAnalytics?.dayOffset||dayOffset;
 const cutoff=offset(local(now),-729),last=offset(local(now),1);
 for(const date of Object.keys(readingActivity))if(date<cutoff||date>last)delete readingActivity[date];
 return {library:combine(current.library||{},incoming.library),siteRules,follows:mergeSubscriptions(current.follows||{},incoming.follows),readingActivity,readingGoal:current.readingGoal??incoming.readingGoal,releaseNotifications:current.releaseNotifications??incoming.releaseNotifications};
}
function backupCounts(state){
 return {series:Object.keys(state.library||{}).length,chapters:Object.values(state.library||{}).reduce((n,s)=>n+Object.keys(s.chapters||{}).length,0),rules:Object.keys(state.siteRules||{}).length,follows:Object.keys(state.follows||{}).length,days:Object.keys(state.readingActivity||{}).length};
}
if(typeof module!=="undefined")module.exports={portableBackup,validActivity,validatePortable,mergePortable,backupCounts};
