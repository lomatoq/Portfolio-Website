const {chromium}=require('playwright');
const assert=require('assert');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});try{
 for(const width of [1440,390]){
  const p=await b.newPage({viewport:{width,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(process.env.FLOW59_URL||'http://127.0.0.1:4190/');await p.waitForTimeout(3000);
  const stops=await p.evaluate(()=>NocturneScroll.checkpoints().filter(q=>q.kind==='chapter'||q.kind==='gallery'));
  for(const q of stops){await p.evaluate(y=>NocturneScroll.to(y,{instant:true}),q.y);await p.waitForTimeout(500);const result=await p.evaluate(q=>{const e=document.getElementById(q.chapter);return{ready:LiquidPortfolio.presentationReady(q),pin:e.querySelector('.scene-pin').getBoundingClientRect().top}},q);assert(result.ready,`${width} ${q.id} unready ${JSON.stringify(result)}`);assert(Math.abs(result.pin)<1,`${q.id} pin ${result.pin}`);}
  console.log(width,'all',stops.length,'stops fully revealed');
  await p.evaluate(y=>NocturneScroll.to(y,{instant:true}),stops[0].y-500);
  for(let i=0;i<8;i++){await p.mouse.wheel(0,500);await p.waitForTimeout(30)}await p.waitForTimeout(1700);
  assert.equal(await p.evaluate(()=>NocturneScroll.diagnostics().gate?.id),stops[0].id);
  await p.screenshot({path:`flow59-first-${width}.png`});
  await p.mouse.wheel(0,2000);await p.waitForTimeout(1800);assert.equal(await p.evaluate(()=>NocturneScroll.diagnostics().gate?.id),stops[1].id);
  await p.mouse.wheel(0,-100);await p.waitForTimeout(100);assert.equal(await p.evaluate(()=>NocturneScroll.diagnostics().gate),null);console.log(width,'burst, next gesture, immediate reversal passed');
  await p.evaluate(()=>NocturneScroll.to(NocturneScroll.checkpoints().find(q=>q.id==='playgendary').y,{instant:true}));await p.waitForTimeout(500);const hit=await p.locator('#playgendary h3').boundingBox();await p.mouse.click(hit.x+hit.width/2,hit.y+hit.height/2);await p.waitForFunction(()=>NocturneLab.caseProgress>.9999);await p.waitForTimeout(900);
  assert.equal(await p.locator('.mobile-history-intro').evaluate(e=>getComputedStyle(e).filter),'blur(18px)');
  await p.screenshot({path:`flow59-history-${width}.png`});
  await p.locator('.mx-inline-case [data-media-open="polysphere"]').first().click();await p.waitForTimeout(1000);assert(await p.evaluate(()=>NocturneMedia.isOpen));
  const state=await p.evaluate(()=>({y:scrollY,inner:document.querySelector('.mx-inline-case').scrollTop}));
  assert.equal(await p.locator('.mv-media').evaluate(e=>getComputedStyle(e).scrollbarWidth),'none');await p.screenshot({path:`flow59-glass-${width}.png`});
  await p.locator(width<760?'.mv-layout':'.mv-media').evaluate(e=>e.scrollTop=600);await p.waitForTimeout(100);assert.equal(await p.evaluate(()=>scrollY),state.y);
  await p.keyboard.press('Escape');await p.waitForTimeout(700);assert(!(await p.evaluate(()=>NocturneMedia.isOpen)));assert(await p.evaluate(()=>NocturneLab.inlineOpen));assert.equal(await p.evaluate(()=>scrollY),state.y);
  await p.keyboard.press('Escape');await p.waitForTimeout(1700);assert(!(await p.evaluate(()=>NocturneLab.inlineOpen)));assert.deepEqual(errors,[]);console.log(width,'nested popup, scroll, Escape return, no JS errors passed');await p.close();
 }
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
