import os
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,traceback
R=Path(__file__).resolve().parents[1];O=R/'tests/flow58';checks=[];errors=[]
def check(n,v,d=None):
 checks.append({'name':n,'pass':bool(v),'details':d});print('PASS' if v else 'FAIL',n,str(d)[:250],flush=True);(O/'interaction.json').write_text(json.dumps({'checks':checks,'errors':errors},indent=2))
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=(None if os.environ.get('CHROMIUM_PATH')=='playwright' else os.environ.get('CHROMIUM_PATH','/usr/bin/chromium')),headless=True,args=['--no-sandbox','--disable-gpu']);page=b.new_page(viewport={'width':1366,'height':768});page.set_default_timeout(10000);page.route('https://**/*',lambda r:r.abort());page.on('pageerror',lambda e:errors.append(str(e)))
 try:
  page.set_content((R/'index.html').read_text(),wait_until='domcontentloaded');page.wait_for_selector('#bootLoader',state='detached',timeout=15000)
  pts=page.evaluate('NocturneScroll.checkpoints()');D={q['id']:q for q in pts}
  def state():return page.evaluate('NocturneScroll.diagnostics()')
  def jump(y):page.evaluate('(y)=>NocturneScroll.to(y,{instant:true})',y);page.evaluate('()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
  def idle():page.wait_for_function('!NocturneScroll.active()',timeout=5000);page.evaluate('()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
  page.mouse.move(1300,360)
  for pt in [q for q in pts if q['kind']=='chapter']:
   jump(pt['y']-300);page.mouse.wheel(0,600);idle();check(pt['id']+': wheel entrance lands fully open',abs(state()['actual']-pt['y'])<1 and page.evaluate('(p)=>LiquidPortfolio.presentationReady(p)',pt),state()['actual'])
  jump(D['vice']['y']);top=page.locator('#vice .stage-study .project-art').bounding_box();page.mouse.wheel(0,120)
  page.evaluate('()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
  check('Next input moves actual position within two rendered frames',state()['position']>D['vice']['y']+.5,{'position':state()['position'],'anchor':D['vice']['y']})
  idle();after=page.locator('#vice .stage-study .project-art').bounding_box();check('First wheel after intro gives visible composition feedback',abs(top['x']-after['x'])+abs(top['y']-after['y'])>3,{'before':top,'after':after})
  jump(D['companion']['y']+300);page.mouse.wheel(0,-600);idle();check('Reverse approach also has a soft entrance',abs(state()['actual']-D['companion']['y'])<1)
  jump(D['vice:0:0']['y']);page.mouse.wheel(0,600);t=state()['target'];page.mouse.wheel(0,-90);check('Reverse input interrupts pending forward inertia',state()['target']<t-30,{'forwardTarget':t,'reverseTarget':state()['target']})
  jump(D['vice:0:0']['y']);box=page.locator('#vice .rail-window').bounding_box();x=box['x']+box['width']*.55;y=box['y']+box['height']*.45;page.mouse.move(x,y);page.mouse.down();page.mouse.move(x-320,y,steps=12);page.mouse.up();idle()
  check('Horizontal drag remains synchronized with page position',state()['actual']>D['vice:0:0']['y']+50,{'y':state()['actual'],'first':D['vice:0:0']['y']})
  jump(D['freelance']['y']);page.keyboard.press('ArrowDown');a=state()['target'];page.keyboard.press('ArrowDown');check('Repeated keyboard input is accepted without a wait',state()['target']>a+30)
  page.evaluate('scrollTo(0,777)');page.wait_for_timeout(150);check('Native position change cancels smooth ownership',not state()['synchronized'] and abs(state()['actual']-777)<1)
  page.mouse.move(1300,350);page.mouse.wheel(0,120);check('Input resumes after native scrolling',state()['target']>777)
  check('No interaction JS errors',not errors,errors)
 except Exception as e:check('Harness completed',False,str(e));print(traceback.format_exc(),flush=True)
 finally:b.close()

if any(not c["pass"] for c in checks):
 raise SystemExit(1)
