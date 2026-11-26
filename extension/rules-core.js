function validateRule(input){
 let u;try{u=new URL(input.origin)}catch{throw Error("Invalid website origin")}
 if(!["http:","https:"].includes(u.protocol)||u.origin!==input.origin||u.username||u.password)throw Error("Invalid website origin");
 const path=typeof input.path==="string"?input.path.trim():"";
 if(!path.startsWith("/")||path.length>300||/[?#\\\u0000-\u0020]/.test(path))throw Error("Enter a URL path prefix, such as /read/");
 const selector=k=>{
  const s=typeof input[k]==="string"?input[k].trim():"";
  if(!s||s.length>240||/[\u0000-\u001f]/.test(s))throw Error("Enter a CSS selector (1–240 characters)");
  return s;
 };
 return {origin:u.origin,path,titleSelector:selector("titleSelector"),chapterSelector:selector("chapterSelector")};
}

function ruleApplies(rule,url){
 try{const u=new URL(url);return u.origin===rule.origin&&u.pathname.startsWith(rule.path)}catch{return false}
}

function parseRuleReading(rule,url,title,chapter){
 if(!ruleApplies(rule,url))return null;
 const u=new URL(url);
 // Unknown query-based routes cannot be represented safely by the current URL model.
 if(u.search&&!(u.hostname==="webtoons.com"||u.hostname.endsWith(".webtoons.com")))return null;
 const name=String(title||"").normalize("NFKC").replace(/\s+/g," ").trim();
 const text=String(chapter||"").normalize("NFKC").trim();
 const match=text.match(/^(?:(?:chapter|chapitre|cap[ií]tulo|kapitel|chap|ch|episode|ep)[\s._:#-]*|第\s*)?(\d+(?:[.,]\d+)?)(?:\s*[話话章回])?$/i);
 if(!name||name.length>180||!(/[\p{L}\p{N}]/u.test(name))||!match)return null;
 const number=String(Number(match[1].replace(",",".")));
 if(!/^\d+(?:\.\d+)?$/.test(number))return null;
 let safe=u.origin+u.pathname;
 if(u.search){
  if(!/\/viewer\/?$/.test(u.pathname))return null;
  const t=u.searchParams.get("title_no"),e=u.searchParams.get("episode_no");
  if(!/^\d+$/.test(t||"")||!/^\d+$/.test(e||""))return null;
  safe+="?title_no="+t+"&episode_no="+e;
 }
 return {title:name,chapter:number,origin:u.origin,url:safe};
}

function validateRulesBackup(data){
 if(!data||data.version!==1||!Array.isArray(data.rules)||data.rules.length>200)throw Error("Invalid rules backup");
 const result={};
 for(const raw of data.rules){const rule=validateRule(raw);if(Object.hasOwn(result,rule.origin))throw Error("Duplicate website rule");result[rule.origin]=rule;}
 return result;
}
if(typeof module!=='undefined')module.exports={validateRule,ruleApplies,parseRuleReading,validateRulesBackup};
