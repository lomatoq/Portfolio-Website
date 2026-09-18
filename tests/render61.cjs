const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 for(const mode of ['webgl2','webgl1','webgl1-no-vao','webkit']){
  const browser=await (mode==='webkit'?webkit:chromium).launch(mode==='webkit'?{headless:true}:{channel:'chrome',headless:true});
  try{
   const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   if(mode.startsWith('webgl1'))await page.addInitScript(mode=>{
    const get=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(kind,...rest){return kind==='webgl2'?null:get.call(this,kind,...rest)};
    if(mode==='webgl1-no-vao'){
     const getExtension=WebGLRenderingContext.prototype.getExtension;
     WebGLRenderingContext.prototype.getExtension=function(name){return name==='OES_vertex_array_object'?null:getExtension.call(this,name)};
    }
   },mode);
   await page.goto(process.env.FLOW59_URL||'http://127.0.0.1:4192/');
   await page.waitForFunction(()=>window.NocturneScroll&&!document.documentElement.classList.contains('booting'));
   for(const id of ['playgendary','vice','vice:0:0','elemental']){
    await page.evaluate(id=>NocturneScroll.to(NocturneScroll.checkpoints().find(p=>p.id===id).y,{instant:true}),id);await page.waitForTimeout(450);
   }
   await page.setViewportSize({width:844,height:390});await page.waitForTimeout(450);
   await page.evaluate(()=>NocturneMedia.open('polysphere'));await page.waitForTimeout(700);
   assert(await page.evaluate(()=>NocturneMedia.isOpen));await page.evaluate(()=>NocturneMedia.close());await page.waitForTimeout(600);
   const d=await page.evaluate(()=>Nocturne.diagnostics());
   assert.equal(d.mode,mode.startsWith('webgl1')?'webgl1':'webgl2');assert.equal(d.quality,'full');assert.deepEqual(d.errors,[]);assert.deepEqual(errors,[]);
   console.log(mode,'chapters, orientation, popup passed;',d.renderSize,d.samples,'samples');
  }finally{await browser.close()}
 }
})();
