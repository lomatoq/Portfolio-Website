"""Quick probe of the exact final HTML bytes; not a hardware benchmark."""
import os,json,hashlib
from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1];O=R/'tests/flow58';errors=[];checks=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=(None if os.environ.get('CHROMIUM_PATH')=='playwright' else os.environ.get('CHROMIUM_PATH','/usr/bin/chromium')),headless=True,args=['--no-sandbox','--disable-gpu','--disable-webgl','--disable-software-rasterizer'])
 page=b.new_page(viewport={'width':1440,'height':900});page.route('https://**/*',lambda r:r.abort());page.on('pageerror',lambda e:errors.append(str(e)))
 html=(R/'index.html').read_bytes();page.set_content(html.decode(),wait_until='domcontentloaded');page.wait_for_selector('#bootLoader',state='detached',timeout=25000)
 point=page.evaluate("NocturneScroll.checkpoints().find(p=>p.id==='vice')");page.evaluate('(p)=>NocturneScroll.to(p.y-300,{instant:true})',point);page.mouse.move(1360,430);page.mouse.wheel(0,600);page.wait_for_function('!NocturneScroll.active()',timeout=10000);page.evaluate('()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
 checks.append({'name':'Final HTML: complete first entrance from wheel','pass':abs(page.evaluate('scrollY')-point['y'])<1 and page.evaluate('(p)=>LiquidPortfolio.presentationReady(p)',point)})
 page.mouse.wheel(0,120);checks.append({'name':'Final HTML: next input has no lock','pass':page.evaluate('NocturneScroll.diagnostics().target')>point['y']+10})
 page.evaluate("NocturneMedia.open('chick')");page.wait_for_function('document.querySelector(".mv-image")?.naturalHeight>4000')
 checks.append({'name':'Final HTML: long media loads','pass':page.evaluate('NocturneMedia.isOpen')})
 page.keyboard.press('Escape');page.wait_for_function('!NocturneMedia.isOpen');checks.append({'name':'Final HTML: close restores page','pass':not page.evaluate('NocturneMedia.isOpen')})
 checks.append({'name':'Final HTML: no JavaScript errors','pass':not errors,'errors':errors})
 report={'sha256':hashlib.sha256(html).hexdigest(),'bytes':len(html),'browser':b.version,'checks':checks,'renderer':page.evaluate('Nocturne.diagnostics()'),'environment':'Chromium; native wheel via Playwright; full set_content; external fonts blocked; forced Canvas 2D fallback'}
 (O/'final.json').write_text(json.dumps(report,indent=2));print(json.dumps({'sha256':report['sha256'],'checks':checks},indent=2),flush=True);b.close()
if any(not c['pass'] for c in checks):raise SystemExit(1)
