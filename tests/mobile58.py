import os
from pathlib import Path
from playwright.sync_api import sync_playwright
import json, traceback
R=Path(__file__).resolve().parents[1];O=R/'tests/flow58';checks=[];errors=[]
def check(n,v,d=None):
 checks.append({'name':n,'pass':bool(v),'details':d});print('PASS' if v else 'FAIL',n,str(d)[:320],flush=True);(O/'mobile.json').write_text(json.dumps({'checks':checks,'errors':errors},indent=2))
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=(None if os.environ.get('CHROMIUM_PATH')=='playwright' else os.environ.get('CHROMIUM_PATH','/usr/bin/chromium')),headless=True,args=['--no-sandbox','--disable-gpu']);page=b.new_page(viewport={'width':390,'height':844},device_scale_factor=1,is_mobile=True,has_touch=True)
 page.route('https://**/*',lambda r:r.abort());page.on('pageerror',lambda e:errors.append(str(e)));page.set_default_timeout(10000)
 try:
  page.set_content((R/'index.html').read_text(),wait_until='domcontentloaded');page.wait_for_selector('#bootLoader',state='detached',timeout=15000)
  pts=page.evaluate('NocturneScroll.checkpoints()');byid={a['id']:a for a in pts}
  page.evaluate('(y)=>NocturneScroll.to(y,{instant:true})',byid['vice']['y']);page.wait_for_timeout(300)
  check('Mobile first project fully visible',page.evaluate('(p)=>LiquidPortfolio.presentationReady(p)',byid['vice']))
  page.screenshot(path=str(O/'mobile-vice.png'))
  page.evaluate('(y)=>NocturneScroll.to(y,{instant:true})',byid['vice:0:0']['y']);page.wait_for_timeout(100)
  before=page.evaluate('NocturneScroll.diagnostics()');cdp=page.context.new_cdp_session(page)
  cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':370,'y':710}]})
  for y in [650,580,510,440,370]:
   cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':370,'y':y}]});page.wait_for_timeout(20)
  cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});page.wait_for_timeout(1000)
  after=page.evaluate('NocturneScroll.diagnostics()');check('Vertical touch scroll changes gallery position without a step gate',after['actual']>before['actual']+180 and after['acceptedInputs']>before['acceptedInputs'],{'before':before['actual'],'after':after['actual']})
  page.evaluate('(y)=>NocturneScroll.to(y,{instant:true})',byid['spribe']['y']);page.wait_for_timeout(200);page.locator('#spribe summary').evaluate('(e)=>e.click()');page.wait_for_timeout(900)
  page.locator('.mx-inline-body [data-media-open="chick"]').evaluate('(e)=>e.click()');page.wait_for_timeout(550)
  page.wait_for_function('document.querySelector(".mv-image")?.complete')
  check('Mobile native overlay opens over company case',page.evaluate('NocturneMedia.isOpen&&NocturneLab.inlineOpen'))
  rect=page.locator('.mv-shell').bounding_box();check('Overlay fits mobile viewport',rect['x']>=0 and rect['y']>=0 and rect['x']+rect['width']<=391 and rect['y']+rect['height']<=845,rect)
  check('Notes start below tall image and are not overlaid',page.evaluate('document.querySelector(".mv-notes").getBoundingClientRect().top>=document.querySelector(".mv-image").getBoundingClientRect().bottom-1 && !NocturneMedia.diagnostics().notesVisible'))
  page.screenshot(path=str(O/'mobile-tall-top.png'))
  before=page.evaluate('scrollY');page.locator('.mv-layout').evaluate('(e)=>e.scrollTop=e.scrollHeight');page.wait_for_timeout(700)
  check('Notes reveal at image end on mobile',page.evaluate('NocturneMedia.diagnostics().notesVisible'))
  check('Overlay scroll does not move background',page.evaluate('scrollY')==before)
  page.screenshot(path=str(O/'mobile-tall-end.png'))
  awaitable=page.locator('.mv-close');awaitable.tap();page.wait_for_function('!NocturneMedia.isOpen')
  check('Close restores same case and page coordinate',page.evaluate('NocturneLab.inlineOpen') and abs(page.evaluate('scrollY')-before)<1)
  page.locator('.mx-inline-body [data-media-open="dragon"]').first.evaluate('(e)=>e.click()');page.wait_for_timeout(850)
  check('Video plays inline on mobile',page.locator('.mv-video').evaluate('(v)=>v.playsInline&&v.muted&&!v.paused&&v.currentTime>0'))
  check('Video has text below on mobile',page.evaluate('document.querySelector(".mv-notes").getBoundingClientRect().top>=document.querySelector(".mv-media").getBoundingClientRect().bottom-1'))
  page.screenshot(path=str(O/'mobile-video.png'))
  page.locator('.mv-close').tap();page.wait_for_function('!NocturneMedia.isOpen')
  check('No mobile JS errors',not errors,errors)
 except Exception as e:check('Harness completed',False,str(e));print(traceback.format_exc(),flush=True)
 finally:b.close()

if any(not c["pass"] for c in checks):
 raise SystemExit(1)
