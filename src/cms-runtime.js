/* Editable content is embedded by rebuild.py, so the public site remains static and works via file://. */
(() => {
  'use strict';
  const source=document.getElementById('portfolio-cms');
  let cms={projects:[],chapters:{},copy:{}};
  try{cms=JSON.parse(source?.textContent||'{}');}catch(error){console.warn('CMS data could not be read',error);}
  const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  const safePath=s=>typeof s==='string'&&/^(?:assets\/uploads\/|assets\/)[\w./%-]+$/i.test(s)&&!s.includes('..')?s:'';
  const setText=(selector,value)=>{const node=$(selector);if(node&&typeof value==='string'&&node.textContent.trim()!==value.trim())node.textContent=value;};
  const copyTargets={hero_tagline:'.hero-tagline',story_title:'#story-title',projects_title:'#projects-title',bento_title:'#bento-title',bento_intro:'.bento-head>p',lab_title:'#lab-title',lab_note:'.lab-foot',footer_title:'.footer h2',footer_note:'.footer-note'};
  for(const [key,selector] of Object.entries(copyTargets))setText(selector,cms.copy?.[key]);
  const projects=Array.isArray(cms.projects)?cms.projects:[];
  const byId=Object.fromEntries(projects.map(p=>[p.id,p]));
  const legacyData=$('#portfolio-data');
  if(legacyData){try{
    const data=JSON.parse(legacyData.textContent);
    for(const experience of data.experience||[])experience.cases=(experience.cases||[]).filter(c=>byId[c.id]?.visible!==false).map(c=>{
      const project=byId[c.id];return project?{...c,name:project.title,art:project.art||c.art,type:project.kind}:c;
    });
    for(const project of projects){
      if(project.group!=='work'||!project.companyId||project.visible===false)continue;
      const experience=(data.experience||[]).find(e=>e.id===project.companyId);
      if(experience&&!experience.cases.some(c=>c.id===project.id))experience.cases.push({id:project.id,name:project.title,type:project.kind,art:project.art||'type'});
    }
    legacyData.textContent=JSON.stringify(data);
  }catch(error){console.warn('Career case data could not be updated',error);}}
  const firstMedia=p=>p.blocks?.find(b=>safePath(b.src)&&['image','video'].includes(b.type));
  function mediaElement(block){
    const src=safePath(block?.type==='video'?(block.poster||block.src):block?.src);
    if(!src)return null;
    const image=document.createElement('img');image.src=src;image.alt=block.alt||'';image.loading='lazy';image.decoding='async';return image;
  }
  function updateBento(tile,p){
    const frame=$('.bento-frame',tile),name=$('.bento-meta b',tile),desc=$('.bento-meta i',tile);
    if(name)name.textContent=p.title;if(desc)desc.textContent=p.kind;
    tile.setAttribute('aria-label',`${p.title}. Open details`);
    const media=firstMedia(p);if(frame&&media){const image=mediaElement(media);if(image){frame.replaceChildren(image);frame.dataset.slot=media.type==='video'?'MOTION / PROJECT':'IMAGE / PROJECT';}}
    tile.hidden=p.visible===false;
  }
  for(const tile of $$('.bento-tile[data-case]')){const p=byId[tile.dataset.case];if(p)updateBento(tile,p);}
  for(const row of $$('#labRows .project-row')){
    const p=byId[row.dataset.case];if(!p)continue;
    $('.proj-name',row).textContent=p.title;$('.proj-field',row).textContent=p.kind;
    row.dataset.group=p.group||'personal';row.dataset.category=p.category||'tools';row.hidden=p.visible===false;
  }
  const rows=$('#labRows'),wall=$('.bento-wall'),columns=$$('.bento-col',wall);
  if(rows){
    let number=rows.querySelectorAll('.project-row').length;
    for(const p of projects){
      if(p.visible===false||$(`#labRows [data-case="${CSS.escape(p.id)}"]`))continue;
      if(p.placement==='bento'&&columns.length){
        const col=columns.reduce((a,b)=>a.children.length<=b.children.length?a:b);
        const tile=document.createElement('button');tile.type='button';tile.className='bento-tile';tile.dataset.case=p.id;tile.style.setProperty('--th','300px');
        tile.innerHTML='<span class="bento-frame" data-slot="PROJECT"></span><span class="bento-num"></span><span class="bento-meta"><b></b><i></i></span>';
        $('.bento-num',tile).textContent=String(++number).padStart(2,'0');col.append(tile);updateBento(tile,p);
      }else{
        const row=document.createElement('button');row.type='button';row.className='project-row';row.dataset.case=p.id;row.dataset.group=p.group||'personal';row.dataset.category=p.category||'tools';
        row.innerHTML='<span class="num"></span><span class="proj-name"></span><span class="proj-field"></span><span class="arrow">↗</span>';
        $('.num',row).textContent=String(++number).padStart(2,'0');$('.proj-name',row).textContent=p.title;$('.proj-field',row).textContent=p.kind;rows.append(row);
      }
    }
    const ordered=[...projects.filter(p=>p.group!=='work'),...projects.filter(p=>p.group==='work')];
    for(const p of ordered){const row=$(`#labRows [data-case="${CSS.escape(p.id)}"]`);if(row)rows.append(row);}
    $$('.project-row',rows).forEach((row,index)=>{$('.num',row).textContent=String(index+1).padStart(2,'0');});
  }
  const existingChapters=new Set(['vice','companion','party','elemental','color']);
  const addedFeatured=projects.filter(p=>p.visible!==false&&p.featured&&!existingChapters.has(p.id));
  if(addedFeatured.length){
    const section=document.createElement('section');section.className='cms-featured';section.id='more-work';
    section.innerHTML='<div class="cms-featured-head"><span class="eyebrow">SELECTED WORK / MORE STORIES</span><h2>More work to explore.</h2></div><div class="cms-featured-grid"></div>';
    const grid=$('.cms-featured-grid',section);
    for(const p of addedFeatured){
      const card=document.createElement('button');card.type='button';card.className='cms-featured-card';card.dataset.case=p.id;
      const visual=document.createElement('span');visual.className='cms-featured-visual';const img=mediaElement(firstMedia(p));if(img)visual.append(img);
      const content=document.createElement('span');content.className='cms-featured-content';
      const name=document.createElement('strong');name.textContent=p.title;const kind=document.createElement('small');kind.textContent=p.kind;
      content.append(name,kind);card.append(visual,content);grid.append(card);
    }
    document.getElementById('bento')?.before(section);
  }
  const filters=$('.filters');
  if(filters){for(const [key,label] of [['work','Work'],['personal','Personal']]){
    if($(`[data-filter="${key}"]`,filters))continue;
    const button=document.createElement('button');button.type='button';button.className='filter';button.dataset.filter=key;button.setAttribute('aria-pressed','false');button.textContent=label;filters.append(button);
  }}
  function fillCard(card,slide,index,total){
    card.dataset.slide=String(index);card.setAttribute('aria-label',`${index+1} of ${total}: ${slide.title||'Project media'}`);
    card.classList.toggle('cms-media-card',slide.type!=='legacy');
    const title=$('.media-caption h4',card),subtitle=$('.media-caption p',card),num=$('.media-caption>.mono',card);
    if(title)title.textContent=slide.title||'Project media';if(subtitle)subtitle.textContent=slide.subtitle||'';if(num)num.textContent=String(index+1).padStart(2,'0');
    if(slide.type==='legacy'&&!safePath(slide.src))return;
    const glass=$('.card-glass',card);if(!glass)return;
    glass.replaceChildren();
    if(slide.type==='video'){
      const v=document.createElement('video');v.controls=true;v.playsInline=true;v.preload='none';v.muted=true;v.setAttribute('playsinline','');
      if(safePath(slide.poster))v.poster=slide.poster;
      for(const [key,mime] of [['src','video/webm'],['mp4','video/mp4']])if(safePath(slide[key])){const source=document.createElement('source');source.src=slide[key];source.type=mime;v.append(source);}
      glass.append(v);
    }else if(safePath(slide.src)){
      const image=mediaElement(slide);if(image)glass.append(image);
    }
  }
  for(const [id,chapter] of Object.entries(cms.chapters||{})){
    const root=document.getElementById(id);if(!root)continue;
    setText(`#${id} .chapter-eyebrow`,chapter.eyebrow);
    setText(`#${id} .chapter-heading h2`,chapter.title);
    setText(`#${id} .chapter-heading>p`,chapter.description);
    setText(`#${id} .scene-note`,chapter.note);
    const rail=$('.media-rail',root),track=$('.rail-track',rail),dots=$('.rail-dots',rail);
    if(!rail||!track||!dots||!Array.isArray(chapter.slides))continue;
    const old=new Map($$('.media-card[data-frame-id]',track).map(card=>[card.dataset.frameId,card]));
    const cards=[];
    for(const slide of chapter.slides){
      let card=old.get(slide.id);
      if(!card){card=document.createElement('article');card.className='media-card';card.dataset.frameId=slide.id;card.setAttribute('role','group');card.setAttribute('aria-roledescription','slide');card.innerHTML='<div class="card-glass"></div><div class="media-caption"><div><h4></h4><p></p></div><span class="mono"></span></div>';}
      cards.push(card);
    }
    if(!cards.length)continue;
    track.replaceChildren(...cards);dots.replaceChildren();rail.dataset.count=String(cards.length);
    cards.forEach((card,index)=>{fillCard(card,chapter.slides[index],index,cards.length);const dot=document.createElement('button');dot.type='button';dot.className='rail-dot';dot.dataset.slideTo=String(index);dot.setAttribute('aria-label',`Slide ${index+1}`);dot.setAttribute('aria-pressed',String(index===0));dots.append(dot);});
  }
  window.PortfolioCMS={data:cms,projects:byId,safePath};
})();
