// Whole-world GPU timer queries + frame cadence; neither is a phone FPS claim.
const {chromium}=require('playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const url=process.env.FLOW59_URL||'http://127.0.0.1:4192/';
const stats=a=>{a.sort((x,y)=>x-y);return {n:a.length,median:a[a.length>>1],p95:a[Math.floor(a.length*.95)],mean:a.reduce((x,y)=>x+y,0)/a.length}};
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});const results=[];
try{for(const width of (process.env.WIDTHS||'390,1440').split(',').map(Number))for(const variant of (process.env.VARIANTS||'baseline,current').split(',')){
 const p=await b.newPage({viewport:{width,height:844},isMobile:width===390,hasTouch:width===390,deviceScaleFactor:2});
 await p.route('https://**/*',r=>r.abort());
 if(variant==='baseline')await p.route(url,r=>r.fulfill({contentType:'text/html',body:fs.readFileSync(process.env.BASELINE_HTML,'utf8')}));
 await p.goto(url);await p.waitForFunction(()=>window.NocturneScroll&&!document.documentElement.classList.contains('booting'));
 await p.evaluate(()=>{Nocturne.forceTime=16;NocturneScroll.to(0,{instant:true});});await p.waitForTimeout(Number(process.env.WARMUP_MS)||1600);
 const data=await p.evaluate(async sampleCount=>{
  const gl=document.querySelector('#worldCanvas').getContext('webgl2'),ext=gl?.getExtension('EXT_disjoint_timer_query_webgl2');
  const pending=[],gpu=[],cpu=[],frames=[],original=Nocturne.tick;let last=0,disjoint=false;
  Nocturne.tick=function(...args){
   const start=performance.now();if(last)frames.push(args[0]-last);last=args[0];
   if(ext){
    disjoint ||= !!gl.getParameter(ext.GPU_DISJOINT_EXT);
    while(pending.length&&gl.getQueryParameter(pending[0],gl.QUERY_RESULT_AVAILABLE)){
     const q=pending.shift();gpu.push(gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6);gl.deleteQuery(q);
    }
   }
   const q=ext&&gl.createQuery();if(q)gl.beginQuery(ext.TIME_ELAPSED_EXT,q);
   original.apply(this,args);if(q){gl.endQuery(ext.TIME_ELAPSED_EXT);pending.push(q);}cpu.push(performance.now()-start);
  };
  await new Promise(resolve=>{let n=0;const sample=()=>++n>=sampleCount?resolve():requestAnimationFrame(sample);requestAnimationFrame(sample)});
  Nocturne.tick=original;for(const q of pending)gl.deleteQuery(q);
  return {gpu:disjoint?[]:gpu,cpu,frames,renderer:Nocturne.diagnostics(),gpuTimer:!!ext,disjoint};
 },Number(process.env.SAMPLES)||180);
 assert.equal(data.renderer.quality,'full');assert.equal(data.renderer.mode,'webgl2');assert.deepEqual(data.renderer.errors,[]);
 const cdp=await p.context().newCDPSession(p),events=[];
 cdp.on('Tracing.dataCollected',e=>events.push(...e.value));
 await cdp.send('Tracing.start',{categories:'devtools.timeline',transferMode:'ReportEvents'});await p.waitForTimeout(2400);
 const complete=new Promise(r=>cdp.once('Tracing.tracingComplete',r));await cdp.send('Tracing.end');await complete;
 const sums={};for(const e of events)if(e.ph==='X'&&e.dur&&['FireAnimationFrame','UpdateLayoutTree','Layout','Paint'].includes(e.name)){const s=sums[e.name]||={count:0,ms:0};s.count++;s.ms+=e.dur/1000;}
 const frameCount=sums.FireAnimationFrame?.count||1;for(const s of Object.values(sums)){s.perFrame=s.ms/frameCount;s.countPerFrame=s.count/frameCount;}
 results.push({width,variant,gpuMs:stats(data.gpu.slice(10)),cpuMs:stats(data.cpu.slice(10)),frameMs:stats(data.frames.slice(10)),timeline:sums,gpuTimer:data.gpuTimer,disjoint:data.disjoint,size:data.renderer.renderSize,vertices:data.renderer.bladeVertices||168,instances:data.renderer.instances});
 console.log(JSON.stringify(results.at(-1)));await p.close();
}}finally{await b.close();}
if(process.env.RESULT_JSON)fs.writeFileSync(process.env.RESULT_JSON,JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
