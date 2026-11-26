function trackingScripts(scripts){return scripts.filter(s=>typeof s.id==="string"&&s.id.startsWith("site-")&&Array.isArray(s.js)&&s.js.includes("content.js")&&Array.isArray(s.matches));}

function permissionRows(scripts,origins){
 const registered=trackingScripts(scripts), granted=new Set(origins);
 const patterns=new Set([...registered.flatMap(s=>s.matches),...origins]);
 return [...patterns].sort().map(pattern=>({pattern,granted:granted.has(pattern),ids:registered.filter(s=>s.matches.includes(pattern)).map(s=>s.id),release:pattern==="https://api.mangadex.org/*"}));
}
if(typeof module!=='undefined')module.exports={trackingScripts,permissionRows};
