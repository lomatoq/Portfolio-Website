import os
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,traceback
R=Path(__file__).resolve().parents[1];O=R/'tests/flow58';checks=[];errors=[]
def check(n,v,d=None):
 checks.append({'name':n,'pass':bool(v),'details':d});print('PASS' if v else 'FAIL',n,str(d)[:240],flush=True);(O/'edge.json').write_text(json.dumps({'checks':checks,'errors':errors},indent=2))
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=(None if os.environ.get('CHROMIUM_PATH')=='playwright' else os.environ.get('CHROMIUM_PATH','/usr/bin/chromium')),headless=True,args=['--no-sandbox','--disable-gpu']);page=b.new_page(viewport={'width':1366,'height':768});page.set_default_timeout(10000);page.route('https://**/*',lambda r:r.abort());page.on('pageerror',lambda e:errors.append(str(e)))
 try:
  page.set_content((R/'index.html').read_text(),wait_until='domcontentloaded');page.wait_for_selector('#bootLoader',state='detached',timeout=15000)
  page.evaluate("NocturneMedia.open('polysphere')");page.wait_for_timeout(200)
  check('Media can open without replacing a parent case',page.evaluate('NocturneMedia.isOpen&&!NocturneLab.inlineOpen'))
  for _ in range(5):page.keyboard.press('Tab')
  check('Focus remains within top layer',page.evaluate('document.querySelector("#mediaViewer").contains(document.activeElement)'))
  page.locator('.mv-file').set_input_files({'name':'local-layout-test.svg','mimeType':'image/svg+xml','buffer':b'<svg xmlns="http://www.w3.org/2000/svg" width="320" height="1280"><rect width="320" height="1280" fill="#abc"/></svg>'})
  page.wait_for_function('document.querySelector(".mv-image")?.naturalHeight===1280')
  check('Local media replacement preserves natural aspect ratio',page.locator('.mv-image').evaluate('(e)=>e.naturalWidth===320&&e.naturalHeight===1280'))
  page.keyboard.press('Escape');page.wait_for_function('!NocturneMedia.isOpen')
  page.evaluate("NocturneMedia.open('chick'); NocturneMedia.close(); NocturneMedia.open('dragon');")
  page.wait_for_timeout(650);check('Rapid close/reopen does not leave stale modal state',page.evaluate("NocturneMedia.diagnostics().id==='dragon'&&!NocturneMedia.diagnostics().closing"))
  page.evaluate('window.testVideo=document.querySelector(".mv-video")');page.mouse.click(2,2);page.wait_for_function('!NocturneMedia.isOpen')
  check('Backdrop click closes video and pauses playback',page.evaluate('testVideo.paused&&!NocturneMedia.isOpen'))
  check('Body/root scrolling restored after media without parent',page.evaluate("!document.documentElement.style.overflow&&!document.body.style.overflow"))
  page.evaluate("NocturneScroll.to(NocturneScroll.checkpoints().find(p=>p.id==='spribe').y,{instant:true})");page.wait_for_timeout(150);page.locator('#spribe summary').evaluate('(e)=>e.click()');page.wait_for_timeout(1000)
  page.locator('.mx-inline-body [data-media-open="chick"]').evaluate('(e)=>e.click()');page.wait_for_timeout(200);page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(350)
  check('Viewport change keeps both layers open',page.evaluate('NocturneMedia.isOpen&&NocturneLab.inlineOpen'))
  page.locator('.mv-close').click();page.wait_for_function('!NocturneMedia.isOpen');page.wait_for_timeout(100)
  box=page.locator('.exp.mx-expanded').bounding_box();check('Underlying company case refits after viewport change',box['x']>=-2 and box['x']+box['width']<=392,box)
  page.evaluate('NocturneLab.closeInline()');page.wait_for_function('!NocturneLab.inlineOpen',timeout=5000)
  page.emulate_media(reduced_motion='reduce');page.wait_for_timeout(300);check('Reduced-motion preference is respected',page.evaluate("document.body.classList.contains('reduced')"))
  page.evaluate('scrollTo(0,0)');page.wait_for_timeout(150);before=page.evaluate('NocturneScroll.diagnostics().acceptedInputs');page.mouse.move(350,430);page.mouse.wheel(0,200);page.wait_for_timeout(250)
  check('Reduced-motion wheel remains native and unblocked',page.evaluate('NocturneScroll.diagnostics().acceptedInputs')==before and page.evaluate('scrollY')>0)
  check('No edge-case JS errors',not errors,errors)
 except Exception as e:check('Harness completed',False,str(e));print(traceback.format_exc(),flush=True)
 finally:b.close()

if any(not c["pass"] for c in checks):
 raise SystemExit(1)
