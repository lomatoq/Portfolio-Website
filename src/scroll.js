/* FLOW62 — automatic chapter entrances, interruptible by deliberate input.
 * One playhead for words, flight and cards. Native touch keeps its own inertia.
 */
(() => {
  'use strict';
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
  const root=document.documentElement, STORAGE='nocturne-scroll-flow58';
  const DEFAULTS=Object.freeze({response:240,sensitivity:1,entranceResistance:.48,magnet:1});
  const settings={...DEFAULTS};let storageAvailable=true;
  function sanitize(v){const out={};for(const [k,lo,hi] of [['response',200,450],['sensitivity',.65,1.6],['entranceResistance',.25,.8],['magnet',0,1]])if(Number.isFinite(Number(v?.[k])))out[k]=clamp(Number(v[k]),lo,hi);return out;}
  try{Object.assign(settings,sanitize(JSON.parse(localStorage.getItem(STORAGE)||'{}')));}catch{storageAvailable=false;}
  const reduced=()=>document.body.classList.contains('reduced');
  const suspended=()=>document.hidden||root.classList.contains('booting')||window.NocturneLab?.inlineOpen||$('#dialog')?.open||window.NocturneMedia?.isOpen;
  const wake=()=>window.portfolioWake?.();
  const layoutY=el=>{let y=0;for(let n=el;n;n=n.offsetParent)y+=n.offsetTop;return y;};
  let points=[],entrances=[],maxY=0,dirty=true;
  let position=scrollY,target=scrollY,velocity=0,lastWritten=scrollY,owned=false,moving=false;
  let lastFrame=0,lastInputAt=-Infinity,inputDirection=0,mode='idle',done=null;
  let touch=null,scrollbarHeld=false,settleTimer=0,resizeTimer=0,lastCaptured=null;
  let departure=null, arrival=null;
  let inputMagnitude=0,burstStarted=0,burstDistance=0,fastUntil=0;
  let gestureSpeed=0;
  function entranceResponse(speed,distance){
    const pace=speed/Math.max(1,innerHeight),travel=clamp(Math.sqrt(Math.abs(distance)/Math.max(1,innerHeight)),.85,1.3);
    return clamp(1450*travel/(1+pace*.8),Math.max(400,settings.response),1500);
  }
  let fingerDown=false,nativeY=scrollY,nativeDirection=0,nativeTimer=0,nativePending=false;
  // Touch scrolling belongs to the browser/compositor, in both orientations.
  // Never feed finger movement into the wheel spring or its presentation gates.
  let touchDriven=matchMedia('(pointer: coarse)').matches;
  let acceptedInputs=0,settleSerial=0;const trace=[];
  function record(type,data={}){trace.push({type,at:Math.round(performance.now()),y:+position.toFixed(2),...data});if(trace.length>70)trace.shift();}
  function invalidate(){dirty=true;wake();}
  function measure(){
    if(!dirty||window.NocturneLab?.inlineOpen||window.NocturneMedia?.isOpen)return;
    dirty=false;maxY=Math.max(0,root.scrollHeight-innerHeight);const next=[];
    const add=(y,id,kind,extra={})=>{if(Number.isFinite(y))next.push({y:clamp(y,0,maxY),id,kind,hard:false,...extra});};
    add(0,'top','hero');
    $$('.exp:not(.mx-expanded)').forEach(el=>{const s=$('summary',el);add(layoutY(el)+(s?.offsetTop||0)+(s?.offsetHeight||0)/2-innerHeight/2,el.id,'career');});
    const orbit=$('#projects');if(orbit)add(layoutY(orbit)+innerHeight*.04,'projects','orbit');
    for(const p of window.LiquidPortfolio?.checkpoints?.()||[]){const a=p.id.split(':');add(p.y,p.id,a.length===1?'chapter':'gallery',{...p,chapter:a[0],rail:Number(a[1]||0),slide:a.length>1?Number(a[2]):undefined});}
    for(const id of ['bento','lab','contact']){const e=document.getElementById(id);if(e)add(layoutY(e)-(id==='contact'?80:0),id,'section');}
    add(maxY,'end','end');next.sort((a,b)=>a.y-b.y);points=[];
    for(const p of next)if(!points.length||p.y-points.at(-1).y>1)points.push(p);
    entrances=points.filter(p=>p.kind==='chapter');
  }
  function writing(v){root.classList.toggle('nocturne-scrolling',v);document.body.classList.toggle('is-navigating',v);}
  function write(y){position=clamp(y,0,maxY);if(Math.abs(scrollY-position)>.05)scrollTo({top:position,behavior:'instant'});lastWritten=scrollY;}
  function sync(){position=target=scrollY;lastWritten=scrollY;}
  function clearSettle(){clearTimeout(settleTimer);settleTimer=0;}
  function cancel(reason='external'){
    clearSettle();clearTimeout(nativeTimer);nativePending=false;moving=false;velocity=0;owned=false;lastFrame=0;done=null;touch=null;lastCaptured=null;departure=null;arrival=null;sync();nativeY=scrollY;mode='idle';writing(false);
    if(reason!=='external')record('cancel',{reason});wake();
  }
  // Exact solution of x'' + 2*w*x' + w*w*(x-target) = 0; stable for any dt.
  // Retargeting carries velocity rather than restarting an easing at rest.
  function springStep(x,v,to,omega,dt){const offset=x-to,b=v+omega*offset,d=Math.exp(-omega*dt);return {x:to+(offset+b*dt)*d,v:(v-omega*b*dt)*d};}
  function start(to,source='free'){
    if(!owned){sync();velocity=0;}
    target=clamp(to,0,maxY);moving=Math.abs(target-position)>.08||Math.abs(velocity)>.5;owned=true;mode=source;lastFrame=lastFrame||performance.now();writing(moving);wake();
  }
  function begin(y,options={}){
    measure();if(!Number.isFinite(Number(y)))return false;clearSettle();lastCaptured=null;departure=null;arrival=null;done=options.done||null;
    const to=clamp(Number(y),0,maxY);
    if(options.instant||options.duration===0||reduced()){
      owned=true;moving=false;velocity=0;target=to;write(to);lastFrame=0;mode='idle';writing(false);done?.();done=null;wake();return true;
    }
    start(to,options.menu?'navigation':options.source==='gallery-drag'?'free':'navigation');record('navigation',{to});return true;
  }
  function tick(now){
    if(suspended()){if(moving||arrival||settleTimer)cancel('suspended');return;}
    if(reduced()){if(moving||arrival||settleTimer)cancel('reduced-motion');return;}
    if(arrival&&Math.abs(position-arrival.point.y)<1&&window.LiquidPortfolio?.presentationReady(arrival.point)){
      record('presented',{id:arrival.point.id});departure={id:arrival.point.id,dir:arrival.dir};arrival=null;
    }
    if(!moving)return;
    if(Math.abs(scrollY-lastWritten)>2){cancel('native-scroll');return;}
    // Analytic spring: use elapsed time, even when a slow frame took >64 ms.
    const dt=clamp((now-(lastFrame||now-16.667))/1000,0,.2);lastFrame=now;
    if(arrival)arrival.response+=(arrival.responseTarget-arrival.response)*(1-Math.exp(-dt/0.14));
    const response=mode==='entry'?(arrival?.response||800):mode==='navigation'?Math.max(settings.response,320):mode==='gallery'?settings.response*.58:settings.response;
    const s=springStep(position,velocity,target,4.75/(response/1000),dt);velocity=s.v;write(s.x);
    if((position<=0&&target===0)||(position>=maxY&&target===maxY)){velocity=0;}
    if(Math.abs(position-target)<.22&&Math.abs(velocity)<5){
      write(target);velocity=0;moving=false;lastFrame=0;writing(false);mode='idle';settleSerial++;done?.();done=null;
      dispatchEvent(new CustomEvent('nocturne:scroll-settled',{detail:{y:position,serial:settleSerial}}));
    }
  }
  function nearest(list,y){return list.reduce((best,p)=>!best||Math.abs(p.y-y)<Math.abs(best.y-y)?p:best,null);}
  function settle(){
    settleTimer=0;if(suspended()||reduced()||touch||scrollbarHeld||arrival||!owned||!settings.magnet)return;measure();
    let p=null,limit=0;
    // Finish a half-revealed chapter, but only inside its entrance region.
    for(const a of entrances){if(inputDirection>0&&a.id!==departure?.id&&target>=a.trigger&&target<a.y&&performance.now()>fastUntil){p=a;limit=a.y-a.trigger;break;}}
    if(!p){
      const g=points.filter(a=>a.kind==='gallery'),close=nearest(g,target);
      if(close){const sib=g.filter(a=>a.chapter===close.chapter&&a.rail===close.rail),i=sib.indexOf(close),step=Math.min(sib[i+1]?.y-close.y||Infinity,close.y-sib[i-1]?.y||Infinity);if(Math.abs(close.y-target)<Math.min(165,step*.34)){p=close;limit=Math.min(165,step*.34);}}
    }
    if(!p){const c=nearest(points.filter(a=>a.kind==='career'||a.kind==='orbit'),target);if(c&&Math.abs(c.y-target)<innerHeight*.13){p=c;limit=innerHeight*.13;}}
    if(!p||p.id===departure?.id||Math.abs(p.y-target)<.5||Math.abs(p.y-target)>limit)return;
    // A short wheel gesture must keep its progress, not spring backwards to
    // the previous card when the input stream pauses.
    if(p.kind==='gallery'&&innerWidth>760&&Math.sign(p.y-target)!==inputDirection)return;
    if(p.kind==='chapter')enter(p.id);else start(p.y,'settling');record('soft-settle',{id:p.id,to:p.y});
  }
  function scheduleSettle(){clearSettle();if(settings.magnet)settleTimer=setTimeout(settle,135);}
  function enter(id,source='entrance'){
    measure();const point=entrances.find(p=>p.id===id);
    if(!point||suspended()||reduced())return false;
    const speed=source==='hover'?innerHeight*.55:source==='native-settle'?innerHeight*.35:performance.now()-lastInputAt<400?gestureSpeed:innerHeight*.4;
    const response=entranceResponse(speed,point.y-(owned?position:scrollY));
    clearSettle();done=null;arrival={point,dir:1,at:performance.now(),effort:0,response,responseTarget:response};
    inputDirection=1;start(point.y,'entry');record('arrival',{id,source,response:Math.round(response)});return true;
  }
  // Hovering the first orbit seed starts its authored flight. A small dwell
  // avoids activation when the pointer merely crosses an icon during scrolling.
  const seed=$('.orbit-icon');let hoverTimer=0;
  seed?.addEventListener('pointerenter',e=>{
    if(e.pointerType==='touch'||!matchMedia('(hover:hover) and (pointer:fine)').matches)return;
    clearTimeout(hoverTimer);hoverTimer=setTimeout(()=>{
      measure();const first=entrances[0];
      if(first&&scrollY<first.y&&!moving&&seed.matches(':hover'))enter(first.id,'hover');
    },160);
  });
  seed?.addEventListener('pointerleave',()=>clearTimeout(hoverTimer));
  function consume(delta,source='wheel'){
    if(!Number.isFinite(delta)||!delta||scrollbarHeld||suspended())return;
    measure();if(!owned||Math.abs(scrollY-lastWritten)>2){sync();velocity=0;}
    clearSettle();done=null;const dir=Math.sign(delta),now=performance.now();
    const inputGap=now-lastInputAt,magnitude=Math.abs(delta),previousMagnitude=inputMagnitude;
    const sample=magnitude/((inputGap>180||dir!==inputDirection) ? .09 : clamp(inputGap/1000,.008,.18));
    gestureSpeed=inputGap>180||dir!==inputDirection?sample:gestureSpeed+(sample-gestureSpeed)*.3;
    lastInputAt=now;inputMagnitude=magnitude;acceptedInputs++;
    if(inputGap>160||dir!==inputDirection||now-burstStarted>160){burstStarted=now;burstDistance=0;}
    burstDistance+=magnitude;
    const fast=magnitude>innerHeight*.80||burstDistance>innerHeight*.95;
    if(fast)fastUntil=now+240;
    if(arrival){
      arrival.effort+=magnitude;
      arrival.responseTarget=entranceResponse(gestureSpeed,arrival.point.y-arrival.point.trigger);
      const renewed=magnitude>previousMagnitude*1.65+24||source==='keyboard';
      const interrupt=dir!==arrival.dir||fast||renewed||arrival.effort>innerHeight*(1.04-settings.entranceResistance*.65);
      if(!interrupt){wake();return;}
      departure={id:arrival.point.id,dir};arrival=null;target=position;
      if(dir!==inputDirection)velocity=0;
    }
    // Reversal takes control now, not after the old target/animation completes.
    let base=inputDirection&&dir!==inputDirection?position:target;
    if(inputDirection&&dir!==inputDirection){departure=null;velocity=0;}
    const left=nearest(points,base);if(left&&Math.abs(left.y-base)<3)departure={id:left.id,dir};
    inputDirection=dir;
    let amount=delta*settings.sensitivity;
    let sourceMode='free';
    // Desktop chapters can allocate a very long vertical span to each card.
    // Normalize wheel travel to ~180 input pixels per card, only within a rail.
    // Native touch and project entrance timing remain independent of this gain.
    if(source==='wheel'&&innerWidth>760){
      const gallery=points.filter(p=>p.kind==='gallery');
      const a=gallery.find((p,i)=>{const q=gallery[i+1];return q&&p.chapter===q.chapter&&p.rail===q.rail&&base>=p.y-1&&base<=q.y+1;});
      if(a){const rail=gallery.filter(p=>p.chapter===a.chapter&&p.rail===a.rail),i=rail.indexOf(a),step=rail[i+1].y-a.y;
        const gain=clamp(step/180,1.5,4),remaining=dir>0?rail.at(-1).y-base:base-rail[0].y;
        amount=dir*Math.min(Math.abs(amount)*gain,Math.max(Math.abs(amount),remaining));sourceMode='gallery';
      }
    }
    let to=clamp(clamp(base+amount,0,maxY),position-innerHeight*2.3,position+innerHeight*2.3);
    // Only project entrances capture normal forward gestures. Gallery cards
    // settle after input ends; they never gate a continuous trackpad stream.
    const crossed=dir>0&&now>fastUntil&&settings.magnet?entrances.find(p=>p.id!==departure?.id&&base<p.y-1&&to>=p.trigger&&to<p.y+innerHeight*.3):null;
    if(crossed){enter(crossed.id,source);return;}
    // Bounded inertia: no stale queue extending over several projects.
    to=clamp(to,position-innerHeight*2.3,position+innerHeight*2.3);
    start(to,sourceMode);scheduleSettle();record('input',{source,delta:+delta.toFixed(2),to:+target.toFixed(2)});
  }
  const freeSelector='[data-free-scroll],.scroll-tuning-panel,.utility-options,.dialog,.mx-inline-case,.mx-lab,.media-viewer';
  const textSelector='input,textarea,select,[contenteditable]:not([contenteditable="false"])';
  const freeNode=t=>t?.closest?.(freeSelector);
  function managesInput(e){return !reduced()&&!suspended()&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!freeNode(e.target);}
  addEventListener('wheel',e=>{
    if(e.defaultPrevented||e.ctrlKey||e.metaKey||e.altKey||reduced()||suspended())return;
    touchDriven=false;
    const native=freeNode(e.target);if(native){if(native.scrollHeight<=native.clientHeight+1&&e.cancelable)e.preventDefault();return;}
    if(e.target.closest?.('select'))return;
    let delta=e.deltaY;
    if(Math.abs(e.deltaX)>Math.abs(e.deltaY)){if(!e.target.closest?.('.rail-window'))return;delta=e.deltaX;}
    delta*=e.deltaMode===1?16:e.deltaMode===2?innerHeight:1;if(!Number.isFinite(delta)||Math.abs(delta)<.01)return;
    if(e.cancelable)e.preventDefault();consume(clamp(delta,-innerHeight*3,innerHeight*3));
  },{capture:true,passive:false});
  addEventListener('keydown',e=>{
    if(e.defaultPrevented||!managesInput(e)||e.target.closest?.(textSelector))return;
    const control=e.target.closest?.('button,a,summary,video,.rail-window,[role="button"]');
    if(control&&[' ','Home','End','ArrowLeft','ArrowRight'].includes(e.key))return;
    if(e.key==='Escape'){cancel('escape');return;}
    if(e.key==='Home'||e.key==='End'){e.preventDefault();measure();begin(e.key==='Home'?0:maxY,{menu:true});return;}
    const dir={ArrowDown:1,ArrowUp:-1,PageDown:1,PageUp:-1,' ':e.shiftKey?-1:1}[e.key];if(!dir)return;
    e.preventDefault();consume(dir*(e.key.startsWith('Arrow')?90:innerHeight*.78),'keyboard');
  });
  addEventListener('touchstart',e=>{
    touchDriven=true;
    // Interrupt an anchor/button animation at the current position on contact.
    // Nested scrollers retain their own native gesture and background lock.
    if(!suspended()&&!freeNode(e.target)){cancel('native-touch');fingerDown=true;nativeDirection=0;}
  },{capture:true,passive:true});
  function settleNative(){
    clearTimeout(nativeTimer);
    if(!nativePending||fingerDown||owned||suspended()||reduced()||!settings.magnet)return;
    nativePending=false;measure();
    // Complete an unfinished entrance only after native momentum has ended.
    // A fling that passed the composition is never pulled backwards.
    const point=nativeDirection>0&&entrances.find(p=>scrollY>=p.trigger&&scrollY<p.y-2);
    if(point)enter(point.id,'native-settle');
  }
  function endTouch(){fingerDown=false;if(nativePending){clearTimeout(nativeTimer);nativeTimer=setTimeout(settleNative,180);}}
  addEventListener('touchend',endTouch,{passive:true});addEventListener('touchcancel',endTouch,{passive:true});
  addEventListener('pointerdown',e=>{if((e.clientX>=root.clientWidth&&innerWidth>root.clientWidth)||e.button===1){cancel('scrollbar');scrollbarHeld=true;}},{passive:true});
  addEventListener('pointerup',()=>{if(scrollbarHeld){scrollbarHeld=false;cancel('scrollbar-release');}},{passive:true});
  addEventListener('scroll',()=>{
    if(owned&&Math.abs(scrollY-lastWritten)>2)cancel('native-scroll');
    if(touchDriven&&!owned&&!suspended()){
      const y=scrollY;if(Math.abs(y-nativeY)>.5){nativeDirection=Math.sign(y-nativeY);nativePending=true;}nativeY=y;
      clearTimeout(nativeTimer);nativeTimer=setTimeout(settleNative,180);
    }
  },{passive:true});
  addEventListener('scrollend',settleNative,{passive:true});
  addEventListener('blur',()=>{scrollbarHeld=false;cancel('blur');});
  addEventListener('resize',()=>{
    // Mobile browser bars resize the viewport during a swipe. Never snap back
    // to a checkpoint when the visual viewport changes underneath native inertia.
    if(touchDriven){if(owned)cancel('touch-resize');invalidate();return;}
    measure();const p=nearest(points,position),id=p&&Math.abs(p.y-position)<2?p.id:null;cancel('resize');invalidate();clearTimeout(resizeTimer);
    resizeTimer=setTimeout(()=>{measure();const q=points.find(p=>p.id===id);if(q&&!suspended())begin(q.y,{instant:true});},150);
  },{passive:true});
  addEventListener('pageshow',()=>{cancel('pageshow');invalidate();});
  addEventListener('nocturne:booted',()=>{cancel('booted');invalidate();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel('hidden');});
  document.addEventListener('toggle',invalidate,{capture:true,passive:true});
  document.fonts?.ready.then(invalidate);new ResizeObserver(()=>{window.LiquidPortfolio?.invalidate();invalidate();}).observe($('main')||document.body);
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',()=>{cancel('motion-preference');invalidate();});
  $('#motionToggle')?.addEventListener('click',()=>{cancel('motion-toggle');invalidate();});
  function configure(values,persist=true){Object.assign(settings,sanitize(values));if(persist)try{localStorage.setItem(STORAGE,JSON.stringify(settings));storageAvailable=true;}catch{storageAvailable=false;}updateSettingsUI();return {...settings};}
  const api=window.NocturneScroll={
    to:begin,enter,cancel,tick,invalidate,managesInput,next(dir){consume(Math.sign(dir)*innerHeight*.75,'next');},
    active:()=>moving||!!arrival,synchronized:()=>owned||touchDriven,playhead:()=>owned?position:(window.NocturneFrame?.scrollY??scrollY),
    checkpoints:()=>{measure();return points.map(p=>({...p}));},configure,reset:()=>configure(DEFAULTS),
    get settings(){return {...settings};},
    diagnostics:()=>{measure();return {version:'flow62',mode,nativeTouch:touchDriven,position:owned?position:scrollY,actual:scrollY,target,velocity,active:moving,synchronized:owned||touchDriven,gate:arrival?{id:arrival.point.id,since:arrival.at}:null,locked:false,acceptedInputs,settleSerial,pointCount:points.length,settings:{...settings},trace:trace.map(e=>({...e}))};}
  };
  root.classList.add('nocturne-scroll');
  const options=$('#utilityOptions');let panel=null;
  function updateSettingsUI(){if(!panel)return;const note=$('[data-scroll-storage]',panel);if(note)note.textContent=storageAvailable?'Saved in this browser':'This session only';for(const input of $$('[data-scroll-setting]',panel)){const k=input.dataset.scrollSetting;input.value=String(settings[k]);const out=document.getElementById(input.id+'Value');if(out)out.textContent=k==='response'?Math.round(settings[k])+' ms':settings[k].toFixed(2)+'×';}}
  if(options){
    const toggle=document.createElement('button');toggle.type='button';toggle.id='scrollTuningToggle';toggle.textContent='Scroll feel';toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-controls','scrollTuningPanel');options.append(toggle);
    panel=document.createElement('section');panel.id='scrollTuningPanel';panel.className='scroll-tuning-panel';panel.hidden=true;panel.dataset.freeScroll='';panel.setAttribute('aria-labelledby','scrollTuningTitle');
    const fields=[['response','Softness',200,450,10],['sensitivity','Scroll speed',.65,1.6,.05],['entranceResistance','Entrance pass-through',.25,.8,.05]];
    panel.innerHTML='<div class="scroll-tuning-head"><div><small>CONTINUOUS SCROLL</small><h3 id="scrollTuningTitle">Scroll feel</h3></div><button type="button" data-scroll-close aria-label="Close scroll settings">×</button></div><p>Each project settles into view. Scroll faster to pass through, or reverse at any time. Move freely between the cards.</p>'+fields.map(([k,label,min,max,step])=>`<label class="scroll-tuning-field" for="scroll-${k}"><span>${label}<output id="scroll-${k}Value" for="scroll-${k}"></output></span><input id="scroll-${k}" data-scroll-setting="${k}" type="range" min="${min}" max="${max}" step="${step}"></label>`).join('')+'<div class="scroll-tuning-foot"><span data-scroll-storage></span><button type="button" data-scroll-reset>Reset defaults ↺</button></div>';
    document.body.append(panel);updateSettingsUI();
    function close(restore=false){panel.hidden=true;toggle.setAttribute('aria-expanded','false');if(restore)(options.hidden?$('#utilityToggle'):toggle)?.focus({preventScroll:true});}
    toggle.addEventListener('click',()=>{panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden){cancel('settings');options.hidden=true;$('#utilityToggle')?.setAttribute('aria-expanded','false');$('[data-scroll-setting]',panel).focus({preventScroll:true});}});
    $('[data-scroll-close]',panel).addEventListener('click',()=>close(true));$('[data-scroll-reset]',panel).addEventListener('click',()=>api.reset());
    panel.addEventListener('input',e=>{const el=e.target.closest('[data-scroll-setting]');if(el)configure({[el.dataset.scrollSetting]:Number(el.value)});});
    panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close(true);}});
    document.addEventListener('pointerdown',e=>{if(!panel.hidden&&!panel.contains(e.target)&&e.target!==toggle)close();},{passive:true});
  }
})();
