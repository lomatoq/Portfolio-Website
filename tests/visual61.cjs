const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path');
const baseline=process.env.BASELINE_HTML;
if(!baseline)throw Error('Set BASELINE_HTML to the original index.html');
const output=process.env.RESULTS_DIR||path.resolve('flow61-visual');fs.mkdirSync(output,{recursive:true});
const url=process.env.FLOW59_URL||'http://127.0.0.1:4192/';
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});
for(const width of (process.env.WIDTHS||'390,844,1440').split(',').map(Number))for(const variant of ['baseline','current']){
const p=await b.newPage({viewport:{width,height:width===844?390:844},isMobile:width!==1440,hasTouch:width!==1440,deviceScaleFactor:1});
await p.route('https://**/*',r=>r.abort());
if(variant==='baseline')await p.route(url,r=>r.fulfill({contentType:'text/html',body:fs.readFileSync(baseline,'utf8')}));
await p.addInitScript(()=>{
 let seed=51;Math.random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
 window.qaTime=0;performance.now=()=>qaTime;let id=0;const queue=new Map();
 window.requestAnimationFrame=fn=>{queue.set(++id,fn);return id};window.cancelAnimationFrame=id=>queue.delete(id);
 window.qaStep=n=>{for(let i=0;i<n;i++){qaTime+=1000/60;const jobs=[...queue.values()];queue.clear();for(const f of jobs)f(qaTime)}};
});
await p.goto(url);await p.waitForTimeout(600);
await p.evaluate(()=>qaStep(360));await p.waitForTimeout(1800);
await p.evaluate(()=>qaStep(360));await p.waitForTimeout(1600);
await p.waitForFunction(()=>!document.documentElement.classList.contains('booting'));
for(const id of ['playgendary','vice','vice:0:0','elemental']){
 await p.evaluate(id=>{NocturneScroll.to(NocturneScroll.checkpoints().find(p=>p.id===id).y,{instant:true});qaStep(180)},id);
 // IntersectionObserver delivery is asynchronous: settle the resulting nav
 // scrim spring before comparing, rather than taking one stale observer frame.
 await p.waitForTimeout(50);await p.evaluate(()=>qaStep(180));
 await p.waitForTimeout(50);await p.evaluate(()=>qaStep(180));
 await p.waitForTimeout(50);await p.evaluate(()=>{qaStep(1);document.getAnimations().forEach(a=>{a.pause();a.currentTime=1000});document.querySelectorAll('video').forEach(v=>{v.dataset.userPaused='true';v.pause();if(Number.isFinite(v.duration)&&v.duration>0)v.currentTime=Math.min(.5,v.duration/2)})});
 await p.waitForTimeout(150);
 const position=await p.evaluate(id=>({actual:scrollY,expected:NocturneScroll.checkpoints().find(p=>p.id===id).y}),id);
 if(Math.abs(position.actual-position.expected)>3)throw Error(`${width}/${id}: scroll reset during capture ${JSON.stringify(position)}`);
 await p.screenshot({path:path.join(output,`${width}-${id.replaceAll(':','_')}-${variant}.png`)});
}
console.log(width,variant,await p.evaluate(()=>({errors:Nocturne.diagnostics().errors,quality:Nocturne.diagnostics().quality,size:Nocturne.diagnostics().renderSize})));
await p.close();}await b.close()})();
