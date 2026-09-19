// Desktop WebKit compositor experiment, not a physical iPhone benchmark.
const {webkit}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
const url=process.env.FLOW59_URL||'http://127.0.0.1:4192/';
(async()=>{const b=await webkit.launch({headless:true}),results=[];
try{for(const variant of ['baseline','current']){
 const p=await b.newPage({viewport:{width:393,height:852},deviceScaleFactor:3,isMobile:true,hasTouch:true});
 if(variant==='baseline'){assert(process.env.BASELINE_HTML);await p.route(url,r=>r.fulfill({contentType:'text/html',body:fs.readFileSync(process.env.BASELINE_HTML,'utf8')}));}
 await p.goto(url,{waitUntil:'domcontentloaded'});
 await p.waitForFunction(()=>window.Nocturne&&!document.documentElement.classList.contains('booting')&&document.body.classList.contains('webfont-ready'));
 if(variant==='current')await p.waitForFunction(()=>document.querySelectorAll('.glow-cached').length===10);
 await p.waitForTimeout(3000);
 const data=await p.evaluate(async()=>{let a=[],last=performance.now();await new Promise(resolve=>{function step(t){a.push(t-last);last=t;if(a.length<35)requestAnimationFrame(step);else resolve()}requestAnimationFrame(step)});a=a.slice(5).sort((a,b)=>a-b);const d=Nocturne.diagnostics();return {medianMs:a[15],p95Ms:a[28],fontSize:d.nameFontSize,renderSize:d.renderSize,quality:d.quality,cached:document.querySelectorAll('.glow-cached').length,errors:d.errors};});
 assert.equal(data.quality,'full');assert.deepEqual(data.errors,[]);results.push({variant,...data});console.log(JSON.stringify(results.at(-1)));await p.close();
}}finally{await b.close();}
assert(Math.abs(results[0].fontSize-results[1].fontSize)<.01,'name size changed');
if(process.env.RESULT_JSON)fs.writeFileSync(process.env.RESULT_JSON,JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
