/* NOCTURNE R13 — navigation, light and wall share the application's frame clock.
 * No private perpetual rAF loops. No analytics, external dependencies or polling.
 */
(() => {
  'use strict';
  const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v)),lerp=(a,b,t)=>a+(b-a)*t;
  const smooth=(v,a,b)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
  const reduced=()=>document.body.classList.contains('reduced');
  // FLOW56 owns all scrolling; effects only share its application clock.
  const cancel=()=>window.NocturneScroll?.cancel();

  // Reveal observes each element once. It is not a 400 ms timer or a frame loop.
  const revealSelectors=['.story-sticky .chapter-no','.story-sticky h2','.timeline-foot','.orbit-copy .eyebrow','.orbit-copy h2','.orbit-copy p',
    '.index-head .eyebrow','.index-head h2','.index-head .filter-row','.project-row','.lab-foot','.footer .eyebrow','.footer h2','.footer-note','.footer-links'];
  const observer=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){e.target.classList.add('is-in');observer.unobserve(e.target);}},{rootMargin:'0px 0px -4% 0px',threshold:0});
  revealSelectors.forEach((sel,k)=>$$(sel).filter(el=>!el.classList.contains('word-heading')).forEach((el,i)=>{el.classList.add('rv');el.style.setProperty('--rv-x','0px');el.style.setProperty('--rv-y','18px');el.style.transitionDelay=Math.min(i*35+(k%3)*35,140)+'ms';observer.observe(el);}));
  $$('.name-glyph .glyph-ink:not(.glyph-fringe)').forEach((el,i,a)=>{el.style.setProperty('--edge',Math.abs(i-(a.length-1)/2)/Math.max(1,(a.length-1)/2));el.style.setProperty('--gi',i);});

  const tints=['#8fd0ff','#b9a8ff','#ffb0d6','#ffd08c','#9ff0d2','#ff9f8c','#cbe57e','#7fe3ff','#d8c2ff'];
  const rows=$$('.exp').map((row,i)=>{
    const bubble=$('.career-bubble',row);if(!bubble)return null;
    for(const cls of ['lux','disp','nrg glow','nrg']){const el=document.createElement('i');el.className=cls;el.setAttribute('aria-hidden','true');bubble.append(el);}
    bubble.style.setProperty('--nrg',tints[i%tints.length]);return {row,bubble,i,lux:0};
  }).filter(Boolean);
  const story=$('#story');
  const wall=$('#bento'),cols=$$('.bento-col',wall),tiles=$$('.bento-tile',wall),workTiles=tiles.filter(el=>el.dataset.case);
  // All six works remain available on a phone. Unfilled author slots are kept,
  // but not shown to a portfolio visitor.
  const ordered=[...workTiles].sort((a,b)=>Number($('.bento-num',a)?.textContent)-Number($('.bento-num',b)?.textContent));
  ordered.forEach((el,i)=>cols[i%cols.length].append(el));
  tiles.filter(el=>!el.dataset.case).forEach((el,i)=>cols[i%cols.length].append(el));
  const status=$('#renderStatus');if(status)$('#utilityOptions').append(status);
  $$('.hero-edition .mono').forEach(el=>{el.innerHTML=el.innerHTML.replace(/NOCTURNE\s*\/\s*R6\.1\s*[–—-]\s*REFRACTION/g,'NOCTURNE / R14 — CONTINUITY');});
  let near=-1,navMark='',lastShock=-10;
  let wallDirty=true,wallTop=0,wallHeight=1,colLayout=[];
  const wallMotion={value:0,velocity:0};
  function measureWall(){
    if(!wallDirty)return;wallDirty=false;
    const r=wall.getBoundingClientRect();wallTop=r.top+scrollY;wallHeight=r.height;
    colLayout=cols.map(col=>({col,height:col.scrollHeight,tiles:[...col.children].map(el=>({el,top:el.offsetTop,height:el.offsetHeight,absolute:el.getBoundingClientRect().top+scrollY}))}));
  }
  const wallObserver=new ResizeObserver(()=>{wallDirty=true;window.portfolioWake?.();});wallObserver.observe(wall);cols.forEach(c=>wallObserver.observe(c));
  function shock(x,y,power=.35){
    if(reduced()||performance.now()-lastShock<700)return;
    lastShock=performance.now();window.Nocturne?.pulse?.(Math.min(.65,power));
    for(const bug of bugs){bug.vx+=(bug.x-x)*.012;bug.vy-=8;bug.life=.3;}
  }
  window.NocturneLight={shock,pulse:p=>window.Nocturne?.pulse?.(p)};
  const cv=document.createElement('canvas');cv.className='fireflies';cv.setAttribute('aria-hidden','true');document.body.append(cv);
  // A bounded point-sprite pass: iridescent fibres, shaded in their local coordinates.
  let pgl=null,pp=null,pbuf=null;const pdata=new Float32Array(44*6);
  try{pgl=cv.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:false,depth:false});if(pgl){
   const compile=(type,source)=>{const shader=pgl.createShader(type);pgl.shaderSource(shader,source);pgl.compileShader(shader);if(!pgl.getShaderParameter(shader,pgl.COMPILE_STATUS))throw Error(pgl.getShaderInfoLog(shader));return shader;};
   pp=pgl.createProgram();pgl.attachShader(pp,compile(pgl.VERTEX_SHADER,`attribute vec2 position;attribute vec4 material;uniform vec2 viewport;uniform float ratio;varying vec3 v;void main(){gl_Position=vec4(position/viewport*vec2(2.,-2.)+vec2(-1.,1.),0.,1.);gl_PointSize=material.x*ratio;v=material.yzw;}`));
   pgl.attachShader(pp,compile(pgl.FRAGMENT_SHADER,`precision mediump float;varying vec3 v;uniform float time;void main(){vec2 p=gl_PointCoord*2.-1.;float angle=v.y*.71+sin(time*.22+v.y)*.35;float c=cos(angle),s=sin(angle);p=mat2(c,-s,s,c)*p;float taper=max(0.,1.-p.y*p.y);float bend=p.x-.16*sin(p.y*2.8+time*.3+v.y);float body=exp(-bend*bend/0.007)*taper*taper;float halo=exp(-bend*bend/.085)*taper*taper*.10;float glint=exp(-pow(abs((p.y-sin(time*.5+v.y)*.7)*4.),2.));vec3 silver=mix(vec3(.55,.68,.79),vec3(.95,.89,.77),glint*.6+.2);float alpha=(body*(.42+glint*.4)+halo)*v.x;if(alpha<.004)discard;gl_FragColor=vec4(silver,alpha);}`));
   pgl.linkProgram(pp);if(!pgl.getProgramParameter(pp,pgl.LINK_STATUS))throw Error('Fibre shader link');pgl.useProgram(pp);pbuf=pgl.createBuffer();pgl.bindBuffer(pgl.ARRAY_BUFFER,pbuf);pgl.bufferData(pgl.ARRAY_BUFFER,pdata,pgl.DYNAMIC_DRAW);
   const pos=pgl.getAttribLocation(pp,'position'),mat=pgl.getAttribLocation(pp,'material');pgl.enableVertexAttribArray(pos);pgl.vertexAttribPointer(pos,2,pgl.FLOAT,false,24,0);pgl.enableVertexAttribArray(mat);pgl.vertexAttribPointer(mat,4,pgl.FLOAT,false,24,8);pgl.enable(pgl.BLEND);pgl.blendFunc(pgl.SRC_ALPHA,pgl.ONE_MINUS_SRC_ALPHA);
   pp.viewport=pgl.getUniformLocation(pp,'viewport');pp.ratio=pgl.getUniformLocation(pp,'ratio');pp.time=pgl.getUniformLocation(pp,'time');
  }}catch(e){console.warn('Ambient fibre pass unavailable',e.message);pgl=null;}
  const ctx=pgl?null:cv.getContext('2d');let width=0,height=0,lastFX=0;

  const bugs=Array.from({length:44},(_,i)=>({x:((i*.618)%1)*innerWidth,y:innerHeight*(.18+((i*.381)%1)*.86),vx:0,vy:0,phase:i*1.7,r:.6+(i%4)*.16,life:0}));
  // One reusable sprite rather than one allocated radial gradient per particle per frame.
  const dot=document.createElement('canvas');dot.width=dot.height=32;const dc=dot.getContext('2d');
  if(dc){
    // Bake a tapered, curved silver filament once; no spherical sparkle texture.
    const pixels=dc.createImageData(32,32);
    for(let y=0;y<32;y++)for(let x=0;x<32;x++){const u=(x-15.5)/15.5,v=(y-15.5)/15.5,curve=u-.17*Math.sin(v*3),edge=Math.max(0,1-v*v),core=Math.exp(-curve*curve/0.012)*edge*edge,haze=Math.exp(-curve*curve/.14)*edge*.14,a=Math.min(1,core*.8+haze),j=(y*32+x)*4;pixels.data[j]=218;pixels.data[j+1]=230;pixels.data[j+2]=241;pixels.data[j+3]=Math.round(a*255)}dc.putImageData(pixels,0,0);
  }
  function resize(){wallDirty=true;width=innerWidth;height=innerHeight;if(ctx||pgl){const dpr=Math.min(devicePixelRatio||1,1.5);cv.width=width*dpr;cv.height=height*dpr;if(ctx)ctx.setTransform(dpr,0,0,dpr,0,0);if(pgl){pgl.viewport(0,0,cv.width,cv.height);pgl.uniform2f(pp.viewport,width,height);pgl.uniform1f(pp.ratio,dpr);}}}
  resize();addEventListener('resize',resize,{passive:true});
  let frameStoryRect=null,frameWallRect=null;
  function read(){
    // These section boxes do not depend on the animated child transforms.
    // Sample them alongside the other reads, before the frame's style writes.
    measureWall();frameStoryRect=story.getBoundingClientRect();frameWallRect=wall.getBoundingClientRect();
  }
  function energy(t,dt){
    const scrollY=window.NocturneFrame?.scrollY??window.scrollY;
    // Read first, then paint. Geometry for the glowing rim is the same box as
    // the actual card, never a separate viewport-sized displacement overlay.
    const sr=frameStoryRect||story.getBoundingClientRect();if(sr.top>height||sr.bottom<0)return;
    const head=window.Nocturne?.riverHead||0;
    // Card geometry comes from the renderer's own layout pass. Re-measuring it
    // here, after the frame had already written transforms, forced a second
    // full layout every frame.
    const stops=window.Nocturne?.riverStops?.()||[];
    const byId=new Map(stops.map(s=>[s.id,s]));
    for(const r of rows){
      const stop=byId.get(r.row.id);if(!stop)continue;
      const rect={top:stop.top-scrollY,bottom:stop.bottom-scrollY,height:stop.height};
      if(rect.top>height+160||rect.bottom<-160)continue;
      const d=(head-stop.center)/Math.max(180,rect.height*1.5);
      const target=Number(r.row.querySelector('summary').dataset.focus||0);
      r.lux=lerp(r.lux,target,1-Math.exp(-dt*7));
      const st=r.bubble.style;st.setProperty('--lux',r.lux.toFixed(3));
      st.setProperty('--flow',((t*.088+r.i*.117)%1).toFixed(4));st.setProperty('--flow2',((1-(t*.053+r.i*.21)%1)).toFixed(4));
      st.setProperty('--w1',(1.25+r.lux*.7).toFixed(2)+'px');st.setProperty('--w2',(2+r.lux*1.8).toFixed(2)+'px');
    }
  }
  function drawWall(t,still,dt){
    measureWall();const H=innerHeight,r=frameWallRect||wall.getBoundingClientRect(),top=r.top,pin=$('.bento-pin',wall);
    wallTop=top+scrollY;wallHeight=r.height;
    const desktop=innerWidth>900&&!still;
    if(top>H*1.18||top+wallHeight<0){
      if(desktop){pin.style.position='sticky';pin.style.top='0';pin.style.left='';pin.style.right='';pin.style.zIndex='';}
      return;
    }
    const span=Math.max(1,wallHeight-H),target=clamp(-top/span);
    const p=still?target:window.NocturneMotion.spring(wallMotion,target,13,dt);
    const entry=still?1:smooth(-top,-H*1.15,-H*.06);
    const departure=still?0:smooth(-top,span-H*.45,span+H*.45);
    wall.style.setProperty('--bento-entry',entry.toFixed(4));
    wall.style.setProperty('--bento-wash',(entry*(1-departure)).toFixed(5));
    if(!desktop){
      pin.style.position='';pin.style.top='';pin.style.left='';pin.style.right='';pin.style.zIndex='';
      window.NocturneR14?.arc(pin,1,0,null,false,true);
      const hr=$('.bento-head',wall).getBoundingClientRect(),headerEntry=still?1:smooth(H-hr.top,H*.02,H*.42);
      wall.style.setProperty('--r14-head-opacity',headerEntry.toFixed(4));wall.style.setProperty('--head-fade','1');
      wall.style.setProperty('--r14-head-y',((1-headerEntry)*18).toFixed(2)+'px');wall.style.setProperty('--r14-head-filter',window.NocturneMotion.opticalFilter(1-headerEntry,5));
      window.NocturneR14?.heading($('.bento-head h2',wall),headerEntry,0);
      const gridTop=$('.bento-wall',wall).getBoundingClientRect().top;
      const batch=colLayout.map(c=>({col:c.col,items:c.tiles.map(item=>({el:item.el,top:item.top,height:item.height}))}));
      const countText=String(workTiles.length).padStart(2,'0')+' / PROJECTS';if($('.bento-count',wall).textContent!==countText)$('.bento-count',wall).textContent=countText;
      wall.style.setProperty('--bento-entry','1');
      for(const c of batch){c.col.style.transform='';for(const item of c.items){
        const el=item.el,y=gridTop+item.top;
        const arrival=still?1:smooth(H-y,0,H*.25),leave=still?0:1-smooth(y-65,-item.height,-item.height*.55),alpha=arrival*(1-leave);
        el.style.transform='';el.style.filter='';el.style.opacity='';el.inert=alpha<.08&&!still;
        el.style.setProperty('--tile-opacity',alpha.toFixed(4));el.style.setProperty('--tile-y',((1-arrival)*34-leave*17).toFixed(2)+'px');
        window.NocturneMotion.optics(el,Math.max(1-arrival,leave),5,'--tile-optics');
      }}return;
    }
    // Arrive while the previous chapter is still dissolving. No empty runway.
    const incoming=top>0;
    pin.style.position=incoming?'fixed':'sticky';pin.style.top='0';pin.style.left=incoming?'0':'';pin.style.right=incoming?'0':'';pin.style.zIndex=incoming?'8':'';
    // The wall gets no seam band at all. It is a content section, not a scene,
    // and a full-width defocus strip sweeping across it is the straight edge
    // that kept showing up here. Its reveal is the tiles and the heading.
    window.NocturneR14?.arc(pin,entry,departure,null,false,true);
    const headOut=smooth(p,.015,.23);
    // The block keeps its opacity while the words scatter; fading the whole
    // heading first hid the one animation worth seeing.
    wall.style.setProperty('--head-fade','1');wall.style.setProperty('--r14-head-opacity',(entry*(1-smooth(p,.24,.32))).toFixed(5));
    wall.style.setProperty('--r14-head-y',((1-entry)*26-headOut*72).toFixed(2)+'px');
    wall.style.setProperty('--r14-head-filter',window.NocturneMotion.opticalFilter(Math.max(1-entry,headOut)*.6,5));
    window.NocturneR14?.heading($('.bento-head h2',wall),entry,headOut);
    window.NocturneR14?.heading($('.bento-head p',wall),entry,headOut);
    window.NocturneR14?.heading($('.bento-head .eyebrow',wall),entry,headOut);
    let best=99,pick=0;
    colLayout.forEach((data,ci)=>{
      const ch=data.height,cy=H*.53,y=H*(.51+ci*.012)-p*(ch+H*.42)*(1+(ci-1)*.04);
      data.col.style.transform=`translate3d(0,${y.toFixed(2)}px,0)`;
      data.tiles.forEach((item,index)=>{
        const el=item.el;if(!item.height)return;
        const c=y+item.top+item.height/2,d=(c-cy)/H,a=Math.abs(d);
        const intro=smooth(entry,ci*.04,.92),velocity=clamp(wallMotion.velocity,-2.5,2.5);
        const variant=window.NocturneLab?.flags.bentoV2;const bend=(ci-1)*a*a*(variant?100:34),z=-a*a*(variant?300:200)-(1-intro)*130,scale=1-Math.min(.14,a*a*.20);
        const drift=(1-intro)*55+Math.sin(t*.45+ci*1.3+index)*.65;
        el.style.transform=`translate3d(${bend.toFixed(2)}px,${drift.toFixed(2)}px,${z.toFixed(2)}px) rotateX(${clamp(-d*19+velocity*5,-24,24).toFixed(2)}deg) rotateY(${((ci-1)*(-a*6-(1-intro)*12)).toFixed(2)}deg) rotateZ(${((ci-1)*(1-intro)*4+velocity*(ci-1)*.75).toFixed(2)}deg) scale(${scale.toFixed(4)})`;
        const fade=smooth(a,.37,.86),alpha=intro*(1-fade)*(1-departure);
        el.style.opacity=alpha<.0005?'0':alpha.toFixed(4);
        window.NocturneMotion.optics(el,Math.max(1-intro,fade,departure)*(ci===1?.86:1),6,'--tile-optics');
        el.inert=alpha<.12;el.classList.toggle('is-near',a<.19);
        if(el.dataset.case&&a<best){best=a;pick=workTiles.indexOf(el);}
      });
    });
    if(pick!==near){near=pick;$('.bento-count',wall).textContent=`${String(pick+1).padStart(2,'0')} / ${String(workTiles.length).padStart(2,'0')}`;}
    $('.bento-bar i',wall).style.transform=`scaleX(${p})`;
  }

  function frame(t,dt,still){
    drawWall(t,still,dt);
    if(!ctx&&!pgl)return;
    if(still||window.NocturneLab?.flags.ambientParticles===false||document.body.classList.contains('eco-effects')){if(ctx)ctx.clearRect(0,0,width,height);if(pgl)pgl.clear(pgl.COLOR_BUFFER_BIT);return;}
    const navNow=$('.glass-nav a[aria-current]')?.dataset.nav;
    if(navNow&&navNow!==navMark){/* section-entry light is owned by NocturneR14 */navMark=navNow;}
    energy(t,dt);
    if(t-lastFX<1/60)return;const fd=clamp(t-lastFX,0,.066);lastFX=t;
    if(ctx)ctx.clearRect(0,0,width,height);if(pgl)pgl.clear(pgl.COLOR_BUFFER_BIT);
    const wind=window.Nocturne?.windState?.().dir||0,count=width<761?12:window.NocturneLab?.inlineOpen?16:28;
    for(let i=0;i<count;i++){
      const b=bugs[i];b.vx=lerp(b.vx,wind*18+Math.sin(t*.21+b.phase)*7+Math.cos(t*.11+b.phase*2)*4,1-Math.exp(-fd*1.8));
      b.vy=lerp(b.vy,-3-Math.cos(t*.3+b.phase)*2,1-Math.exp(-fd*1.2));b.x+=b.vx*fd;b.y+=b.vy*fd;b.life=Math.max(0,b.life-fd*.4);
      if(b.x<-20)b.x=width+16;if(b.x>width+20)b.x=-16;
      if(b.y<height*.12){b.y=height*1.03;b.x=((i*.618+t*.013)%1)*width;}
      const alpha=(.12+Math.pow(.5+.5*Math.sin(t*.65+b.phase),2)*.48+b.life*.1)*clamp((b.y-height*.12)/(height*.25));
      const depth=.45+(i%5)*.18;const s=b.r*(i%7===0?29:16)*depth;
      // Soft elongated pollen with layered drift; one cached sprite, no per-frame gradients.
      
      if(ctx){ctx.globalAlpha=alpha;ctx.drawImage(dot,b.x-s/2,b.y-s/2,s,s);}if(pgl)pdata.set([b.x,b.y,s,alpha,b.phase,depth],i*6);
    }if(ctx)ctx.globalAlpha=1;if(pgl){pgl.bufferSubData(pgl.ARRAY_BUFFER,0,pdata.subarray(0,count*6));pgl.uniform1f(pp.time,t);pgl.drawArrays(pgl.POINTS,0,count);}
  }
  window.NocturneFX={read,tick:frame,needsFrame:()=>!reduced()};
  document.addEventListener('click',e=>{const el=e.target.closest('.exp summary,.orbit-icon,.bento-tile');if(el){const r=el.getBoundingClientRect();shock(r.left+r.width/2,r.top+r.height/2,.28);}},true);
  // Close the utility popover on outside click/Escape; do not trap keyboard focus.
  function closeUtility(){const b=$('#utilityToggle');b.setAttribute('aria-expanded','false');$('#utilityOptions').hidden=true;}
  document.addEventListener('click',e=>{if(!e.target.closest('.utility-dock'))closeUtility();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#dialog').open){closeUtility();cancel();}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancel();$$('video').forEach(v=>v.pause());}else window.portfolioWake?.();});
  window.portfolioWake?.();
})();

// Keep the reader's last chosen project visible when returning from its case.
document.querySelector('#labRows')?.addEventListener('click',event=>{
  const selected=event.target.closest('.project-row');if(!selected)return;
  document.querySelectorAll('#labRows .project-row').forEach(row=>{
    row.classList.toggle('is-selected',row===selected);
    row.toggleAttribute('data-selected',row===selected);
  });
});
