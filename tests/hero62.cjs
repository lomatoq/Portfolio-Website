const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});try{
 const p=await b.newPage({viewport:{width:1440,height:900}});await p.goto(process.env.FLOW59_URL||'http://127.0.0.1:4192/');await p.waitForTimeout(8500);
 const dir='../mobile61-qa/flow62';fs.mkdirSync(dir,{recursive:true});
 await p.screenshot({path:dir+'/after-hero-1440.png'});
 const r=await p.locator('.hero-tagline').boundingBox();
 // A white probe below the real text distinguishes actual compositing from
 // merely setting mix-blend-mode inside an isolated stacking context.
 await p.evaluate(r=>{const e=document.createElement('div');e.id='blend-probe';e.style.cssText=`position:absolute;left:${r.x}px;top:${r.y-8}px;width:${r.width}px;height:${r.height+16}px;background:white`;document.querySelector('.mx-trail').append(e)},r);
 await p.screenshot({path:dir+'/inverse-on.png',clip:{x:Math.floor(r.x),y:Math.floor(r.y),width:Math.ceil(r.width),height:Math.ceil(r.height)}});
 await p.locator('.hero-tagline').evaluate(e=>e.style.mixBlendMode='normal');
 await p.screenshot({path:dir+'/inverse-off.png',clip:{x:Math.floor(r.x),y:Math.floor(r.y),width:Math.ceil(r.width),height:Math.ceil(r.height)}});
 await p.evaluate(()=>{document.querySelector('#blend-probe').remove();document.querySelector('.hero-tagline').style.mixBlendMode='';});
 // Real mouse input still creates the original trail and light ribbon.
 for(let i=0;i<28;i++)await p.mouse.move(r.x+r.width*(i/28),r.y+r.height/2,{steps:2});
 assert(await p.locator('.mx-trail-frame').evaluateAll(es=>es.some(e=>+e.style.opacity>.05)),'pointer trail missing');
 assert.equal(await p.locator('.mx-fluid').evaluate(e=>e.parentElement.className),'intro');
 await p.screenshot({path:dir+'/pointer-inversion.png'});
 const first=await p.evaluate(()=>NocturneScroll.checkpoints().find(q=>q.id==='vice'));
 await p.evaluate(()=>NocturneScroll.to(NocturneScroll.checkpoints().find(q=>q.id==='projects').y,{instant:true}));await p.waitForTimeout(700);
 const seed=await p.locator('.orbit-icon').first().boundingBox();await p.mouse.move(seed.x+seed.width/2,seed.y+seed.height/2);await p.waitForTimeout(250);
 assert(await p.evaluate(()=>NocturneScroll.diagnostics().trace.some(e=>e.source==='hover')),'hover did not start seed flight');
 await p.waitForFunction(()=>!NocturneScroll.active());assert(Math.abs(await p.evaluate(()=>scrollY)-first.y)<2);
 console.log('Text compositing probes saved; real pointer trail, ribbon and hover flight passed');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
