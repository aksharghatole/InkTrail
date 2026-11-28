const test=require("node:test"),assert=require("node:assert/strict");
const {historyOrigin,historyCandidates,importHistory}=require("../extension/history-core.js");
const origin="https://manga.example.org",time=Date.now()-1000;
const row=(chapter,overrides={})=>({url:origin+"/manga/moon/chapter-"+chapter,title:"Moon Chapter "+chapter,lastVisitTime:time,...overrides});
test("only exact requested origin is scanned",()=>assert.equal(historyCandidates([row(1),row(2,{url:"https://other.example.org/manga/moon/chapter-2"})],origin).length,1));
test("reject series list and ambiguous query routes",()=>assert.equal(historyCandidates([row(1,{url:origin+"/manga/moon"}),row(2,{url:origin+"/manga/moon/chapter-2?token=secret"})],origin).length,0));
test("deduplicate repeated chapter visits",()=>{const c=historyCandidates([row(1),row(1,{lastVisitTime:time+500})],origin);assert.equal(c.length,1);assert.equal(c[0].visitedAt,time+500)});
test("import is visited only, not completed",()=>{const r=importHistory({},historyCandidates([row(2)],origin));const s=Object.values(r.library)[0];assert.equal(r.added,1);assert.equal(s.chapters["2"].completed,false);assert.equal(s.chapters["2"].progress,0)});
test("existing progress preserved",()=>{const c=historyCandidates([row(2)],origin),a=importHistory({},c),s=Object.values(a.library)[0];s.chapters["2"].progress=90;s.chapters["2"].completed=true;const b=importHistory(a.library,c);assert.equal(b.skipped,1);assert.equal(Object.values(b.library)[0].chapters["2"].progress,90)});
test("older visits cannot replace current resume chapter",()=>{const a=importHistory({},historyCandidates([row(3,{lastVisitTime:time+500})],origin));const b=importHistory(a.library,historyCandidates([row(2)],origin));assert.equal(Object.values(b.library)[0].lastChapter,"3")});
test("invalid URLs and origin rejected",()=>{assert.throws(()=>historyOrigin(origin+"/read"));assert.throws(()=>importHistory({},[{title:"Moon",chapter:"1",origin,url:"javascript:alert(1)",visitedAt:time}]))});

test("malformed history entries and future visits are ignored",()=>{assert.deepEqual(historyCandidates(null,origin),[]);const c=historyCandidates([null,{},row(1,{lastVisitTime:Date.now()+120000}),row(2)],origin);assert.equal(c.length,1);assert.equal(c[0].chapter,"2")});

test("history recognizes the same localized routes as live detection",()=>{
 const rows=["cap%C3%ADtulo","capitolo","epis%C3%B3dio","episodio","%C3%A9pisode"].map((segment,i)=>row(i+1,{url:origin+"/manga/moon/"+segment+"-"+(i+1),title:"Moon Chapter "+(i+1)}));
 const candidates=historyCandidates([...rows,{...rows[0],url:rows[0].url+"?token=secret"}],origin);
 assert.equal(candidates.length,5);
 assert.equal(importHistory({},candidates).added,5);
});
