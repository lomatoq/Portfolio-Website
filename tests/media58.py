import os
from playwright.sync_api import sync_playwright
from pathlib import Path
import json,sys,time,traceback
R=Path(__file__).resolve().parents[1];O=R/'tests/flow58';checks=[];errors=[]
def check(n,v,d=None):
 checks.append({'name':n,'pass':bool(v),'details':d});print('PASS' if v else 'FAIL',n,str(d)[:300],flush=True);(O/'media.json').write_text(json.dumps({'checks':checks,'errors':errors},indent=2))
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=(None if os.environ.get('CHROMIUM_PATH')=='playwright' else os.environ.get('CHROMIUM_PATH','/usr/bin/chromium')),headless=True,args=['--no-sandbox','--disable-gpu'])
 page=b.new_page(viewport={'width':1440,'height':900});page.on('pageerror',lambda e:errors.append(str(e)));page.route('https://**/*',lambda r:r.abort());page.set_default_timeout(10000)
 try:
  page.set_content((R/'index.html').read_text(),wait_until='domcontentloaded');page.wait_for_selector('#bootLoader',state='detached',timeout=15000);print('booted',flush=True)
  page.evaluate("NocturneScroll.to(NocturneScroll.checkpoints().find(p=>p.id==='spribe').y,{instant:true})");page.wait_for_timeout(300);print('scrolled',flush=True)
  page.locator('#spribe summary').evaluate('(e)=>e.click()');print('clicked',flush=True);page.wait_for_timeout(1200);print('waited',flush=True)
  check('Selected work supports mixed cell types',page.locator('.mx-inline-body [data-media-open]').count()>=3 and page.locator('.mx-inline-body [data-case="bonus"]').count()>0)
  page.locator('.mx-inline-body [data-media-open="chick"]').evaluate('(e)=>e.click()');print('chick clicked',flush=True);page.wait_for_timeout(500)
  check('Tall-image viewer opens over original case',page.evaluate('NocturneMedia.isOpen && NocturneLab.inlineOpen'),page.evaluate('NocturneMedia.diagnostics()'))
  check('Image loaded with tall natural aspect ratio',page.locator('.mv-image').evaluate('(e)=>e.complete&&e.naturalHeight>e.naturalWidth*3'),page.locator('.mv-image').evaluate('(e)=>({w:e.naturalWidth,h:e.naturalHeight})'))
  page.screenshot(path=str(O/'desktop-tall.png'))
  before=page.evaluate('scrollY');page.locator('.mv-media').evaluate('(e)=>e.scrollTop=800');page.wait_for_timeout(120)
  check('Viewer scroll leaves page position unchanged',abs(page.evaluate('scrollY')-before)<1)
  page.keyboard.press('Escape');page.wait_for_function('!NocturneMedia.isOpen',timeout=2500);check('Escape closes only media, keeps company case',page.evaluate('!NocturneMedia.isOpen&&NocturneLab.inlineOpen'),page.evaluate('({media:NocturneMedia.diagnostics(),inline:NocturneLab.inlineOpen})'))
  page.locator('.mx-inline-body [data-media-open="dragon"]').first.evaluate('(e)=>e.click()');page.wait_for_timeout(1200)
  check('Video autoplay advances',page.locator('.mv-video').evaluate('(v)=>!v.paused&&v.currentTime>0'),page.locator('.mv-video').evaluate('(v)=>({paused:v.paused,t:v.currentTime,error:v.error?.message,ready:v.readyState})'))
  page.screenshot(path=str(O/'desktop-video.png'))
  page.keyboard.press('Escape');page.wait_for_function('!NocturneMedia.isOpen',timeout=2500)
  page.locator('.mx-inline-body [data-case="bonus"]').evaluate('(e)=>e.click()');page.wait_for_timeout(1000)
  check('Ordinary context case still opens normally',page.evaluate('!NocturneMedia.isOpen&&NocturneLab.inlineOpen') and page.locator('.mx-case-back').count()>0)
  check('No JS errors',not errors,errors)
 except Exception as e:check('Harness completed',False,str(e));print(traceback.format_exc(),flush=True)
 finally:b.close()

if any(not c["pass"] for c in checks):
 raise SystemExit(1)
