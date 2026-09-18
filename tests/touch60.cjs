// Real browser touch input (CDP), including native scrolling and fling inertia.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const url=process.env.FLOW59_URL||'http://127.0.0.1:4191/';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{for(const viewport of [{width:390,height:844},{width:844,height:390}]){
  const context=await browser.newContext({viewport,isMobile:true,hasTouch:true,deviceScaleFactor:2});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const cdp=await context.newCDPSession(page);
  await page.goto(url);await page.waitForFunction(()=>window.NocturneScroll&&!document.documentElement.classList.contains('booting'));
  async function swipe(x,y,dx,dy){
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
   for(let i=1;i<=12;i++){
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/12,y:y+dy*i/12}]});
    await page.waitForTimeout(20);
   }
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }
  async function vertical(label,x=viewport.width*.5,y=viewport.height*.73){
   const before=await page.evaluate(()=>scrollY);
   await page.evaluate(()=>{window.swipeSamples=[];window.swipeSample=()=>swipeSamples.push(scrollY);addEventListener('scroll',swipeSample,{passive:true});});
   await swipe(x,y,0,-Math.min(250,viewport.height*.43));await page.waitForTimeout(800);
   const state=await page.evaluate(()=>{removeEventListener('scroll',swipeSample);return{y:scrollY,samples:swipeSamples,d:NocturneScroll.diagnostics()}});
   assert(state.y>before+70,`${label}: did not scroll ${before} -> ${state.y}`);
   assert(state.samples.every((n,i,a)=>!i||n>=a[i-1]-2),`${label}: bounced backwards`);
   assert.equal(state.d.locked,false);assert.equal(state.d.nativeTouch,true);
   assert(!state.d.trace.some(t=>t.type==='input'&&t.source.startsWith('touch')),'Touch routed to wheel spring');
   console.log(viewport.width,label,Math.round(state.y-before),'px; native, monotonic');
  }
  await vertical('hero');
  for(let i=0;i<2;i++)await vertical('repeated swipe');
  await page.evaluate(()=>NocturneScroll.to(NocturneScroll.checkpoints().find(p=>p.id==='vice').y,{instant:true}));await page.waitForTimeout(500);
  const canvas=await page.locator('#vectorCanvas').boundingBox();
  await vertical('over canvas',canvas.x+canvas.width*.5,Math.min(viewport.height-40,canvas.y+canvas.height*.7));
  await page.evaluate(()=>NocturneScroll.to(NocturneScroll.checkpoints().find(p=>p.id==='vice:0:0').y,{instant:true}));await page.waitForTimeout(400);
  await vertical('gallery vertical');
  await page.evaluate(()=>NocturneScroll.to(NocturneScroll.checkpoints().find(p=>p.id==='vice:0:0').y,{instant:true}));await page.waitForTimeout(400);
  const rail=await page.locator('#vice .rail-window').boundingBox();
  const startY=await page.evaluate(()=>scrollY);
  await swipe(viewport.width*.8,Math.max(100,Math.min(viewport.height-65,rail.y+rail.height-8)),-viewport.width*.65,0);
  await page.waitForTimeout(900);assert(await page.evaluate(()=>scrollY)>startY+40,'Horizontal gallery swipe failed');
  // Address-bar height changes must not schedule a delayed scroll-to checkpoint.
  const y=await page.evaluate(()=>scrollY);await page.setViewportSize({width:viewport.width,height:viewport.height-35});await page.waitForTimeout(400);
  assert(Math.abs(await page.evaluate(()=>scrollY)-y)<3,'Resize snapped native position');
  await page.setViewportSize(viewport);
  await page.evaluate(()=>NocturneMedia.open('polysphere'));await page.waitForTimeout(850);
  const background=await page.evaluate(()=>scrollY);
  await swipe(viewport.width*.4,viewport.height*.75,0,-Math.min(200,viewport.height*.35));await page.waitForTimeout(500);
  assert((await page.evaluate(()=>NocturneMedia.diagnostics().scrollTop))>50,'Popup touch did not scroll');
  assert.equal(await page.evaluate(()=>scrollY),background,'Popup moved background');
  await page.evaluate(()=>NocturneMedia.close());await page.waitForTimeout(550);
  await page.evaluate(()=>NocturneScroll.to(NocturneScroll.checkpoints().find(p=>p.id==='playgendary').y,{instant:true}));await page.waitForTimeout(500);
  const heading=await page.locator('#playgendary h3').boundingBox();await page.touchscreen.tap(heading.x+heading.width/2,heading.y+heading.height/2);
  await page.waitForFunction(()=>NocturneLab.caseProgress>.9999);await page.waitForTimeout(350);
  const caseBackground=await page.evaluate(()=>scrollY);
  const scroller=await page.locator('.mx-expanded .mx-inline-case').boundingBox();
  await swipe(scroller.x+scroller.width*.5,Math.min(viewport.height-45,scroller.y+scroller.height*.85),0,-Math.min(150,scroller.height*.55));await page.waitForTimeout(400);
  assert(await page.locator('.mx-expanded .mx-inline-case').evaluate(e=>e.scrollTop)>20,'Parent case did not scroll');
  assert.equal(await page.evaluate(()=>scrollY),caseBackground,'Parent case moved background');
  await page.evaluate(()=>NocturneLab.closeInline());await page.waitForTimeout(1500);
  await vertical('after closing parent case');
  assert.deepEqual(errors,[]);console.log(viewport.width,'viewport resize and popup native swipe passed');
  await context.close();
 }}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
