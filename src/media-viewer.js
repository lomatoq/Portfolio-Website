/* FLOW58 / NocturneMedia. Separate top-layer viewer, never replaces the case DOM.
 * Data: content/media.json, inlined for file://. type = long-image | video.
 * Public API: open(id, opener), close(), register(id, item), isOpen, diagnostics().
 * Content values are inserted as text. URLs are restricted; no remote execution.
 */
(() => {
 'use strict';
 const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const root=document.documentElement,body=document.body;
 let registry={};try{registry=JSON.parse($('#portfolio-media')?.textContent||'{}').items||{};}catch(e){console.warn('Media config could not be read.',e);}
 let viewer=null,shell=null,layout=null,media=null,notes=null,progress=null,opener=null,activeId=null,current=null,animation=null,closing=false,token=0,lock=null,observer=null;
 const replacements=new Map();let pauseList=[],scrollFrame=0;
 const reduced=()=>body.classList.contains('reduced')||matchMedia('(prefers-reduced-motion: reduce)').matches;
 const mobile=()=>matchMedia('(max-width:760px)').matches;
 function safeURL(value,type='image'){
  if(typeof value!=='string'||!value.trim())return '';
  const url=value.trim();
  if(/^data:/i.test(url))return (type==='video'?/^data:video\/(mp4|webm|ogg);base64,/i:/^data:image\/(png|jpeg|jpg|webp|gif|avif|svg\+xml)[;,]/i).test(url)?url:'';
  if(/^blob:/i.test(url))return url;
  try{const u=new URL(url,location.href);return ['http:','https:','file:'].includes(u.protocol)?url:'';}catch{return /^(?![a-z][\w+.-]*:|\/\/)[\w.\-/ %]+$/i.test(url)?url:'';}
 }
 function demoStory(item){
  const artwork=window.portfolioArt?.(item.demoArt||'poly')||'';
  const panels=['Opening frame','Form & detail','Interface studies','Sequence & rhythm'];
  // Responsive HTML typography, not a 4480px bitmap with scaled-up text.
  return '<div class="mv-story"><p class="mv-story-label">ILLUSTRATIVE VISUAL STUDY</p>'+panels.map((label,i)=>
   `<figure class="mv-story-panel"><div class="mv-story-art" aria-hidden="true">${artwork}</div><figcaption><span>${String(i+1).padStart(2,'0')}</span><h3>${label}</h3></figcaption></figure>`).join('')+'<p class="mv-demo-caption">Illustrative previews · not original product captures</p></div>';
 }
 function ensure(){
  if(viewer)return;
  viewer=document.createElement('dialog');viewer.id='mediaViewer';viewer.className='media-viewer';viewer.dataset.freeScroll='';viewer.setAttribute('aria-labelledby','mediaViewerTitle');viewer.setAttribute('aria-modal','true');
  viewer.innerHTML='<section class="mv-shell"><header class="mv-head"><div class="mv-heading"><span class="mv-eyebrow"></span><h2 class="mv-title" id="mediaViewerTitle"></h2></div><span class="mv-hint"></span><button type="button" class="mv-close" aria-label="Close media and return to the project">×</button></header><div class="mv-progress" role="progressbar" aria-label="Reading progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"></div><div class="mv-layout" data-free-scroll><div class="mv-media" data-free-scroll tabindex="0" role="region" aria-label="Project media"></div><aside class="mv-notes" data-free-scroll tabindex="-1" aria-label="Project details"></aside></div><footer class="mv-foot"><button type="button" class="mv-back">↙ Back to project</button><span class="mv-position" aria-hidden="true"></span><button type="button" class="mv-details">Project details ↓</button></footer></section>';
  body.append(viewer);shell=$('.mv-shell',viewer);layout=$('.mv-layout',viewer);media=$('.mv-media',viewer);notes=$('.mv-notes',viewer);progress=$('.mv-progress',viewer);
  $('.mv-close',viewer).addEventListener('click',()=>close());
  $('.mv-back',viewer).addEventListener('click',()=>close());
  $('.mv-details',viewer).addEventListener('click',()=>{
   notes.classList.remove('mv-notes-pending');
   if(mobile())layout.scrollTo({top:layout.scrollTop+notes.getBoundingClientRect().top-layout.getBoundingClientRect().top,behavior:reduced()?'instant':'smooth'});
   else notes.scrollTop=0;
   notes.focus({preventScroll:true});
  });
  viewer.addEventListener('cancel',e=>{e.preventDefault();close();});
  // Same-target pointer up avoids closing after a drag ends outside the sheet.
  let downOutside=false;viewer.addEventListener('pointerdown',e=>{downOutside=e.target===viewer;});
  viewer.addEventListener('click',e=>{if(e.target===viewer&&downOutside)close();});
  for(const scroller of [layout,media])scroller.addEventListener('scroll',()=>{if(!scrollFrame)scrollFrame=requestAnimationFrame(updateProgress);},{passive:true});
  viewer.addEventListener('wheel',e=>{if(e.target===viewer||e.target.closest('.mv-head'))e.preventDefault();},{passive:false});
  viewer.addEventListener('touchmove',e=>{if(e.target===viewer||e.target.closest('.mv-head'))e.preventDefault();},{passive:false});
  viewer.addEventListener('keydown',e=>{
   if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();return;}
   if(e.key==='Tab'){
    const list=$$('button:not([disabled]),a[href],video[controls],[tabindex="0"]',viewer).filter(e=>!e.hidden&&e.getClientRects().length);
    const first=list[0],last=list.at(-1);if(e.shiftKey&&(document.activeElement===first||!viewer.contains(document.activeElement))){e.preventDefault();last?.focus();}else if(!e.shiftKey&&(document.activeElement===last||!viewer.contains(document.activeElement))){e.preventDefault();first?.focus();}
   }
   if(!e.target.closest('video,input,textarea,select,[contenteditable]')&&!(e.key===' '&&e.target.closest('button'))&&['PageDown','PageUp','ArrowDown','ArrowUp','Home','End',' '].includes(e.key)){
    const scroller=mobile()?layout:e.target.closest('.mv-notes')?notes:media,dir=['PageUp','ArrowUp'].includes(e.key)||(e.key===' '&&e.shiftKey)?-1:1;e.preventDefault();scroller.scrollTo({top:e.key==='Home'?0:e.key==='End'?scroller.scrollHeight:scroller.scrollTop+dir*(e.key.startsWith('Arrow')?64:scroller.clientHeight*.82),behavior:reduced()?'instant':'smooth'});
   }
  });
 }
 function freezeBackground(){
  window.NocturneScroll?.cancel('media-open');
  lock={y:scrollY,x:scrollX,rootOverflow:root.style.overflow,bodyOverflow:body.style.overflow,gutter:root.style.scrollbarGutter};
  root.style.scrollbarGutter='stable';root.style.overflow='hidden';body.style.overflow='hidden';
  pauseList=$$('video').filter(v=>!viewer.contains(v)&&!v.paused);pauseList.forEach(v=>v.pause());
 }
 function restoreBackground(){
  if(!lock)return;const saved=lock;lock=null;root.style.overflow=saved.rootOverflow;body.style.overflow=saved.bodyOverflow;root.style.scrollbarGutter=saved.gutter;
  scrollTo({left:saved.x,top:saved.y,behavior:'instant'});window.NocturneScroll?.cancel('media-close');window.NocturneScroll?.invalidate();
  if(!window.NocturneLab?.inlineOpen&&!$('#dialog')?.open)for(const v of pauseList)if(v.isConnected&&v.getBoundingClientRect().bottom>0&&v.getBoundingClientRect().top<innerHeight)v.play().catch(()=>{});
  pauseList=[];
 }
 function updateProgress(){
  scrollFrame=0;if(!viewer?.open)return;
  const scroller=mobile()?layout:media,max=scroller.scrollHeight-scroller.clientHeight;
  const ratio=max>1?Math.min(1,Math.max(0,scroller.scrollTop/max)):1;progress.style.setProperty('--mv-progress',ratio.toFixed(4));
  const percent=String(Math.round(ratio*100));if(progress.getAttribute('aria-valuenow')!==percent){progress.setAttribute('aria-valuenow',percent);$('.mv-position',viewer).textContent=current?.type==='video'?'MOTION STUDY':percent+'%';}
 }
 function observeNotes(){
  observer?.disconnect();notes.classList.remove('mv-notes-pending');if(!mobile()||current.type==='video'||reduced())return;
  if(!('IntersectionObserver' in window))return;
  notes.classList.add('mv-notes-pending');observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){notes.classList.remove('mv-notes-pending');observer.disconnect();}},{root:layout,rootMargin:'0px 0px 50px 0px',threshold:.03});observer.observe(notes);
 }
 function status(text){const el=document.createElement('p');el.className='mv-status';el.setAttribute('role','status');el.textContent=text;return el;}
 function paint(item){
  current=item;media.replaceChildren();notes.replaceChildren();layout.scrollTop=media.scrollTop=notes.scrollTop=0;progress.removeAttribute('aria-valuenow');
  viewer.dataset.mediaType=item.type;$('.mv-title',viewer).textContent=item.title||'Project media';$('.mv-eyebrow',viewer).textContent=item.eyebrow||'SELECTED WORK';$('.mv-hint',viewer).textContent=item.type==='video'?'PLAY / PAUSE / EXPLORE':'SCROLL TO EXPLORE ↓';
  notes.innerHTML=`<p class="mv-description">${esc(item.description||'')}</p>${(item.sections||[]).map(s=>`<section class="mv-text-section"><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></section>`).join('')}${item.tags?.length?`<div class="mv-tags">${item.tags.map(t=>`<span>${esc(t)}</span>`).join('')}</div>`:''}${item.note?`<p class="mv-note">${esc(item.note)}</p>`:''}`;
  const replacement=replacements.get(activeId);
  if(item.type==='long-image'&&item.demo&&!replacement&&!item.src&&!item.images?.length){
   media.innerHTML=demoStory(item);
  }else if(item.type==='long-image'){
   const loading=document.createElement('span');loading.className='mv-loading';loading.textContent='LOADING IMAGE';loading.setAttribute('role','status');media.append(loading);
   const sources=replacement?[{src:replacement.url}]:Array.isArray(item.images)&&item.images.length?item.images:[{src:safeURL(item.src),width:item.width,height:item.height,alt:item.alt}];
   let remaining=sources.length;
   for(const [i,part] of sources.entries()){
    const data=typeof part==='string'?{src:part}:part,src=safeURL(data.src);if(!src){loading.remove();media.append(status('Image space is ready. Add a source in content/media.json or choose a local file.'));continue;}
    const img=document.createElement('img');img.className='mv-image';img.alt=data.alt||item.alt||item.title||'Project image';img.decoding='async';img.loading=i===0?'eager':'lazy';
    // Dimensions reserve the exact aspect ratio; local replacements measure themselves.
    if(Number(data.width)>0&&Number(data.height)>0){img.width=Number(data.width);img.height=Number(data.height);}
    img.addEventListener('load',()=>{if(--remaining<=0||i===0)loading.remove();updateProgress();},{once:true});
    img.addEventListener('error',()=>{loading.remove();img.replaceWith(status('This image could not be loaded. Check the file path or select a local image.'));},{once:true});
    img.src=src;media.append(img);
   }
   if(item.demo&&!replacement){const caption=document.createElement('div');caption.className='mv-demo-caption';caption.textContent=item.note||'LAYOUT DEMO';media.append(caption);}
  }else{
   const wrap=document.createElement('div');wrap.className='mv-video-wrap';media.append(wrap);
   const v=document.createElement('video');v.className='mv-video';v.controls=true;v.playsInline=true;v.setAttribute('playsinline','');v.muted=item.muted!==false;v.defaultMuted=v.muted;v.autoplay=item.autoplay!==false;v.loop=item.loop!==false;v.preload='metadata';v.setAttribute('aria-label',item.demo?'Synthetic playback demo; not original project footage':item.title||'Project video');
   let src=safeURL(replacement?.url||item.src,'video'),poster=safeURL(item.poster);
   if(!src&&item.demoVideoSelector){try{const demo=$(item.demoVideoSelector);src=safeURL(demo?.currentSrc||demo?.getAttribute('src')||$('source',demo||document)?.getAttribute('src'),'video');poster=poster||safeURL(demo?.poster);}catch{}}
   if(poster)v.poster=poster;
   if(src){v.src=src;wrap.append(v);const fallback=document.createElement('button');fallback.className='mv-play-fallback';fallback.type='button';fallback.textContent='Play video ▷';fallback.hidden=true;wrap.append(fallback);fallback.onclick=()=>v.play().then(()=>fallback.hidden=true).catch(()=>fallback.textContent='Playback unavailable — choose another file');
    v.addEventListener('play',()=>fallback.hidden=true);v.addEventListener('error',()=>{fallback.hidden=true;wrap.append(status('This video could not be played. Try an H.264 MP4 or a supported WebM file.'));},{once:true});
    // Called synchronously in the initiating click, before awaiting animation.
    if(v.autoplay)v.play().catch(()=>{if(viewer.open&&!closing)fallback.hidden=false;});
   }else wrap.append(status('Video space is ready. Add a video source in content/media.json or choose a local file.'));
   if(item.demo&&!replacement){const label=document.createElement('div');label.className='mv-demo-caption';label.textContent=item.note||'PLAYBACK DEMO';wrap.append(label);}
  }
  if(body.classList.contains('author-mode')){
   const input=document.createElement('input');input.className='mv-file';input.type='file';input.accept=item.type==='video'?'video/*':'image/*';input.setAttribute('aria-label','Choose local media');
   const replace=document.createElement('button');replace.type='button';replace.className='mv-replace';replace.textContent=replacement?'Change local preview ↗':'Replace demo locally ↗';replace.onclick=()=>input.click();
   input.onchange=()=>{const file=input.files?.[0];if(!file)return;if(!file.type.startsWith(item.type==='video'?'video/':'image/')){replace.textContent='Choose a matching image or video file';return;}
    const old=replacements.get(activeId);if(old)URL.revokeObjectURL(old.url);replacements.set(activeId,{url:URL.createObjectURL(file),name:file.name});$$('video',media).forEach(v=>v.pause());paint(item);observeNotes();
   };notes.append(replace,input);
   const local=document.createElement('p');local.className='mv-note';local.textContent=replacement?'LOCAL PREVIEW: '+replacement.name:'Local preview only. Files are not uploaded or saved after reload.';notes.append(local);
  }
  requestAnimationFrame(()=>{observeNotes();updateProgress();});
 }
 function open(id,source=document.activeElement){
  const item=registry[id];if(!item||!['long-image','video'].includes(item.type))return false;
  ensure();const already=viewer.open;token++;animation?.cancel();closing=false;viewer.classList.remove('is-closing');
  if(!already){opener=source;freezeBackground();}
  activeId=id;body.classList.add('media-viewer-open');if(!already)viewer.showModal();
  paint(item);$('.mv-close',viewer).focus({preventScroll:true});
  const parentTitle=source?.closest?.('.exp')?.querySelector('h3')?.textContent;
  $('.mv-back',viewer).textContent='↙ Back to '+(parentTitle||((window.NocturneLab?.inlineOpen||$('#dialog')?.open)?'project':'portfolio'));
  shell.style.willChange='transform,opacity';
  animation=shell.animate([{opacity:0,transform:'translate3d(0,28px,0) scale(.965)'},{opacity:1,transform:'translate3d(0,0,0) scale(1)'}],{duration:reduced()?1:560,easing:'cubic-bezier(.2,1,.3,1)',fill:'both'});
  const serial=token;animation.finished.then(()=>{if(serial===token&&!closing){animation.cancel();animation=null;shell.style.willChange='auto';}}).catch(()=>{});
  window.portfolioWake?.();return true;
 }
 function close(){
  if(!viewer?.open||closing)return Promise.resolve();closing=true;const serial=++token;
  $$('video',viewer).forEach(v=>v.pause());observer?.disconnect();
  const style=getComputedStyle(shell),from={opacity:style.opacity,transform:style.transform};animation?.cancel();viewer.classList.add('is-closing');body.classList.remove('media-viewer-open');shell.style.willChange='transform,opacity';
  animation=shell.animate([from,{opacity:0,transform:'translate3d(0,18px,0) scale(.975)'}],{duration:reduced()?1:360,easing:'cubic-bezier(.4,0,.2,1)',fill:'both'});
  return animation.finished.catch(()=>{}).then(()=>{
   if(serial!==token)return;viewer.close();animation?.cancel();animation=null;viewer.classList.remove('is-closing');media.replaceChildren();notes.replaceChildren();activeId=null;current=null;closing=false;restoreBackground();
   if(opener?.isConnected)opener.focus?.({preventScroll:true});opener=null;window.portfolioWake?.();
  });
 }
 // Explicit per-item routing: non-media cards still use the existing case path.
 // Observe only inserted HTML, never scrolling styles or every animation frame.
 function bind(rootNode=document){
  $$('[data-case]',rootNode).forEach(button=>{
   const item=registry[button.dataset.case];if(!item||!button.closest('.case-company,.case-works'))return;
   button.dataset.mediaOpen=button.dataset.case;button.setAttribute('aria-haspopup','dialog');
   button.setAttribute('aria-label',(item.type==='video'?'Play video: ':'View visual story: ')+item.title);
   const action=$('.cover-action',button);if(action){const label=item.type==='video'?'Play motion study ▷':'View visual story ↗';if(action.textContent!==label)action.textContent=label;}
   const small=$('.frame-label small',button);if(small&&!small.dataset.mediaLabel){small.dataset.mediaLabel='1';small.textContent+=(item.type==='video'?' · Video':' · Visual story');}
  });
 }
 let bindQueued=false;new MutationObserver(records=>{if(!records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&!n.closest?.('.media-viewer'))))return;if(!bindQueued){bindQueued=true;queueMicrotask(()=>{bindQueued=false;bind(document);});}}).observe(body,{childList:true,subtree:true});
 // Window capture precedes the existing document-level case navigation.
 addEventListener('click',e=>{const b=e.target.closest?.('[data-media-open]');if(b&&registry[b.dataset.mediaOpen]){e.preventDefault();e.stopImmediatePropagation();open(b.dataset.mediaOpen,b);}},{capture:true});
 addEventListener('resize',()=>{if(viewer?.open){observeNotes();updateProgress();}},{passive:true});
 addEventListener('pagehide',()=>{for(const v of replacements.values())URL.revokeObjectURL(v.url);replacements.clear();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)$$('video',viewer||document.createElement('div')).forEach(v=>v.pause());});
 window.NocturneMedia={open,close,register(id,item){if(!id||!['long-image','video'].includes(item?.type))throw new TypeError('Media requires an id and long-image/video type.');registry[id]={...item};bind();},get isOpen(){return !!viewer?.open;},diagnostics:()=>({id:activeId,type:current?.type||null,open:!!viewer?.open,closing,backgroundY:lock?.y??null,scrollTop:(mobile()?layout:media)?.scrollTop||0,videoTime:$('video',media||document.createElement('div'))?.currentTime??null,notesVisible:notes?!notes.classList.contains('mv-notes-pending'):false})};
 bind();
})();
