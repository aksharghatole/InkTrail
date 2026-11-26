const test=require("node:test"),assert=require("node:assert/strict");const {trackingScripts,permissionRows}=require("../extension/privacy-core.js");
const script={id:"site-123",js:["core.js","content.js"],matches:["https://example.org/*"]};
test("only InkTrail reading registrations are included",()=>assert.deepEqual(trackingScripts([script,{...script,id:"unrelated"},{...script,js:["other.js"]}]),[script]));
test("registered and permission-only origins remain separate",()=>{const rows=permissionRows([script],["https://other.org/*"]);assert.equal(rows.length,2);assert.equal(rows[0].granted,false);assert.deepEqual(rows[0].ids,["site-123"]);assert.equal(rows[1].granted,true);assert.deepEqual(rows[1].ids,[])});
test("release API access is identified separately",()=>assert.equal(permissionRows([],["https://api.mangadex.org/*"])[0].release,true));
test("deduplicate matching grants",()=>assert.equal(permissionRows([script],["https://example.org/*"]).length,1));
