const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const url=process.env.FLOW59_URL||'http://127.0.0.1:4192/';
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});try{
 for(const width of [1440,390,844]){
  const height=width===844?390:844,p=await b.newPage({viewport:{width,height},hasTouch:width!==1440,isMobile:width!==1440,deviceScaleFactor:1});
  const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(url);await p.waitForFunction(()=>window.NocturneScroll&&!document.documentElement.classList.contains('booting'));
  const points=await p.evaluate(()=>NocturneScroll.checkpoints()),chapters=points.filter(p=>p.kind==='chapter');
  for(const point of chapters){
   await p.evaluate(y=>NocturneScroll.to(y,{instant:true}),point.trigger-40);await p.mouse.wheel(0,80);
   await p.waitForFunction(id=>!NocturneScroll.active()&&LiquidPortfolio.presentationReady(NocturneScroll.checkpoints().find(q=>q.id===id)),point.id,{timeout:6000});
   const y=await p.evaluate(()=>scrollY);assert(Math.abs(y-point.y)<2,'entrance does not complete');
   // Next gesture is accepted immediately, without the old 360–950 ms gate.
   await p.mouse.wheel(0,110);await p.waitForTimeout(140);assert(await p.evaluate(()=>scrollY)>y+35,'post-entrance input swallowed');
  }
  console.log(width,'all chapter entrances complete; next input responds');
  const first=chapters[0];
  await p.evaluate(y=>NocturneScroll.to(y,{instant:true}),first.trigger-40);await p.mouse.wheel(0,80);await p.waitForTimeout(120);
  await p.mouse.wheel(0,-180);await p.waitForTimeout(250);const reversal=await p.evaluate(()=>NocturneScroll.diagnostics());
  const reverseInput=reversal.trace.filter(e=>e.type==='input'&&e.delta<0).at(-1);
  assert(reverseInput&&reversal.actual<reverseInput.y-100&&reversal.velocity<=0,'reversal blocked '+JSON.stringify(reversal));
  await p.evaluate(y=>NocturneScroll.to(y,{instant:true}),first.trigger-40);
  for(let i=0;i<5;i++){await p.mouse.wheel(0,height*1.1);await p.waitForTimeout(40);}await p.waitForTimeout(800);
  assert(await p.evaluate(()=>scrollY)>first.y+100,'fast scroll trapped at entrance');
  const gallery=points.filter(p=>p.chapter==='vice'&&p.kind==='gallery');
  await p.evaluate(y=>NocturneScroll.to(y,{instant:true}),gallery[0].y);await p.mouse.wheel(0,gallery.at(-1).y-gallery[0].y);await p.waitForTimeout(1000);
  assert(await p.evaluate(()=>scrollY)>gallery[1].y+10,'gallery gated every card');
  for(const q of points.filter(p=>p.kind==='gallery')){
   await p.evaluate(y=>NocturneScroll.to(y,{instant:true}),q.y);await p.waitForFunction(q=>LiquidPortfolio.presentationReady(q),q,{timeout:3500});
  }
  console.log(width,'reversal, fast bypass, free gallery, complete card poses passed');
  if(width!==1440){
   const cdp=await p.context().newCDPSession(p),x=width*.5,y=height*.7;
   await p.evaluate(y=>NocturneScroll.to(y,{instant:true}),first.trigger+20);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
   for(let i=1;i<=10;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-i*10}]});await p.waitForTimeout(30);}
   await p.waitForTimeout(250);assert.equal(await p.evaluate(()=>NocturneScroll.diagnostics().gate),null,'entrance captured finger before release');
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await p.waitForFunction(id=>!NocturneScroll.active()&&Math.abs(scrollY-NocturneScroll.checkpoints().find(q=>q.id===id).y)<2,first.id,{timeout:5000});
   console.log(width,'native entrance completes after finger and inertia release');
  }
  await p.evaluate(()=>NocturneScroll.to(NocturneScroll.checkpoints().find(q=>q.id==='playgendary').y,{instant:true}));await p.waitForTimeout(400);
  const hit=await p.locator('#playgendary h3').boundingBox();await p.mouse.click(hit.x+hit.width/2,hit.y+hit.height/2);await p.waitForFunction(()=>NocturneLab.caseProgress>.9999);await p.waitForTimeout(200);
  const parent=await p.locator('.mx-inline-case').evaluate(e=>({top:e.scrollTop,y:scrollY}));
  await p.locator('.mx-inline-case [data-media-open="polysphere"]').first().click();await p.waitForTimeout(700);
  // Playwright may scroll the opener into view before clicking in landscape.
  parent.top=await p.locator('.mx-inline-case').evaluate(e=>e.scrollTop);
  assert.equal(await p.locator('.mv-story-panel').count(),4);
  assert(await p.locator('.mv-back').textContent().then(t=>t.includes('Playgendary')));
  const overflow=await p.locator('.mv-shell').evaluate(e=>({x:e.scrollWidth-e.clientWidth,y:e.scrollHeight-e.clientHeight}));assert(overflow.x<=1&&overflow.y<=1,'shell overflows');
  fs.mkdirSync('../mobile61-qa/flow62',{recursive:true});await p.screenshot({path:`../mobile61-qa/flow62/after-popup-${width}.png`});
  await p.locator('.mv-details').click();await p.waitForTimeout(550);
  assert.equal(await p.evaluate(()=>document.activeElement.className),'mv-notes');
  if(width<761)assert(await p.locator('.mv-layout').evaluate(e=>e.scrollTop)>300);
  await p.keyboard.press('End');await p.waitForTimeout(400);
  assert.equal(await p.evaluate(()=>scrollY),parent.y,'nested scroller moved background');
  await p.keyboard.press('Escape');await p.waitForTimeout(500);assert(await p.evaluate(()=>NocturneLab.inlineOpen));
  assert.equal(await p.locator('.mx-inline-case').evaluate(e=>e.scrollTop),parent.top);
  await p.keyboard.press('Escape');await p.waitForTimeout(1500);assert(!(await p.evaluate(()=>NocturneLab.inlineOpen)));
  assert.deepEqual(errors,[]);console.log(width,'nested layout, details, keyboard and return passed');await p.close();
 }
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
