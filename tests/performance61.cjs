// Optional BASELINE_HTML compares the same workload with a saved release.
// CPU timings are local browser measurements, not an iPhone FPS claim.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const url=process.env.FLOW59_URL||'http://127.0.0.1:4192/';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const results=[];
 try{for(const viewport of [{width:390,height:844},{width:844,height:390},{width:1440,height:900}]){
  for(const variant of process.env.BASELINE_HTML?['baseline','current']:['current']){
   const context=await browser.newContext({viewport,isMobile:viewport.width!==1440,hasTouch:viewport.width!==1440,deviceScaleFactor:2});
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('https://**/*',r=>r.abort());
   if(variant==='baseline')await page.route(url,r=>r.fulfill({contentType:'text/html',body:fs.readFileSync(process.env.BASELINE_HTML,'utf8')}));
   await page.addInitScript(()=>{
    window.glCalls={};
    for(const proto of [WebGLRenderingContext.prototype,WebGL2RenderingContext.prototype]){
     for(const method of ['vertexAttribPointer','texImage2D','getParameter']){
      const original=proto[method];proto[method]=function(...args){glCalls[method]=(glCalls[method]||0)+1;return original.apply(this,args)};
     }
    }
   });
   await page.goto(url);await page.waitForFunction(()=>window.NocturneScroll&&!document.documentElement.classList.contains('booting'));
   await page.evaluate(()=>NocturneScroll.to(NocturneScroll.checkpoints().find(p=>p.id==='playgendary').y,{instant:true}));
   await page.waitForTimeout(1800);
   const metrics=await page.evaluate(async()=>{
    const samples=[],fx=[];let total=0;
    const originals=[];
    for(const name of ['NocturneLab','NocturneR14','LiquidPortfolio','NocturneMotion','Nocturne','NocturneFX']){
     for(const method of ['tick','read']){const obj=window[name],original=obj?.[method];if(!original)continue;
      originals.push(()=>obj[method]=original);
      obj[method]=function(...args){const start=performance.now();try{return original.apply(this,args)}finally{const elapsed=performance.now()-start;total+=elapsed;if(name==='NocturneFX'&&method==='tick')fx.push(elapsed)}};
     }
    }
    glCalls={};await new Promise(resolve=>{let frames=0;const sample=()=>{samples.push(total);total=0;if(++frames===120)resolve();else requestAnimationFrame(sample)};requestAnimationFrame(sample)});
    originals.forEach(f=>f());
    const stats=a=>{a.sort((a,b)=>a-b);return{median:a[a.length>>1],p95:a[Math.floor(a.length*.95)],mean:a.reduce((a,b)=>a+b,0)/a.length}};
    return{cpu:stats(samples.slice(1)),fx:stats(fx),calls:{...glCalls},renderer:Nocturne.diagnostics()};
   });
   assert.equal(metrics.renderer.quality,'full');assert.equal(metrics.renderer.samples,2);assert.deepEqual(metrics.renderer.errors,[]);
   const resize=await page.evaluate(()=>{glCalls={};for(let i=0;i<12;i++)dispatchEvent(new Event('resize'));return{calls:{...glCalls},size:Nocturne.diagnostics().renderSize}});
   if(variant==='current'){
    assert.equal(resize.calls.texImage2D||0,0,'Unchanged resize reallocated render targets');
    assert.equal(resize.calls.getParameter||0,0,'Resize synchronously queried GPU limits');
    assert.equal(metrics.calls.vertexAttribPointer||0,0,'Static vertex layouts rebuilt per frame');
   }
   await page.setViewportSize({width:viewport.height,height:viewport.width});await page.waitForTimeout(350);
   assert.deepEqual(await page.evaluate(()=>Nocturne.diagnostics().errors),[]);
   assert.deepEqual(errors,[]);
   results.push({viewport,variant,cpu:metrics.cpu,fx:metrics.fx,calls:metrics.calls,resize,renderSize:metrics.renderer.renderSize});
   console.log(JSON.stringify(results.at(-1)));await context.close();
  }
 }}finally{await browser.close()}
 if(process.env.RESULT_JSON)fs.writeFileSync(process.env.RESULT_JSON,JSON.stringify(results,null,2));
})();
