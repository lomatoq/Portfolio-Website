import os
from playwright.sync_api import sync_playwright
from pathlib import Path
import json,time,traceback
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'tests/flow58';results=[];errors=[]
def check(n,v,d=None):
 results.append({'name':n,'pass':bool(v),'details':d});print('PASS' if v else 'FAIL',n,str(d)[:300],flush=True)
 (OUT/'smoke.json').write_text(json.dumps({'checks':results,'errors':errors},indent=2))
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=(None if os.environ.get('CHROMIUM_PATH')=='playwright' else os.environ.get('CHROMIUM_PATH','/usr/bin/chromium')),headless=True,args=['--no-sandbox','--disable-gpu'])
 page=b.new_page(viewport={'width':1440,'height':900});page.on('pageerror',lambda e:errors.append(str(e)));page.route('https://**/*',lambda r:r.abort());page.set_default_timeout(18000)
 try:
  page.set_content((ROOT/'index.html').read_text(),wait_until='domcontentloaded');page.wait_for_selector('#bootLoader',state='detached',timeout=55000);page.wait_for_timeout(500)
  print('loaded',page.evaluate('NocturneScroll.diagnostics()'),flush=True)
  pts=page.evaluate('NocturneScroll.checkpoints()');(OUT/'points.json').write_text(json.dumps(pts,indent=2))
  def pt(id):return next(a for a in pts if a['id']==id)
  def jump(y):
   page.evaluate('(y)=>NocturneScroll.to(y,{instant:true})',y);page.wait_for_timeout(100)
  def state():return page.evaluate('NocturneScroll.diagnostics()')
  def idle():page.wait_for_function('!NocturneScroll.active()',timeout=12000);page.wait_for_timeout(180)
  page.mouse.move(1360,430)
  jump(pt('vice')['y']-380);page.mouse.wheel(0,900);idle();d=state();check('Large single impulse lands at project intro',abs(d['actual']-pt('vice')['y'])<1,d)
  check('Intro is fully visible',page.evaluate('(p)=>LiquidPortfolio.presentationReady(p)',pt('vice')),page.evaluate('LiquidPortfolio.presentation()'))
  page.screenshot(path=str(OUT/'intro-vice.png'))
  page.mouse.wheel(0,120);page.wait_for_timeout(60);d=state();check('Next wheel responds immediately without fresh gesture',d['target']>pt('vice')['y']+10,d)
  idle();check('Soft settle does not pull departure back to intro',state()['actual']>pt('vice')['y']+10,state())
  jump(pt('vice')['y']-380);page.mouse.wheel(0,850);page.wait_for_timeout(30);t=state()['target'];page.mouse.wheel(0,160);check('Input retargets DURING entrance animation',state()['target']>t+15,state())
  jump(pt('vice:0:0')['y']);start=state()['actual']
  for _ in range(7):page.mouse.wheel(0,150);page.wait_for_timeout(24)
  idle();check('Gallery moves across multiple cards without mandatory stops',state()['actual']>start+500,state())
  jump(pt('freelance')['y']);
  for _ in range(8):page.mouse.wheel(0,160);page.wait_for_timeout(20)
  idle();check('Work history scrolls continuously',state()['actual']>pt('freelance')['y']+700,state())
  check('No JS errors',not errors,errors)
 except Exception as e:
  check('Harness completed',False,str(e));print(traceback.format_exc(),flush=True)
 finally:b.close()

if any(not c["pass"] for c in results):
 raise SystemExit(1)
