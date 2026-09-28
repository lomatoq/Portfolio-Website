// Checks the mobile WebGL glass projection against its scrolling DOM anchor.
// Desktop WebKit is a geometry regression test, not an iPhone inertia benchmark.
const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');

const url=process.env.FLOW59_URL||'http://127.0.0.1:4192/';
(async()=>{
  for(const [name,browserType] of Object.entries({chromium,webkit})){
    const browser=await browserType.launch(name==='chromium'?{channel:'chrome',headless:true}:{headless:true});
    try{
      const page=await browser.newPage({viewport:{width:393,height:852},deviceScaleFactor:3,isMobile:true,hasTouch:true});
      const errors=[];page.on('pageerror',error=>errors.push(error.message));
      await page.goto(url,{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>window.Nocturne?.diagnostics().mode==='webgl2'&&!document.documentElement.classList.contains('booting'));
      const measurements=[];
      for(const id of ['freelance','playgendary','spribe']){
        await page.evaluate(id=>{
          const point=NocturneScroll.checkpoints().find(p=>p.id===id);
          NocturneScroll.to(point.y,{instant:true});
        },id);
        await page.evaluate(async()=>{
          await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
        });
        measurements.push(await page.evaluate(id=>{
          const row=document.getElementById(id),bubble=row.querySelector('.career-bubble');
          const surface=Nocturne.surfaces.get(bubble),actual=row.querySelector('summary').getBoundingClientRect(),projected=surface?.rect;
          const errors=projected?Object.fromEntries(['left','top','right','bottom','width','height'].map(k=>[k,projected[k]-actual[k]])):{};
          const mismatch=projected?Math.max(...Object.values(errors).map(Math.abs)):Infinity;
          return {id,mismatch,errors,visible:projected?.bottom>0&&projected?.top<innerHeight,scrollY,glass:Nocturne.diagnostics().visibleGlass};
        },id));
      }
      console.log(name,JSON.stringify(measurements));
      assert.deepEqual(errors,[],name+' page errors');
      for(const item of measurements){
        assert(item.visible,name+' '+item.id+' surface not visible');
        assert(item.mismatch<.25,name+' '+item.id+' glass offset '+item.mismatch+'px');
        assert(item.glass>0,name+' '+item.id+' WebGL glass missing');
      }
    }finally{await browser.close();}
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
