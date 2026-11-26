const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs/promises"),os=require("node:os"),path=require("node:path"),http=require("node:http");
const {chromium}=require("playwright");
test("Chromium extension loads, picks elements and imports a reading library",{timeout:120000},async()=>{
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),"inktrail-browser-"));
 const extension=path.join(temp,"extension");
 const server=http.createServer((req,res)=>{res.writeHead(200,{"Content-Type":"text/html"});res.end('<!doctype html><title>Fixture</title><h1 id="series" style="margin-top:100px">Fixture Moon</h1><p id="chapter">Chapter 12.5</p><div style="height:3000px"></div>')});
 let context;
 try{
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  const origin="http://127.0.0.1:"+server.address().port,url=origin+"/read/fixture";
  await fs.cp(path.join(__dirname,"../extension"),extension,{recursive:true});
  const manifestPath=path.join(extension,"manifest.json"),manifest=JSON.parse(await fs.readFile(manifestPath,"utf8"));
  // Test-only permission for the local fixture; the shipping manifest is unchanged.
  manifest.host_permissions=["http://127.0.0.1/*"];
  await fs.writeFile(manifestPath,JSON.stringify(manifest));
  context=await chromium.launchPersistentContext(path.join(temp,"profile"),{channel:"chromium",headless:true,args:["--disable-extensions-except="+extension,"--load-extension="+extension]});
  const worker=context.serviceWorkers()[0]||await context.waitForEvent("serviceworker",{timeout:30000});
  const id=new URL(worker.url()).host;
  const page=await context.newPage();await page.goto(url);
  const tabId=await worker.evaluate(async url=>{const tabs=await chrome.tabs.query({});return tabs.find(t=>t.url===url).id},url);
  await worker.evaluate(tabId=>chrome.scripting.executeScript({target:{tabId},files:["picker.js"]}),tabId);
  await page.locator("#series").click();
  await page.locator("#chapter").click();
  await page.getByText("Draft saved. Reopen InkTrail, test and save the rule.").waitFor();
  const draft=await worker.evaluate(async id=>(await chrome.storage.session.get("picker:"+id))["picker:"+id],tabId);
  assert.equal(draft.rule.titleSelector,"#series");assert.equal(draft.rule.chapterSelector,"#chapter");assert.equal(draft.rule.origin,origin);
  const library=await context.newPage();await library.goto("chrome-extension://"+id+"/library.html");
  await library.getByText("Your library is empty.",{exact:false}).waitFor();
  const key=origin+"|fixture moon";
  const backup={version:1,library:{[key]:{key,title:"Fixture Moon",origin,lastChapter:"12.5",updatedAt:1,chapters:{"12.5":{chapter:"12.5",url,progress:45,completed:false,updatedAt:1}}}}};
  library.on("dialog",d=>d.accept());
  await library.locator("#file").setInputFiles({name:"library.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(backup))});
  await library.getByRole("heading",{name:"Fixture Moon",exact:true}).waitFor();
  await library.getByText("Chapter history",{exact:true}).click();
  await library.getByRole("button",{name:"Mark read",exact:true}).click();
  await library.getByRole("button",{name:"Mark unread",exact:true}).waitFor();
  const stored=await worker.evaluate(async key=>(await chrome.storage.local.get("library")).library[key],key);
  assert.equal(stored.chapters["12.5"].completed,true);
 }finally{if(context)await context.close();await new Promise(resolve=>server.close(resolve));await fs.rm(temp,{recursive:true,force:true})}
});
