(() => {
  'use strict';
  const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const chapterNames={vice:'V-ICE',companion:'Companion',party:'Local Party',elemental:'El Emental',tools:'Color Prime'};
  const copyNames={hero_tagline:'Подпись на первом экране',story_title:'Заголовок истории работы',projects_title:'Заголовок личных проектов',bento_title:'Заголовок мини-проектов',bento_intro:'Вступление к мини-проектам',lab_title:'Заголовок каталога',lab_note:'Примечание каталога',footer_title:'Заголовок футера',footer_note:'Текст в футере'};
  let data=null,revision='',dirty=false,section='projects',selected='',busy=false;
  const openGroups=new Set(['personal','personal:featured','personal:other','work']);
  const companyName=id=>data?.companies?.find(c=>c.id===id)?.name||'Без компании';
  const branchKey=p=>p.group==='work'?(p.companyId?`company:${p.companyId}`:'work:unassigned'):(p.featured?'personal:featured':'personal:other');
  function revealProject(p){if(!p)return;openGroups.add(p.group==='work'?'work':'personal');openGroups.add(branchKey(p));}
  function notice(message,error=false){const el=$('#notice');el.textContent=message;el.classList.toggle('error',error);el.hidden=false;clearTimeout(notice.timer);notice.timer=setTimeout(()=>el.hidden=true,5500);}
  function markDirty(){dirty=true;$('#saveState').textContent='Есть несохранённые изменения';$('#saveState').classList.add('dirty');}
  function markSaved(){dirty=false;$('#saveState').textContent='Все изменения сохранены';$('#saveState').classList.remove('dirty');}
  function option(value,label,current){return `<option value="${esc(value)}" ${current===value?'selected':''}>${esc(label)}</option>`;}
  function field(label,key,value,scope='project',opts={}){
    const attr=`data-${scope}-field="${esc(key)}"`,wide=opts.wide?' wide':'',hint=opts.hint?`<small>${esc(opts.hint)}</small>`:'';
    if(opts.options)return `<label class="field${wide}"><span>${esc(label)}</span><select ${attr}>${opts.options.map(([v,n])=>option(v,n,value)).join('')}</select>${hint}</label>`;
    if(opts.check)return `<label class="field check"><input type="checkbox" ${attr} ${value?'checked':''}><span>${esc(label)}</span></label>`;
    if(opts.multiline)return `<label class="field${wide}"><span>${esc(label)}</span><textarea ${attr} rows="${opts.rows||3}">${esc(value)}</textarea>${hint}</label>`;
    return `<label class="field${wide}"><span>${esc(label)}</span><input ${attr} value="${esc(value)}" ${opts.readonly?'readonly':''}>${hint}</label>`;
  }
  const project=()=>data.projects.find(p=>p.id===selected);
  function renderList(){
    const list=$('#itemList'),q=$('#search').value.trim().toLowerCase();
    if(section==='copy'){list.innerHTML='';return;}
    const scroll=list.scrollTop;
    const item=(p,sub)=>`<button class="item tree-item ${selected===p.id?'active':''}" data-select="${esc(p.id)}" aria-current="${selected===p.id?'page':'false'}"><span class="item-icon">${p.group==='work'?'W':'P'}</span><span class="item-copy"><strong>${esc(p.title)}</strong><small>${esc(p.visible===false?'Скрыт · ':'')}${esc(sub)}</small></span></button>`;
    if(section==='chapters'){
      list.innerHTML=Object.keys(data.chapters).filter(id=>!q||(chapterNames[id]||id).toLowerCase().includes(q)).map(id=>`<button class="item ${selected===id?'active':''}" data-select="${esc(id)}"><span class="item-icon">▧</span><span class="item-copy"><strong>${esc(chapterNames[id]||id)}</strong><small>${data.chapters[id].slides.length} слайдов</small></span></button>`).join('');
      list.scrollTop=scroll;return;
    }
    const all=data.projects,personal=all.filter(p=>p.group!=='work'),work=all.filter(p=>p.group==='work');
    const matches=(p,context)=>!q||`${p.title} ${p.kind} ${context}`.toLowerCase().includes(q);
    const group=(key,label,count,content,depth=0,addContext='')=>`<details class="tree-group depth-${depth}" data-group-key="${esc(key)}" ${q||openGroups.has(key)?'open':''}><summary><span class="tree-chevron" aria-hidden="true">›</span><span class="tree-label">${esc(label)}</span><span class="tree-count">${count}</span></summary><div class="tree-children">${content}${addContext?`<button class="tree-create" data-add-project="${esc(addContext)}" aria-label="Добавить проект в ${esc(label)}">＋ Добавить сюда</button>`:''}</div></details>`;
    const featured=personal.filter(p=>p.featured&&matches(p,'Личные проекты Избранные проекты'));
    const other=personal.filter(p=>!p.featured&&matches(p,'Личные проекты Другие проекты'));
    const personalContent=(!q||featured.length?group('personal:featured','Избранные проекты',personal.filter(p=>p.featured).length,featured.map(p=>item(p,'Личный · избранное')).join(''),1,'personal:featured'):'')+
      (!q||other.length?group('personal:other','Другие проекты',personal.filter(p=>!p.featured).length,other.map(p=>item(p,'Личный проект')).join(''),1,'personal:other'):'');
    const companyContent=(data.companies||[]).map(c=>{
      const own=work.filter(p=>p.companyId===c.id),shown=own.filter(p=>matches(p,`Работа ${c.name}`));
      if(q&&!shown.length&&!c.name.toLowerCase().includes(q))return '';
      return group(`company:${c.id}`,c.name,own.length,shown.map(p=>item(p,`Работа · ${c.name}`)).join(''),1,`company:${c.id}`);
    }).join('');
    const unassigned=work.filter(p=>!p.companyId),shownUnassigned=unassigned.filter(p=>matches(p,'Работа Без компании'));
    const workContent=companyContent+(!q||shownUnassigned.length?group('work:unassigned','Без компании',unassigned.length,shownUnassigned.map(p=>item(p,'Работа · без компании')).join(''),1,'work:unassigned'):'');
    list.innerHTML=(q&&!featured.length&&!other.length?'':group('personal','Личные проекты',personal.length,personalContent,0))+
      (q&&!work.filter(p=>matches(p,`Работа ${companyName(p.companyId)}`)).length&&!(data.companies||[]).some(c=>c.name.toLowerCase().includes(q))?'':group('work','Работа · компании',work.length,workContent,0));
    if(!list.innerHTML)list.innerHTML='<p class="tree-empty">Ничего не найдено</p>';
    list.scrollTop=scroll;
  }
  function controls(scope,index,canDelete=true){return `<div class="block-actions"><button class="icon-btn" data-move="${scope}:${index}:-1" title="Выше">↑</button><button class="icon-btn" data-move="${scope}:${index}:1" title="Ниже">↓</button>${canDelete?`<button class="icon-btn danger" data-remove="${scope}:${index}" title="Удалить">×</button>`:''}</div>`;}
  function uploadButton(scope,index,key,label,kind){return `<div class="upload-row"><button class="small-btn" data-upload="${scope}:${index}:${key}:${kind}">${esc(label)}</button><small>${esc(scope==='block'?project().blocks[index][key]:data.chapters[selected].slides[index][key]||'Файл ещё не загружен')}</small></div>`;}
  function renderBlock(block,index){
    const type=block.type||'image',file=type==='image'?'image':'video';
    return `<article class="block"><div class="block-head"><strong>${String(index+1).padStart(2,'0')} / ${type==='image'?'Изображение':type==='video'?'Видео':'Текст'}</strong>${controls('block',index)}</div><div class="fields">
      ${field('Тип блока','type',type,'block',{options:[['image','Изображение'],['video','Видео'],['text','Текст']]})}
      ${type==='text'?`${field('Заголовок','title',block.title,'block')}${field('Текст','text',block.text,'block',{wide:true,multiline:true,rows:5})}`:
      `${field('Подпись','caption',block.caption,'block',{wide:true})}${type==='image'?field('Описание изображения','alt',block.alt,'block',{wide:true,hint:'Краткое описание для экранных дикторов.'}):''}
      ${field('Ширина, px','width',block.width,'block')}${field('Высота, px','height',block.height,'block')}
      <div class="field wide"><span>Основной файл</span>${uploadButton('block',index,'src',type==='image'?'Загрузить изображение':'Загрузить WebM',file)}</div>
      ${type==='video'?`<div class="field wide"><span>Совместимая версия MP4</span>${uploadButton('block',index,'mp4','Загрузить MP4','video')}</div><div class="field wide"><span>Постер</span>${uploadButton('block',index,'poster','Загрузить постер','image')}</div>`:''}
      ${block.src&&type==='image'?`<img class="block-preview" src="../${esc(block.src)}" alt="Предпросмотр">`:''}`}
    </div></article>`;
  }
  function renderProject(){
    const p=project();if(!p){$('#editor').innerHTML='<p class="empty">Выберите проект слева.</p>';return;}
    $('#pageTitle').textContent=p.title;$('#pageSubtitle').textContent='Редактирование карточки и содержимого проекта.';
    const branch=p.group==='work'?`Работа / ${companyName(p.companyId)}`:`Личные проекты / ${p.featured?'Избранные проекты':'Другие проекты'}`;
    $('#editor').innerHTML=`<div class="editor-header"><div><div class="hierarchy-path">${esc(branch)} <span>›</span> ${esc(p.title)}</div><h2>${esc(p.title)}</h2><p>Изменения появятся на сайте после сохранения. Медиа открываются внутри проекта.</p></div><div class="editor-tools"><button class="small-btn" data-move="project:${data.projects.indexOf(p)}:-1">↑ Выше</button><button class="small-btn" data-move="project:${data.projects.indexOf(p)}:1">↓ Ниже</button>${p.legacy?'':`<button class="small-btn danger" id="deleteProject">Удалить</button>`}</div></div>
    <div class="panel"><h3>Основное</h3><div class="fields">
      ${field('Название','title',p.title)}${field('ID / адрес проекта','id',p.id,'project',{readonly:true,hint:'Постоянный адрес. Не меняется после создания.'})}
      ${field('Тип / подзаголовок','kind',p.kind,'project',{wide:true})}
      ${field('Группа','group',p.group,'project',{options:[['personal','Личный проект'],['work','Работа']]})}
      ${p.group==='work'?field('Компания в истории работы','companyId',p.companyId||'','project',{options:[['','Без привязки / только каталог'],...(data.companies||[]).map(c=>[c.id,c.name])],hint:'Новый рабочий проект появится также внутри выбранной компании.'}):''}
      ${field('Категория','category',p.category,'project',{options:[['games','Игры'],['tools','Инструменты'],['interaction','Интерактив'],['work','Работа']]})}
      ${field('Размещение','placement',p.placement,'project',{options:[['index','Каталог проектов'],['bento','Галерея мини-проектов'],['work','История работы / каталог']]})}
      ${field('Иллюстрация по умолчанию','art',p.art,'project',{options:['poly','poly2','vector','pet','rock','party','tiles','type','reels','chick','dragon'].map(x=>[x,x])})}
      ${field('Видимый проект','visible',p.visible,'project',{check:true})}
      ${field('Показывать в избранном','featured',p.featured,'project',{check:true})}
    </div></div>
    <div class="panel"><h3>Текст кейса</h3><div class="fields">
      ${field('Идея / вступление','intro',p.intro,'project',{wide:true,multiline:true})}
      ${field('Моя роль','role',p.role,'project',{wide:true,multiline:true})}
      ${field('Материалы и доказательства','proof',p.proof,'project',{wide:true,multiline:true})}
      ${field('Навыки / теги, по одному на строке','scope',p.scope?.join('\n'),'project',{wide:true,multiline:true})}
      ${field('Текущий статус / примечание','status',p.status,'project',{wide:true,multiline:true})}
    </div></div>
    <div class="panel"><h3>Контент проекта <span class="badge">${p.blocks.length} блоков</span></h3><p class="help">Добавляйте изображения любой пропорции, видео или текстовые вставки. Изображения конвертируются в WebP. Для WebM можно добавить MP4 на случай несовместимого кодека.</p><div class="stack">${p.blocks.length?p.blocks.map(renderBlock).join(''):'<div class="empty">Пока нет контента. Добавьте первый блок ниже.</div>'}</div><div class="add-row"><button class="small-btn" data-add-block="image">＋ Изображение</button><button class="small-btn" data-add-block="video">＋ Видео</button><button class="small-btn" data-add-block="text">＋ Текст</button></div></div>`;
  }
  function renderSlide(slide,index){
    const type=slide.type||'legacy';return `<article class="block"><div class="block-head"><strong>${String(index+1).padStart(2,'0')} / ${type==='legacy'?'Исходный слайд':type==='image'?'Изображение':'Видео'}</strong>${controls('slide',index,data.chapters[selected].slides.length>1)}</div><div class="fields">
      ${field('Заголовок','title',slide.title,'slide')}${field('Подпись','subtitle',slide.subtitle,'slide')}
      ${field('Тип','type',type,'slide',{options:[['legacy','Исходный слайд'],['image','Изображение'],['video','Видео']]})}
      ${type==='legacy'?'<div class="field"><small>Сохраняет текущую интерактивную сцену. Можно заменить её медиа.</small></div>':`${field('Ширина, px','width',slide.width,'slide')}${field('Высота, px','height',slide.height,'slide')}
      ${type==='image'?field('Описание изображения','alt',slide.alt,'slide',{wide:true}):''}
      <div class="field wide"><span>Файл слайда</span>${uploadButton('slide',index,'src',type==='image'?'Загрузить WebP':'Загрузить WebM',type)}</div>
      ${type==='video'?`<div class="field wide"><span>MP4 для совместимости</span>${uploadButton('slide',index,'mp4','Загрузить MP4','video')}</div><div class="field wide"><span>Постер</span>${uploadButton('slide',index,'poster','Загрузить постер','image')}</div>`:''}
      ${slide.src&&type==='image'?`<img class="block-preview" src="../${esc(slide.src)}" alt="Предпросмотр">`:''}`}
    </div></article>`;
  }
  function renderChapter(){
    const c=data.chapters[selected];if(!c){$('#editor').innerHTML='<p class="empty">Выберите главу слева.</p>';return;}
    $('#pageTitle').textContent=chapterNames[selected]||selected;$('#pageSubtitle').textContent='Текст большой главы и её слайды.';
    $('#editor').innerHTML=`<div class="helper-bar">Интерактивная сцена главы сохраняется. Добавленные слайды включаются в прокрутку и навигационные точки.</div><div class="panel"><h3>Текст главы</h3><div class="fields">
      ${field('Надзаголовок','eyebrow',c.eyebrow,'chapter',{wide:true})}
      ${field('Заголовок','title',c.title,'chapter',{wide:true,hint:'После редактирования выводится обычным текстом. Исходная типографика сохраняется, пока текст не меняется.'})}
      ${field('Описание','description',c.description,'chapter',{wide:true,multiline:true})}
      ${field('Примечание под сценой','note',c.note,'chapter',{wide:true,multiline:true})}
    </div></div><div class="panel"><h3>Слайды <span class="badge">${c.slides.length}</span></h3><p class="help">Слайды можно менять местами, удалять и добавлять без ограничения фиксированным шаблоном.</p><div class="stack">${c.slides.map(renderSlide).join('')}</div><div class="add-row"><button class="small-btn" data-add-slide="image">＋ Изображение</button><button class="small-btn" data-add-slide="video">＋ Видео</button></div></div>`;
  }
  function renderCopy(){
    $('#pageTitle').textContent='Тексты сайта';$('#pageSubtitle').textContent='Общие подписи и вступления на странице.';
    $('#editor').innerHTML=`<div class="panel"><h3>Основные разделы</h3><div class="copy-grid">${Object.entries(copyNames).map(([key,label])=>field(label,key,data.copy[key],'copy',{wide:true,multiline:true,rows:2})).join('')}</div></div>`;
  }
  function render(){renderList();if(section==='projects')renderProject();else if(section==='chapters')renderChapter();else renderCopy();$('#addProject').hidden=section!=='projects';$('#search').hidden=section==='copy';$('#listHeading').textContent=section==='projects'?'СТРУКТУРА ПРОЕКТОВ':section==='chapters'?'ГЛАВЫ':'ТЕКСТЫ';}
  function createProject(context){
    const id='project-'+Date.now().toString(36),work=context==='work:unassigned'||context.startsWith('company:'),featured=context==='personal:featured';
    const companyId=context.startsWith('company:')?context.slice('company:'.length):'';
    const p={id,title:'Новый проект',kind:work?'Рабочий проект':'Личный проект',group:work?'work':'personal',companyId,category:work?'work':'tools',placement:work?'work':'index',featured,visible:true,legacy:false,art:'type',intro:'',role:'',proof:'',scope:[],status:'',blocks:[]};
    data.projects.push(p);selected=id;revealProject(p);markDirty();render();$('#editor [data-project-field=title]')?.focus();
  }
  async function load(){try{const r=await fetch('/api/data',{cache:'no-store'});if(!r.ok)throw Error('Сервер не отвечает');const json=await r.json();data=json.data;revision=json.revision;selected=data.projects.find(p=>p.group!=='work')?.id||data.projects[0]?.id||'';revealProject(project());markSaved();render();}catch(error){notice('Не удалось загрузить данные: '+error.message,true);}}
  async function save(){if(busy)return false;busy=true;$('#save').disabled=true;$('#save').textContent='Сохраняю…';try{
    const r=await fetch('/api/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data,revision})});const json=await r.json();if(!r.ok)throw Error(json.error||'Ошибка сохранения');revision=json.revision;markSaved();notice('Сайт сохранён и собран. Теперь можно смотреть результат.');return true;
  }catch(error){notice('Не удалось сохранить: '+error.message,true);return false;}finally{busy=false;$('#save').disabled=false;$('#save').textContent='Сохранить сайт';}}
  async function imageBlob(file){
    if(file.type==='image/webp'){try{const bitmap=await createImageBitmap(file);const width=bitmap.width,height=bitmap.height;bitmap.close?.();return {blob:file,width,height,name:file.name};}catch{return {blob:file,width:0,height:0,name:file.name};}}
    let bitmap;try{bitmap=await createImageBitmap(file);}catch{return {blob:file,width:0,height:0,name:file.name};}
    const scale=Math.min(1,2560/bitmap.width,14000/bitmap.height),width=Math.max(1,Math.round(bitmap.width*scale)),height=Math.max(1,Math.round(bitmap.height*scale));
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');ctx.drawImage(bitmap,0,0,width,height);bitmap.close?.();
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.84));canvas.width=canvas.height=0;
    return blob?.type==='image/webp'?{blob,width,height,name:file.name.replace(/\.[^.]+$/,'')+'.webp'}:{blob:file,width,height,name:file.name};
  }
  async function upload(spec){const [scope,indexText,key,kind]=spec.split(':'),index=Number(indexText);const input=document.createElement('input');input.type='file';input.accept=kind==='image'?'image/*':'.webm,.mp4,video/webm,video/mp4';
    input.onchange=async()=>{const file=input.files?.[0];if(!file)return;try{
      notice('Загружаю '+file.name+'…');const prepared=kind==='image'?await imageBlob(file):{blob:file,name:file.name,width:0,height:0};
      const r=await fetch('/api/media',{method:'POST',headers:{'X-File-Name':prepared.name,'X-Media-Kind':kind},body:prepared.blob});const json=await r.json();if(!r.ok)throw Error(json.error||'Ошибка загрузки');
      const item=scope==='block'?project().blocks[index]:data.chapters[selected].slides[index];item[key]=json.path;
      if(key==='src'&&prepared.width&&prepared.height){item.width=prepared.width;item.height=prepared.height;}
      markDirty();render();notice('Файл добавлен. Сохраните сайт, чтобы опубликовать ссылку на него.');
    }catch(error){notice('Не удалось загрузить: '+error.message,true);}};input.click();
  }
  document.addEventListener('click',async e=>{
    const nav=e.target.closest('[data-section]');if(nav){section=nav.dataset.section;selected=section==='projects'?(data.projects.find(p=>p.group!=='work')||data.projects[0])?.id:section==='chapters'?Object.keys(data.chapters)[0]:'';if(section==='projects')revealProject(project());document.querySelectorAll('.section').forEach(x=>x.classList.toggle('active',x===nav));render();return;}
    const item=e.target.closest('[data-select]');if(item){selected=item.dataset.select;if(section==='projects')revealProject(project());render();return;}
    const add=e.target.closest('[data-add-project]');if(add){createProject(add.dataset.addProject);return;}
    if(e.target.closest('#addProject')){createProject(project()?branchKey(project()):'personal:other');return;}
    if(e.target.closest('#deleteProject')){const p=project();if(p&&!p.legacy&&confirm(`Удалить «${p.title}» из редактора?`)){data.projects=data.projects.filter(x=>x!==p);selected=(data.projects.find(x=>x.group!=='work')||data.projects[0])?.id;revealProject(project());markDirty();render();}return;}
    const addBlock=e.target.closest('[data-add-block]');if(addBlock){const type=addBlock.dataset.addBlock;project().blocks.push({type,src:'',mp4:'',poster:'',caption:'',alt:'',title:'',text:'',width:0,height:0});markDirty();render();return;}
    const addSlide=e.target.closest('[data-add-slide]');if(addSlide){const type=addSlide.dataset.addSlide;data.chapters[selected].slides.push({id:selected+'-cms-'+Date.now().toString(36),type,title:'Новый слайд',subtitle:'',src:'',mp4:'',poster:'',alt:'',width:16,height:9});markDirty();render();return;}
    const move=e.target.closest('[data-move]');if(move){const [scope,n,d]=move.dataset.move.split(':'),index=Number(n),direction=Number(d),array=scope==='project'?data.projects:scope==='block'?project().blocks:data.chapters[selected].slides;let next=index+direction;if(scope==='project'){const peers=array.filter(p=>branchKey(p)===branchKey(array[index])),sibling=peers[peers.indexOf(array[index])+direction];next=sibling?array.indexOf(sibling):-1;}if(next>=0&&next<array.length){[array[index],array[next]]=[array[next],array[index]];markDirty();render();}return;}
    const remove=e.target.closest('[data-remove]');if(remove){const [scope,n]=remove.dataset.remove.split(':'),array=scope==='block'?project().blocks:data.chapters[selected].slides;array.splice(Number(n),1);markDirty();render();return;}
    const up=e.target.closest('[data-upload]');if(up){upload(up.dataset.upload);return;}
    if(e.target.closest('#save')){await save();return;}
    if(e.target.closest('#preview')){if(dirty&&!(await save()))return;window.open('../index.html','_blank','noopener');return;}
  });
  document.addEventListener('input',e=>{
    if(e.target.id==='search'){renderList();return;}
    const target=e.target,scope=['project','chapter','block','slide','copy'].find(x=>target.hasAttribute(`data-${x}-field`));if(!scope)return;
    const key=target.getAttribute(`data-${scope}-field`),value=target.type==='checkbox'?target.checked:target.value;
    if(scope==='project'){if(key==='scope')project().scope=String(value).split('\n').map(x=>x.trim()).filter(Boolean);else project()[key]=value;
      if(key==='group'&&value==='personal')project().companyId='';
      if(['group','companyId','featured'].includes(key))revealProject(project());
      if(key==='title'){$('#pageTitle').textContent=value;$('.editor-header h2').textContent=value;const p=project(),branch=p.group==='work'?`Работа / ${companyName(p.companyId)}`:`Личные проекты / ${p.featured?'Избранные проекты':'Другие проекты'}`;$('.hierarchy-path').innerHTML=`${esc(branch)} <span>›</span> ${esc(value)}`;renderList();}}
    else if(scope==='chapter')data.chapters[selected][key]=value;
    else if(scope==='copy')data.copy[key]=value;
    else {const article=target.closest('.block'),index=[...article.parentElement.children].indexOf(article),item=scope==='block'?project().blocks[index]:data.chapters[selected].slides[index];item[key]=['width','height'].includes(key)?Math.max(0,Number(value)||0):value;}
    markDirty();
    if(['type','placement','group','companyId','category','visible','featured'].includes(key))render();
  });
  document.addEventListener('toggle',e=>{const key=e.target.dataset?.groupKey;if(!key)return;if(e.target.open)openGroups.add(key);else openGroups.delete(key);},true);
  $('#save').addEventListener('keydown',e=>e.stopPropagation());
  document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();save();}});
  addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
  load();
})();
