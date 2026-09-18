/* NOCTURNE R14 — one reversible scroll timeline, with semantic checkpoint navigation.
 * update() reads layout on scroll/resize; tick() renders only visible chapters.
 * A carousel has ONE source of truth: its chapter's scroll coordinate.
 */
(() => {
  'use strict';
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v)), lerp=(a,b,t)=>a+(b-a)*t;
  const range=(v,a,b)=>{const t=clamp((v-a)/(b-a)); return t*t*(3-2*t);};
  // FLOW58: the same authored poses drive rendering, buttons and soft settling.
  const TIMELINE=Object.freeze({study:.14,railStart:.42,railSpan:.52,leadIn:.065,leadOut:.035});
  const railBounds=(s,k)=>({start:TIMELINE.railStart+k*TIMELINE.railSpan/s.rails.length,end:TIMELINE.railStart+(k+1)*TIMELINE.railSpan/s.rails.length});
  const slideProgress=(s,k,i)=>{const b=railBounds(s,k);return b.start+TIMELINE.leadIn+i/Math.max(1,s.rails[k].cards.length-1)*(b.end-b.start-TIMELINE.leadIn-TIMELINE.leadOut);};
  // The final card must precede the curved departure on every viewport; a
  // viewport-relative fade previously started before that card in short chapters.
  const exitStart=s=>{const k=s.rails.length-1;return Math.max(s.span-H*.20,s.span*slideProgress(s,k,s.rails[k].cards.length-1)+H*.045);};
  const layoutY=el=>{let y=0;for(let n=el;n;n=n.offsetParent)y+=n.offsetTop;return y;};
  const set=(el,vars)=>{for(const [k,v] of Object.entries(vars))el.style.setProperty(k,typeof v==='number'?v.toFixed(4):v);};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const orbit=$('#projects'), orbitStage=$('.orbit-stage'), icons=$$('.orbit-icon');
  const nav=$('.glass-nav'), thumb=$('.nav-thumb');
  let reduced=false,Y=scrollY,H=innerHeight,W=innerWidth,firstTop=0,orbitRect=null,orbitVisible=false,glassOff=false;
  const localFiles=new Map();
  let layoutDirty=true,orbitTop=0,orbitHeight=1,labTop=0,stageBox=null;
  const navItems=$$('[data-nav]',nav),navMetrics=new Map();let lastNav='',tickTime=0;
  // Written straight onto the element: a custom property here competed with
  // several stylesheet rules and lost, leaving the slot a full item adrift.
  function placeThumb(m){if(!m)return;
    // Inline !important: several stylesheets declare this transform and one of
    // them was winning over the inline value, parking the slot on item one.
    thumb.style.setProperty('width',m.width.toFixed(2)+'px','important');
    thumb.style.setProperty('--thumb-left',m.x.toFixed(2)+'px');}
  document.fonts?.ready.then(()=>{layoutDirty=true;window.portfolioWake?.();});
  function invalidate(){layoutDirty=true;window.portfolioWake?.();}
  addEventListener('resize',invalidate,{passive:true});document.fonts?.ready.then(invalidate);
  // Contact controls/font loading can resize the nav without a viewport resize.
  const navObserver=new ResizeObserver(invalidate);navObserver.observe(nav);navItems.forEach(a=>navObserver.observe(a));
  // A future poster-only slot must not present broken play controls.
  // Preserve the four existing embedded clips; only empty slots become
  // preview buttons leading to their illustrative interactive scene.
  $$('video[data-owned-demo]').forEach(v=>{
    if(v.getAttribute('src')||$('source[src]',v))return;
    const chapter=v.closest('[data-chapter]')?.id,card=v.closest('.media-card');
    const preview=document.createElement('button');preview.type='button';preview.className='study-preview';
    preview.dataset.viewStudy=chapter;preview.dataset.frameTitle=v.getAttribute('aria-label')||'Visual study';
    preview.setAttribute('aria-label','Open study: '+preview.dataset.frameTitle);
    const image=document.createElement('img');image.src=v.poster;image.alt='Illustrative study, not product footage';preview.append(image);v.replaceWith(preview);
    const label=$('.media-caption p',card);if(label)label.textContent='Study · try the live scene';
    const evidence=$('.media-evidence',card);if(evidence)evidence.textContent='VISUAL STUDY';
  });
  const states=$$('[data-chapter]').map((el,index)=>{
    const pin=$('.scene-pin',el), content=$('.world-content',el), bg=$('.world-background',el);
    const frame=document.createElement('div');frame.className='portal-frame';frame.setAttribute('aria-hidden','true');
    const src=icons.find(a=>a.hash==='#'+el.id)||icons[index];
    frame.innerHTML='<div class="portal-seed">'+(src?.querySelector('svg')?.outerHTML||'')+'</div>';
    frame.dataset.firstWave=String(index===0);frame.classList.add('background-portal');frame.style.display='none';$('.world-host').append(frame);
    const echo=document.createElement('div');echo.className='study-departure-glow';echo.setAttribute('aria-hidden','true');content.prepend(echo);
    return {el,index,id:el.id,pin,content,bg,frame,heading:$('.chapter-heading',el),study:$('.stage-study',el),
      p:0,entry:0,visible:false,top:0,span:1,rect:null,
      rails:$$('.media-rail',el).map(rail=>({rail,cards:$$('.media-card',rail),win:$('.rail-window',rail),track:$('.rail-track',rail),
        pos:0,target:0,base:0,offset:0,center:-1,visible:false,cardWidth:600,gap:28,dragging:false,start:.42,end:.94}))};
  });
  const rails=states.flatMap(s=>s.rails);rails.forEach(rs=>rs.owner=states.find(s=>s.rails.includes(rs)));
  const handoff=icons[0].cloneNode(true);handoff.removeAttribute('href');handoff.removeAttribute('data-orbit-index');
  handoff.classList.remove('orbit-icon');handoff.classList.add('handoff-icon');handoff.setAttribute('aria-hidden','true');handoff.tabIndex=-1;handoff.hidden=true;document.body.append(handoff);
  let seedArrived=false;
  const flightOrb=document.createElement('div');flightOrb.className='flight-orb';flightOrb.hidden=true;document.body.append(flightOrb);
  const api=window.LiquidPortfolio={hasGlass:false,update,tick,seek,invalidate,
    checkpoints:()=>{measureLayout();return states.flatMap(s=>{
      const top=s.top,span=s.span;
      const points=[{id:s.id,y:top+span*TIMELINE.study,progress:TIMELINE.study}];
      s.rails.forEach((rs,k)=>rs.cards.forEach((card,i)=>{const progress=slideProgress(s,k,i);points.push({id:s.id+':'+k+':'+i,y:top+span*progress,progress});}));
      return points;
    });},glass:()=>!glassOff,
    presentationReady:point=>{
      const s=states.find(s=>s.id===point.chapter),v=s?.visual;
      if(!s?.visible||!v||v.entry<.999||v.exit>.001||v.heading<.998||s.content.classList.contains('arc-masking')||s.content.classList.contains('arc-hidden'))return false;
      if(window.NocturneMotion?.chapterReady&&!window.NocturneMotion.chapterReady(s.id))return false;
      if(point.kind==='chapter')return v.study>.998;
      const rs=s.rails[point.rail||0];
      return !!rs&&rs.visible&&rs.opacity>.998&&Math.abs(rs.pos-point.slide)<.003;
    },
    presentation:()=>states.map(s=>({id:s.id,visible:s.visible,...s.visual,rails:s.rails.map(rs=>({position:rs.pos,opacity:rs.opacity,visible:rs.visible})),masked:s.content.classList.contains('arc-masking')})),
    needsFrame:()=>!reduced&&(orbitVisible||states.some(s=>s.visible)),
    stateProgress:id=>states.find(s=>s.id===id)?.p??0,
    isStudyVisible:id=>{const s=states.find(s=>s.id===id);return !!s?.visible&&Number(s.el.style.getPropertyValue('--stage-opacity'))>.01;},
    ambient:()=>range(Y,orbitTop-H*.5,orbitTop+H*.2)*(1-range(Y,labTop-H*.9,labTop+H*.3)),
    states:()=>states.map(s=>({id:s.id,progress:s.p,entry:s.entry,visible:s.visible,position:s.rails[0]?.pos,center:s.rails[0]?.center,cardWidth:s.rails[0]?.cardWidth})),
    redraw:()=>window.portfolioWake?.()};

  // Geometry is measured on resize/font/content changes, not between scroll writes.
  function measureLayout(){
    if(!layoutDirty)return;
    layoutDirty=false;W=innerWidth;H=innerHeight;
    const o=orbit.getBoundingClientRect();orbitTop=o.top+scrollY;orbitHeight=o.height;
    labTop=$('#lab').getBoundingClientRect().top+scrollY;
    const stage=orbitStage.getBoundingClientRect(),pin=$('.orbit-pin').getBoundingClientRect();
    stageBox={left:stage.left,offsetTop:stage.top-pin.top,width:stage.width,height:stage.height};
    {
      // Measured against the pill's own border box. offsetLeft is relative to a
      // different edge depending on the border, which is what slid the selected
      // slot sideways on the last item.
      const navBox=nav.getBoundingClientRect();
      navItems.forEach(a=>{const r=a.getBoundingClientRect();navMetrics.set(a,{width:r.width,x:r.left-navBox.left-nav.clientLeft});});
      const active=navItems.find(a=>a.hasAttribute('aria-current'))||navItems[0];
      placeThumb(navMetrics.get(active));
    }
    for(const s of states){
      const r=s.el.getBoundingClientRect();s.top=r.top+scrollY;s.span=Math.max(1,r.height-H);s.height=r.height;
      s.headTop=parseFloat(getComputedStyle(s.heading).top)||110;
      const desc=$('p',s.heading);if(desc){desc.style.height='auto';s.descHeight=desc.scrollHeight;desc.style.height='';s.el.style.setProperty('--desc-height',s.descHeight+'px');}
      s.oldFocus=s.el.style.getPropertyValue('--gallery-focus');s.el.style.setProperty('--gallery-focus','0');
      s.rails.forEach(rs=>{rs.bottom=parseFloat(getComputedStyle(rs.rail).bottom)||91;rs.width=rs.win.clientWidth||W;});
    }
    for(const s of states)s.fullHeight=s.heading.offsetHeight;
    for(const s of states)s.el.style.setProperty('--gallery-focus','1');
    for(const s of states)s.tightHeight=s.heading.offsetHeight;
    for(const s of states){s.el.style.setProperty('--gallery-focus',s.oldFocus||'0');s.layoutFresh=true;}
    firstTop=states[0].top;lastNav='';
    window.NocturneMotion?.measure();
  }
  function update(y,height,isReduced,current){
    Y=y;H=height;W=innerWidth;reduced=isReduced;measureLayout();
    orbitRect={top:orbitTop-Y,bottom:orbitTop+orbitHeight-Y,height:orbitHeight};
    orbitVisible=orbitRect.top<H&&orbitRect.bottom>0;
    const chosen=['lab','contact'].includes(current)?'lab':(['story','top'].includes(current)?'story':'projects');
    if(chosen!==lastNav){lastNav=chosen;for(const a of navItems){
      const on=a.dataset.nav===chosen;a.toggleAttribute('data-active',on);
      if(on){a.setAttribute('aria-current','location');placeThumb(navMetrics.get(a));}
      else a.removeAttribute('aria-current');
    }}
    for(const s of states){
      const top=s.top-Y,bottom=top+s.height;s.rect={top,bottom,height:s.height};
      s.p=clamp(((window.NocturneScroll?.playhead?.()??Y)-s.top)/s.span);s.entry=reduced?1:range(-top,-H*(s===states[0]?.18:1.18),-H*.06);
      s.visible=reduced?(top<H&&bottom>0):(top<H*1.18&&bottom>0);
      const incoming=!reduced&&top>0&&top<H*1.18;
      if(s.incoming!==incoming||s.wasReduced!==reduced||s.layoutFresh){
        s.pin.style.position=reduced?'relative':incoming?'fixed':'sticky';
        s.pin.style.left=incoming?'0':'';s.pin.style.right=incoming?'0':'';s.pin.style.top='0';
        s.pin.style.width=incoming?'100%':'';s.pin.style.zIndex=incoming?'7':'';
        s.incoming=incoming;s.wasReduced=reduced;
      }
      if(s.wasVisible!==s.visible){s.pin.style.visibility=s.visible?'visible':'hidden';s.pin.inert=!s.visible;s.wasVisible=s.visible;
        if(!s.visible){s.rails.forEach(rs=>$$('video',rs.rail).forEach(v=>v.pause()));}}
      if(!s.progress){s.progress={value:s.p,velocity:0};s.appear={value:s.entry,velocity:0};}
      if(!s.visible){window.NocturneMotion.setChapter(s.id,0,0,false);s.progress.value=s.p;s.progress.velocity=0;s.appear.value=s.entry;s.appear.velocity=0;if(s.departure){s.departure.value=reduced?0:range((window.NocturneScroll?.playhead?.()??Y)-s.top,exitStart(s),s.span+H*.48);s.departure.velocity=0;}}
    }
  }
  function paintChapter(s,dt){
    if(!s.visible){s.frame.style.display="none";return;}
    const spring=window.NocturneMotion.spring;
    const scrollOwned=window.NocturneScroll?.synchronized?.();
    const p=reduced||scrollOwned?s.p:spring(s.progress,s.p,16,dt);
    if(scrollOwned){s.progress.value=s.p;s.progress.velocity=0;}
    const follow=(state,target,omega)=>{if(reduced||scrollOwned){state.value=target;state.velocity=0;return target;}return spring(state,target,omega,dt);};
    let e=reduced?1:follow(s.appear,s.entry,11);
    // FLOW58: entry is driven by the same playhead as the mask.
    // A separate flash timer must not hold the scene behind the user's input.
    const exitTarget=reduced?0:range((window.NocturneScroll?.playhead?.()??Y)-s.top,exitStart(s),s.span+H*.48);
    if(!s.departure)s.departure={value:exitTarget,velocity:0};
    const rawExit=reduced?0:follow(s.departure,exitTarget,21);
    // C1-continuous optical tail: finish before the spring's asymptote so an
    // invisible low-alpha layer never survives the completed scene change.
    const tail=clamp((rawExit-.90)/.09);
    const exit=rawExit<=.90?rawExit:tail===1?1:.90+.10*(.90*tail+1.20*tail*tail-1.10*tail*tail*tail);
    const heading=reduced?1:range(e,.3,.9),gf=reduced?(p>=.40?1:0):range(p,.31,.43);
    // FLOW58: no invisible scroll dead-zone after the intro. Use a linear
    // transition master; each visual channel below eases it exactly once.
    // The first forward wheel now moves the composition instead of consuming
    // several notches while the first screen remains visually frozen.
    const dissolveTarget=clamp((p-.20)/(.48-.20));
    if(!s.dissolve)s.dissolve={value:dissolveTarget,velocity:0};
    const dissolve=reduced?dissolveTarget:clamp(follow(s.dissolve,dissolveTarget,7));
    const lift=Math.sin(Math.PI*dissolve),flight=range(dissolve,0,.88);
    const study=reduced?(p<.40?1:0):range(e,.57,1)*(1-range(dissolve,0,.82));
    const ht=s.headTop+lerp(s.fullHeight,s.tightHeight,gf)+(W<=760?0:22);
    const contentTop=H<=520&&W>H?88:Math.min(ht,H*.67);
    set(s.el,{'--gallery-focus':gf,'--exit':exit,'--heading-opacity':heading*(1-exit*.30),'--heading-x':'0px','--heading-y':'0px',
      '--heading-blur':'0px','--stage-opacity':study,'--stage-scale':lerp(.72,1,range(e,.3,1))*(1-flight*.12+Math.sin(dissolve*Math.PI*2)*.012),
      '--stage-x':(-lift*Math.min(W*.045,62))+'px','--stage-y':(-flight*155+Math.sin(dissolve*Math.PI*2)*10+(1-range(e,.57,1))*20)+'px',
      '--study-glow':reduced?0:range(dissolve,.06,.32)*(1-range(dissolve,.48,1))*.24,
      '--study-glow-scale':1+flight*.16,
      '--stage-ry':(-lift*5)+'deg','--stage-rz':(-lift*3)+'deg','--study-blur':((1-range(e,.5,1))*4+range(p,.32,.43)*4)+'px',
      '--stage-pointer':study>.65?'auto':'none','--chapter-progress':p,'--content-top':contentTop+'px'});
    s.visual={entry:e,exit,heading:heading*(1-exit*.30),study,progress:p};
    window.NocturneMotion.setChapter(s.id,e,exit,s.visible);
    const topEl=$('.scene-top',s.el);topEl.style.opacity=String(reduced?1:range(e,.63,.97)*(1-exit));
    window.NocturneMotion.optics(topEl,Math.max(1-e,exit)*.75,4);
    const foot=$('.scene-foot',s.el);if(foot){foot.style.opacity=String(reduced?1:range(e,.75,1)*(1-exit));window.NocturneMotion.optics(foot,exit,5);}
    s.study.inert=study<.5;s.study.style.visibility=study<=0?'hidden':'visible';
    s.study.style.setProperty('--study-optics',reduced?'none':`blur(${((1-study)*12).toFixed(2)}px)`);
    // A feathered curved aperture, fully removed at rest. The shell is a
    // separate organic optical echo, never a hard clipping rectangle.
    window.NocturneR14?.chapter(s,e,exit,tickTime,reduced);
    for(let i=0;i<s.rails.length;i++){
      const rs=s.rails[i],n=s.rails.length,bounds=railBounds(s,i);rs.start=bounds.start;rs.end=bounds.end;
      const opacity=reduced?(p>=rs.start-.02&&(i===n-1||p<rs.end)?1:0):(i===0?range(dissolve,.72,1):range(p,rs.start-.055,rs.start+.035))*(i===n-1?1:1-range(p,rs.end-.04,rs.end+.02));
      rs.opacity=opacity;rs.visible=s.visible&&opacity>0;rs.rail.style.visibility=rs.visible?'visible':'hidden';rs.rail.inert=!rs.visible||opacity<.5;
      set(rs.rail,{'--rail-opacity':opacity,'--rail-x':'0px','--rail-y':(1-opacity)*65+'px','--rail-roll':'0deg','--rail-blur':'0px','--rail-pointer':opacity>.6?'auto':'none'});
      window.NocturneMotion.optics(rs.rail,1-opacity,5,'--rail-optics');
      const wh=Math.max(80,H-contentTop-rs.bottom-80);
      rs.cardWidth=Math.max(150,Math.min(W*(W<=760?.84:.61),790,(Math.max(80,wh-56))*16/9));
      rs.gap=W<=760?22:34;set(rs.rail,{'--card-w':rs.cardWidth+'px'});rs.track.style.gap=rs.gap+'px';
      const raw=clamp((p-(rs.start+TIMELINE.leadIn))/(rs.end-rs.start-TIMELINE.leadIn-TIMELINE.leadOut))*(rs.cards.length-1);
      // The document controller supplies easing and settling. No per-card speed bumps.
      rs.base=raw;
      if(!rs.dragging)rs.target=reduced?Math.round(rs.base):rs.base;
      if(!rs.visible)$$('video',rs.rail).forEach(v=>{if(!v.paused)v.pause();});
    }
    s.layoutFresh=false;
  }
  function drawCloud(t){
    if(!orbitVisible){handoff.hidden=true;flightOrb.hidden=true;return;}
    const mobile=W<761,R={...stageBox,top:stageBox.offsetTop+Math.max(0,orbitRect.top)+Math.min(0,orbitRect.bottom-H)};
    const g=reduced?0:range(Y,orbitTop+H*.05,firstTop-H*.15);
    const cx=mobile?W*.5:W*.74,cy=(mobile?H*.72:H*.54)+Math.max(0,orbitRect.top);
    const center=$('.orbit-center');center.style.left=(cx-R.left)+'px';center.style.top=(cy-R.top)+'px';
    const ex=mobile?W*.34:Math.min(W*.18,300),ey=mobile?H*.155:Math.min(H*.24,220);
    const angles=[-1.42,-.44,.41,1.32,2.19,3.05,3.97],radii=[.96,1.08,.84,1.1,.90,.69,1.17];
    icons.forEach((el,i)=>{
      const a=angles[i]+(reduced?0:Math.sin(t*.1+i)*.035),bx=Math.cos(a)*ex*radii[i],by=Math.sin(a)*ey*radii[i];
      const depth=(Math.sin(a+.3)+1)*.5,scale=.84+depth*.21;
      let x=cx+bx+by*.26+(reduced?0:Math.sin(t*.35+i*1.7)*4),y=cy+by-bx*.14+(reduced?0:Math.cos(t*.38+i*2.1)*5);
      const arrival=reduced?1:range(H-orbitRect.top,H*.38+i*12,H*1.01+i*12);
      x+=(1-arrival)*(i%2?130:-130);y+=(1-arrival)*42;
      let opacity=(.76+depth*.24)*arrival,angle=reduced?0:Math.sin(t*.2+i)*2.5;
      if(i===0){
        const k=range(g,0,1),sx=x,sy=y;
        // Cubic flight curls outward, rises, then approaches the seed horizontally.
        const u=1-k;
        x=u*u*u*sx+3*u*u*k*(sx+W*.12)+3*u*k*k*(W*.5-W*.16)+k*k*k*W*.5;
        y=u*u*u*sy+3*u*u*k*(sy-H*.20)+3*u*k*k*(H*.5)+k*k*k*H*.5;
        el.style.opacity=String(opacity*(1-range(g,.01,.11)));
        const e=states[0].entry;
        handoff.hidden=reduced||g<.005||e>.24;
        if(k<.65)seedArrived=false;
        if(k>.965&&!seedArrived&&!reduced){seedArrived=true;window.NocturneR14?.seedArrival?.();}
        flightOrb.hidden=handoff.hidden;
        if(!handoff.hidden){
          flightOrb.style.left=x+'px';flightOrb.style.top=y+'px';
          flightOrb.style.opacity=String(range(k,.38,.8)*(1-range(e,.04,.25)));
          flightOrb.style.transform=`translate(-50%,-50%) scale(${1+range(e,0,.24)*4})`;

          handoff.style.opacity=String(range(g,.01,.10)*(1-range(e,.03,.24)));
          handoff.style.left=x+'px';handoff.style.top=y+'px';
          const ratio=mobile?66/90:1;
          handoff.style.transform=`translate(-50%,-50%) scale(${lerp(scale*ratio,.055,range(k,.12,.92))})`;
          handoff.style.filter=`blur(${(range(k,.24,.94)*7).toFixed(2)}px) drop-shadow(0 0 24px #cceeff)`;
          handoff.style.setProperty('--flight-glow',String(range(k,.3,.78)));
          handoff.style.setProperty('--flight-stretch',String(1+Math.sin(Math.PI*k)*4));
          $('span',handoff).style.opacity=String(1-range(g,.45,.88));
        }
      }else{
        // A small cohesive retreat, not the old edge-to-edge explosion.
        const k=range(g,.07+i*.022,.92);
        x=lerp(x,cx+bx*.80,k);y=lerp(y,cy+by*.80-30,k);angle*=1-k;
        opacity*=1-range(k,0,.87);el.style.opacity=String(opacity);
      }
      el.style.transform=`translate(-50%,-50%) translate3d(${x-R.left-R.width*.5}px,${y-R.top-R.height*.5}px,0) rotateZ(${angle}deg) scale(calc(${scale*(1-(i?g*.08:0))} * var(--icon-hover-scale,1)))`;
      el.style.zIndex=String(5+Math.round(depth*20));el.style.filter=reduced?'none':`blur(${((1-arrival)*9).toFixed(2)}px)`;el.inert=!reduced&&g>.5;
    });
  }
  function renderRail(rs,t){
    const w=rs.width;
    rs.track.style.transform=`translate3d(${w/2-rs.cardWidth/2-rs.pos*(rs.cardWidth+rs.gap)}px,0,0)`;
    for(let i=0;i<rs.cards.length;i++){
      const el=rs.cards[i],dist=i-rs.pos,a=Math.abs(dist);
      // Keep images and captions on one reading plane. The tactile chapters
      // breathe in depth; technical work travels like an editorial film strip.
      // No velocity-dependent tilt: a fast scroll must not throw the artwork.
      const tactile=['companion','elemental'].includes(rs.owner.id);
      const depth=tactile&&!reduced?.045:.015;
      set(el,{'--card-scale':1-clamp(a)*depth,'--card-opacity':clamp(1-a*.62,.12,1),
        '--card-angle':'0deg','--card-roll':'0deg','--card-bob':'0px','--card-blur':'0px'});
      window.NocturneMotion.optics(el,range(a,.72,1.65),2,'--card-optics');
      el.style.translate='';el.style.rotate='';
      el.style.visibility=a>1.65?'hidden':'visible';el.style.zIndex=String(100-Math.round(a*10));
    }
    const center=Math.round(rs.pos);
    if(center!==rs.center){
      rs.center=center;
      rs.cards.forEach((el,i)=>{const on=i===center;el.classList.toggle('is-center',on);el.setAttribute('aria-hidden',String(!on));el.inert=!on;
        $$('button,video,a',el).forEach(v=>v.tabIndex=on?0:-1);$$('video',el).forEach(v=>{if(!on)v.pause();else if(v.preload==='none'){v.preload='metadata';v.load();}});});
      $$('[data-slide-to]',rs.rail).forEach((b,i)=>b.setAttribute('aria-pressed',String(i===center)));
      $('.rail-count',rs.rail).textContent=`${String(center+1).padStart(2,'0')} / ${String(rs.cards.length).padStart(2,'0')}`;
    }
    $('.rail-prev',rs.rail).disabled=rs.target<.01;
    $('.rail-next',rs.rail).disabled=rs.target>rs.cards.length-1.01;
  }
  function tick(t,dt,isReduced){
    tickTime=t;reduced=isReduced;
    if(layoutDirty)update(scrollY,innerHeight,reduced,lastNav==='lab'?'lab':lastNav);
    const gather=reduced?0:range(Y,orbitTop+H*.05,firstTop-H*.15);
    if(orbitVisible){set(orbit,{'--orbit-copy-opacity':range(H-orbitRect.top,H*.38,H*1.02)*(1-range(gather,0,.7)),'--orbit-copy-y':-24*gather+'px','--orbit-center-opacity':range(H-orbitRect.top,H*.45,H*1.04)*(1-range(gather,0,.58))});$('.orbit-bottom').style.opacity=1-gather;}
    for(const s of states)paintChapter(s,dt);
    drawCloud(reduced?0:t);
    for(const rs of rails){if(!rs.visible)continue;
      if(!rs.spring)rs.spring={value:rs.pos,velocity:0};
      const synchronized=window.NocturneScroll?.synchronized?.();
      const previous=rs.pos;
      rs.pos=reduced||synchronized||rs.dragging?rs.target:window.NocturneMotion.spring(rs.spring,rs.target,16,dt);
      rs.velocity=reduced?0:(synchronized||rs.dragging?(rs.pos-previous)/Math.max(.008,dt):rs.spring.velocity);
      if(reduced||synchronized||rs.dragging){rs.spring.value=rs.pos;rs.spring.velocity=0;}
      renderRail(rs,t);
    }
  }
  function seek(id,p=TIMELINE.study,behavior,source){
    const el=document.getElementById(id);if(!el)return;
    const top=scrollY+el.getBoundingClientRect().top+(reduced? -80:Math.max(0,el.offsetHeight-H)*p);
    if(window.NocturneScroll)window.NocturneScroll.to(top,{instant:behavior==='instant'||reduced,source});
    else window.scrollTo({top,behavior:reduced?'instant':'smooth'});
    window.portfolioWake?.();
  }
  function select(rs,index,instant=false,duration=600){
    const i=clamp(index,0,rs.cards.length-1);rs.target=i;
    const p=slideProgress(rs.owner,rs.owner.rails.indexOf(rs),i);
    const y=rs.owner.top+rs.owner.span*p;
    window.NocturneScroll?.to(y,{duration:instant||reduced?0:duration,instant:instant||reduced});window.portfolioWake?.();
  }
  for(const rs of rails){
    $('.rail-prev',rs.rail).addEventListener('click',()=>select(rs,Math.round(rs.target)-1));
    $('.rail-next',rs.rail).addEventListener('click',()=>select(rs,Math.round(rs.target)+1));
    $$('[data-slide-to]',rs.rail).forEach(b=>b.addEventListener('click',()=>select(rs,Number(b.dataset.slideTo))));
    let drag=null,suppress=false;
    rs.win.addEventListener('keydown',e=>{
      if(e.target.matches('input,video,textarea'))return;
      const i={ArrowRight:Math.round(rs.target)+1,ArrowLeft:Math.round(rs.target)-1,Home:0,End:rs.cards.length-1}[e.key];
      if(i!==undefined){e.preventDefault();select(rs,i);}
    });
    rs.win.addEventListener('pointerdown',e=>{
      if(e.button!==0||e.target.closest('video,.replace-frame'))return;
      drag={id:e.pointerId,x:e.clientX,y:e.clientY,start:rs.pos,horizontal:false,lastX:e.clientX,lastT:performance.now(),velocity:0};suppress=false;
    });
    rs.win.addEventListener('pointermove',e=>{
      if(!drag||e.pointerId!==drag.id)return;
      const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
      if(!drag.horizontal&&Math.abs(dy)>Math.abs(dx)+7){drag=null;return;}
      if(!drag.horizontal&&Math.abs(dx)>9){drag.horizontal=true;rs.dragging=true;window.NocturneScroll?.cancel();rs.win.setPointerCapture(e.pointerId);}
      if(!drag.horizontal)return;e.preventDefault();suppress=true;
      const now=performance.now();drag.velocity=drag.velocity*.55+(e.clientX-drag.lastX)/Math.max(8,now-drag.lastT)*.45;drag.lastX=e.clientX;drag.lastT=now;
      rs.target=clamp(drag.start-dx/(rs.cardWidth+rs.gap),0,rs.cards.length-1);
      // Keep the single document playhead aligned while dragging, not after release.
      const p=slideProgress(rs.owner,rs.owner.rails.indexOf(rs),rs.target);
      window.NocturneScroll?.to(rs.owner.top+rs.owner.span*p,{instant:true,source:'gallery-drag'});window.portfolioWake?.();
    },{passive:false});
    const finish=e=>{
      if(!drag||e.pointerId!==drag.id)return;
      const moved=drag.horizontal,velocity=drag.velocity;drag=null;rs.dragging=false;
      if(rs.win.hasPointerCapture(e.pointerId))rs.win.releasePointerCapture(e.pointerId);
      if(moved)select(rs,Math.round(clamp(rs.target-velocity*.18,0,rs.cards.length-1)),false,360);
    };
    for(const type of ['pointerup','pointercancel','lostpointercapture'])rs.win.addEventListener(type,finish);
    rs.win.addEventListener('click',e=>{if(suppress){e.preventDefault();e.stopImmediatePropagation();suppress=false;}},{capture:true});
  }
  icons.forEach(a=>a.addEventListener('click',e=>{
    e.preventDefault();const id=a.hash.slice(1);seek(id,.14,undefined,a);
    try{history.replaceState({},'',a.hash);}catch{}
  }));
  document.addEventListener('click',e=>{
    const b=e.target.closest('button,a');if(!b)return;
    if(b.dataset.nextChapter){const i=states.findIndex(s=>s.id===b.dataset.nextChapter),next=states[i+1];
      if(next)seek(next.id,.14);else window.portfolioNavigate?.('bento');}
    if(b.dataset.backToStudy){Promise.resolve(window.portfolioCloseDialog?.()).then(()=>seek(b.dataset.backToStudy,.19));}
    if(b.hasAttribute('data-view-study')){
      const title=b.dataset.frameTitle,kind=b.dataset.viewStudy,svg=$('svg,img',b)?.outerHTML||'';
      window.portfolioOpenDialog?.(`<div class="eyebrow">MEDIA STUDY / ${esc(kind.toUpperCase())}</div><h2 id="dialogTitle">${esc(title)}</h2><div class="motion-study-large">${svg}</div><p class="art-note">Illustrative study, not product footage.</p><div class="case-actions"><button data-back-to-study="${esc(kind)}">Try the live scene ↗</button><button data-close>Back to the gallery ↙</button></div>`,'HLEB / MEDIA STUDY');
    }
    if(b.hasAttribute('data-replace-frame')){
      const id=b.dataset.replaceFrame,input=document.createElement('input');input.type='file';input.accept='video/*,image/*';
      input.addEventListener('change',()=>{
        const file=input.files?.[0];if(!file||!(/^(image|video)\//.test(file.type)))return;
        const card=$(`[data-frame-id="${CSS.escape(id)}"]`),host=$('.card-glass',card);host.querySelector('video')?.pause();
        if(localFiles.has(id))URL.revokeObjectURL(localFiles.get(id));
        const u=URL.createObjectURL(file);localFiles.set(id,u);
        const media=document.createElement(file.type.startsWith('video/')?'video':'img');
        if(media.tagName==='VIDEO'){media.controls=true;media.playsInline=true;media.preload='metadata';media.muted=true;}else media.alt=file.name;
        media.src=u;host.querySelector('video,img,.study-preview')?.replaceWith(media);
        $('.media-evidence',host).textContent='LOCAL MEDIA · '+file.name.slice(0,28);window.portfolioWake?.();
      });input.click();
    }
  });
  $('#glassToggle')?.addEventListener('click',()=>{
    glassOff=!glassOff;document.body.classList.toggle('no-glass',glassOff);
    $('#glassToggle').setAttribute('aria-pressed',String(glassOff));$('#glassToggle').textContent=glassOff?'Glass: off':'Glass: on';window.portfolioWake?.();
  });
  addEventListener('pagehide',e=>{if(!e.persisted)localFiles.forEach(u=>URL.revokeObjectURL(u));});
  window.portfolioV6Debug=()=>({reduced,firstTop,scroll:Y,handoffVisible:!handoff.hidden,chapters:api.states()});
})();

