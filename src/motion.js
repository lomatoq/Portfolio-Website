/* NOCTURNE R14 — shared motion primitives.
 * The application owns the frame clock. This module never starts a private loop.
 * Layout is cached on resize/font changes; settled optical filters are removed.
 */
(() => {
  'use strict';
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
  const mix=(a,b,t)=>a+(b-a)*t;
  const ease=t=>1-Math.pow(1-clamp(t),3);
  const smooth=t=>{t=clamp(t);return t*t*(3-2*t);};
  const out='cubic-bezier(.16,1,.3,1)';
  const fine=matchMedia('(hover:hover) and (pointer:fine)');
  const motionQuery=matchMedia('(prefers-reduced-motion:reduce)');
  let reduced=motionQuery.matches, dirty=true, extrasBound=false;
  let mx=-10000,my=-10000,pointerInside=false,heroVisible=true;
  let sheetPointer=[0,0],sheetSoft=[0,0],sheetHover=0;
  const titleGroups=[],chapterGroups=new Map(),glyphs=[];
  // Exact solution of a critically damped spring: stable after a long frame,
  // preserves velocity when a target changes, and has no clipped final snap.
  function spring(s,target,omega,dt){
    dt=Math.min(Math.max(dt,0),.2);
    if(window.NocturneLab?.fast()&&!window.NocturneScroll?.synchronized?.())omega=Math.max(omega,35);
    const x=s.value-target,b=s.velocity+omega*x,e=Math.exp(-omega*dt);
    s.value=target+(x+b*dt)*e;s.velocity=(s.velocity-omega*b*dt)*e;
    if(Math.abs(s.value-target)<.00004&&Math.abs(s.velocity)<.0004){s.value=target;s.velocity=0;}
    return s.value;
  }
  const wake=()=>window.portfolioWake?.();
  const isLight=()=>document.body.classList.contains('eco-effects')||document.body.dataset.effectTier==='light';

  // Opaque where navigation lives; only the lower edge feathers into the scene.
  const scrim=document.createElement('div');scrim.className='nav-scrim';scrim.setAttribute('aria-hidden','true');
  $('.floating-ui').before(scrim);
  // Small, quantized RGB filter bank. Never use a page-wide SVG filter.
  const svgNS='http://www.w3.org/2000/svg',defs=document.createElementNS(svgNS,'svg');
  defs.setAttribute('class','optics-defs');defs.setAttribute('aria-hidden','true');defs.setAttribute('width','0');defs.setAttribute('height','0');
  defs.innerHTML='<defs>'+[.28,.5,.8,1.2,1.8,2.5].map((d,i)=>`<filter id="nocturne-ca-${i+1}" x="-25%" y="-35%" width="150%" height="170%" color-interpolation-filters="sRGB"><feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="red"/><feOffset in="red" dx="${d}" dy="${d*.16}" result="r"/><feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" result="cyan"/><feOffset in="cyan" dx="${-d}" dy="${-d*.12}" result="gb"/><feBlend in="r" in2="gb" mode="screen"/></filter>`).join('')+'</defs>';
  defs.insertAdjacentHTML('beforeend','<defs>'+
    '<filter id="nocturne-seam-lens" x="-30%" y="-60%" width="160%" height="220%" color-interpolation-filters="sRGB">'+
    '<feTurbulence type="fractalNoise" baseFrequency="0.0019 0.0088" numOctaves="2" seed="11" result="wave"/>'+
    '<feDisplacementMap in="SourceGraphic" in2="wave" scale="15" xChannelSelector="R" yChannelSelector="G" result="bent"/>'+
    '<feColorMatrix in="bent" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="lr"/>'+
    '<feOffset in="lr" dx="1.3" dy=".6" result="lro"/>'+
    '<feColorMatrix in="bent" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="lg"/>'+
    '<feColorMatrix in="bent" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="lb"/>'+
    '<feOffset in="lb" dx="-1.3" dy="-.6" result="lbo"/>'+
    '<feBlend in="lro" in2="lg" mode="screen" result="lrg"/>'+
    '<feBlend in="lrg" in2="lbo" mode="screen"/>'+
    '</filter></defs>');
  document.body.prepend(defs);
  function opticalFilter(amount,maxBlur=5){
    const a=clamp(amount);
    if(reduced||a<.022)return 'none';
    const b=(a*a*maxBlur).toFixed(2);
    if(isLight())return `blur(${Math.min(2,+b)}px)`;
    // Continuous optics: discrete SVG filter levels caused visible jumps and rerasterization.
    return `blur(${Math.min(3,+b)}px)`;
  }
  function optics(el,amount,maxBlur=5,property='filter'){
    const value=opticalFilter(amount,maxBlur);
    if(property.startsWith('--'))el.style.setProperty(property,value);else el.style[property]=value;
    el.classList.toggle('optics-active',value!=='none');
  }

  function splitWords(el,mode='observe'){
    if(!el||el.dataset.wordMotion)return titleGroups.find(g=>g.el===el);
    const readable=el.innerText?.replace(/\s+/g,' ').trim()||el.textContent.replace(/\s+/g,' ').trim();
    const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);const nodes=[];
    while(walker.nextNode())if(walker.currentNode.textContent.trim())nodes.push(walker.currentNode);
    const words=[];
    for(const node of nodes){
      const fragment=document.createDocumentFragment();
      for(const token of node.textContent.split(/(\s+)/)){
        if(!token)continue;
        if(/^\s+$/.test(token)){fragment.append(document.createTextNode(token));continue;}
        const word=document.createElement('span');word.className='motion-word';word.textContent=token;word.setAttribute('aria-hidden','true');
        fragment.append(word);words.push(word);
      }
      node.replaceWith(fragment);
    }
    el.dataset.wordMotion=mode;el.classList.add('word-heading');
    if(/^H[1-6]$/.test(el.tagName))el.setAttribute('aria-label',readable);
    else {
      // Paragraphs are naming-prohibited in ARIA. Keep a real readable copy,
      // with only the animated visual words hidden from assistive technology.
      el.removeAttribute('aria-label');
      const accessible=document.createElement('span');accessible.className='motion-readable';accessible.textContent=readable;el.append(accessible);
    }
    const group={el,words,mode,target:mode==='dialog'?1:0,exit:0,visible:mode==='dialog',p:{value:reduced?1:0,velocity:0},last:-1};
    titleGroups.push(group);
    if(mode==='observe')titleObserver.observe(el);
    return group;
  }
  const titleObserver=new IntersectionObserver(entries=>{for(const e of entries){const g=titleGroups.find(g=>g.el===e.target);if(!g)continue;g.visible=e.isIntersecting;g.target=e.isIntersecting?1:0;wake();}},{threshold:0,rootMargin:'-5% 0px -8% 0px'});
  $$('[data-chapter]').forEach(ch=>{
    const groups=[$('.chapter-heading h2',ch),$('.chapter-heading>p',ch)].filter(Boolean).map(h=>splitWords(h,'chapter'));
    chapterGroups.set(ch.id,groups);
  });
  $$('.orbit-copy h2,.index-head h2,.bento-head h2,.footer h2').forEach(h=>splitWords(h));
  function setChapter(id,entry,exit,visible){
    const groups=chapterGroups.get(id)||[];
    groups.forEach((g,i)=>{g.target=reduced?1:clamp((entry-.20-i*.07)/(.74-i*.02));g.exit=reduced?0:clamp(exit);g.visible=visible;});
  }
  function paintWords(g,dt){
    if(!g.el.isConnected){titleObserver.unobserve(g.el);return;}
    const target=reduced?1:g.target;
    const synchronized=g.mode==='chapter'&&window.NocturneScroll?.synchronized?.();
    let p=reduced||synchronized?target:spring(g.p,target,g.mode==='chapter'?16:10,dt);
    if(synchronized){g.p.value=target;g.p.velocity=0;}
    if(!g.visible&&g.mode==='chapter'){g.p.value=target;g.p.velocity=0;p=target;}
    const exit=g.exit||0;
    // FLOW58: scroll-driven headings stagger spatially via k below. A second
    // wall-clock ignition was leaving text grey even after a complete entrance.
    const sequential=g.mode!=='chapter'&&/^H[1-6]$/.test(g.el.tagName);
    if(p<.08||exit>.98)g.wordAge=0;
    else g.wordAge=(g.wordAge||0)+dt;
    const lighting=sequential&&!reduced&&(g.wordAge||0)<g.words.length*.14+.55;
    if(!lighting&&Math.abs(p-g.last)<.00002&&g.lastExit===exit)return;
    g.last=p;g.lastExit=exit;
    const stretch=1+(g.words.length-1)*.053;
    g.words.forEach((w,i)=>{
      const k=clamp(p*stretch-i*.053), incoming=ease(k);
      const depart=reduced?0:smooth(clamp(exit*(1+(g.words.length-1)*.065)-i*.065));
      const ignition=sequential&&!reduced?.45+.55*smooth(clamp(((g.wordAge||0)-i*.14)/.5)):1;
      const opacity=reduced?1:smooth(k)*(1-depart)*ignition;
      const blur=(1-k)**1.7*7+depart**1.3*10;
      const x=depart*(i-(g.words.length-1)*.5)*.085;
      const y=(1-incoming)*.5-depart*(.38+(i%3)*.05);
      const vertical=!!g.el.closest('.bento-head');
      const rx=(vertical?0:(1-incoming)*-24)+depart*18;
      const rz=(vertical?0:(1-incoming)*(i%2?1.3:-1.3))+depart*(i%2?3:-3);
      w.style.opacity=opacity.toFixed(5);
      w.style.transform=reduced||(k>.9999&&depart<.0001)?'none':`translate3d(${x.toFixed(4)}em,${y.toFixed(4)}em,0) rotateX(${rx.toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg) scale(${(1-depart*.07).toFixed(4)})`;
      w.style.filter=reduced||blur<.05?'none':`blur(${blur.toFixed(2)}px)`;
      const ab=((1-k)**1.5+depart**1.4)*2;
      w.style.textShadow=reduced||ab<.04?'none':`${(-ab).toFixed(2)}px 0 2px #86e7ff65, ${ab.toFixed(2)}px 0 2px #ffa2d35b`;
      w.style.willChange=opacity>.004&&opacity<.995?'transform,opacity':'auto';
    });
  }

  // Keep the original intro on the outer glyph. Hover has its own inner layer.
  $$('.name-glyph').forEach((outer,i)=>{
    const ink=$('.glyph-ink',outer),layer=document.createElement('span');layer.className='glyph-motion';
    ink.before(layer);layer.append(ink);
    // The moving colour sweep must not invalidate two wide glow convolutions
    // for every letter. Keep the glow's silhouette static and composite the
    // same clipped sweep above it as a separate, unfiltered sibling.
    if(matchMedia('(pointer:coarse)').matches){const sheen=ink.cloneNode(true);sheen.classList.add('glyph-sheen');sheen.setAttribute('aria-hidden','true');layer.append(sheen);}
    for(const [cls,color] of [['cyan','#9eefff'],['rose','#ffb9dc']]){
      const fringe=ink.cloneNode(true);fringe.classList.add('glyph-fringe',cls);fringe.setAttribute('aria-hidden','true');fringe.style.color=color;layer.prepend(fringe);
    }
    glyphs.push({outer,layer,i,x:0,y:0,w:0,h:0,a:{value:0,velocity:0},sx:{value:0,velocity:0},sy:{value:0,velocity:0}});
  });
  const name=$('.name-sculpture'),hero=$('.intro');
  // Bake only the unchanging wide glow. Live glyphs, their colour sweep and
  // motion stay in the DOM. Re-running two drop-shadow filters per glyph per
  // frame is particularly expensive in WebKit's filter compositor.
  if(matchMedia('(pointer:coarse)').matches){
    const renderGlow=(image,ratio,makeCanvas)=>{
      const w=image.width,h=image.height,first=makeCanvas(w,h),a=first.getContext('2d');
      a.shadowColor='rgba(255,248,223,0.36862745)';a.shadowBlur=12*ratio;a.drawImage(image,0,0);
      const second=makeCanvas(w,h),b=second.getContext('2d');
      b.shadowColor='rgba(239,235,225,0.23921569)';b.shadowBlur=52*ratio;b.drawImage(first,0,0);
      b.shadowColor='transparent';b.shadowBlur=0;b.globalCompositeOperation='destination-out';b.drawImage(image,0,0);
      return second;
    };
    const glowWorkerMain=()=>{
      self.onmessage=async({data:d})=>{try{
        const second=renderGlow(d.image,d.ratio,(w,h)=>new OffscreenCanvas(w,h));
        d.image.close();const bitmap=second.transferToImageBitmap();self.postMessage({id:d.id,bitmap},[bitmap]);
      }catch(e){self.postMessage({id:d.id,error:String(e)})}};
    };
    let worker=null,generation=0,timer=0;const jobs=new Map();
    try{if(window.OffscreenCanvas&&window.Worker&&window.createImageBitmap){
      const url=URL.createObjectURL(new Blob(['const renderGlow='+renderGlow.toString()+';('+glowWorkerMain.toString()+')()'],{type:'text/javascript'}));
      worker=new Worker(url);URL.revokeObjectURL(url);
      worker.onmessage=({data:d})=>{const job=jobs.get(d.id);jobs.delete(d.id);if(!job){d.bitmap?.close();return;}job(d);};
      worker.onerror=()=>{worker?.terminate();worker=null;for(const job of jobs.values())job({error:'worker unavailable'});jobs.clear();queueGlow();};
    }}catch{}
    async function cacheGlows(){
      if(!document.body.classList.contains('webfont-ready'))return;
      const version=++generation;
      for(const [i,g] of glyphs.entries()){
        const ink=g.layer.querySelector('.glyph-ink:not(.glyph-fringe):not(.glyph-sheen)'),letter=ink?.querySelector('.live-letter');
        if(!letter)continue;
        const css=getComputedStyle(letter),size=parseFloat(css.fontSize),ratio=Math.min(devicePixelRatio||1,3),pad=84;
        const key=[css.fontFamily,size,letter.textContent,ratio].join('/');if(ink.dataset.glowKey===key)continue;
        const width=ink.offsetWidth,height=ink.offsetHeight;if(!width||!height)continue;
        const source=document.createElement('canvas');source.width=Math.ceil((width+pad*2)*ratio);source.height=Math.ceil((height+pad*2)*ratio);
        const c=source.getContext('2d');c.scale(ratio,ratio);c.font=`${css.fontStyle} ${css.fontWeight} ${css.fontSize} ${css.fontFamily}`;c.fillStyle='#fff';
        const m=c.measureText(letter.textContent),line=parseFloat(css.lineHeight)||size*1.14;
        const ascent=m.fontBoundingBoxAscent,descent=m.fontBoundingBoxDescent;if(!Number.isFinite(ascent+descent))continue;
        c.fillText(letter.textContent,pad,pad+(line-ascent-descent)/2+ascent);
        const bitmap=worker?await createImageBitmap(source):source;if(version!==generation){bitmap.close?.();return;}
        const id=version+':'+i;
        await new Promise(resolve=>{
          jobs.set(id,d=>{if(d.error){worker?.terminate();worker=null;queueGlow();}if(d.bitmap){if(version===generation){
            const glow=g.glow||document.createElement('canvas');glow.className='glyph-cached-glow';glow.setAttribute('aria-hidden','true');
            glow.width=source.width;glow.height=source.height;glow.style.cssText=`position:absolute;left:-${pad}px;top:-${pad}px;width:${source.width/ratio}px;height:${source.height/ratio}px;pointer-events:none;z-index:0`;
            glow.getContext('2d').drawImage(d.bitmap,0,0);if(!g.glow){g.layer.prepend(glow);g.glow=glow;}
            ink.classList.add('glow-cached');ink.dataset.glowKey=key;
          }d.bitmap.close?.();}resolve();});
          if(worker)worker.postMessage({id,image:bitmap,ratio},[bitmap]);
          else{const result=renderGlow(source,ratio,(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;});const done=jobs.get(id);jobs.delete(id);done({bitmap:result});}
        });
        if(!worker)await new Promise(resolve=>setTimeout(resolve,0));
      }
    }
    const queueGlow=()=>{clearTimeout(timer);timer=setTimeout(()=>cacheGlows().catch(()=>{}),180);};
    document.fonts?.ready.then(queueGlow);new ResizeObserver(queueGlow).observe(name);
    new MutationObserver(queueGlow).observe(document.body,{attributes:true,attributeFilter:['class']});
    addEventListener('pagehide',e=>{if(!e.persisted){clearTimeout(timer);worker?.terminate();jobs.clear();}});
  }
  new IntersectionObserver(es=>{heroVisible=es[0].isIntersecting;if(!heroVisible)pointerInside=false;wake();},{threshold:0}).observe(hero);
  name.addEventListener('pointermove',e=>{if(e.pointerType==='touch'||!fine.matches)return;mx=e.clientX;my=e.clientY;pointerInside=true;wake();},{passive:true});
  name.addEventListener('pointerleave',()=>{pointerInside=false;wake();});
  name.addEventListener('pointercancel',()=>{pointerInside=false;wake();});
  function measure(){
    if(!dirty)return;dirty=false;
    // offset coordinates ignore the running glyph transforms and avoid hover feedback.
    const nr=name.getBoundingClientRect();
    glyphs.forEach(g=>{
      let x=0,y=0,n=g.outer;while(n&&n!==name){x+=n.offsetLeft;y+=n.offsetTop;n=n.offsetParent;}
      if(n!==name){const r=g.outer.getBoundingClientRect();x=r.left-nr.left;y=r.top-nr.top;}
      g.x=nr.left+x+g.outer.offsetWidth/2;g.y=nr.top+scrollY+y+g.outer.offsetHeight/2;g.w=g.outer.offsetWidth;g.h=g.outer.offsetHeight;
    });
  }
  function animateName(t,dt){
    if(!heroVisible||dialog.open)return;
    const active=fine.matches&&pointerInside&&!dialog.open&&!reduced;
    const pageY=window.NocturneFrame?.scrollY??scrollY;
    glyphs.forEach(g=>{
      const gy=g.y-pageY,dx=mx-g.x,dy=my-gy;
      const radius=Math.max(82,Math.min(185,g.h*.7));
      const influence=active?Math.exp(-((dx/radius)**2+(dy/(radius*1.22))**2)*1.75):0;
      const a=reduced?0:spring(g.a,influence,11,dt);
      const x=reduced?0:spring(g.sx,clamp(dx/radius,-1,1)*influence,12,dt);
      const y=reduced?0:spring(g.sy,clamp(dy/radius,-1,1)*influence,12,dt);
      const edge=Math.abs(g.i-(glyphs.length-1)/2)/Math.max(1,(glyphs.length-1)/2);
      const idle=reduced?0:Math.sin(t*.58+g.i*1.43)*.38+Math.sin(t*.31+g.i*.79)*.18;
      g.layer.style.transform=reduced?'none':`translate3d(${(x*3.5).toFixed(2)}px,${(-a*Math.min(15,g.h*.065)+idle).toFixed(2)}px,0) rotateZ(${(x*2.8).toFixed(2)}deg) skewX(${(-x*2.2).toFixed(2)}deg) scale(${(1+a*(.035+.085*edge)).toFixed(4)},${(1+a*(.025+.07*edge)-y*.006).toFixed(4)})`;
      g.layer.style.filter=a<.015?'none':`blur(${(a*.72).toFixed(2)}px)`;
      g.layer.style.setProperty('--hover-chroma',(a*2.5).toFixed(2)+'px');g.layer.style.setProperty('--hover-strength',a.toFixed(3));
      g.layer.style.willChange=a>.02?'transform':'auto';
    });
  }

  // Separate wall trajectory from pointer tilt; transforms never compete.
  $$('.bento-tile').forEach(tile=>{
    const skin=document.createElement('span');skin.className='bento-skin';
    while(tile.firstChild)skin.append(tile.firstChild);tile.append(skin);
  });
  function attachSurfaces(root=document){
    if(!window.Nocturne?.registerSurface)return;
    $$('.bento-skin,.dialog .float-frame,.dialog .case-art,.dialog .motion-study-large',root).forEach(el=>window.Nocturne.registerSurface(el,el,'detail'));
  }
  // Larger, genuinely translucent action lens. The summary remains the one button.
  $$('.career-arrow').forEach(el=>{el.classList.add('career-play');el.setAttribute('aria-hidden','true');el.innerHTML='<svg viewBox="0 0 24 24" fill="none"><path d="M8 5.6c0-1 1.1-1.6 2-1.1l10 6.2a1.5 1.5 0 0 1 0 2.6l-10 6.2c-.9.5-2-.1-2-1.1V5.6Z" fill="currentColor" stroke="currentColor" stroke-width=".8" stroke-linejoin="round"/></svg>';});

  const dialog=$('#dialog'),dc=$('#dialogContent');
  const sheet=document.createElement('div');sheet.className='sheet-surface';
  while(dialog.firstChild)sheet.append(dialog.firstChild);dialog.append(sheet);
  const grab=document.createElement('button');grab.type='button';grab.className='sheet-grab';grab.setAttribute('aria-label','Close details');grab.title='Drag down or click to close';grab.dataset.close='';
  $('.dialog-head',dialog).prepend(grab);
  dialog.addEventListener('pointermove',e=>{
    if(e.pointerType==='touch'||!fine.matches||reduced)return;
    // Large text surfaces remain stable; the sheet has only a restrained rim response.
    sheetPointer=[clamp(e.clientX/innerWidth-.5,-.5,.5),clamp(e.clientY/innerHeight-.5,-.5,.5)];sheetHover=1;wake();
  },{passive:true});
  dialog.addEventListener('pointerleave',()=>{sheetHover=0;sheetPointer=[0,0];wake();});
  function prepareDialog(){
    // Release detached title references from previous sheet views.
    for(let i=titleGroups.length-1;i>=0;i--)if(!titleGroups[i].el.isConnected){titleObserver.unobserve(titleGroups[i].el);titleGroups.splice(i,1);}
    $$('h2',dc).forEach(h=>splitWords(h,'dialog'));
    attachSurfaces(dialog);dirty=true;wake();
  }
  function animateSheet(mode='open'){
    prepareDialog();
    if(window.NocturneR14)return window.NocturneR14.animateSheet(mode,reduced);dialog.dataset.sheetState=mode==='open'?'opening':'open';
    if(reduced){dialog.dataset.sheetState='open';dialog.style.transform='';dialog.style.filter='';return null;}
    const a=mode==='open'?dialog.animate([
      {opacity:0,transform:'translate3d(0,80vh,0) scale(.985)',filter:isLight()?'blur(3px)':'url("#nocturne-ca-5") blur(8px)'},
      {opacity:1,transform:'translate3d(0,0,0) scale(1)',filter:'none'}
    ],{duration:640,easing:out}):dc.animate([
      {opacity:.05,transform:'translate3d(0,12px,0)',filter:'blur(3px)'},{opacity:1,transform:'none',filter:'none'}
    ],{duration:300,easing:out});
    a.finished.catch(()=>{}).then(()=>{if(dialog.open)dialog.dataset.sheetState='open';});return a;
  }
  function closeSheet(){
    if(window.NocturneR14)return window.NocturneR14.closeSheet(reduced);
    dialog.dataset.sheetState='closing';sheetHover=0;sheetPointer=[0,0];
    return dialog.animate([
      {opacity:1,transform:dialog.style.transform||'translate3d(0,0,0)',filter:'none'},
      {opacity:0,transform:'translate3d(0,65vh,0) scale(.985)',filter:isLight()?'blur(2px)':'url("#nocturne-ca-4") blur(6px)'}
    ],{duration:330,easing:'cubic-bezier(.4,0,.7,.4)',fill:'forwards'});
  }
  let drag=null,swallowClick=false;
  grab.addEventListener('pointerdown',e=>{
    if(e.button!==0||dialog.dataset.sheetState==='opening'||dialog.dataset.sheetState==='closing')return;
    drag={id:e.pointerId,y:e.clientY,last:e.clientY,t:performance.now(),velocity:0,dy:0};swallowClick=false;grab.setPointerCapture(e.pointerId);
  });
  grab.addEventListener('pointermove',e=>{
    if(!drag||e.pointerId!==drag.id)return;const now=performance.now();
    drag.dy=Math.max(0,e.clientY-drag.y);drag.velocity=(e.clientY-drag.last)/Math.max(10,now-drag.t);drag.last=e.clientY;drag.t=now;
    if(drag.dy>6)swallowClick=true;
    dialog.style.transform=`translate3d(0,${drag.dy.toFixed(1)}px,0)`;dialog.style.opacity=String(1-Math.min(.3,drag.dy/1000));
  });
  const endDrag=e=>{
    if(!drag||e.pointerId!==drag.id)return;const d=drag;drag=null;
    if(grab.hasPointerCapture(e.pointerId))grab.releasePointerCapture(e.pointerId);
    if(e.type==='pointerup'&&(d.dy>110||(d.dy>38&&d.velocity>.65)))window.portfolioCloseDialog?.();
    else {
      if(d.dy>2&&!reduced)dialog.animate([{transform:dialog.style.transform,opacity:dialog.style.opacity},{transform:'none',opacity:1}],{duration:420,easing:out});
      dialog.style.transform='';dialog.style.opacity='';
    }
  };
  ['pointerup','pointercancel','lostpointercapture'].forEach(type=>grab.addEventListener(type,endDrag));
  grab.addEventListener('click',e=>{if(swallowClick){e.preventDefault();e.stopPropagation();swallowClick=false;}},true);
  dialog.addEventListener('close',()=>{dialog.style.transform='';dialog.style.opacity='';dialog.style.filter='';dialog.dataset.sheetState='closed';sheet.style.transform='';});

  function tick(t,dt,isReduced){
    reduced=!!isReduced;measure();
    if(!extrasBound&&window.Nocturne?.registerSurface){attachSurfaces();extrasBound=true;}
    animateName(t,Math.min(dt,.1));
    for(const g of titleGroups)paintWords(g,Math.min(dt,.1));
    if(dialog.open){
      const a=1-Math.exp(-dt*8);
      sheetSoft[0]=mix(sheetSoft[0],reduced?0:sheetPointer[0]*sheetHover,a);sheetSoft[1]=mix(sheetSoft[1],reduced?0:sheetPointer[1]*sheetHover,a);
      sheet.style.setProperty('--sheet-light-x',(50+sheetSoft[0]*85).toFixed(2)+'%');
      sheet.style.transform=reduced?'none':`perspective(1800px) rotateX(${(-sheetSoft[1]*.3).toFixed(3)}deg) rotateY(${(sheetSoft[0]*.5).toFixed(3)}deg)`;
    }
  }
  function invalidate(){dirty=true;wake();}
  addEventListener('resize',invalidate,{passive:true});document.fonts?.ready.then(invalidate);
  window.NocturneMotion={tick,measure:invalidate,setChapter,splitWords,optics,opticalFilter,spring,attachSurfaces,prepareDialog,animateSheet,closeSheet,
    chapterReady:id=>(chapterGroups.get(id)||[]).every(g=>g.visible&&g.last>.998&&(g.exit||0)<.001),
    tokens:{hover:160,ui:280,reveal:640,sheet:640,close:330,ease:out},
    diagnostics:()=>({version:'R14',glyphs:glyphs.length,wordGroups:titleGroups.filter(g=>g.el.isConnected).length,words:titleGroups.filter(g=>g.el.isConnected).reduce((a,g)=>a+g.words.length,0),pointerActive:pointerInside,heroVisible,sheetState:dialog.dataset.sheetState||'closed',reduced}),
    needsFrame:()=>titleGroups.some(g=>Math.abs(g.p.value-g.target)>.0001)};
})();
