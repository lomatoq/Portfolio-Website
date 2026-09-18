import os
"""Static geometry/readability regression, not a performance or gesture benchmark."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import sys,json,traceback
R=Path(__file__).resolve().parents[1];O=R/'tests/flow58';w,h=map(int,sys.argv[1:3] or [1366,768]);checks=[];errors=[]
def check(n,v,d=None):
 checks.append({'name':n,'pass':bool(v),'details':d});print('PASS' if v else 'FAIL',n,str(d)[:230],flush=True);(O/f'poses-{w}-{h}.json').write_text(json.dumps({'checks':checks,'errors':errors},indent=2))
POSE='''p=>{const ch=document.getElementById(p.chapter),heading=ch.querySelector('.chapter-heading h2'),el=p.kind==='chapter'?ch.querySelector('.stage-study .project-art'):ch.querySelectorAll('.media-rail')[p.rail].querySelectorAll('.media-card')[p.slide];const r=el.getBoundingClientRect(),words=[...heading.querySelectorAll('.motion-word')].map(w=>({opacity:+getComputedStyle(w).opacity,filter:getComputedStyle(w).filter,transform:getComputedStyle(w).transform}));return {rect:{x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom},words,ready:LiquidPortfolio.presentationReady(p),state:LiquidPortfolio.presentation().find(s=>s.id===p.chapter)};}'''
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=(None if os.environ.get('CHROMIUM_PATH')=='playwright' else os.environ.get('CHROMIUM_PATH','/usr/bin/chromium')),headless=True,args=['--no-sandbox','--disable-gpu']);page=b.new_page(viewport={'width':w,'height':h},has_touch=w<600,is_mobile=w<600);page.set_default_timeout(10000);page.route('https://**/*',lambda r:r.abort());page.on('pageerror',lambda e:errors.append(str(e)))
 try:
  page.set_content((R/'index.html').read_text(),wait_until='domcontentloaded');page.wait_for_selector('#bootLoader',state='detached',timeout=15000)
  pts=page.evaluate("NocturneScroll.checkpoints().filter(p=>['chapter','gallery'].includes(p.kind))")
  for pt in pts:
   page.evaluate('(p)=>NocturneScroll.to(p.y,{instant:true})',pt);page.evaluate('()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
   data=page.evaluate(POSE,pt);rect=data['rect']
   check(f'{pt["id"]}: complete pose and readable heading',data['ready'] and rect['x']>=-1 and rect['right']<=w+1 and rect['y']>=60 and rect['bottom']<=h-28 and all(d['opacity']>.998 and d['transform']=='none' and d['filter']=='none' for d in data['words']),data)
   if pt['id'] in ['companion','tools:0:2']:page.screenshot(path=str(O/f'pose-{w}-{pt["id"].replace(":","-")}.png'))
  check('No horizontal overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
  check('No JS errors',not errors,errors)
 except Exception as e:check('Harness completed',False,str(e));print(traceback.format_exc(),flush=True)
 finally:b.close()

if any(not c["pass"] for c in checks):
 raise SystemExit(1)
