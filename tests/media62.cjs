const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});try{
 for(const width of [320,1440]){
  const p=await b.newPage({viewport:{width,height:844},isMobile:width===320,hasTouch:width===320});const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(process.env.FLOW59_URL||'http://127.0.0.1:4192/');await p.waitForFunction(()=>window.NocturneMedia&&!document.documentElement.classList.contains('booting'));
  await p.evaluate(()=>{
   const svg='<svg xmlns="http://www.w3.org/2000/svg" width="600" height="4200"><rect width="600" height="4200" fill="#cce1ff"/><circle cx="300" cy="300" r="200" fill="#314566"/></svg>';
   NocturneMedia.register('qa-tall',{title:'A complete visual story with a longer project title',type:'long-image',src:'data:image/svg+xml,'+encodeURIComponent(svg),width:600,height:4200,sections:[{title:'Context',text:'Long-form project notes. '.repeat(100)}]});NocturneMedia.open('qa-tall');
  });
  await p.waitForFunction(()=>document.querySelector('.mv-image')?.naturalHeight===4200);
  await p.waitForTimeout(600);
  assert(await p.locator('.mv-image').evaluate(e=>Math.abs(e.getBoundingClientRect().height/e.getBoundingClientRect().width-7)<.001),'image aspect ratio changed');
  const fit=await p.locator('.mv-shell').evaluate(e=>({x:e.scrollWidth-e.clientWidth,y:e.scrollHeight-e.clientHeight}));assert(fit.x<=1&&fit.y<=1,'long title broke shell');
  const y=await p.evaluate(()=>scrollY);await p.locator(width<761?'.mv-layout':'.mv-media').evaluate(e=>e.scrollTop=700);await p.waitForTimeout(100);assert.equal(await p.evaluate(()=>scrollY),y);
  await p.locator('.mv-details').click();await p.waitForTimeout(450);await p.keyboard.press('End');await p.waitForTimeout(500);
  assert(await p.locator(width<761?'.mv-layout':'.mv-notes').evaluate(e=>e.scrollTop)>100,'keyboard did not scroll focused region');
  for(let i=0;i<8;i++)await p.keyboard.press('Tab');assert(await p.evaluate(()=>document.querySelector('#mediaViewer').contains(document.activeElement)));
  await p.evaluate(()=>{NocturneMedia.close();NocturneMedia.open('dragon');});await p.waitForTimeout(900);assert.equal(await p.evaluate(()=>NocturneMedia.diagnostics().id),'dragon');
  await p.waitForFunction(()=>{const v=document.querySelector('.mv-video');return v&&!v.paused&&v.currentTime>.1},{timeout:10000});
  await p.evaluate(()=>window.qaVideo=document.querySelector('.mv-video'));await p.mouse.click(1,1);await p.waitForFunction(()=>!NocturneMedia.isOpen);
  assert(await p.evaluate(()=>qaVideo.paused&&!document.documentElement.style.overflow&&!document.body.style.overflow));
  // Replacement remains available through the existing author-mode control.
  await p.evaluate(()=>{document.querySelector('#authorToggle').click();NocturneMedia.open('polysphere');});
  await p.locator('.mv-file').setInputFiles({name:'local-proof.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="360"><rect width="120" height="360" fill="red"/></svg>')});
  await p.waitForFunction(()=>document.querySelector('.mv-image')?.naturalHeight===360);
  assert(await p.locator('.mv-note').allTextContents().then(a=>a.some(t=>t.includes('local-proof.svg'))));
  await p.evaluate(async()=>{await NocturneMedia.close();document.querySelector('#authorToggle').click();});
  await p.emulateMedia({reducedMotion:'reduce'});await p.evaluate(()=>NocturneMedia.open('qa-tall'));await p.waitForTimeout(100);await p.keyboard.press('Escape');await p.waitForFunction(()=>!NocturneMedia.isOpen);
  assert.deepEqual(errors,[]);console.log(width,'real tall media, long title, focus, notes scrolling, rapid reopen, video, backdrop, author replacement, reduced motion passed');await p.close();
 }
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
