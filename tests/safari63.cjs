// Composition and alpha regressions. Desktop WebKit is not an iPhone FPS test.
const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const url=process.env.FLOW59_URL||'http://127.0.0.1:4192/';
(async()=>{for(const [name,type] of Object.entries({chromium,webkit})){
 const browser=await type.launch(name==='chromium'?{channel:'chrome',headless:true}:{headless:true});
 try{
  const p=await browser.newPage({viewport:{width:393,height:852},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>localStorage.setItem('nocturne-blue','on'));
  await p.goto(url);await p.waitForFunction(()=>window.NocturneScroll&&!document.documentElement.classList.contains('booting'));
  await p.evaluate(()=>NocturneScroll.to(NocturneScroll.checkpoints().find(q=>q.id==='playgendary').y,{instant:true}));
  await p.waitForTimeout(650);
  const material=await p.evaluate(()=>{
   const bubble=document.querySelector('#playgendary .career-bubble'),grain=document.querySelector('.world-host .film-grain');
   const r=grain.getBoundingClientRect();
   return {background:getComputedStyle(bubble).backgroundImage,grain:[r.width,r.height],renderer:Nocturne.diagnostics()};
  });
  assert.equal(material.renderer.glassComposition,'attached-dom');assert.equal(material.renderer.visibleGlass,0);
  assert.match(material.background,/gradient/);assert(material.grain[0]<=393&&material.grain[1]<=852);
  if(process.env.QA_DIR)await p.screenshot({path:process.env.QA_DIR+'/'+name+'-career-after.png'});
  await p.evaluate(()=>{const q=NocturneScroll.checkpoints().find(q=>q.id==='companion');NocturneScroll.to(q.trigger-10,{instant:true});NocturneScroll.enter(q.id);});
  await p.waitForTimeout(650);
  if(process.env.QA_DIR)await p.screenshot({path:process.env.QA_DIR+'/'+name+'-entry-after.png'});
  await p.waitForFunction(()=>!NocturneScroll.active(),null,{timeout:10000});
  // Force a half-progress draw of the existing optical shell and inspect its
  // actual framebuffer: gradient alpha, transparent interior, premultiplied RGB.
  const alpha=await p.evaluate(()=>{
   const canvas=[...document.querySelectorAll('canvas')].find(c=>{const g=c.getContext('webgl');return g&&g.getParameter(g.CURRENT_PROGRAM)&&g.getUniformLocation(g.getParameter(g.CURRENT_PROGRAM),'firstWave')!==null;});
   if(!canvas)return null;
   const gl=canvas.getContext('webgl'),program=gl.getParameter(gl.CURRENT_PROGRAM);
   gl.uniform1f(gl.getUniformLocation(program,'progress'),.5);gl.drawArrays(gl.TRIANGLES,0,6);
   const pixels=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
   let max=0,min=255,bad=0;const levels=new Set();
   for(let i=0;i<pixels.length;i+=4){const a=pixels[i+3];min=Math.min(min,a);max=Math.max(max,a);levels.add(a);if(Math.max(pixels[i],pixels[i+1],pixels[i+2])>a+1)bad++;}
   return {min,max,levels:levels.size,bad,premultiplied:gl.getContextAttributes().premultipliedAlpha};
  });
  assert(alpha&&alpha.premultiplied);assert.equal(alpha.bad,0);assert(alpha.min<alpha.max*.15&&alpha.max>0&&alpha.max<80&&alpha.levels>8,JSON.stringify(alpha));
  const start=await p.evaluate(()=>Nocturne.diagnostics().targetAllocations);
  // A burst of height-only resize notifications must not reallocate every time.
  await p.evaluate(()=>{
   window.__heightDescriptor=Object.getOwnPropertyDescriptor(window,'innerHeight');
   const h=innerHeight;for(let i=1;i<=25;i++){Object.defineProperty(window,'innerHeight',{configurable:true,value:h-i*2});dispatchEvent(new Event('resize'));}
  });
  await p.waitForFunction(start=>Nocturne.diagnostics().targetAllocations>start,start,{timeout:5000});
  const end=await p.evaluate(()=>Nocturne.diagnostics());
  assert.equal(end.targetAllocations-start,1);assert.equal(end.quality,'full');assert.deepEqual(end.errors,[]);assert.deepEqual(errors,[]);
  await p.evaluate(()=>{Object.defineProperty(window,'innerHeight',window.__heightDescriptor);delete window.__heightDescriptor;dispatchEvent(new Event('resize'));});
  console.log(name,JSON.stringify({material,alpha,resizeAllocations:end.targetAllocations-start}));
 }finally{await browser.close();}
}})().catch(e=>{console.error(e);process.exitCode=1;});
