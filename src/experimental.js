/* Motion lab: a single clock, scoped effects and individually reversible flags. */
(() => {
 'use strict';
 const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)],clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),mix=(a,b,t)=>a+(b-a)*t;
 const flags={navBackdrop:true,contextCursor:true,heroImageTrail:true,heroMarquee:true,careerPreview:true,careerInlineCase:true,playerV2:true,companionGooType:true,bentoV2:true,indexAccent:true,galleryMotionVariant:true,mediaFlow:true,fluidPointer:true,grassPointer:true,loaderV2:true,ambientParticles:true};
 try{Object.assign(flags,JSON.parse(localStorage.getItem('nocturne-lab-flags')||'{}'));}catch{}
 const fine=matchMedia('(hover:hover) and (pointer:fine)'),body=document.body;
 const isReduced=()=>body.classList.contains('reduced')||matchMedia('(prefers-reduced-motion:reduce)').matches;
 const save=()=>{try{localStorage.setItem('nocturne-lab-flags',JSON.stringify(flags))}catch{}};
 function apply(){for(const [k,v] of Object.entries(flags))body.classList.toggle('mx-'+k,!!v);body.classList.toggle('mx-cursor-ready',flags.contextCursor&&fine.matches&&!isReduced());window.portfolioWake?.();}
 const ptr={x:innerWidth/2,y:innerHeight/2,rx:innerWidth/2,ry:innerHeight/2,speed:0,brush:0,gx:innerWidth/2,gy:innerHeight/2,grassX:innerWidth/2,grassY:innerHeight/2,grassPower:0,last:0,inside:false,target:null};
 let fastUntil=0,lastY=scrollY,lastTick=0,energy=0,marqueeX=0,previewTarget=null,previewAt=0,trailAt=0,lastTrail={x:0,y:0},inline=null,origin=null,closing=false,inlineAnimation=null,activeTween=0;
 const cursor=document.createElement('div');cursor.className='mx-cursor';cursor.setAttribute('aria-hidden','true');cursor.innerHTML='<i></i><span></span>';body.append(cursor);
 const label=$('span',cursor),ring=$('i',cursor);
 let preview=document.createElement('div');const retiringPreviews=[];preview.className='mx-preview';preview.setAttribute('aria-hidden','true');body.append(preview);
 const trail=document.createElement('div');trail.className='mx-trail';trail.setAttribute('aria-hidden','true');$('.intro').prepend(trail);
 const artKinds=Array.from({length:64},(_,i)=>['poly','pet','vector','rock','cards','tiles'][i%6]);
 const art=kind=>window.portfolioArt?.(kind)||'';
 const cards=artKinds.map((kind,i)=>{const e=document.createElement('div');e.className='mx-trail-frame';e.innerHTML=art(kind);trail.append(e);return {el:e,born:-10000,x:0,y:0,scrollAt:0,angle:(i%2?1:-1)*(5+i),index:i};});
 let trailIndex=0;
 const previewArt=el=>{const exp=el.closest('.exp');const a=exp?$$('.frame-art',exp).map(e=>e.innerHTML).slice(0,3):[];return a.length?a:[$('svg,img',el)?.outerHTML||art('poly')];};
 function retirePreview(){
  if(!preview.childElementCount)return;
  const old=preview;old.classList.remove('visible');old.classList.add('retiring');
  retiringPreviews.push({el:old,at:performance.now()});
  preview=document.createElement('div');preview.className='mx-preview';preview.setAttribute('aria-hidden','true');body.append(preview);
 }
 function hover(el){const next=el?.closest?.('.career-bubble,.exp summary,.project-row,.mini-art');
  if(next===previewTarget||next&&previewTarget&&next.closest('.exp')===previewTarget.closest('.exp')&&next.closest('.exp'))return;
  retirePreview();previewTarget=next;previewAt=performance.now();
  if(next&&flags.careerPreview){const arts=previewArt(next);preview.innerHTML=arts.map((s,i)=>`<figure style="--i:${i}">${s}</figure>`).join('');const row=next.closest('.exp');if(row){const record=JSON.parse($('#portfolio-data').textContent).experience.find(x=>x.id===row.id);if(record){const copy=document.createElement('div');copy.className='mx-preview-copy';copy.style.top=(arts.length*76+50)+'px';const title=document.createElement('b'),desc=document.createElement('p'),link=document.createElement('span');title.textContent=record.company;desc.textContent=record.summary+' '+(record.role?record.role+'. ':'')+(record.period||'');link.textContent='Explore this chapter ↗';copy.append(title,desc,link);preview.append(copy);}}}
 }
 document.addEventListener('pointermove',e=>{if(!fine.matches)return;const now=performance.now(),dt=Math.max(8,now-ptr.last);ptr.speed=clamp(Math.hypot(e.clientX-ptr.x,e.clientY-ptr.y)/dt,0,3);ptr.x=e.clientX;ptr.y=e.clientY;ptr.last=now;ptr.inside=true;ptr.target=e.target;hover(e.target);
  const hit=e.target.closest('button,a,summary,[role=button],.rail-window');const text=e.target.closest('input,textarea,[contenteditable],.scroll-tuning-panel');label.textContent=text||hit?.closest('.contact-cta,.orbit-icon,.hero-scroll')?'':hit?.closest('.film-player')?'PLAY':hit?.closest('.rail-window')?'DRAG':hit?'VIEW':'';cursor.classList.toggle('action',!!hit);cursor.classList.toggle('native',!!text);window.portfolioWake?.();
 },{passive:true});
 document.addEventListener('pointerleave',()=>{ptr.inside=false;hover(null);window.portfolioWake?.();});
 document.addEventListener('focusin',e=>{if(e.target.matches('button,a,summary'))hover(e.target);});
 document.addEventListener('scroll',()=>{hover(null);if(inline)keepCaseScroll();},{passive:true});
 addEventListener('wheel',e=>{if(window.NocturneScroll?.managesInput?.(e)||e.ctrlKey||e.target.closest('[data-free-scroll]'))return;const now=performance.now();energy=(now-(ptr.wheelAt||0)<180?energy:0)+Math.abs(e.deltaY);ptr.wheelAt=now;if(energy>650){fastUntil=now+500;}},{capture:true,passive:true});
 const fast=()=>performance.now()<fastUntil;
 function markFast(ms=400){fastUntil=performance.now()+ms;}
 // One cue per intentional activation, never sound per animation frame.
 let sound=false,audio=null;
 function cue(){if(!sound)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.setValueAtTime(240,audio.currentTime);o.frequency.exponentialRampToValueAtTime(110,audio.currentTime+.12);g.gain.setValueAtTime(.025,audio.currentTime);g.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+.16);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+.18);}catch{}}
 const tools=document.createElement('div');tools.className='mx-tools';tools.innerHTML='<button type="button" class="mx-theme" aria-label="Switch to electric blue" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7"/><path d="M12 5a7 7 0 0 0 0 14Z" fill="currentColor" stroke="none"/></svg></button><button type="button" class="mx-sound" aria-label="Enable interface sound" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10v4m4-7v10m4-13v16m4-13v10m4-7v4"/></svg><span>OFF</span></button>';body.append(tools);
 const blueLayer=document.createElement('div');blueLayer.className='mx-blue-wash';$('.world-host')?.append(blueLayer);
 let blue=false;try{blue=localStorage.getItem('nocturne-blue')==='on'}catch{}
 function theme(){document.documentElement.dataset.colorTheme=blue?'blue':'night';body.classList.toggle('mx-blue',blue);$('.mx-theme').setAttribute('aria-pressed',String(blue));$('.mx-theme').setAttribute('aria-label',blue?'Switch to night':'Switch to electric blue');try{localStorage.setItem('nocturne-blue',blue?'on':'off')}catch{}}
 $('.mx-theme').onclick=()=>{blue=!blue;theme();cue();};$('.mx-sound').onclick=()=>{sound=!sound;$('.mx-sound').setAttribute('aria-pressed',String(sound));$('.mx-sound').setAttribute('aria-label',sound?'Mute interface sound':'Enable interface sound');$('.mx-sound span').textContent=sound?'ON':'OFF';cue();};theme();
 // On narrow screens the first career card used to peek into the landing
 // viewport as an arbitrary cropped rectangle. Give that boundary its own
 // editorial beat and let the real timeline begin below it.
 const historyIntro=document.createElement('a');
 historyIntro.className='mobile-history-intro';historyIntro.href='#freelance';
 historyIntro.setAttribute('aria-label','Explore work history, 2018 to 2026');
 historyIntro.innerHTML='<span class="mobile-history-float"><small>PROFESSIONAL JOURNEY</small><strong><span>WORK</span><span>HISTORY</span></strong><b>2018 — 2026</b><i aria-hidden="true"><svg viewBox="0 0 36 24"><path d="M7 7l11 10L29 7"/></svg></i></span>';
 const historyTimeline=$('#story .timeline');historyTimeline?.before(historyIntro);
 const historyObserver=new IntersectionObserver(entries=>{
  for(const entry of entries)entry.target.classList.toggle('is-visible',entry.isIntersecting);
 },{rootMargin:'0px',threshold:.01});
 historyObserver.observe(historyIntro);
 // Mask a local artwork copy: Chromium can clip backdrop blur before applying its mask.
 $$('.bento-frame').forEach((frame,i)=>{const art=$('svg',frame);if(!art)return;const frost=document.createElement('div');frost.className='mx-bento-frost';frost.setAttribute('aria-hidden','true');const copy=art.cloneNode(true);const ids=new Map();$$('[id]',copy).forEach(e=>{ids.set(e.id,`frost-${i}-${e.id}`);e.id=ids.get(e.id)});for(const e of [copy,...$$('*',copy)])for(const a of [...e.attributes]){let value=a.value;for(const [id,to] of ids)value=value.replaceAll(`url(#${id})`,`url(#${to})`).replace(new RegExp('^#'+id+'$'),'#'+to);if(value!==a.value)e.setAttribute(a.name,value);}frost.append(copy);frame.append(frost);});
 // Own typography; company names follow existing data, no invented ex/current status.
 const marquee=document.createElement('div');marquee.className='mx-marquee';marquee.setAttribute('aria-label','Art, motion, systems. Warsaw, worldwide. Voodoo, Playgendary, SPRIBE.');
 const text=['ART / MOTION / SYSTEMS','WARSAW · WORLDWIDE','VOODOO','PLAYGENDARY','SPRIBE'].map(label=>label.split(' ').map(word=>'<b class="mx-marquee-item">'+word+'</b>').join(' ')+'<i></i>').join('');
 marquee.innerHTML='<div aria-hidden="true"><span>'+text+'</span><span>'+text+'</span></div>';$('.intro')?.append(marquee);let marqueePaused=false,marqueeSpeed=1;marquee.onpointerenter=()=>marqueePaused=true;marquee.onpointerleave=()=>marqueePaused=false;const marqueeTrack=$('div',marquee),marqueeSpan=$('span',marqueeTrack);let marqueeWidth=1;const measureMarquee=()=>{marqueeWidth=Math.max(1,marqueeSpan.getBoundingClientRect().width);const copies=Math.max(2,Math.ceil(marquee.clientWidth/marqueeWidth)+2);while(marqueeTrack.children.length<copies)marqueeTrack.append(marqueeSpan.cloneNode(true));while(marqueeTrack.children.length>copies)marqueeTrack.lastElementChild.remove();marqueeX%=marqueeWidth;};const marqueeObserver=new ResizeObserver(measureMarquee);marqueeObserver.observe(marqueeSpan);marqueeObserver.observe(marquee);document.fonts.ready.then(measureMarquee);
 // Inline case: one shell morphs from its source. Content is laid out at final size.
 const sheet=document.createElement('section');sheet.className='mx-inline-case';sheet.hidden=true;sheet.setAttribute('role','region');sheet.setAttribute('aria-label','Selected work');sheet.dataset.freeScroll='';sheet.innerHTML='<button type="button" class="mx-inline-close" aria-label="Close selected work"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 7H7v10M7 7l10 10"/></svg></button><div class="mx-inline-body"></div>';body.append(sheet);$('.mx-inline-close').onclick=()=>closeInline();
 const updateSheetMask=()=>sheet.style.setProperty('--mx-top-alpha',1-quint(clamp(sheet.scrollTop/70)));sheet.addEventListener('scroll',updateSheetMask,{passive:true});
 const backdrop=document.createElement('div');backdrop.className='mx-case-backdrop';backdrop.setAttribute('aria-hidden','true');body.append(backdrop);
 const ease='cubic-bezier(.22,1,.36,1)';let restoreFocus=null,sourceRect=null;
 let caseScrollLock=null;
 const insideCaseScroller=target=>target?.closest?.('[data-free-scroll]');
 function blockCaseScroll(e){if(caseScrollLock&&!e.ctrlKey&&!insideCaseScroller(e.target))e.preventDefault();}
 addEventListener('wheel',blockCaseScroll,{capture:true,passive:false});
 // A page-wide non-passive listener forces every native swipe through JS.
 // Install the modal guard only while a case actually owns the background.
 function lockCaseScroll(){if(caseScrollLock)return;caseScrollLock={y:scrollY,x:scrollX};addEventListener('touchmove',blockCaseScroll,{capture:true,passive:false});}
 function keepCaseScroll(){if(caseScrollLock&&(scrollY!==caseScrollLock.y||scrollX!==caseScrollLock.x))scrollTo({left:caseScrollLock.x,top:caseScrollLock.y,behavior:'instant'});}
 function unlockCaseScroll(){if(!caseScrollLock)return;caseScrollLock=null;removeEventListener('touchmove',blockCaseScroll,true);}

 function openPanel(html,source){if(!flags.careerInlineCase)return false;window.NocturneScroll?.cancel();hover(null);lockCaseScroll();
  inlineAnimation?.cancel();closing=false;activeTween++;if(!inline){restoreFocus=source||document.activeElement;origin=source?.closest?.('.exp')||null;sourceRect=(source||origin?.querySelector('summary'))?.getBoundingClientRect();}
  $$('.exp').forEach(e=>{e.classList.toggle('mx-neighbor',e!==origin);e.classList.toggle('mx-origin',e===origin);});
  const content=$('.mx-inline-body');content.innerHTML=html;$$('[id]',content).forEach(e=>e.id='mx-'+e.id);$$('[data-close]',content).forEach(b=>b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();closeInline();}));
  sheet.hidden=false;sheet.style.cssText='';sheet.classList.remove('closing');body.classList.add('mx-case-open');backdrop.style.opacity='1';const dest=sheet.getBoundingClientRect();const rect=sourceRect||{left:innerWidth*.4,top:innerHeight*.45,width:180,height:90};
  const sx=clamp(rect.width/dest.width,.08,1),sy=clamp(rect.height/dest.height,.08,1),dx=rect.left-dest.left,dy=rect.top-dest.top;
  inline={scrollAt:scrollY};const time=isReduced()?1:1000;
  inlineAnimation=sheet.animate([{transform:`translate(${dx}px,${dy}px) scale(${sx},${sy})`,opacity:.2,borderRadius:'40px'},{transform:'translate(0,0) scale(1,1)',opacity:1,borderRadius:'32px'}],{duration:time,easing:ease,fill:'both'});
  // Keep readable content out of the geometrically scaled part of the transition.
  content.animate([{opacity:0,transform:'translateY(28px)',filter:'blur(8px)'},{opacity:1,transform:'none',filter:'blur(0px)'}],{duration:isReduced()?1:650,delay:isReduced()?0:400,easing:ease,fill:'both'});
  const token=activeTween;inlineAnimation.finished.then(()=>{if(token!==activeTween)return;inlineAnimation.cancel();inlineAnimation=null;$('.mx-inline-close').focus({preventScroll:true});}).catch(()=>{});cue();window.portfolioWake?.();return true;
 }
 function closePanel(){if(!inline||closing)return;closing=true;activeTween++;const token=activeTween;inlineAnimation?.cancel();sheet.classList.add('closing');const dest=sheet.getBoundingClientRect(),r=origin?.querySelector('summary')?.getBoundingClientRect()||sourceRect;
  const dx=r?r.left-dest.left:0,dy=r?r.top-dest.top:30;
  // Clip the surface instead of squeezing its typography.
  inlineAnimation=sheet.animate([{clipPath:'inset(0% 0% 0% 0% round 32px)',opacity:1,transform:'translate(0,0)',filter:'blur(0px)'},{clipPath:'inset(30% 18% 34% 18% round 44px)',opacity:0,transform:`translate(${dx*.3}px,${dy*.3}px)`,filter:'blur(10px)'}],{duration:isReduced()?1:800,easing:'cubic-bezier(.4,0,.2,1)',fill:'both'});
  body.classList.remove('mx-case-open');backdrop.style.opacity='0';$$('.mx-neighbor,.mx-origin').forEach(e=>e.classList.remove('mx-neighbor','mx-origin'));
  inlineAnimation.finished.then(()=>{if(token!==activeTween)return;sheet.hidden=true;inline=null;closing=false;unlockCaseScroll();inlineAnimation.cancel();inlineAnimation=null;restoreFocus?.focus?.({preventScroll:true});}).catch(()=>{});
 }

 // One reversible progress controls surface, content, neighbours and river.
 let expansion=null,caseShift=0;
 const quint=p=>p*p*p*(10-15*p+6*p*p);
 function inlineBlocks(content){const root=$('.case-shell',content)||content;return [...root.children].filter(el=>!el.classList.contains('mx-case-back'));}
 function sharedVisual(root){if(!root)return null;return root.matches?.('.case-cover-link,.frame-art')?root:$('.case-cover-link,.frame-art',root)||$('svg,img,video',root)||root;}
 function paintInlineContent(html,nested=false){
  const content=$('.mx-inline-body');$$('*',content).forEach(el=>el.getAnimations().forEach(a=>a.cancel()));content.innerHTML=html;
  if(!nested)$('.sheet-title',content)?.remove();
  if(nested&&!$('.mx-case-back',content)){const back=document.createElement('button');back.type='button';back.dataset.close='';back.className='mx-case-back';back.textContent='← Back to the chapter';content.prepend(back);}
  $$('[data-close]',content).forEach(button=>button.onclick=e=>{e.preventDefault();e.stopPropagation();const previous=expansion?.history?.pop();if(previous){transitionInlineContent(previous.html,previous.nested,{direction:'back',key:previous.key,restoreScroll:previous.scroll});}else closeInline();});
  $$('.case-cover svg',content).forEach(svg=>svg.setAttribute('preserveAspectRatio','xMidYMid slice'));
  $$('h2',content).forEach(title=>window.NocturneMotion?.splitWords(title,'dialog'));
  upgradePlayers();
 }
 async function transitionInlineContent(html,nested,{source=null,direction='forward',key=null,restoreScroll=0}={}){
  const ex=expansion,content=$('.mx-inline-body');if(!ex||content.dataset.transitioning){return;}
  if(isReduced()){paintInlineContent(html,nested);sheet.scrollTop=restoreScroll;updateSheetMask();return;}
  content.dataset.transitioning='true';sheet.style.pointerEvents='none';
  const sourceHost=source?.closest?.('.case-cover-link,.float-frame,.case-cover,[data-case]')||$('.case-cover',content),sourceArt=sharedVisual(sourceHost),from=sourceArt?.getBoundingClientRect();
  const visualRadius=(art,host)=>{for(const el of [art,host,host?.closest?.('.case-cover,.float-frame')]){if(!el)continue;const value=getComputedStyle(el).borderRadius;if(value&&value.split(/\s+/).some(v=>parseFloat(v)>.5))return value;}return '18px';};
  const sourceRadius=visualRadius(sourceArt,sourceHost);const zoomSource=sourceArt?.matches('svg,img,video')?sourceArt:$('svg,img,video',sourceArt);const sourceZoom=zoomSource?getComputedStyle(zoomSource).transform:'none';
  let ghost=null,ghostClip=null;
  if(sourceArt&&from?.width&&from?.height){const frame=ex.row.getBoundingClientRect();ghostClip=document.createElement('div');ghostClip.className='mx-case-shared-clip';Object.assign(ghostClip.style,{left:frame.left+'px',top:frame.top+'px',width:frame.width+'px',height:frame.height+'px',borderRadius:getComputedStyle(ex.row).borderRadius||'32px'});ghost=document.createElement('div');const artwork=sourceArt.cloneNode(true);ghost.append(artwork);ghost.style.borderRadius=sourceRadius;ghost.style.clipPath='inset(0 round '+sourceRadius+')';const artStyle=getComputedStyle(sourceArt);for(const key of ['color','fill','stroke','filter','objectFit','objectPosition'])artwork.style[key]=artStyle[key];artwork.style.transform='none';artwork.style.opacity='1';const zoomCopy=artwork.matches('svg,img,video')?artwork:$('svg,img,video',artwork);if(zoomCopy&&zoomCopy!==artwork){zoomCopy.style.transform=sourceZoom;zoomCopy.style.transition='none';}$$('.cover-action',artwork).forEach(el=>el.remove());$$('[id]',ghost).forEach(el=>el.removeAttribute('id'));ghost.removeAttribute?.('id');ghost.classList.add('mx-case-shared');ghost.setAttribute('aria-hidden','true');ghost.style.setProperty('left',(from.left-frame.left)+'px','important');ghost.style.setProperty('top',(from.top-frame.top)+'px','important');ghost.style.setProperty('width',from.width+'px','important');ghost.style.setProperty('height',from.height+'px','important');ghostClip.append(ghost);body.append(ghostClip);sourceArt.style.opacity='0';}
  const oldLayer=document.createElement('div');oldLayer.className='mx-case-outgoing';oldLayer.innerHTML=content.innerHTML;Object.assign(oldLayer.style,{position:'absolute',left:'0',top:-sheet.scrollTop+'px',width:content.clientWidth+'px',pointerEvents:'none'});sheet.append(oldLayer);const sign=direction==='forward'?-1:1,outgoing=inlineBlocks(oldLayer),outAnimations=outgoing.map((el,i)=>el.animate([{opacity:1,transform:'translate3d(0,0,0) scale(1)',filter:'blur(0px)'},{opacity:0,transform:`translate3d(${sign*(18+i*2)}px,${-7-i}px,0) scale(.985)`,filter:'blur(11px)'}],{duration:280,delay:i*34,easing:'cubic-bezier(.55,0,.55,1)',fill:'both'}));
  paintInlineContent(html,nested);sheet.scrollTop=restoreScroll;updateSheetMask();
  let targetHost;if(direction==='back'&&key)targetHost=$$('[data-case]',content).find(el=>el.dataset.case===key);targetHost=targetHost||$('.case-cover',content);const targetArt=sharedVisual(targetHost),to=targetArt?.getBoundingClientRect();
  let move=null;const zoomCopy=ghost?.querySelector('svg,img,video');if(zoomCopy&&sourceArt!==zoomSource){const targetZoom=targetArt?.matches('svg,img,video')?targetArt:$('svg,img,video',targetArt);zoomCopy.animate([{transform:sourceZoom},{transform:targetZoom?getComputedStyle(targetZoom).transform:'none'}],{duration:680,easing:'cubic-bezier(.33,0,.2,1)',fill:'forwards'});}
  if(targetArt&&ghost&&to?.width&&to?.height){targetArt.style.opacity='0';const targetRadius=visualRadius(targetArt,targetHost);move=ghost.animate([{transform:'translate3d(0,0,0) scale(1)',borderRadius:sourceRadius},{transform:`translate3d(${to.left-from.left}px,${to.top-from.top}px,0) scale(${to.width/from.width},${to.height/from.height})`,borderRadius:targetRadius}],{duration:680,easing:'cubic-bezier(.33,0,.2,1)',fill:'both'});}
  const incoming=inlineBlocks(content),incomingAnimations=incoming.map((el,i)=>el.animate([{opacity:0,transform:el.contains(targetArt)?'none':`translate3d(${-sign*(22+i*2)}px,${10+i}px,0) scale(.99)`,filter:el.contains(targetArt)?'none':'blur(13px)'},{opacity:1,transform:el.contains(targetArt)?'none':'translate3d(0,0,0) scale(1)',filter:'blur(0px)'}],{duration:520,delay:90+i*42,easing:'cubic-bezier(.16,1,.3,1)',fill:'backwards'}));
  await Promise.allSettled([...incomingAnimations.map(a=>a.finished),...outAnimations.map(a=>a.finished),...(move?[move.finished]:[])]);oldLayer.remove();
  if(expansion!==ex){ghostClip?.remove();return;}
  if(targetArt&&ghost){
   // The media parent stays stationary; overlap both images at the one endpoint.
   targetArt.style.opacity='';
   // Reveal the real image fully beneath the opaque travelling image first.
   // Fading both simultaneously produces a visible dip in combined opacity.
   const dissolve=ghost.animate([{opacity:1},{opacity:0}],{duration:260,easing:'cubic-bezier(.33,0,.67,1)',fill:'both'});
   await dissolve.finished.catch(()=>{});
  }
  ghostClip?.remove();content.removeAttribute('data-transitioning');sheet.style.pointerEvents='';
  const focusTarget=direction==='forward'?$('.mx-case-back',content):targetHost;focusTarget?.focus?.({preventScroll:true});window.portfolioWake?.();
 }

 function bridgeReturnedSurface(summary,from,skin){
  if(isReduced())return;
  const box=summary.getBoundingClientRect(),m=new DOMMatrixReadOnly(getComputedStyle(summary).transform);
  const ratioX=from.width/Math.max(1,box.width),ratioY=from.height/Math.max(1,box.height);
  const a=m.a*ratioX,d=m.d*ratioY,x=m.m41+from.left-box.left+(from.width-box.width)/2,y=m.m42+from.top-box.top+(from.height-box.height)/2;
  summary._returnPose={at:performance.now(),a,d,x,y,alpha:Number(summary.dataset.visibility??1),gpuAlpha:skin?.alpha??1,blur:Number(summary.dataset.motionBlur||0),yaw:Number(summary.style.getPropertyValue('--in-yaw')||0),rot:Number(summary.style.getPropertyValue('--in-rot')||0),entry:skin?.apertureEntry??1,exit:skin?.apertureExit??0};
  summary._returnBlend=0;summary.style.transform=`matrix(${a},0,0,${d},${x},${y})`;summary._w={};
 }
 // Reparenting changes each child's containing block independently of the shell.
 // Preserve its presented box, then release it into the restored layout.
 function bridgeReturnedChild(el,from){
  if(isReduced()||!el?.isConnected||!from.width||!from.height)return;
  el._finishReturn?.();
  const keys=['translate','scale','transition','opacity'],saved=keys.map(k=>[k,el.style.getPropertyValue(k),el.style.getPropertyPriority(k)]);
  const cs=getComputedStyle(el),endTranslate=cs.translate,endScale=cs.scale,endOpacity=cs.opacity;
  const parts=value=>value==='none'?[0,0]:value.split(/\s+/).map(parseFloat);
  const trans=parts(endTranslate),sc=endScale==='none'?[1,1]:endScale.split(/\s+/).map(Number);
  let tx=trans[0]||0,ty=trans[1]||0,sx=sc[0]||1,sy=sc[1]||sc[0]||1;
  el.style.setProperty('transition','none','important');
  const place=()=>{el.style.translate=tx+'px '+ty+'px';el.style.scale=sx+' '+sy;};
  place();
  // A small local Jacobian accounts for the parent's scale and perspective.
  // Raw screen-pixel translate was wrong on the previous circle-only repair.
  for(let i=0;i<3;i++){
   let r=el.getBoundingClientRect();sx*=from.width/Math.max(.01,r.width);sy*=from.height/Math.max(.01,r.height);place();r=el.getBoundingClientRect();
   tx+=1;place();const rx=el.getBoundingClientRect();tx-=1;ty+=1;place();const ry=el.getBoundingClientRect();ty-=1;
   const ax=rx.left-r.left,ay=rx.top-r.top,bx=ry.left-r.left,by=ry.top-r.top,det=ax*by-ay*bx,dx=from.left-r.left,dy=from.top-r.top;
   if(Math.abs(det)>.00001){tx+=(dx*by-dy*bx)/det;ty+=(dy*ax-dx*ay)/det;}place();
  }
  let animation,done=false;
  const finish=()=>{if(done)return;done=true;animation?.cancel();for(const [k,v,priority] of saved){if(v)el.style.setProperty(k,v,priority);else el.style.removeProperty(k);}delete el._finishReturn;};
  el._finishReturn=finish;
  animation=el.animate([{translate:el.style.translate,scale:el.style.scale,opacity:from.opacity},{translate:endTranslate,scale:endScale,opacity:endOpacity}],{duration:480,easing:'cubic-bezier(.22,1,.36,1)',fill:'both'});
  animation.finished.then(finish).catch(()=>{});
 }
 function openInline(html,source){
  if(!flags.careerInlineCase)return false;
  const row=source?.closest?.('.exp');if(!row&&!expansion)return openPanel(html,source);
  if(expansion){if(closing){closing=false;expansion.row.classList.remove('mx-return-focus');expansion.settled=false;expansion.startV=expansion.v||0;expansion.from=expansion.p;expansion.to=1;expansion.at=performance.now();expansion.elapsed=0;}else{const key=source?.closest?.('[data-case]')?.dataset.case||null;expansion.history??=[];expansion.history.push({html:$('.mx-inline-body').innerHTML,scroll:sheet.scrollTop,nested:expansion.history.length>0,key});transitionInlineContent(html,true,{source,direction:'forward',key,restoreScroll:0});}return true;}
  row.classList.remove('mx-return-focus');
  window.NocturneScroll?.cancel();hover(null);lockCaseScroll();
  $$('.career-logo,.career-info,.career-play,.career-date',row).forEach(el=>el._finishReturn?.());
  const bubble=$('.career-bubble',row),r=$('summary',row).getBoundingClientRect(),summary=$('summary',row),rr=row.getBoundingClientRect();
  const spacer=document.createElement(row.tagName);spacer.className='mx-placeholder';spacer.style.cssText=`height:${rr.height}px;margin-bottom:${getComputedStyle(row).marginBottom}`;
  const cs0=getComputedStyle(bubble),t0=getComputedStyle($('h3',row)),cs={padding:cs0.padding,gap:cs0.gap,gridTemplateColumns:cs0.gridTemplateColumns},title={fontSize:t0.fontSize,margin:t0.margin},roleSize=getComputedStyle($('.career-role',row)).fontSize;
  const sourceLogoSvg=$('.career-logo svg',row),sourceLogoSvgStyle=sourceLogoSvg?{width:getComputedStyle(sourceLogoSvg).width,height:getComputedStyle(sourceLogoSvg).height}:null;
  const sourceMetrics={radius:cs0.borderRadius,logoWidth:getComputedStyle($('.career-logo',row)).width,logoHeight:getComputedStyle($('.career-logo',row)).height};
  const header=['.career-logo','.career-info','.career-play'].map(sel=>$(sel,bubble)).filter(Boolean).map(el=>{const q=el.getBoundingClientRect();return{el,attrs:['role','tabindex','aria-hidden','aria-label'].map(k=>[k,el.getAttribute(k)]),parent:el.parentNode,next:el.nextSibling,style:el.style.cssText,x:q.left-r.left,y:q.top-r.top,box:{left:q.left,top:q.top,width:q.width,height:q.height},localX:el.offsetLeft,localY:el.offsetTop,w:el.offsetWidth,h:el.offsetHeight}});
  const sourceWidth=summary.offsetWidth,sourceHeight=summary.offsetHeight;
  const sourceDate=$('.career-date',row),dateBox=sourceDate?.getBoundingClientRect(),dateWidth=sourceDate?.offsetWidth;
  const dateType=sourceDate?[sourceDate,...$$('*',sourceDate)].map(el=>{const cs=getComputedStyle(el);return{el,style:el.style.cssText,font:cs.font,spacing:cs.letterSpacing,lineHeight:cs.lineHeight}}):[];
  if(summary._focus)summary._focus.velocity=0;delete summary._returnPose;delete summary._returnBlend;
  row.before(spacer);const side=r.left+r.width/2<innerWidth/2?1:-1;
  expansion={row,bubble,spacer,style:row.style.cssText,wasOpen:row.open,summary,r,sourceScale:r.width/sourceWidth,sourceWidth,sourceHeight,p:0,v:0,startV:0,from:0,to:1,elapsed:0,at:performance.now(),side,scrollAt:scrollY,header};
  // The date lives outside the card silhouette. Keep it outside the clipped
  // expanding surface as well, so it can fade back before the DOM handoff.
  const date=$('.career-date',row);
  if(date){const box=dateBox;expansion.date={el:date,parent:date.parentNode,next:date.nextSibling,style:date.style.cssText,box,width:dateWidth,type:dateType};body.append(date);for(const item of dateType){item.el.style.setProperty('font',item.font,'important');item.el.style.setProperty('letter-spacing',item.spacing,'important');item.el.style.setProperty('line-height',item.lineHeight,'important');}for(const [key,value] of Object.entries({position:'fixed',left:box.left+'px',top:box.top+'px',right:'auto',bottom:'auto',width:expansion.date.width+'px',height:'auto',margin:'0',zIndex:'156',transformOrigin:'0 0',transform:`scale(${box.width/dateWidth})`,pointerEvents:'none'}))date.style.setProperty(key.replace(/[A-Z]/g,m=>'-'+m.toLowerCase()),value,'important');}
  origin=row;restoreFocus=summary;sourceRect=r;body.append(row);row.open=true;row.classList.add('mx-expanded');row.classList.toggle('mx-expand-left',side<0);
  if(sourceLogoSvgStyle){row.style.setProperty('--mx-logo-svg-width',sourceLogoSvgStyle.width);row.style.setProperty('--mx-logo-svg-height',sourceLogoSvgStyle.height);}
  row.style.setProperty('--mx-header-pad',cs.padding);row.style.setProperty('--mx-header-gap',cs.gap);row.style.setProperty('--mx-header-cols',cs.gridTemplateColumns);row.style.setProperty('--mx-title-size',title.fontSize);row.style.setProperty('--mx-title-margin',title.margin);row.style.setProperty('--mx-role-size',roleSize);row.style.setProperty('--mx-source-radius',sourceMetrics.radius);row.style.setProperty('--mx-logo-width',sourceMetrics.logoWidth);row.style.setProperty('--mx-logo-height',sourceMetrics.logoHeight);
  const w=Math.min(1320,innerWidth-48,Math.max(760,innerWidth*.82)),h=Math.min(900,innerHeight-80);
  row.style.setProperty('--mx-close-x',(w-(innerWidth<=760?66:92))+'px');row.style.setProperty('--mx-close-y',innerWidth<=760?'24px':'40px');
  expansion.dest={left:clamp(side>0?r.left+65:r.right-w-65,24,innerWidth-w-24),top:(innerHeight-h)/2,width:w,height:h};
  const playHeader=header.find(h=>h.el.classList.contains('career-play'));if(playHeader){row.append(playHeader.el);playHeader.el.removeAttribute('aria-hidden');playHeader.el.setAttribute('role','button');playHeader.el.tabIndex=0;playHeader.el.setAttribute('aria-label','Back to the journey');row.style.setProperty('--mx-play-x',playHeader.x+'px');row.style.setProperty('--mx-play-y',playHeader.y+'px');}
  row.dataset.mxBaseWidth=r.width;row.append(sheet);row.append($('.mx-inline-close'));sheet.hidden=false;sheet.scrollTop=0;sheet.classList.remove('closing');sheet.style.cssText=`--mx-content-width:${w-(innerWidth<=760?56:120)}px;--mx-content-height:${h-(innerWidth<=760?155:185)}px`;updateSheetMask();
  summary.setAttribute('aria-expanded','true');summary.removeAttribute('aria-haspopup');
  paintInlineContent(html);
  $$('.exp').forEach(e=>{if(e!==row){e.classList.add('mx-neighbor');e.style.setProperty('--mx-away',(-side*90)+'px')}});
  inline={scrollAt:scrollY};closing=false;body.classList.add('mx-case-open');updateExpansion(performance.now(),0);cue();window.portfolioWake?.();return true;
 }
 function measureReturnDestination(ex){
  // Measure the actual restored layout synchronously, before any closing frame.
  // Opening boxes contain hover lift/tilt and are not valid landing targets.
  const row=ex.row,style=row.style.cssText,classes=row.className,open=row.open;
  const nodes=[...ex.header,...(ex.date?[ex.date]:[])];
  const saved=nodes.map(h=>({h,parent:h.el.parentNode,next:h.el.nextSibling,style:h.el.style.cssText}));
  ex.spacer.before(row);row.style.cssText=ex.style;row.classList.remove('mx-expanded','mx-expand-left');row.open=ex.wasOpen;
  for(const h of [...nodes].reverse()){h.el.style.cssText=h.style;h.parent.insertBefore(h.el,h.next?.parentNode===h.parent?h.next:null);}
  for(const h of nodes){const b=h.el.getBoundingClientRect();h.landingBox={left:b.left,top:b.top,width:b.width,height:b.height};delete h.landingOffset;}
  for(const s of [...saved].reverse()){s.h.el.style.cssText=s.style;s.parent.insertBefore(s.h.el,s.next?.parentNode===s.parent?s.next:null);}
  body.append(row);row.style.cssText=style;row.className=classes;row.open=open;
 }
 // FLOW58: a top-layer media viewer must not destroy its parent case on
 // orientation change. Refit the settled case behind it to the new viewport.
 function reflowInlineBehindMedia(){
  if(!expansion||closing)return;
  const ex=expansion,row=ex.row,w=Math.min(1320,innerWidth-48,Math.max(760,innerWidth*.82)),h=Math.min(900,innerHeight-80);
  ex.dest={left:(innerWidth-w)/2,top:(innerHeight-h)/2,width:w,height:h};
  row.style.setProperty('--mx-close-x',(w-(innerWidth<=760?66:92))+'px');row.style.setProperty('--mx-close-y',innerWidth<=760?'24px':'40px');
  sheet.style.setProperty('--mx-content-width',(w-(innerWidth<=760?56:120))+'px');sheet.style.setProperty('--mx-content-height',(h-(innerWidth<=760?155:185))+'px');
  ex.p=ex.from=1;ex.to=1;ex.elapsed=1.4;ex.settled=false;updateExpansion(performance.now(),0);updateSheetMask();window.portfolioWake?.();
 }
 function closeInline(){if(!expansion)return closePanel();if(closing)return;closing=true;const row=expansion.row;row.classList.add('mx-return-focus');measureReturnDestination(expansion);expansion.settled=false;expansion.startV=expansion.v||0;expansion.from=expansion.p;expansion.to=0;expansion.at=performance.now();expansion.elapsed=0;window.portfolioWake?.();}
 function updateExpansion(now,dt){
  if(!expansion){caseShift=mix(caseShift,0,1-Math.exp(-dt*7));return;}
  const ex=expansion,row=ex.row;keepCaseScroll();
  // Reparented controls must keep the same inherited lighting and text state.
  const bubbleState=ex.bubble.style,summaryState=ex.summary.style;
  const play=ex.header.find(h=>h.el.classList.contains('career-play'))?.el;
  for(const key of ['--flow','--lux'])if(play)play.style.setProperty(key,bubbleState.getPropertyValue(key)||'0');
  if(ex.date)ex.date.el.style.setProperty('--mx-focus',summaryState.getPropertyValue('--mx-focus')||'0');
  if(ex.settled&&ex.to===1)return;
  // Advance on presented frames, not time spent constructing/rasterizing the sheet.
  // A stalled frame must not skip an entire part of the unfolding trajectory.
  ex.elapsed=(ex.elapsed||0)+Math.min(dt,.05);
  const duration=ex.to===0?.72:1.4;
  const t=isReduced()?1:clamp(ex.elapsed/duration),u=t-1;
  // Layout approaches its endpoint without clipping an overshooting progress.
  // The small elastic accent is a common scale on the entire surface below.
  // One continuous trajectory, with most of its duration reserved for settling.
  // The opening velocity peaks early and decays to zero with a fourth-order tail.
  const eased=ex.to===1?1-Math.pow(1-t,5)*(1+5*t):t*t*t*(10+t*(-15+6*t));
  ex.p=mix(ex.from,ex.to,eased);
  ex.v=(ex.to-ex.from)*(ex.to===1?30*t*Math.pow(1-t,4):30*t*t*(1-t)*(1-t))/duration;
  const p=ex.p,r=ex.r,d=ex.dest;
  if(t===1&&ex.to===1){ex.settled=true;const control=ex.header.find(h=>h.el.classList.contains('career-play'))?.el;control?.focus({preventScroll:true});}
  // Source remains at its document location if native scrollbar moves mid-morph.
  const sourceTop=r.top+ex.scrollAt-scrollY;
  // Uniform scale keeps CSS and GPU perspective on the same local plane.
  // The former nonuniform scale projected a tall sheet into a short source card.
  const accent=ex.to===1?.0035*16*t*t*(1-t)*(1-t):0;
  const sx=mix(ex.sourceScale,1,p)*(1+accent),sy=sx;
  const centerX=mix(r.left+r.width*.5,d.left+d.width*.5,p),centerY=mix(sourceTop+r.height*.5,d.top+d.height*.5,p);
  const bx=centerX-mix(ex.sourceWidth,d.width,p)*sx*.5,by=centerY-mix(ex.sourceHeight,d.height,p)*sy*.5;
  const localW=mix(ex.sourceWidth,d.width,p),localH=mix(ex.sourceHeight,d.height,p);
  Object.assign(row.style,{left:'0px',top:'0px',width:localW+'px',height:localH+'px',transformOrigin:'0 0'});
  row.dataset.mxLocalWidth=localW;row.dataset.mxLocalHeight=localH;
  row.style.setProperty('transform',`translate3d(${bx}px,${by}px,0) scale(${sx})`,'important');
  row.style.setProperty('--mx-inv-x',1/sx);row.style.setProperty('--mx-inv-y',1/sy);
  row.style.setProperty('--mx-open',clamp(p));row.dataset.mxProgress=clamp(p);
  for(const h of ex.header){const isInfo=h.el.classList.contains('career-info'),isPlay=h.el.classList.contains('career-play');const x=mix(h.localX,isInfo?(innerWidth<=760?78:104):(innerWidth<=760?24:36),p),y=mix(h.localY,innerWidth<=760?24:34,p);h.el.style.setProperty('position','absolute','important');h.el.style.setProperty('left','0px','important');h.el.style.setProperty('top','0px','important');h.el.style.removeProperty('translate');if(!isPlay)h.el.style.setProperty('transform',`translate3d(${x}px,${y}px,0)`,'important');h.el.style.setProperty('width',((isPlay&&innerWidth<=760?mix(h.w,42,p):h.w)*(isPlay?mix(ex.sourceScale,1,p):1))+'px','important');h.el.style.setProperty('height',((isPlay&&innerWidth<=760?mix(h.h,42,p):h.h)*(isPlay?mix(ex.sourceScale,1,p):1))+'px','important');}
  // Finish the small containing-block correction while the card is still in
  // flight. At p=0 every header child already occupies its compact screen box,
  // so the DOM handoff has no second movement to reveal.
  const landing=closing?quint(clamp((.42-p)/.42)):0;
  if(landing){for(const h of ex.header){const isPlay=h.el.classList.contains('career-play'),hx=isPlay?mix(parseFloat(row.style.getPropertyValue('--mx-play-x')),parseFloat(row.style.getPropertyValue('--mx-close-x')),clamp(p)):sx*mix(h.localX,h.el.classList.contains('career-info')?(innerWidth<=760?78:104):(innerWidth<=760?24:36),p),hy=isPlay?mix(parseFloat(row.style.getPropertyValue('--mx-play-y')),parseFloat(row.style.getPropertyValue('--mx-close-y')),clamp(p)):sx*mix(h.localY,innerWidth<=760?24:34,p);if(!h.landingOffset){const measured=h.el.getBoundingClientRect();h.landingOffset={x:(measured.left-bx-hx)/sx,y:(measured.top-by-hy)/sy};}const base={left:bx+hx+h.landingOffset.x*sx,top:by+hy+h.landingOffset.y*sy},target=h.landingBox||h.box,targetLeft=target.left,targetTop=target.top,desiredLeft=mix(base.left,targetLeft,landing),desiredTop=mix(base.top,targetTop,landing);let tx=(desiredLeft-base.left)/Math.max(.001,sx),ty=(desiredTop-base.top)/Math.max(.001,sy);h.el.style.setProperty('translate',tx+'px '+ty+'px','important');}}

  const reveal=quint(clamp((p-.1)/.72)),content=$('.mx-inline-body');
  sheet.style.opacity=reveal;sheet.style.pointerEvents=p>.65&&!closing?'auto':'none';content.style.transform=`translateX(${ex.side*(1-reveal)*28}px)`;content.style.filter='none';
  $('.mx-inline-close').style.opacity=reveal;caseShift=-ex.side*85*p;
  for(const n of $$('.mx-neighbor')){n.style.setProperty('--mx-displace',(-ex.side*90*p)+'px');n.style.setProperty('--mx-dim',Math.pow(1-clamp(p),3));}
  for(const layer of $$('.mx-neighbor,.story-sticky,.timeline-foot'))layer.style.setProperty('--mx-case-progress',clamp(p));
  backdrop.style.opacity=String(clamp(p));
  if(ex.date){ex.date.el.style.setProperty('opacity',String(.85*(1-quint(clamp(p*2.5)))),'important');ex.date.el.style.setProperty('top',mix(ex.date.box.top+ex.scrollAt-scrollY,ex.date.landingBox?.top??ex.date.box.top,landing)+'px','important');}

  if(t===1&&ex.to===0){const returningPlay=ex.header.find(h=>h.el.classList.contains('career-play'))?.el,shouldRestoreFocus=document.activeElement===document.body||document.activeElement?.classList.contains('mx-inline-close')||document.activeElement===returningPlay;sheet.hidden=true;sheet.prepend($('.mx-inline-close'));body.append(sheet);ex.spacer.replaceWith(row);row.style.cssText=ex.style;if(ex.date){for(const item of ex.date.type)item.el.style.cssText=item.style;ex.date.el.style.cssText=ex.date.style;ex.date.parent.insertBefore(ex.date.el,ex.date.next?.parentNode===ex.date.parent?ex.date.next:null);}for(const h of ex.header){h.el.style.cssText=h.style;for(const [k,v] of h.attrs){if(v===null)h.el.removeAttribute(k);else h.el.setAttribute(k,v);}if(h.el.parentNode!==h.parent)h.parent.insertBefore(h.el,h.next?.parentNode===h.parent?h.next:null);}row.open=ex.wasOpen;row.classList.remove('mx-expanded','mx-expand-left');delete row.dataset.mxProgress;delete row.dataset.mxLocalWidth;delete row.dataset.mxLocalHeight;ex.summary.setAttribute('aria-expanded','false');body.classList.remove('mx-case-open');for(const n of $$('.mx-neighbor')){n.classList.remove('mx-neighbor');['--mx-away','--mx-displace','--mx-dim'].forEach(k=>n.style.removeProperty(k));}expansion=null;inline=null;closing=false;origin=null;unlockCaseScroll();row._landingAt=performance.now();ex.summary._floatResumeAt=performance.now();if(ex.summary._focus)ex.summary._focus.velocity=0;window.Nocturne?.layout?.();if(shouldRestoreFocus)ex.summary.focus({preventScroll:true});const releaseReturnFocus=()=>{row._hoverReleaseAt=performance.now();row.classList.add('mx-hover-ready');for(const key of ['--rx','--ry','--rz'])ex.bubble.style.setProperty(key,'0deg');for(const key of ['--px','--py'])ex.bubble.style.setProperty(key,'0px');ex.bubble.style.setProperty('--ps','1');row.classList.remove('mx-return-focus');window.portfolioWake?.();};releaseReturnFocus();hover(null);}
 }
 document.addEventListener('click',e=>{if(window.NocturneMedia?.isOpen||!inline)return;const row=expansion?.row;
  if(row&&e.target.closest('.mx-expanded summary,.mx-expanded>.career-play,.mx-inline-close')||!e.target.closest('.mx-expanded,.mx-inline-case,.mx-lab')){e.preventDefault();e.stopImmediatePropagation();closeInline();}
 },{capture:true});
 addEventListener('resize',()=>{if(expansion){if(window.NocturneMedia?.isOpen)reflowInlineBehindMedia();else closeInline();}},{passive:true});

 document.addEventListener('keydown',e=>{if(window.NocturneMedia?.isOpen)return;if(inline&&e.key==='Tab'){const scope=expansion?.row||sheet,items=$$('button:not([disabled]),a[href],[tabindex="0"]',scope).filter(el=>el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden');if(items.length){const first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}if(inline&&(e.key==='Escape'||(['Enter',' '].includes(e.key)&&e.target.matches('.mx-expanded>.career-play')))){e.preventDefault();e.stopImmediatePropagation();closeInline();}},{capture:true});
 // The feature panel is deliberately separate from product settings: experimental A/B only.
 const lab=document.createElement('details');lab.className='mx-lab';lab.innerHTML='<summary>Motion Lab</summary><div><b>EXPERIMENTAL / A–B</b><p>Each switch restores that component’s baseline.</p>'+Object.keys(flags).map(k=>`<label><input type="checkbox" data-flag="${k}" ${flags[k]?'checked':''}>${k}</label>`).join('')+'<button type="button" data-all="off">Baseline components</button><button type="button" data-all="on">New design</button></div>';body.append(lab);
 lab.addEventListener('change',e=>{if(e.target.dataset.flag){flags[e.target.dataset.flag]=e.target.checked;if(!flags.careerInlineCase)closeInline();apply();save();}});lab.addEventListener('click',e=>{if(e.target.dataset.all){for(const k of Object.keys(flags))flags[k]=e.target.dataset.all==='on';$$('[data-flag]',lab).forEach(e=>e.checked=flags[e.dataset.flag]);if(!flags.careerInlineCase)closeInline();apply();save();}});
 // A single fluid ribbon responds to velocity. It is intentionally much quieter than the references.
 const fluid=document.createElementNS('http://www.w3.org/2000/svg','svg');fluid.classList.add('mx-fluid');fluid.setAttribute('aria-hidden','true');fluid.innerHTML='<defs><linearGradient id="mx-fluid-tone"><stop stop-color="#a4d8f2" stop-opacity="0"/><stop offset=".7" stop-color="#bcb8f6" stop-opacity=".2"/><stop offset="1" stop-color="#dae9f1" stop-opacity=".45"/></linearGradient></defs><path fill="url(#mx-fluid-tone)" stroke="none"/>';body.append(fluid);const points=Array.from({length:12},()=>({x:ptr.x,y:ptr.y}));
 // Player styling and state stay with native video: no alternate autoplay loop.
 const format=t=>Number.isFinite(t)?`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`:'0:00';
 function upgradePlayers(){for(const v of $$('.film-player video')){if(v.dataset.mxPlayer)continue;const host=v.closest('.film-player'),bar=$('.film-controls',host);if(!bar)continue;v.dataset.mxPlayer='true';const clock=document.createElement('output');clock.className='mx-film-time';bar.prepend(clock);const update=()=>clock.textContent=`${format(v.currentTime)} / ${format(v.duration)}`;v.addEventListener('timeupdate',update);v.addEventListener('loadedmetadata',update);update();
  const pause=document.createElement('button');pause.className='mx-film-toggle';pause.type='button';pause.setAttribute('aria-label','Pause video');pause.textContent='Ⅱ';bar.prepend(pause);pause.onclick=e=>{e.stopPropagation();v.dataset.userPaused=v.paused?'false':'true';if(v.paused)v.play().catch(()=>{});else v.pause();};const state=()=>{pause.textContent=v.paused?'▶':'Ⅱ';pause.setAttribute('aria-label',v.paused?'Play video':'Pause video');};v.addEventListener('play',state);v.addEventListener('pause',state);
  v.addEventListener('waiting',()=>host.classList.add('mx-buffering'));v.addEventListener('playing',()=>host.classList.remove('mx-buffering'));v.addEventListener('error',()=>{clock.textContent='Preview unavailable';host.classList.remove('mx-buffering');});
 }}upgradePlayers();document.addEventListener('portfolio-player-ready',upgradePlayers);new MutationObserver(upgradePlayers).observe($('main'),{childList:true,subtree:true});
 const api=window.NocturneLab={flags,fast,markFast,openInline,closeInline,upgradePlayers,get caseProgress(){return clamp(expansion?.p||0)},get caseShift(){return caseShift},get inlineOpen(){return !!inline},get pointer(){return ptr},needsFrame:()=>!!inline||ptr.inside||scrollY<innerHeight,diagnostics:()=>({flags:{...flags},fast:fast(),inline:!!inline,trail:cards.filter(c=>performance.now()-c.born<1100).length,flowAvailable:!!gl,flowReady}),tick};
 function tick(t,dt){updateExpansion(t*1000,dt);const {scrollY,innerWidth,innerHeight}=window.NocturneFrame||window;const now=t*1000,dy=scrollY-lastY;for(let i=retiringPreviews.length-1;i>=0;i--){if(now-retiringPreviews[i].at>950){retiringPreviews[i].el.remove();retiringPreviews.splice(i,1);}}const speed=Math.abs(dy)/Math.max(.008,dt);if(!window.NocturneScroll?.synchronized?.()&&(Math.abs(dy)>innerHeight*.6||speed>innerHeight*2.5))markFast();lastY=scrollY;lastTick=t;
  const reduced=isReduced(),active=fine.matches&&!reduced;body.classList.toggle('mx-fast',fast());body.classList.toggle('mx-cursor-ready',flags.contextCursor&&active&&ptr.inside);
  const grassStep=1-Math.exp(-Math.min(dt,.05)*3.5);
  ptr.gx=mix(ptr.gx,ptr.x,grassStep);ptr.gy=mix(ptr.gy,ptr.y,grassStep);
  ptr.grassX=mix(ptr.grassX,ptr.gx,grassStep);ptr.grassY=mix(ptr.grassY,ptr.gy,grassStep);
  ptr.grassPower=mix(ptr.grassPower,active&&ptr.inside&&!fast()?Math.min(.20,ptr.brush*.7):0,1-Math.exp(-Math.min(dt,.05)*1.8));
  const k=1-Math.exp(-dt*8);ptr.rx=mix(ptr.rx,ptr.x,k);ptr.ry=mix(ptr.ry,ptr.y,k);ptr.speed*=Math.exp(-dt*4);ptr.brush=mix(ptr.brush,active&&ptr.inside&&!fast()?clamp(ptr.speed*.20,0,.34):0,1-Math.exp(-dt*2.2));const cursorDx=ptr.x-ptr.rx,cursorDy=ptr.y-ptr.ry,cursorAngle=Math.atan2(cursorDy,cursorDx)*180/Math.PI;cursor.style.transform=`translate3d(${ptr.x}px,${ptr.y}px,0)`;ring.style.transform=`translate(${ptr.rx-ptr.x}px,${ptr.ry-ptr.y}px) rotate(${cursorAngle}deg) scale(${1+ptr.speed*.12},${1-ptr.speed*.045})`;
  if(flags.careerPreview&&active&&previewTarget?.isConnected&&!inline&&!fast()&&now-previewAt>120){
   preview.classList.add('visible');const row=previewTarget.closest('.exp'),r=(row?.querySelector('.career-bubble')||previewTarget).getBoundingClientRect(),side=innerWidth-r.right>r.left?1:-1,gap=34,available=side>0?innerWidth-r.right-gap-20:r.left-gap-20;
   const belowWidth=Math.min(340,Math.max(190,available)),belowX=clamp(side>0?r.right+gap:r.left-gap-belowWidth,20,innerWidth-belowWidth-20),belowY=clamp(r.top+r.height*.5-120,80,Math.max(80,innerHeight-430));
   if(preview._layoutWidth!==innerWidth){
    const textTop=$$('figure',preview).length*76+50;preview.style.setProperty('--preview-text-top',textTop+'px');preview.style.setProperty('--preview-width',belowWidth+'px');preview.dataset.layout='below';preview.removeAttribute('data-text-only');
    const copy=$('.mx-preview-copy',preview),height=copy?.scrollHeight||0,candidate={left:belowX,top:belowY+textTop,right:belowX+belowWidth,bottom:belowY+textTop+height};
    const collision=$$('.exp:not(.mx-expanded) .career-bubble').filter(el=>el.closest('.exp')!==row).some(el=>{const q=el.getBoundingClientRect();return candidate.left<q.right+18&&candidate.right>q.left-18&&candidate.top<q.bottom+18&&candidate.bottom>q.top-18;});
    preview.dataset.layout=collision||candidate.bottom>innerHeight-24?'beside':'below';preview._layoutWidth=innerWidth;
   }
   const beside=preview.dataset.layout==='beside',pw=beside?Math.min(560,Math.max(190,available)):belowWidth,compact=beside&&pw<370,artWidth=pw<480?112:136;
   preview.style.setProperty('--preview-width',pw+'px');preview.style.setProperty('--preview-art',artWidth+'px');preview.style.setProperty('--preview-copy-x',(compact?0:artWidth+32)+'px');preview.toggleAttribute('data-text-only',compact);
   const px=beside?clamp(side>0?r.right+gap:r.left-gap-pw,20,innerWidth-pw-20):belowX,py=beside?clamp(r.top+12,85,Math.max(85,innerHeight-240)):belowY;
   preview.style.transform=`translate3d(${px}px,${py}px,0)`;$$('figure',preview).forEach((f,i)=>{f.style.setProperty('--float',(Math.sin(t*.85+i*1.8)*5)+'px');f.style.setProperty('--side',side);});
  }else preview.classList.remove('visible');

  // Fixed-position stamps, matching the reference component's 300/30 spring.
  if(flags.heroImageTrail&&active&&!inline&&!fast()&&scrollY<innerHeight*.35&&ptr.inside&&!ptr.target?.closest('a,button,.mx-lab')&&Math.hypot(ptr.x-lastTrail.x,ptr.y-lastTrail.y)>28&&now-trailAt>32){
   const hw=56,hh=38;let x=clamp(ptr.x,hw+8,innerWidth-hw-8),y=clamp(ptr.y,90+hh,innerHeight-hh-12);
   let letterDim=1;for(const word of $$('#intro-title .name-word')){const r=word.getBoundingClientRect(),nx=(x-r.left-r.width/2)/(r.width/2+hw),ny=(y-r.top-r.height/2)/(r.height/2+hh);letterDim=Math.min(letterDim,1-.48*Math.exp(-(nx*nx+ny*ny)*2.4));}
   const previous=cards[(trailIndex+cards.length-1)%cards.length];
   if(now-previous.born>120||Math.hypot(x-previous.x,y-previous.y)>19){const c=cards[trailIndex++%cards.length];const ir=$('.intro').getBoundingClientRect();c.x=x-ir.left;c.y=y-ir.top;c.letterDim=letterDim;c.scrollAt=scrollY;c.born=now;c.el.style.zIndex=String(trailIndex);trailAt=now;}
   lastTrail={x:ptr.x,y:ptr.y};
  }
  const spring=t=>t<=0?0:1-Math.exp(-15*t)*(Math.cos(Math.sqrt(75)*t)+15/Math.sqrt(75)*Math.sin(Math.sqrt(75)*t));
  for(const c of cards){const age=(now-c.born)/1000;if(age>1.8){if(c.shown){c.el.style.opacity='0';c.el.style.filter='none';c.shown=false;}continue;}
   const enter=spring(age),leave=age<1?0:spring(age-1),visibility=clamp(enter)*(1-clamp(leave));
   const scrollFade=quint(clamp((scrollY-c.scrollAt)/ (innerHeight*.55)));const opacity=active&&flags.heroImageTrail?visibility*(1-scrollFade)*(c.letterDim??1):0;c.shown=true;
   const letterBlur=clamp((1-(c.letterDim??1))/.48)*12;
   c.el.style.opacity=opacity.toFixed(5);c.el.style.filter=`blur(${Math.max(0,(1-enter)*8+leave*8+scrollFade*14+letterBlur).toFixed(2)}px)`;
   c.el.style.transform=`translate3d(${c.x-56}px,${c.y-38}px,0) scale(${(.5+.5*enter-.5*leave).toFixed(5)})`;
  }
  const track=marqueeTrack;marqueeSpeed=mix(marqueeSpeed,marqueePaused?0:1,1-Math.exp(-dt*4));if(flags.heroMarquee&&scrollY<innerHeight&&!reduced){marqueeX=(marqueeX+dt*32*marqueeSpeed)%marqueeWidth;track.style.transform=`translateX(${-marqueeX}px)`;}const mq=clamp((scrollY/innerHeight-.025)/.59),depart=mq*mq*mq*(10-15*mq+6*mq*mq);
  marquee.style.opacity=String(1-depart);marquee.style.transform=reduced?'none':`translate3d(${-depart*38}px,${-depart*115}px,0) scale(${1+depart*.035})`;marquee.style.filter=reduced?'none':`blur(${depart*11}px)`;
  const fluidOn=flags.fluidPointer&&active&&ptr.inside&&!fast()&&!inline&&scrollY<innerHeight;
  // The ribbon belongs below the hero lettering so difference blending can
  // sample it. Keep fixed viewport coordinates; no duplicate text or canvas.
  if(fluid.parentNode===body)$('.intro').append(fluid);
  points[0].x=ptr.rx;points[0].y=ptr.ry;for(let i=1;i<points.length;i++){points[i].x=mix(points[i].x,points[i-1].x,1-Math.exp(-dt*20));points[i].y=mix(points[i].y,points[i-1].y,1-Math.exp(-dt*20));}fluid.style.opacity=String(fluidOn?clamp(ptr.brush*2.8):0);const path=$('path',fluid);
  // Keep the spring state above up to date, but build the SVG outline only
  // while the ribbon is actually visible. This also avoids idle desktop work.
  if(fine.matches&&fluidOn&&ptr.brush>0){
  const outline=[];for(const side of [1,-1]){const edge=[];for(let i=0;i<points.length;i++){const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],len=Math.max(1,Math.hypot(b.x-a.x,b.y-a.y)),w=(5+ptr.brush*32)*Math.pow(1-i/(points.length-1),1.65);edge.push({x:points[i].x-(b.y-a.y)/len*w*side,y:points[i].y+(b.x-a.x)/len*w*side});}outline.push(...(side===1?edge:edge.reverse()));}
  let d=`M${outline[0].x},${outline[0].y}`;for(let i=1;i<=outline.length;i++){const a=outline[i%outline.length],b=outline[(i+1)%outline.length];d+=` Q${a.x},${a.y} ${(a.x+b.x)/2},${(a.y+b.y)/2}`;}path.setAttribute('d',d+' Z');
  }

  applyGoo(t,reduced);drawFlow(dt);
 }
 // Local, bounded SVG goo on Companion. No page-wide filter.
 const defs=document.createElementNS('http://www.w3.org/2000/svg','svg');defs.setAttribute('width','0');defs.setAttribute('height','0');defs.setAttribute('aria-hidden','true');defs.innerHTML='<defs><filter id="mx-companion-goo" x="-20%" y="-40%" width="140%" height="180%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="0" result="b"/><feColorMatrix in="b" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0"/></filter></defs>';body.prepend(defs);
 let gooAt=-100,gooSeen=false;function applyGoo(t,reduced){const h=$('#companion h2');if(!h)return;const v=window.LiquidPortfolio?.states().find(s=>s.id==='companion');const seen=!!v?.visible&&v.entry>.3;if(seen&&!gooSeen)gooAt=t;gooSeen=seen;const p=clamp((t-gooAt)/1.2);if(flags.companionGooType&&seen&&p<1&&!fast()&&!reduced){h.style.setProperty('filter','url(#mx-companion-goo)','important');$('feGaussianBlur',defs).setAttribute('stdDeviation',String(16*(1-p)**3));$('feColorMatrix',defs).setAttribute('values',`1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 ${1+12*(1-p)**2} ${-5*(1-p)**2}`);}else h.style.removeProperty('filter');}
 // Shared local image shader: velocity trail bends UVs, a small spectral fringe follows.
 const canvas=document.createElement('canvas');canvas.className='mx-flow';canvas.setAttribute('aria-hidden','true');body.append(canvas);let gl=null,program=null,flowTarget=null,flowRect=null,flowReady=false,flowPower=0;const cache=new WeakMap();
 try{gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:false});if(gl){const compile=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s};program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,'attribute vec2 p;varying vec2 uv;void main(){uv=p*.5+.5;gl_Position=vec4(p,0.,1.);}'));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,'precision mediump float;uniform sampler2D tex;uniform vec2 mouse;uniform vec2 velocity;uniform float power;varying vec2 uv;void main(){vec2 q=vec2(uv.x,1.-uv.y);vec2 d=q-mouse;float g=exp(-dot(d,d)*14.);vec2 f=velocity*g*power*.018;vec2 w=q+f;vec4 c=texture2D(tex,clamp(w,0.,1.));c.r=texture2D(tex,clamp(w+f*.18,0.,1.)).r;c.b=texture2D(tex,clamp(w-f*.18,0.,1.)).b;gl_FragColor=c;}'));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('flow link');gl.useProgram(program);const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const loc=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);program.u=Object.fromEntries(['mouse','velocity','power'].map(n=>[n,gl.getUniformLocation(program,n)]));}}catch{gl=null;}
 document.addEventListener('pointermove',e=>{if(e.target.closest?.('.bento-tile')){flowTarget=null;flowReady=false;canvas.style.opacity='0';return;}if(flowTarget&&flowRect&&e.clientX>=flowRect.left&&e.clientX<=flowRect.right&&e.clientY>=flowRect.top&&e.clientY<=flowRect.bottom)return;const target=e.target.closest('.study-preview img,.bento-frame svg,.frame-art svg')||e.target.closest('.bento-tile,.float-frame,.card-glass')?.querySelector('.bento-frame svg,.frame-art svg,.study-preview img')||($$('#bento .bento-frame svg').find(el=>{const r=el.getBoundingClientRect();return e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom}));if(target?.closest('.bento-tile')){flowTarget=null;flowReady=false;canvas.style.opacity='0';return;}if(target===flowTarget)return;flowTarget=target;flowReady=false;if(!target||!gl)return;flowRect=target.getBoundingClientRect();let img=cache.get(target);if(!img){img=new Image();img.src=target.tagName.toLowerCase()==='svg'?'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(target)):target.src;cache.set(target,img);}img.decode().then(()=>{if(flowTarget!==target)return;try{gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);flowReady=true;}catch{flowReady=false;}}).catch(()=>{});},{passive:true});
 addEventListener('scroll',()=>{flowReady=false;flowTarget=null;},{passive:true});
 function drawFlow(dt){if(!gl)return;flowPower=mix(flowPower,ptr.speed,1-Math.exp(-dt*8));const on=flags.mediaFlow&&flowReady&&ptr.inside&&fine.matches&&!isReduced()&&!fast()&&!inline&&flowRect&&ptr.x>=flowRect.left&&ptr.x<=flowRect.right&&ptr.y>=flowRect.top&&ptr.y<=flowRect.bottom;canvas.style.opacity=on?String(clamp(flowPower*2)): '0';if(!on)return;const r=flowRect,w=Math.min(800,Math.round(r.width)),h=Math.max(1,Math.round(w*r.height/r.width));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);}canvas.style.cssText=`left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;opacity:${clamp(flowPower*2)}`;gl.uniform2f(program.u.mouse,(ptr.x-r.left)/r.width,(ptr.y-r.top)/r.height);gl.uniform2f(program.u.velocity,clamp((ptr.x-ptr.rx)/40,-1,1),clamp((ptr.y-ptr.ry)/40,-1,1));gl.uniform1f(program.u.power,flowPower);gl.drawArrays(gl.TRIANGLES,0,6);}

 // Optional heading specimens leave the sculpted name and italic accents intact.
 const families={original:null,manrope:['Manrope','https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap'],satoshi:['Satoshi','https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap'],clash:['Clash Display','https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600&display=swap']};
 const fontLabel=document.createElement('label');fontLabel.className='mx-heading-picker';fontLabel.innerHTML='Headings <select aria-label="Heading typeface"><option value="original">Original · Syne</option><option value="manrope">Manrope</option><option value="satoshi">Satoshi</option><option value="clash">Clash Display</option></select>';$('#utilityOptions')?.append(fontLabel);
 const fontSelect=$('select',fontLabel),loadedFonts=new Set();
 function setHeadingFont(key){if(!families.hasOwnProperty(key))key='original';fontSelect.value=key;body.dataset.headingFont=key;const family=families[key];if(family){body.style.setProperty('--heading-experiment',`"${family[0]}",sans-serif`);if(!loadedFonts.has(key)){loadedFonts.add(key);const link=document.createElement('link');link.rel='stylesheet';link.href=family[1];document.head.append(link);link.onload=()=>document.fonts.load(`500 32px "${family[0]}"`).then(()=>{window.NocturneMotion?.measure();window.LiquidPortfolio?.invalidate?.();dispatchEvent(new Event('resize'));});}}else body.style.removeProperty('--heading-experiment');try{localStorage.setItem('nocturne-heading-font',key)}catch{}window.NocturneMotion?.measure();window.portfolioWake?.();}
 fontSelect.onchange=()=>setHeadingFont(fontSelect.value);let savedFont='original';try{savedFont=localStorage.getItem('nocturne-heading-font')||'original'}catch{}setHeadingFont(savedFont);
 const iconTypes=['Recover structure from pixels. Vector tools and independent research.','A character with presence. Behaviour, response and playful interaction.','Turn phones into controllers. A shared screen brings everyone together.','Explore responsive magic through materials, motion and game feel.','Small studies in colour, light and the shape of an icon.','Words become play. Experiments in puzzles and mobile interaction.','Timing, rhythm and movement. Studies that make an interface feel alive.'];
 const iconFields=['Vector research','Living systems','Shared play','Material & magic','Colour studies','Word play','Motion studies'];
 $$('.orbit-icon').forEach((el,i)=>{const detail=document.createElement('small');detail.className='mx-orbit-detail';detail.textContent=iconFields[i];detail.setAttribute('aria-hidden','true');el.append(detail);el.style.setProperty('--icon-accent',['#aadcf5','#d5c4fa','#e7b393','#c8dcaf','#c8b5ea','#a9ced4','#b9c8eb'][i]);el.setAttribute('aria-label',el.getAttribute('aria-label')+' — '+iconTypes[i]);});

 const orbitCenter=$('.orbit-center'),orbitStage=$('.orbit-stage'),orbitCopy=$('.orbit-copy');
 if(orbitCenter){let panelTimer,activeIcon=null,activePanel=null;
 // Each description owns its lifetime: never replace text in a fading panel.
 $$('.orbit-icon').forEach((icon,i)=>{
  const panel=document.createElement('div');panel.className='orbit-focus-story';panel.setAttribute('aria-hidden','true');panel.innerHTML='<b></b><p></p><span>Explore project ↗</span>';
  $('b',panel).textContent=$('span',icon).textContent;
  iconTypes[i].split(' ').forEach((word,n)=>{const part=document.createElement('span');part.textContent=word+' ';part.style.setProperty('--word-delay',Math.min(n,12)*18+'ms');$('p',panel).append(part)});
  panel.style.setProperty('--icon-accent',icon.style.getPropertyValue('--icon-accent'));orbitCenter.append(panel);
  const show=()=>{if(activeIcon===icon)return;clearTimeout(panelTimer);activeIcon=icon;activePanel?.classList.remove('visible');panelTimer=setTimeout(()=>{
   if(activeIcon!==icon)return;const mobile=innerWidth<=760&&orbitCopy,host=mobile?orbitCopy:orbitCenter;
   if(panel.parentElement!==host)host.append(panel);activePanel=panel;
   orbitCenter.classList.toggle('has-project',!mobile);orbitCopy?.classList.toggle('has-project',!!mobile);
   requestAnimationFrame(()=>{if(activeIcon===icon)panel.classList.add('visible')});
  },90)};
  const hide=()=>{if(activeIcon!==icon||icon.matches(':hover,:focus-visible'))return;clearTimeout(panelTimer);activeIcon=null;panel.classList.remove('visible');orbitCenter.classList.remove('has-project');orbitCopy?.classList.remove('has-project')};
  icon.addEventListener('pointerenter',show);icon.addEventListener('pointerleave',hide);icon.addEventListener('focus',show);icon.addEventListener('blur',hide);
 });
 addEventListener('resize',()=>{clearTimeout(panelTimer);activeIcon=null;activePanel?.classList.remove('visible');activePanel=null;orbitCenter.classList.remove('has-project');orbitCopy?.classList.remove('has-project')},{passive:true});
 }
 const invitation=$('.hero-scroll');if(invitation){invitation.innerHTML='<span class="descent-sculpture" aria-hidden="true"><svg viewBox="0 0 100 70" fill="none"><defs><linearGradient id="descent-glass" x1="18" y1="8" x2="76" y2="62" gradientUnits="userSpaceOnUse"><stop stop-color="#e6f1ff" stop-opacity=".16"/><stop offset=".24" stop-color="#dce8ff" stop-opacity=".55"/><stop offset=".46" stop-color="#f9fbff" stop-opacity=".95"/><stop offset=".6" stop-color="#d2d8f5" stop-opacity=".82"/><stop offset=".78" stop-color="#8794ca" stop-opacity=".48"/><stop offset="1" stop-color="#e7f3ff" stop-opacity=".26"/></linearGradient></defs><g clip-path="url(#descent-boundary)"><path class="descent-halo" d="M20 23Q34 25 50 46Q66 25 80 23"/><path class="descent-fold" d="M16 15Q36 21 50 37Q64 21 84 15L74 33Q61 37 50 53Q39 37 26 33Z" fill="url(#descent-glass)"/><path class="descent-rim" d="M16 15Q36 21 50 37Q64 21 84 15M26 33Q39 37 50 53Q61 37 74 33"/><path class="descent-spine" d="M50 37V53"/><clipPath id="descent-boundary"><path d="M16 15Q36 21 50 37Q64 21 84 15L74 33Q61 37 50 53Q39 37 26 33Z"/></clipPath><path clip-path="url(#descent-boundary)" class="descent-current" pathLength="100" d="M16 15Q36 21 50 37L50 53M84 15Q64 21 50 37"/></g></svg></span><span class="descent-label">Scroll to discover</span>';invitation.setAttribute('role','button');invitation.tabIndex=0;invitation.setAttribute('aria-label','Scroll to professional journey');const go=()=>{const p=window.NocturneScroll?.checkpoints?.().find(x=>x.id!=='top');if(p)window.NocturneScroll.to(p.y,{duration:1500});};invitation.addEventListener('click',e=>{e.preventDefault();go()});invitation.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go()}});}

 // One contact control travels to the closing composition, then returns on scroll-up.
 const contact=$('.contact-cta');if(contact){
 const slot=document.createElement('div');slot.className='contact-slot';slot.setAttribute('aria-hidden','true');$('.footer-links')?.after(slot);const group=document.createElement('div');group.className='contact-pair';contact.before(group);group.append(contact);
 contact.innerHTML='<span class="cta-dot" aria-hidden="true"></span><span class="cta-title">Discuss a role</span><span class="cta-arrow" aria-hidden="true">↗</span>';
 const cv=document.createElement('button');cv.className='contact-cv';cv.textContent='CV';cv.type='button';cv.disabled=true;cv.title='CV coming soon';cv.setAttribute('aria-label','CV — coming soon');group.append(cv);
 let progress=0,frame=0,last=0,docked=false;
 const draw=t=>{frame=0;const footerTop=$('.footer-note').getBoundingClientRect().top,slotTop=slot.getBoundingClientRect().top;
 // Two resting positions, with hysteresis near the viewport edge. Stopping
 // the scroll never leaves the controls suspended over the footer heading.
 if(slotTop<innerHeight-110)docked=true;else if(slotTop>innerHeight-60)docked=false;
 const goal=docked?1:0,dt=Math.min(.2,(t-last)/1000||.016);last=t;progress+=(goal-progress)*(1-Math.exp(-dt/0.18));if(Math.abs(goal-progress)<.0001)progress=goal;
 const top=innerWidth<761?group.parentElement.getBoundingClientRect().top:25,target=innerWidth<761?slotTop:Math.max(180,Math.min(innerHeight-115,footerTop-95));
 if(isReduced())progress=goal;
 group.parentElement.style.setProperty('--contact-dock',progress);
 group.style.setProperty('--contact-y',((target-top)*progress)+'px');group.style.setProperty('--contact-growth',progress);contact.classList.toggle('is-docked',progress>.85);contact.href=progress>.85?'https://www.linkedin.com/in/gleblomatoq/':'#contact';if(Math.abs(goal-progress)>.0001)frame=requestAnimationFrame(draw);};
 const wake=()=>{if(!frame){last=performance.now();frame=requestAnimationFrame(draw)}};addEventListener('scroll',wake,{passive:true});addEventListener('resize',wake,{passive:true});wake();
 }

 apply();window.portfolioWake?.();
})();
