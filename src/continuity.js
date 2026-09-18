/* NOCTURNE R14 / CONTINUITY
 * One frame clock, reversible curved apertures and source-aware sheets.
 * No wheel interception, DOM screenshots, GPU readback, or cloned live controls.
 */
(() => {
  'use strict';
  const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
  const lerp=(a,b,p)=>a+(b-a)*p;
  const smooth=(v,a=0,b=1)=>{const p=clamp((v-a)/(b-a));return p*p*(3-2*p);};
  const out='cubic-bezier(.16,1,.3,1)';
  const spring=(s,t,w,dt)=>window.NocturneMotion.spring(s,t,w,dt);
  const isLight=()=>document.body.classList.contains('eco-effects');
  const dialog=$('#dialog'),dc=$('#dialogContent');
  let reduced=document.body.classList.contains('reduced'),clock=0,dirty=true,moonPower=0,moonAt=-100,insideOrbit=false,layoutVersion=0;
  const metrics={heroHeight:innerHeight,orbitTop:0,orbitHeight:0};
  const heroSpring={value:0,velocity:0},navSpring={value:0,velocity:0};
  // The professional-journey chapter is absent from the first screen and is
  // carried in by the scroll itself, never pre-lit under the hero.
  const storyNode=$('#story'),storyGate={value:0,velocity:0};
  let storyReveal=0;const sceneSeams=new Map(),seamOut=new Float32Array(3);
  const curveStates=new WeakMap(),shells=new WeakMap(),headings=new WeakMap();
  const activeSurfaces=new Set(),candidates=new Set();
  let navRect=null,lastNavRead=-1,lastEnergy=-1,lastSource=null,rootSource=null,sheetOrigin=null,echo=null;
  let pendingAnimations=[],narrativeRects=[];const localSizes=new WeakMap();
  const nameNode=$('.name-sculpture'),navScrim=$('.nav-scrim');
  const sourceSelector='.career-bubble,.bento-tile,.float-frame,.media-card,.orbit-icon,.chapter-case,.project-row,.contact-cta,[data-open-menu]';

  // A visible downward gesture rather than a static hairline.
  const scrollCue=$('.hero-scroll');
  if(scrollCue)scrollCue.innerHTML='<span class="scroll-lens" aria-hidden="true"><span class="scroll-trail"></span><svg viewBox="0 0 32 40"><path d="M10 19l6 6 6-6"/><path d="M12 25l4 4 4-4" class="scroll-chevron-tail"/></svg><i></i></span><span>SCROLL TO EXPLORE</span>';

  // A dedicated layer composes scroll exit with the existing intro + pointer springs.
  const departures=$$('.name-glyph').map((outer,i)=>{
    const layer=$('.glyph-motion',outer),depart=document.createElement('span');depart.className='glyph-departure';
    layer.before(depart);depart.append(layer);return {el:depart,i};
  });

  const moon=document.createElement('div');moon.className='moon-overflow';moon.setAttribute('aria-hidden','true');
  ($('.world-host')||document.body).append(moon);
  const halo=document.createElement('div');halo.className='moon-halo';moon.append(halo);

  const observe=new IntersectionObserver(entries=>{
    for(const e of entries){
      if(e.isIntersecting){activeSurfaces.add(e.target);candidates.add(e.target);}else{activeSurfaces.delete(e.target);candidates.delete(e.target);}
    }
  },{rootMargin:'80px',threshold:0});
  function bind(root=document){
    $$('.card-glass,.bento-skin,.career-bubble,.case-cover,.float-frame',root).forEach(el=>{
      if(el.dataset.r14Surface)return;el.dataset.r14Surface='1';observe.observe(el);
    });
    $$('.bento-frame>svg,.card-glass>svg,.study-preview>svg,.case-cover>svg,.case-cover-link>svg,.frame-art>svg,.mini-art>svg',root).forEach(el=>el.setAttribute('preserveAspectRatio','xMidYMid slice'));
  }
  bind();
  const narratives=new Set();
  const narrativeObserver=new IntersectionObserver(entries=>{
    for(const e of entries){if(e.isIntersecting)narratives.add(e.target);else narratives.delete(e.target);}
  },{rootMargin:'100px',threshold:0});
  $$('.story-sticky,.index-head,#labRows .project-row,#contact').forEach(el=>narrativeObserver.observe(el));

  function measure(){
    if(!dirty)return;dirty=false;
    const h=$('.intro').getBoundingClientRect(),o=$('#projects').getBoundingClientRect();
    metrics.heroHeight=h.height;metrics.orbitTop=o.top+scrollY;metrics.orbitHeight=o.height;
    navRect=$('.glass-nav').getBoundingClientRect();
    const scrim=$('.nav-scrim');
    // The guard follows the capsule's own proportions: a tall ellipse under a
    // short pill reads as a black smear, not as a shadow the pill casts.
    // The guard is the capsule itself: its shadow and defocus grow outward from
    // that exact shape, so nothing elliptical or rectangular is ever readable.
    scrim.style.left=Math.round(navRect.left+navRect.width*.5)+'px';
    scrim.style.top=Math.round(navRect.top)+'px';
    scrim.style.width=Math.round(navRect.width)+'px';
    scrim.style.height=Math.round(navRect.height)+'px';
  }
  // Read geometry before the frame's motion writes. No extra animation loop.
  function read(t){
    measure();
    narrativeRects=[];
    for(const el of narratives){
      const rect=el.getBoundingClientRect();narrativeRects.push({el,rect});
      const key=`${innerWidth}x${innerHeight}/${layoutVersion}`,old=localSizes.get(el);
      if(!old||old.key!==key)localSizes.set(el,{key,h:el.offsetHeight,w:el.offsetWidth});
    }
    if(t-lastNavRead>.12){
      lastNavRead=t;let target=moonPower;
      const top=navRect?.top||20,bottom=top+80,left=(navRect?.left||innerWidth*.5)-35,right=left+(navRect?.width||324)+70;
      const nameRect=nameNode.getBoundingClientRect();
      if(nameRect.bottom>top&&nameRect.top<bottom)target=Math.max(target,.85);
      for(const el of candidates){if(!el.isConnected)continue;const r=el.getBoundingClientRect();if(r.top<bottom&&r.bottom>top&&r.left<right&&r.right>left)target=1;}
      navSpring.target=target;
    }
  }
  function invalidate(){dirty=true;layoutVersion++;window.portfolioWake?.();}
  addEventListener('resize',invalidate,{passive:true});document.fonts?.ready.then(invalidate);

  function makeEdge(host){
    const el=document.createElement('div');el.className='arc-edge';el.setAttribute('aria-hidden','true');
    // Three nested bands: the defocus is deepest on the seam line itself and
    // thins out to both sides, so the junction reads as an optical transition
    // rather than a rule drawn across the page.
    // No scaled backdrop band: sampling the backdrop beyond the viewport returns
    // nothing, which painted a black rectangle with a straight top edge. The
    // actual bending of the scene is done in the renderer's post pass.
    el.innerHTML='<i class="seam-blur s1"></i><i class="seam-blur s2"></i><i class="seam-blur s3"></i><i class="seam-blur s4"></i><i class="seam-blur s5"></i>'+
      '<i class="seam-glow"></i><i class="seam-chroma"></i>';
    host.append(el);return el;
  }
  /** Feathered elliptic reveal. Both layers use alpha masks, never a hard clip.
   * At either terminal state the whole layer is explicitly hidden or unmasked.
   * Dimensions are local CSS pixels; no document-size blur bitmap is created.
   */
  function arc(el,entry=1,exit=0,host=null,local=false,seamOnly=false){
    if(!el)return;
    const e=reduced?1:clamp(entry),x=reduced?0:clamp(exit);
    let state=curveStates.get(el);
    if(!state){state={key:'',edge:host?makeEdge(host):null,measureAt:0,h:0,w:0};curveStates.set(el,state);el.classList.add('r14-arc-target');}
    if(local&&(!state.h||state.measureAt!==`${innerWidth}x${innerHeight}/${layoutVersion}`)){
      const box=localSizes.get(el);state.h=box?.h||el.offsetHeight||innerHeight;state.w=box?.w||el.offsetWidth||innerWidth;state.measureAt=`${innerWidth}x${innerHeight}/${layoutVersion}`;
    }
    const key=e.toFixed(3)+'/'+x.toFixed(3)+'/'+innerHeight+'/'+(local?state.h:0);
    if(key===state.key)return;state.key=key;
    // Hysteresis on the terminal state: without it a chapter sitting on the
    // threshold flickers in and out while the previous one is paged past.
    const terminal=e<=0||x>=1;
    state.terminal=terminal;
    const active=!reduced&&!terminal&&(e<.9995||x>.0005);
    // A flat tint cut by an ellipse always shows its edge as a straight dark
    // band. Layers that are a solid wash fade by opacity instead and only lend
    // their geometry to the seam.
    el.classList.toggle('arc-masking',active&&!seamOnly);
    el.classList.toggle('arc-hidden',terminal&&!seamOnly);
    // A wide, smoothstep-shaped feather. A two-stop ramp reads as a visible
    // band edge; the seam has to dissolve, not end.
    // The reveal mask is back to its original reach. What the transition needed
    // was a thicker visible seam, not a longer dissolve.
    const H=local?state.h:innerHeight,feather=isLight()?Math.min(H*.18,54):clamp(H*(local?.24:.12),local?24:64,135),horizontal=local?(state.w*.84).toFixed(1)+'px':'88vw';
    const radiusIn=Math.max(1,H*1.86*Math.sqrt(e));
    const radiusOut=Math.max(1,H*1.86*Math.pow(x,1.15));
    const ramp=(reverse)=>{
      // Hermite-sampled alpha stops: the derivative reaches zero at both ends,
      // so no straight-line gradient banding survives on a dark field.
      const steps=[0,.14,.3,.5,.7,.86,1];
      return steps.map(s=>{
        const a=s*s*(3-2*s),alpha=reverse?a:1-a;
        const hex=Math.round(clamp(alpha)*255).toString(16).padStart(2,'0');
        return `#000000${hex} calc(100% - ${(feather*(1-s)).toFixed(1)}px)`;
      }).join(',');
    };
    const inMask=`radial-gradient(ellipse ${horizontal} ${radiusIn.toFixed(1)}px at 50% 118%, ${ramp(false)})`;
    const outMask=`radial-gradient(ellipse ${horizontal} ${radiusOut.toFixed(1)}px at 50% 118%, ${ramp(true)})`;
    if(seamOnly)el.style.removeProperty('--section-mask');
    else if(active)el.style.setProperty('--section-mask',e<.9995&&x>.0005?inMask+','+outMask:e<.9995?inMask:outMask);
    else el.style.removeProperty('--section-mask');
    el.dataset.arcEntry=e.toFixed(3);el.dataset.arcExit=x.toFixed(3);
    if(state.edge){
      const edge=state.edge,part=e<.995?e:1-x;
      // Where the seam line actually crosses the screen. When it has travelled
      // off the top or bottom only the band's own cut-off stayed visible, which
      // is the straight dark line that kept showing up at the wall.
      const radius=e<.995?radiusIn:radiusOut;
      const hb=host?host.getBoundingClientRect():null;
      const seamY=hb?hb.top+hb.height*1.18-radius:0;
      const bandPx=Math.min(innerHeight*.15,120);
      const off=Math.max(0,Math.max(-seamY,seamY-innerHeight));
      const onScreen=hb?1-smooth(off,0,bandPx*.34):1;
      let power=active?Math.sin(Math.PI*clamp(part))*onScreen:0;
      const shaped=power*power*(3-2*power);
      edge.style.opacity=shaped.toFixed(4);
      edge.style.setProperty('--seam-power',shaped.toFixed(4));
      edge.style.setProperty('--seam-y',seamY.toFixed(1)+'px');
      // Handed to the scene's post pass so the background itself bends at the
      // junction; a DOM layer can only ever distort what the DOM paints.
      if(shaped>.002)sceneSeams.set(el,{y:1-clamp(seamY/Math.max(1,innerHeight),-.4,1.4),band:clamp(bandPx*.40/Math.max(1,innerHeight),.04,.20),power:shaped*.65});
      else sceneSeams.delete(el);
      edge.style.setProperty('--edge-radius',(e<.995?radiusIn:radiusOut).toFixed(1)+'px');
      edge.style.setProperty('--edge-span',horizontal);
      // The seam band is its own thickness, independent of the mask.
      edge.style.setProperty('--edge-band',Math.min(innerHeight*.15,120).toFixed(1)+'px');
      // Never toggled while it still has substance; that flip is what blinked.
      edge.style.display=shaped>0?'block':'none';
    }
  }

  // A deformed Bezier perimeter, not a scaled rounded rectangle. Distortion
  // stays in the transient shell; it never distorts readable page content.
  let shellsSerial=0;
  function organicShell(frame,e,t){
    if(reduced){frame.style.display='none';return;}
    let shell=shells.get(frame);
    if(!shell){
      const canvas=document.createElement('canvas');canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
      const gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:false,depth:false});
      if(!gl){frame.style.display='none';return;}
      const compile=(type,src)=>{const sh=gl.createShader(type);gl.shaderSource(sh,src);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh));return sh;};
      const program=gl.createProgram();
      gl.attachShader(program,compile(gl.VERTEX_SHADER,'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}'));
      gl.attachShader(program,compile(gl.FRAGMENT_SHADER,`precision mediump float;
        uniform vec2 res;uniform float progress;uniform float clock;uniform float firstWave;
        float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
        float field(vec2 p){return noise(p)*.65+noise(p*2.03+13.)*.25+noise(p*4.01)*.1;}
        void main(){vec2 uv=gl_FragCoord.xy/res;vec2 p=(uv-.5)*vec2(res.x/res.y,1.);
          float e=progress,k=1.-pow(1.-e,2.2);
          vec2 q=p*4.+vec2(clock*.09,-clock*.06);vec2 warp=vec2(field(q),field(q+17.));
          float ink=field(q+warp*2.4);
          p+=(warp-.5)*(.014+.085*k);
          vec2 box=mix(vec2(.022),vec2(res.x/res.y*.57,.59),k);
          float radius=mix(.018,.12,k);vec2 d=abs(p)-box+radius;
          float sdf=length(max(d,0.))+min(max(d.x,d.y),0.)-radius;
          float width=mix(.022,.14,k*k)*(.65+ink*.9);
          float glow=exp(-pow(abs(sdf/width),2.))*.52+exp(-abs(sdf)/(width*2.8))*.12;
          float dispersion=.008*(1.-k);vec3 color=mix(vec3(.64,.82,1.),vec3(.97,.73,.86),smoothstep(-dispersion,dispersion,sdf));
          float fade=smoothstep(.52,.74,k)*(1.-smoothstep(.68,1.,e));
          gl_FragColor=vec4(color,glow*fade*.113*(1.+firstWave*2.*(1.-smoothstep(.55,.95,e))));
        }`));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
      gl.useProgram(program);const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const loc=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
      shell={canvas,gl,program,e,time:t,uniforms:Object.fromEntries(['firstWave','res','progress','clock'].map(name=>[name,gl.getUniformLocation(program,name)]))};shells.set(frame,shell);frame.prepend(canvas);
      const seed=frame.querySelector('.portal-seed');if(seed)seed.style.display='none';
    }
    const dt=Math.min(.06,Math.max(0,t-shell.time));shell.time=t;const delta=(e-shell.e)*(1-Math.exp(-dt*2.6));
    shell.e+=Math.max(-dt*.38,Math.min(dt*.38,delta));e=shell.e;
    const arrivalAge=t-moonAt;
    if(frame.dataset.firstWave==='true'&&arrivalAge>=0&&arrivalAge<2.8){e=.30+.70*smooth(arrivalAge,0,2.8);shell.e=e;}
    frame.style.display=e<.001||e>.999?'none':'block';frame.style.opacity='1';frame.style.filter='none';
    if(frame.style.display==='none')return;
    const {gl,canvas,program}=shell,w=Math.round(innerWidth*.35),h=Math.round(innerHeight*.35);
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);}
    gl.uniform1f(shell.uniforms.firstWave,frame.dataset.firstWave==='true'?1:0);gl.uniform2f(shell.uniforms.res,w,h);gl.uniform1f(shell.uniforms.progress,e);gl.uniform1f(shell.uniforms.clock,t);gl.drawArrays(gl.TRIANGLES,0,6);
  }
  // Warm the first program and buffer before the flight, outside its animation.
  const warmFirstShell=()=>{
    const frame=document.querySelector('.background-portal[data-first-wave="true"]');
    if(!frame||shells.has(frame)||reduced)return;
    organicShell(frame,.002,performance.now()/1000);
    const shell=shells.get(frame);if(shell){shell.e=0;frame.style.display='none';}
  };
  if('requestIdleCallback' in window)requestIdleCallback(warmFirstShell,{timeout:1200});else setTimeout(warmFirstShell,100);
  function chapter(s,entry,exit,t,isReduced){
    reduced=!!isReduced;
    arc(s.content,entry,exit,s.pin);
    s.bg.classList.remove('arc-masking','arc-hidden');
    s.bg.style.removeProperty('--section-mask');
    const deltaY=scrollY-(s.waveLastY??scrollY);s.waveLastY=scrollY;
    if(deltaY<-.5)s.waveReverse=true;else if(deltaY>.5)s.waveReverse=false;
    if(s.waveReverse){s.frame.style.display='none';const sh=shells.get(s.frame);if(sh){sh.e=entry;sh.time=t;}}
    else organicShell(s.frame,entry,t);
    const alpha=1-exit;
    s.content.style.opacity=alpha.toFixed(4);
    s.bg.style.opacity=(alpha*.95*(reduced?1:smooth(entry,0,.55))).toFixed(4);
    s.content.inert=entry<.32||alpha<.08;
    s.content.style.setProperty('--departure-optics',window.NocturneMotion.opticalFilter(exit*.8,6));
    // A chapter does not just slide off: it recedes. Entry comes up out of a
    // smaller scale, departure sinks back into one.
    const zoom=(reduced?1:(.925+.075*smooth(entry,0,.72))*(1-exit*.13)).toFixed(4);
    s.content.style.setProperty('--chapter-scale',zoom);
    s.bg.style.setProperty('--chapter-scale',(reduced?1:1-(1-Number(zoom))*.45).toFixed(4));
    s.content.style.setProperty('--chapter-inertia',(clamp(s.progress.velocity,-3,3)*.7).toFixed(3)+'deg');
  }
  function heading(el,entry,exit=0){
    if(!el)return;
    let g=headings.get(el);if(!g){g=window.NocturneMotion.splitWords(el,'manual');g.mode='manual';headings.set(el,g);}
    g.target=reduced?1:clamp(entry);g.exit=reduced?0:clamp(exit);g.visible=true;
  }

  function prepareLayout(root){
    root.classList.toggle('editorial-content',!!$('.case-shell',root));
    bind(root);
    for(const el of [...activeSurfaces])if(!el.isConnected){activeSurfaces.delete(el);candidates.delete(el);observe.unobserve(el);}
  }
  function normalizeSource(el){
    if(!el||el===document.body||el===document.documentElement||dialog.contains(el))return null;
    const root=el.closest?.(sourceSelector)||el.closest?.('.exp')?.querySelector('.career-bubble');
    if(!root)return null;
    return $('.career-bubble',root)||$('.bento-skin',root)||root;
  }
  document.addEventListener('click',e=>{
    if(dialog.open)return;
    const source=normalizeSource(e.target);
    if(source)lastSource={el:source,time:performance.now()};
  },true);
  function rememberSource(el){
    rootSource=(lastSource&&performance.now()-lastSource.time<1100?lastSource.el:normalizeSource(el))||null;
    sheetOrigin=null;
    if(rootSource?.isConnected){const r=rootSource.getBoundingClientRect();if(r.bottom>0&&r.top<innerHeight&&r.width>1)sheetOrigin={x:r.left,y:r.top,w:r.width,h:r.height};}
  }
  // The source card and the sheet are one object: while the sheet exists the
  // card is dissolved, and it re-focuses exactly as the sheet lands back on it.
  let mergeRaf=0,mergeEl=null;
  function writeMerge(el,v){
    if(!el?.isConnected)return;
    el.style.setProperty('--merge',v.toFixed(4));
    el.style.filter=v>.9985?'':window.NocturneMotion.opticalFilter((1-v)*.9,11);
    el.style.opacity=v>.9985?'':(.12+v*.88).toFixed(4);
    window.Nocturne?.pulse?.(0);
  }
  function clearMerge(){
    if(mergeRaf)cancelAnimationFrame(mergeRaf);mergeRaf=0;
    if(mergeEl?.isConnected){mergeEl.style.removeProperty('--merge');mergeEl.style.filter='';mergeEl.style.opacity='';mergeEl.style.scale='';}
    mergeEl=null;
  }
  function mergeSource(from,to,duration){
    if(reduced||!rootSource?.isConnected)return;
    if(mergeEl&&mergeEl!==rootSource)clearMerge();
    if(mergeRaf)cancelAnimationFrame(mergeRaf);
    mergeEl=rootSource;
    const t0=performance.now();
    const run=now=>{
      const p=clamp((now-t0)/Math.max(1,duration));
      const k=1-Math.pow(1-p,3);
      writeMerge(mergeEl,from+(to-from)*k);
      if(p<1)mergeRaf=requestAnimationFrame(run);
      else {mergeRaf=0;if(to>.9985)clearMerge();}
    };
    mergeRaf=requestAnimationFrame(run);
  }
  function removeEcho(){echo?.remove();echo=null;}
  function clearAnimations(){for(const a of pendingAnimations)a.cancel();pendingAnimations=[];removeEcho();}
  addEventListener('nocturne:sheet-settled',clearMerge);
  function makeEcho(){
    if(!rootSource)return;
    const art=rootSource.querySelector('.bento-frame>svg,.frame-art>svg,.career-logo>svg,.study-preview>svg,svg');
    const image=rootSource.querySelector('img');
    if(!art&&!image)return;
    echo=document.createElement('div');echo.className='sheet-morph-echo';echo.setAttribute('aria-hidden','true');
    const copy=(art||image).cloneNode(true);
    copy.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));copy.removeAttribute('id');
    if(copy.tagName.toLowerCase()==='svg')copy.setAttribute('preserveAspectRatio','xMidYMid meet');
    echo.append(copy);dialog.append(echo);
    const fade=echo.animate([{opacity:.85},{opacity:0}],{duration:300,easing:out,fill:'forwards'});
    pendingAnimations.push(fade);fade.finished.then(removeEcho).catch(()=>{});
  }
  // ---- One coordinated timeline for the sheet -----------------------------
  // The shell, its contents, the page veil behind it and the card it came from
  // are stages of a single optical event. Running them as separate WAAPI
  // animations is what made the blur switch off in one frame at the end.
  let timeline=null;
  const easeInOutQuart=p=>p<.5?8*p*p*p*p:1-Math.pow(-2*p+2,4)/2;
  const easeOutCubic=p=>1-Math.pow(1-p,3);
  const optic=(a,max)=>reduced?'none':window.NocturneMotion.opticalFilter(clamp(a),max);
  const SHEET_BLUR=17;

  function stopTimeline(){
    if(!timeline)return;
    cancelAnimationFrame(timeline.raf);clearTimeout(timeline.guard);
    const done=timeline.settle;timeline=null;done?.();
  }
  function runTimeline(duration,step,after){
    stopTimeline();
    const t0=performance.now();
    let settle;
    const finished=new Promise(res=>{settle=res;});
    const state={raf:0,settle};
    // A watchdog finishes the sequence even if the tab stops producing
    // frames mid-way; the sheet can never be left half-collapsed.
    const done=()=>{clearTimeout(state.guard);if(timeline===state)timeline=null;after?.();settle();};
    const frame=now=>{
      const p=clamp((now-t0)/Math.max(1,duration));
      step(p);
      if(p<1){state.raf=requestAnimationFrame(frame);return;}
      done();
    };
    state.raf=requestAnimationFrame(frame);
    state.guard=setTimeout(()=>{if(timeline!==state)return;cancelAnimationFrame(state.raf);step(1);done();},duration*1.7+260);
    timeline=state;
    return {finished,cancel(){ if(timeline===state){cancelAnimationFrame(state.raf);clearTimeout(state.guard);timeline=null;} settle(); }};
  }
  function resetSheetStyles(){
    dialog.style.transform='';dialog.style.transformOrigin='';dialog.style.filter='';
    dialog.style.opacity='';dialog.style.removeProperty('--veil-blur');dialog.style.removeProperty('--veil-tint');
    document.documentElement.style.removeProperty('--veil-blur');
    document.documentElement.style.removeProperty('--veil-tint');
  }
  function setVeil(v){
    const blur=(v*14).toFixed(2)+'px',tint=(v*.62).toFixed(3);
    dialog.style.setProperty('--veil-blur',blur);dialog.style.setProperty('--veil-tint',tint);
    document.documentElement.style.setProperty('--veil-blur',blur);
    document.documentElement.style.setProperty('--veil-tint',tint);
  }
  // The measured rect of the sheet with no transform applied.
  function sheetRect(){
    const keep=dialog.style.transform;dialog.style.transform='none';
    const r=dialog.getBoundingClientRect();dialog.style.transform=keep;return r;
  }
  function sourceRect(){
    if(!rootSource?.isConnected)return null;
    const b=rootSource.getBoundingClientRect();
    return (b.top<innerHeight&&b.bottom>0&&b.width>1)?b:null;
  }
  function placeSheet(r,box,k,fallbackY){
    // transform-origin is pinned to the top-left so the shell maps onto the
    // card's rect exactly, with no half-size offset to guess at.
    dialog.style.transformOrigin='0 0';
    const tx=box?lerp(0,box.left-r.left,k):0;
    const ty=box?lerp(0,box.top-r.top,k):lerp(0,fallbackY,k);
    const sx=box?lerp(1,box.width/Math.max(1,r.width),k):lerp(1,.95,k);
    const sy=box?lerp(1,box.height/Math.max(1,r.height),k):lerp(1,.95,k);
    dialog.style.transform=`translate3d(${tx.toFixed(2)}px,${ty.toFixed(2)}px,0) scale(${sx.toFixed(5)},${sy.toFixed(5)})`;
  }

  // The sheet translates as one layer. Only its inner content gets a small blur.
  // Closing crops the shell; it never scales glyphs, images or layout.
  function sheetAnimation(frames,options,contentFrames){
    const shell=dialog.animate(frames,{...options,fill:'both'});
    const content=contentFrames?dc.animate(contentFrames,{...options,fill:'both'}):null;
    let cancelled=false;
    return {finished:shell.finished,cancel(){
      if(cancelled)return;cancelled=true;
      // Keep the current pose when Escape interrupts the opening spring.
      const interrupted=dialog.dataset.sheetState==='opening'&&dialog.classList.contains('is-closing');
      const pose=interrupted?getComputedStyle(dialog).transform:null;
      const alpha=interrupted?getComputedStyle(dialog).opacity:null;
      shell.cancel();content?.cancel();
      if(interrupted){dialog.style.transform=pose;dialog.style.opacity=alpha;}
    }};
  }
  let landing=null,cardResponse=null;
  const smoother=t=>{t=clamp(t);return t*t*t*(t*(t*6-15)+10);};
  function cardScale(el){
    if(!cardResponse||cardResponse.el!==el)return 1;
    const t=clamp((performance.now()-cardResponse.start)/1100);
    if(t>=1){cardResponse=null;return 1;}
    return 1-.12*Math.sin(2*Math.PI*t)*Math.pow(Math.sin(Math.PI*t),2)*Math.exp(-2*t);
  }
  function respondCard(delay=0){if(!reduced&&rootSource?.closest('.exp'))cardResponse={el:rootSource,start:performance.now()+delay};}

  function returnBlur(el){
    if(!landing||landing.el!==el)return 0;
    const p=(performance.now()-landing.start)/landing.duration;
    if(p>=1){landing=null;return 0;}
    return 2*smooth(p,.50,.73)*(1-smooth(p,.73,1));
  }
  function animateSheet(mode,isReduced){
    clearAnimations();stopTimeline();clearMerge();landing?.animation?.cancel();landing=null;reduced=!!isReduced;
    resetSheetStyles();dc.style.filter='';dc.style.transform='';dc.style.opacity='';
    dialog.dataset.sheetState=mode==='open'?'opening':'open';
    if(mode!=='open')return dc.animate([{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)'}],{duration:reduced?1:300,easing:out});
    // Mild spring (about 0.3% overshoot), with a zero-velocity, zero-acceleration tail.
    respondCard();
    const duration=1180,zeta=.88,omega=14,wd=omega*Math.sqrt(1-zeta*zeta);
    const distance=dialog.offsetHeight+48,frames=[];
    for(let i=0;i<=60;i++){
      const t=i/60,residual=Math.exp(-zeta*omega*t)*(Math.cos(wd*t)+zeta/Math.sqrt(1-zeta*zeta)*Math.sin(wd*t));
      const progress=1-residual*(1-smoother((t-.72)/.28));
      frames.push({offset:t,transform:`translate3d(0,${((1-progress)*distance).toFixed(3)}px,0)`,opacity:Math.min(1,.2+progress)});
    }
    const a=sheetAnimation(reduced?[{transform:'none',opacity:1},{transform:'none',opacity:1}]:frames,
      {duration:reduced?1:duration,easing:'linear'},
      [{offset:0,filter:reduced?'none':'blur(4px)',opacity:.2},{offset:.48,filter:'blur(0px)',opacity:1},{offset:1,filter:'blur(0px)',opacity:1}]);
    a.finished.then(()=>{if(dialog.open)dialog.dataset.sheetState='open';a.cancel();}).catch(()=>{});
    return a;
  }
  function closeSheet(isReduced){
    clearAnimations();stopTimeline();clearMerge();reduced=!!isReduced;
    dialog.dataset.sheetState='closing';
    const from=getComputedStyle(dialog).transform,r=sheetRect(),box=sourceRect();
    const target=box&&rootSource?.closest('.exp')?box:null;
    const w=Math.min(r.width,target?.width||r.width*.64),h=Math.min(r.height,target?.height||r.height*.38);
    const ix=(r.width-w)*.5,iy=(r.height-h)*.5;
    const x=target?target.left+target.width*.5-(r.left+r.width*.5):0;
    const y=target?target.top+target.height*.5-(r.top+r.height*.5):innerHeight*.20;
    const duration=720;
    if(target&&!reduced){
      landing={el:rootSource,start:performance.now(),duration:1040};
      const pulse=rootSource.animate([{offset:0,filter:'blur(0px)'},{offset:.5,filter:'blur(0px)'},{offset:.73,filter:'blur(2px)'},{offset:1,filter:'blur(0px)'}],{duration:1040,easing:'ease-in-out'});
      landing.animation=pulse;pulse.finished.catch(()=>{});
    }
    respondCard(320);
    const frames=[],startPose=new DOMMatrixReadOnly(from),startAlpha=Number(getComputedStyle(dialog).opacity);
    // One continuous path: crop and translate together, with no arrival hold.
    for(let i=0;i<=60;i++){
      const t=i/60,k=smoother(t),alpha=1-smoother((t-.32)/.68);
      frames.push({offset:t,transform:`translate3d(${lerp(startPose.m41,x,k)}px,${lerp(startPose.m42,y,k)}px,0)`,
        clipPath:`inset(${iy*k}px ${ix*k}px round ${28+14*k}px)`,opacity:startAlpha*alpha});
    }
    return sheetAnimation(frames,
      {duration:reduced?1:duration,easing:'linear'},
      [{offset:0,filter:'blur(0px)',opacity:1},{offset:.52,filter:'blur(0px)',opacity:1},{offset:1,filter:reduced?'none':'blur(5px)',opacity:.35}]);
  }

  // A short scale dip with a small overshoot, resolving the last of the blur.
  function settleCard(card){
    if(!card?.isConnected){clearMerge();return;}
    if(mergeRaf)cancelAnimationFrame(mergeRaf);
    mergeEl=card;
    const t0=performance.now();
    const run=now=>{
      const u=(now-t0)/1000;
      const damp=Math.exp(-5.4*u);
      card.style.scale=(1-.055*damp*Math.cos(7.4*u)).toFixed(4);
      card.style.filter=optic(Math.max(0,.34-u*.85),SHEET_BLUR);
      card.style.opacity='';
      window.portfolioWake?.();
      if(u<1.05)mergeRaf=requestAnimationFrame(run);
      else {mergeRaf=0;clearMerge();}
    };
    mergeRaf=requestAnimationFrame(run);
  }

  dialog.addEventListener('close',()=>{clearAnimations();dialog.style.opacity='';dialog.style.filter='';dialog.style.transform='';
    // The landing card must always end sharp, even on Escape or history back.
    if(mergeEl&&!mergeRaf&&!timeline)setTimeout(clearMerge,420);});

  function tick(t,dt,isReduced){
    clock=t;reduced=!!isReduced;measure();
    const H=innerHeight,Y=scrollY;
    if(storyNode){
      // Mobile cards already have their own viewport entrance. A second gate
      // based only on scroll distance hid cards visible below the short hero.
      const gateTarget=reduced||innerWidth<=760?1:smooth(Y,H*.05,H*.66);
      // FLOW58: reveal geometry follows the already-smoothed document playhead.
      const owned=window.NocturneScroll?.synchronized?.();
      storyReveal=reduced?1:owned?gateTarget:spring(storyGate,gateTarget,8.5,dt);
      if(owned){storyGate.value=storyReveal;storyGate.velocity=0;}
      const g=clamp(storyReveal);
      storyNode.style.setProperty('--story-gate',g.toFixed(4));
      storyNode.style.setProperty('--story-veil',window.NocturneMotion.opticalFilter((1-g)*.85,9));
      const hidden=g<.0025;
      if((storyNode.dataset.gateHidden==='1')!==hidden)storyNode.dataset.gateHidden=hidden?'1':'0';
    }
    if(!dialog.open){
      const heroTarget=smooth(Y,H*.025,H*.52),owned=window.NocturneScroll?.synchronized?.();
      const heroExit=reduced?0:owned?heroTarget:spring(heroSpring,heroTarget,13,dt);
      if(owned){heroSpring.value=heroExit;heroSpring.velocity=0;}
      if(Y<metrics.heroHeight+80||heroExit<.999){
        departures.forEach(({el,i})=>{
          const p=reduced?0:smooth(clamp(heroExit*1.28-i*.028));
          el.style.opacity=p>.9995?'0':(1-p).toFixed(4);
          el.style.transform=p<.0001?'none':`translate3d(${((i-4.5)*10*p).toFixed(2)}px,${((-36+Math.sin(i*1.3)*22)*p).toFixed(2)}px,0) rotateZ(${((i%2?1:-1)*(4+i*.5)*p).toFixed(2)}deg) scale(${(1-p*.28).toFixed(4)})`;
          el.style.filter=p<.001||reduced?'none':window.NocturneMotion.opticalFilter(p,10);
        });
      }
      const ot=metrics.orbitTop-Y,ob=ot+metrics.orbitHeight;
      const enter=ot<H*.7&&ob>H*.3;
      // Orbit arrival flash is triggered by the flying seed, not section entry.
      insideOrbit=enter;
      const age=t-moonAt;
      const orb=document.querySelector('.flight-orb');
      if(orb&&age>=0&&age<2.2&&!reduced){
        const flash=smooth(age,0,.26)*(1-smooth(age,.38,2.2));
        orb.hidden=false;orb.style.left='50%';orb.style.top='50%';
        orb.style.opacity=String(1-smooth(age,.38,2.2));
        orb.style.transform=`translate(-50%,-50%) scale(${1+flash*3.2+smooth(age,.2,2.2)*2})`;
        orb.style.filter=`blur(${7+smooth(age,.2,2.2)*16}px) brightness(${1+flash*3})`;
      }else if(orb){orb.style.filter='';}

      moonPower=reduced?0:smooth(age,0,.32)*(1-smooth(age,.4,2.1));
      moon.style.opacity=(moonPower*.70).toFixed(4);moon.style.transform=`scale(${(1+moonPower*.07).toFixed(4)})`;
      if(ot<H*1.15&&ob>0){
        const op=$('.orbit-pin');
        const entry=reduced?1:smooth(-ot,-H*.62,H*.03);
        const exit=reduced?0:smooth(Y,metrics.orbitTop+metrics.orbitHeight-H*1.2,metrics.orbitTop+metrics.orbitHeight-H*.35);
        arc(op,entry,exit);heading($('.orbit-copy h2'),entry,exit);heading($('.orbit-copy p'),entry,exit);heading($('.orbit-center strong'),entry,exit);
      }
      // Smaller narrative blocks get the same curved edge without masking a
      // several-thousand-pixel tall sticky ancestor.
      for(const {el,rect:r} of narrativeRects){
        if(!r.height||r.top>H*1.12||r.bottom<-100)continue;
        // Short rows use local-size apertures; never allocate a page-long mask.
        const entrance=reduced?1:smooth(H-r.top,0,Math.min(H*.48,r.height+H*.10));
        const departure=reduced?0:smooth(-r.top,r.height*.18,r.height*.86);
        arc(el,entrance,departure,null,true);
        // Arrival has a direction: the block swings in from its own side, out
        // of a smaller scale, instead of only fading up.
        // The career rows already carry their arrival from the renderer, which
        // owns their transform; a second writer here would fight it.
        if(el.matches('#labRows .project-row')){
          const card=false;
          const k=reduced?1:1-Math.pow(1-clamp(entrance),3),back=1-k;
          const side=(r.left+r.width*.5)<innerWidth*.5?-1:1;
          const st=el.style;
          st.setProperty('--in-x',(side*(card?68:34)*back).toFixed(2)+'px');
          st.setProperty('--in-y',((card?44:26)*back).toFixed(2)+'px');
          st.setProperty('--in-s',(1-(card?.15:.07)*back).toFixed(4));
          st.setProperty('--in-rot',(side*(card?4.6:2)*back).toFixed(2));
          st.setProperty('--in-yaw',(-side*(card?10:4)*back).toFixed(2));
        }
        if(!el.matches('#story summary'))el.style.filter=reduced?'none':window.NocturneMotion.opticalFilter(Math.max(1-entrance,departure)*.72,5);
        if(el.matches('.index-head,#contact'))heading($('h2',el),entrance,departure);
      }
    }else {moonPower=0;moon.style.opacity='0';}
    const nav=reduced?0:spring(navSpring,navSpring.target||0,3.4,dt);
    navScrim.style.setProperty('--guard-strength',nav.toFixed(4));
    navScrim.style.transform=`translateX(-50%) scale(${(.97+nav*.05).toFixed(4)},${(.95+nav*.06).toFixed(4)})`;
    if(t-lastEnergy>1/24){
      lastEnergy=t;let i=0;
      for(const el of activeSurfaces){
        if(!el.isConnected){activeSurfaces.delete(el);candidates.delete(el);continue;}
        if(el.closest('[inert]')||dialog.open&&!dialog.contains(el))continue;
        el.style.setProperty('--energy-angle',(reduced?35:(t*12+i*51)%360).toFixed(2)+'deg');
        el.style.setProperty('--energy-power',(reduced?.30:.30+Math.sin(t*.71+i*1.6)*.06+Math.sin(t*.29+i)*.04).toFixed(3));i++;
      }
    }
  }
  const api=window.NocturneR14={seedArrival(){if(!reduced){moonAt=clock;window.portfolioWake?.();}},read,tick,arc,chapter,heading,prepareLayout,rememberSource,animateSheet,closeSheet,invalidate,returnBlur,cardScale,
    get seedAge(){return clock-moonAt;},get moonPower(){return moonPower;},
    get storyGate(){return reduced?1:clamp(storyReveal);},
    seam(){if(reduced||!sceneSeams.size)return null;let best=null;
      for(const [el,s] of sceneSeams){if(!el.isConnected){sceneSeams.delete(el);continue;}
        if(s.y<-.35||s.y>1.35)continue;if(!best||s.power>best.power)best=s;}
      if(!best)return null;seamOut[0]=best.y;seamOut[1]=best.band;seamOut[2]=best.power;return seamOut;},
    diagnostics:()=>({version:'R14',curvedApertures:$$('.r14-arc-target').length,activeApertures:$$('.arc-masking').length,activeRims:activeSurfaces.size,moonPower,sourceContinuity:!!sheetOrigin,heroExit:heroSpring.value,localNavGuard:true,reduced}),
  };
  window.portfolioWake?.();
})();
