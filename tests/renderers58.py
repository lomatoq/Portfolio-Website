import os
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,sys
R=Path(__file__).resolve().parents[1];O=R/'tests/flow58';arg=sys.argv[1] if len(sys.argv)>1 else 'fallback';reports=[]
with sync_playwright() as p:
 args=['--no-sandbox']+(['--disable-gpu','--disable-webgl','--disable-software-rasterizer'] if arg=='fallback' else ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl'])
 b=p.chromium.launch(executable_path=(None if os.environ.get('CHROMIUM_PATH')=='playwright' else os.environ.get('CHROMIUM_PATH','/usr/bin/chromium')),headless=True,args=args);page=b.new_page(viewport={'width':1440,'height':900});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.route('https://**/*',lambda r:r.abort())
 page.set_content((R/'index.html').read_text(),wait_until='domcontentloaded');page.wait_for_selector('#bootLoader',state='detached',timeout=25000)
 page.evaluate("NocturneScroll.to(NocturneScroll.checkpoints().find(p=>p.id==='vice').y,{instant:true})");page.wait_for_timeout(400)
 report=page.evaluate('Nocturne.diagnostics()');print(json.dumps(report),flush=True)
 before=page.evaluate('NocturneScroll.diagnostics().position');page.mouse.move(1360,430);page.mouse.wheel(0,120);page.wait_for_function('NocturneScroll.diagnostics().position>'+str(before+1));page.wait_for_timeout(150)
 reports.append({'name':arg+' render and continuous-input smoke','pass':not errors and report['mode'] in (['canvas2d','poster'] if arg=='fallback' else ['webgl1','webgl2']),'renderer':report,'errors':errors,'positionAfterInput':page.evaluate('NocturneScroll.diagnostics().position')})
 page.screenshot(path=str(O/('renderer-'+arg+'.png')))
 
 for c in reports:
  if arg=='webgl' and c['renderer']['mode'] not in ['webgl1','webgl2']:
   c['status']='blocked_environment';c['pass']=None
 (O/('renderer-'+arg+'.json')).write_text(json.dumps({'checks':reports},indent=2));b.close()
