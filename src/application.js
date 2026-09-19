/* Gleb / Living Systems — a dependency-free, offline narrative prototype.
   Canvas scenes are illustrative interaction studies, not original product builds. */
(() => {
    'use strict';
    const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
    const DATA = JSON.parse($('#portfolio-data').textContent);
    const clamp = (n, a = 0, b = 1) => Math.min(b, Math.max(a, n));
    const mix = (a, b, t) => a + (b - a) * t;
    const ease = t => t * t * (3 - 2 * t);
    const TAU = Math.PI * 2;
    let reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let manualMotion = false, author = false;
    let dirty = true, scrollY = window.scrollY, lastTime = 0, rafId = 0, activeChapter = 'story';
    const mediaUrls = new Map();
    let toastTimer;
    function toast(text) { $('#toast').textContent = text; $('#toast').classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 2800); }
    function escapeHtml(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
    function icon(kind) { const paths = { ui: 'M3 3h18v18H3z M3 8h18 M8 8v13', art: 'm5 18 2-6L17 2l5 5-10 10-7 1Z M14 5l5 5', motion: 'm4 4 16 8-16 8V4Z', team: 'M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm9 1a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM1 22v-4a7 7 0 0 1 14 0v4m1-7a5 5 0 0 1 7 4v3', code: 'm8 5-6 7 6 7m8-14 6 7-6 7m-3-16-2 20' }; return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="${paths[kind] || paths.art}"/></svg>`; }
    function artSvg(kind = 'poly') {
        const start = '<svg viewBox="0 0 400 260" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">', end = '</svg>';
        const tones = ['#ced2bf', '#aab39b', '#738368', '#293425', '#edf0e2', '#8d9d7b'];
        if (kind === 'poly' || kind === 'poly2')
            return start + `<rect width="400" height="260" fill="#eaece1"/><g transform="translate(200 130) rotate(${kind === 'poly2' ? 20 : -10})"><polygon points="0,-99 91,-31 66,78 -44,96 -97,2" fill="#c6d1b4"/><polygon points="0,-99 -8,5 91,-31" fill="#2c3527"/><polygon points="91,-31 -8,5 66,78" fill="#98ab80"/><polygon points="66,78 -8,5 -44,96" fill="#d2fc59"/><polygon points="-44,96 -8,5 -97,2" fill="#6d7f56"/><polygon points="-97,2 -8,5 0,-99" fill="#e1e8d3"/></g><path d="M20 20h13m-13 0v13m360-13h-13m13 0v13M20 240h13m-13 0v-13m360 13h-13m13 0v-13" fill="none" stroke="#8d9679"/><text x="18" y="248" font-size="7" fill="#6d765f" font-family="monospace">PROJECT FRAME / ILLUSTRATION</text>` + end;
        if (kind === 'cards')
            return start + '<rect width="400" height="260" fill="#222920"/>' + [0, 1, 2, 3].map((_, i) => `<g transform="translate(${67 + i * 63} ${49 + Math.abs(i - 1.5) * 8}) rotate(${(i - 1.5) * 8} 43 77)"><rect width="86" height="153" rx="7" fill="${i === 2 ? '#d2fc59' : '#e7eadc'}"/><text x="12" y="24" font-size="18" fill="#2b3523" font-family="serif">${['A', 'K', 'Q', 'J'][i]}</text><path d="m43 49 15 27-15 27-15-27Z" fill="#35472a"/></g>`).join('') + end;
        if (kind === 'tiles')
            return start + '<rect width="400" height="260" fill="#d6ddc8"/>' + Array.from({ length: 12 }, (_, i) => `<g transform="translate(${62 + (i % 4) * 72} ${35 + Math.floor(i / 4) * 66})"><rect width="61" height="59" rx="8" fill="#b7c09f"/><rect width="61" height="53" rx="8" fill="${i === 6 ? '#d2fc59' : '#f3f3e9'}"/><text x="30" y="37" font-size="30" text-anchor="middle" font-family="serif" fill="#333d26">${'WORDMAHJONGA'[i]}</text></g>`).join('') + end;
        if (kind === 'world')
            return start + '<rect width="400" height="260" fill="#d2dac5"/><ellipse cx="200" cy="217" rx="125" ry="15" fill="#bec9ac"/><path d="m60 173 146-75 137 70-148 72Z" fill="#7b8c66"/><path d="m60 156 146-75 137 70-148 72Z" fill="#f2f2e4"/>' + [0, 1, 2].map((x, i) => `<g transform="translate(${125 + i * 70} ${112 - i * 4})"><rect x="-13" y="5" width="26" height="34" rx="7" fill="${tones[i + 2]}"/><circle r="17" fill="${tones[i + 1]}"/></g>`).join('') + end;
        if (kind === 'dragon' || kind === 'chick')
            return start + `<rect width="400" height="260" fill="${kind === 'chick' ? '#eed9c1' : '#ced6bc'}"/><ellipse cx="205" cy="219" rx="71" ry="10" fill="#1b25141c"/><path d="M139 190c-26-32-14-110 27-131 34-19 82-5 99 33 25 15 38 49 19 77-12 35-75 57-108 40-13-3-27-8-37-19Z" fill="${kind === 'chick' ? '#e97483' : '#729260'}"/><ellipse cx="193" cy="106" rx="15" ry="21" fill="#f3f3e9"/><ellipse cx="232" cy="103" rx="15" ry="21" fill="#f3f3e9"/><ellipse cx="198" cy="109" rx="6" ry="10" fill="#242b1b"/><ellipse cx="237" cy="106" rx="6" ry="10" fill="#242b1b"/><path d="m219 129 24 11-24 13-15-13Z" fill="#e9be57"/><path d="m175 206-5 21m65-21 7 21" stroke="#8c7748" stroke-width="7"/><text x="18" y="248" font-size="7" fill="#6d665f" font-family="monospace">SCHEMATIC PLACEHOLDER / NOT ORIGINAL ART</text>` + end;
        if (kind === 'reels')
            return start + '<rect width="400" height="260" fill="#22291d"/>' + [0, 1, 2].map((v, i) => `<g transform="translate(${52 + i * 101} 69)"><rect width="91" height="123" rx="11" fill="#dfe7cc"/><rect x="6" y="6" width="79" height="111" rx="7" fill="#eceede"/><path d="m46 32 12 22 22 3-16 17 3 24-21-12-22 12 4-24-17-17 23-3Z" fill="${i === 1 ? '#abc74f' : '#546e34'}"/></g>`).join('') + end;
        if (kind === 'vector')
            return start + '<rect width="400" height="260" fill="#e9eddc"/><path d="M93 153C52 33 182 14 282 81s-49 177-125 138c-25-13-50-33-64-66Z" fill="#1f2c17" stroke="#7d983f" stroke-width="2"/><path d="M93 153 62 63 179 17 282 81 300 187 157 219 93 153" fill="none" stroke="#799e36" stroke-width="1"/>' + [[93, 153], [62, 63], [179, 17], [282, 81], [300, 187], [157, 219]].map(([x, y]) => `<rect x="${x - 4}" y="${y - 4}" width="8" height="8" fill="#d2fc59" stroke="#3d501d"/>`).join('') + end;
        if (kind === 'pet')
            return start + '<rect width="400" height="260" fill="#25212e"/><ellipse cx="200" cy="220" rx="70" ry="8" fill="#0b090f"/><path d="M115 179c-10-74 16-132 83-136 70-4 105 61 90 129-4 41-153 48-173 7Z" fill="#eeece4"/><ellipse cx="173" cy="119" rx="17" ry="27" fill="#17151c"/><ellipse cx="228" cy="119" rx="17" ry="27" fill="#17151c"/><circle cx="177" cy="119" r="9" fill="#eeece4"/><circle cx="232" cy="119" r="9" fill="#eeece4"/>' + end;
        if (kind === 'rock')
            return start + '<rect width="400" height="260" fill="#101917"/><ellipse cx="200" cy="226" rx="84" ry="8" fill="#55635640"/><g transform="translate(200 125)"><polygon points="0,-91 82,-37 69,67 -36,89 -82,13 -60,-60" fill="#8e9c86"/><path d="m0-91-16 98L82-37Zm-16 98 85 60-105 22Z" fill="#cdd6c0"/><path d="m-82 13 66-6-20 82Z" fill="#586953"/><path d="m-16 7 98-44-13 104Z" fill="#7b8e70"/></g>' + end;
        if (kind === 'party')
            return start + '<rect width="400" height="260" fill="#ef674f"/><g transform="rotate(-6 200 130)"><rect x="54" y="43" width="280" height="158" rx="8" fill="#20261b"/>' + [0, 1, 2, 3].map((v, i) => `<path d="M76 ${75 + i * 30}h230" stroke="#545e47" stroke-dasharray="3 6"/><circle cx="${110 + i * 41}" cy="${75 + i * 30}" r="10" fill="${['#d2fc59', '#cabef8', '#eee9dc', '#db9878'][i]}"/>`).join('') + '</g><rect x="281" y="140" width="56" height="91" rx="11" transform="rotate(12 309 185)" fill="#f0efdb"/>' + end;
        return start + `<rect width="400" height="260" fill="#e0e6d2"/><text x="200" y="161" font-size="122" letter-spacing="-10" text-anchor="middle" fill="#2e3a22" font-family="Space Grotesk, Syne, sans-serif">${kind === 'story' ? 'Aa.' : 'g↗'}</text>` + end;
    }
    $$('[data-art]').forEach(n => { n.innerHTML = artSvg(n.dataset.art); });
    // Dialogs retain the reader's place and never require leaving the story.
    const dialog=$('#dialog');
    let dialogOpener=null,oldHash='',bodyOverflow='',bodyStyleOverflow='';
    let dialogViews=[],dialogIndex=-1,dialogToken='',dialogClosing=null,dialogAnimation=null,closingHistory=false,historyDone=null;
    const nativeClose=dialog.close.bind(dialog);
    const chrome=$('.dialog-head'),label=$('#dialogLabel'),labelGroup=document.createElement('div');
    labelGroup.className='dialog-label-group';label.before(labelGroup);
    const dialogBack=document.createElement('button');dialogBack.className='dialog-back';dialogBack.type='button';dialogBack.textContent='← Back';dialogBack.hidden=true;
    labelGroup.append(dialogBack,label);
    function lockDialog(){
      bodyOverflow=document.documentElement.style.overflow;bodyStyleOverflow=document.body.style.overflow;
      document.documentElement.style.overflow='hidden';document.body.style.overflow='hidden';
      window.NocturneScroll?.cancel();$$('video').forEach(v=>v.pause());
    }
    function paintDialog(view,restore=false){
      const wasOpen=dialog.open,dc=$('#dialogContent');$$('video',dc).forEach(v=>v.pause());
      dc.innerHTML=view.html;window.NocturneR14?.prepareLayout(dc);label.textContent=view.label;dc.scrollTop=restore?view.scroll:0;
      dialog.setAttribute('aria-labelledby',$('#dialogTitle',dc)?'dialogTitle':'dialogLabel');
      dialogBack.hidden=dialogIndex<1;
      if(!dialog.open){window.NocturneR14?.rememberSource(dialogOpener);dialog.showModal();}
      $('.close-dialog').focus({preventScroll:true});
      dialogAnimation?.cancel();
      dialogAnimation=window.NocturneMotion.animateSheet(wasOpen?'content':'open');
      dc.scrollTop=restore?view.scroll:0;window.portfolioWake?.();
    }
    function openDialog(html,labelText,hash){
      if(html.includes('class="case-shell')&&window.NocturneLab?.openInline(html,document.activeElement))return;
      if(dialogClosing){dialogClosing.then(()=>openDialog(html,labelText,hash));return;}
      const view={html,label:labelText,hash:hash||null,scroll:0};
      if(!dialog.open){
        dialogOpener=document.activeElement;oldHash=location.hash.startsWith('#case/')?'#top':location.hash;
        dialogViews=[];dialogIndex=-1;dialogToken='nocturne-'+Date.now();lockDialog();
      }else if(dialogIndex>=0){
        dialogViews[dialogIndex].scroll=$('#dialogContent').scrollTop;
      }
      const replace=dialogIndex>=0&&dialogViews[dialogIndex].label===view.label&&dialogViews[dialogIndex].hash===view.hash;
      if(replace)dialogViews[dialogIndex]=view;
      else {dialogViews.splice(dialogIndex+1);dialogViews.push(view);dialogIndex++;}
      paintDialog(view);
      writeHistory(replace?'replaceState':'pushState',{nocturneDialog:dialogToken,depth:dialogIndex},hash?'#case/'+encodeURIComponent(hash):(location.hash||'#top'));
    }
    function closeDialog(fromPop=false){
      if(dialogClosing)return dialogClosing;
      if(!dialog.open)return Promise.resolve();
      closingHistory=!fromPop;
      dialogClosing=new Promise(resolve=>{
        let done=false;
        function finish(){
          if(done)return;done=true;dialog.classList.remove('is-closing');dialogAnimation?.cancel();nativeClose();
          document.documentElement.style.overflow=bodyOverflow;document.body.style.overflow=bodyStyleOverflow;
          $$('#dialogContent video').forEach(v=>v.pause());dialogOpener?.focus?.({preventScroll:true});dirty=true;requestTick();
          let settled=false;const settle=()=>{if(settled)return;settled=true;closingHistory=false;historyDone=null;dialogClosing=null;resolve();};
          if(!fromPop&&history.state?.nocturneDialog===dialogToken){historyDone=settle;history.go(-(dialogIndex+1));setTimeout(()=>{if(!settled){writeHistory('replaceState',{},oldHash||'#top');settle();}},280);}
          else {if(!fromPop)writeHistory('replaceState',{},oldHash||'#top');settle();}
        }
        dialog.classList.add('is-closing');
        if(reduced){queueMicrotask(finish);return;}
        dialogAnimation?.cancel();
        const a=window.NocturneMotion.closeSheet();dialogAnimation=a;
        a.finished.catch(()=>{}).then(()=>{a.cancel();finish();});setTimeout(finish,850);
      });return dialogClosing;
    }
    dialogBack.addEventListener('click',()=>{
      if(dialogIndex<1||dialogClosing)return;
      if(history.state?.nocturneDialog===dialogToken)history.back();
      else {dialogIndex--;paintDialog(dialogViews[dialogIndex],true);}
    });
    let backdropDown=false;
    const isBackdrop=e=>{const r=dialog.getBoundingClientRect();return e.target===dialog&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom);};
    dialog.addEventListener('pointerdown',e=>backdropDown=isBackdrop(e));
    dialog.addEventListener('pointerup',e=>{if(backdropDown&&isBackdrop(e))closeDialog();backdropDown=false;});
    window.addEventListener('popstate',e=>{
      if(closingHistory){historyDone?.();return;}
      if(e.state?.nocturneDialog===dialogToken&&dialogViews[e.state.depth]){
        if(dialog.open&&dialogIndex>=0)dialogViews[dialogIndex].scroll=$('#dialogContent').scrollTop;
        if(!dialog.open)lockDialog();dialogIndex=e.state.depth;paintDialog(dialogViews[dialogIndex],true);
      }else if(dialog.open)closeDialog(true);
      else if(!location.hash.startsWith('#case/')){const id=decodeURIComponent(location.hash.slice(1));if(document.getElementById(id))navigate(id,false);}
    });
    const caseInfo = {
  "polysphere": {
    "title": "Polysphere",
    "kind": "Commercial experience / Playgendary · 2018–2019",
    "art": "poly",
    "intro": "A visual language for a game — and responsibility for the product.",
    "role": "Product ownership, team leadership, visual direction, UI/UX and VFX, as recorded in the original professional history.",
    "proof": "Original game footage and a project-specific breakdown of visual and product decisions are being prepared.",
    "scope": [
      "Visual direction",
      "Interface & VFX",
      "Team leadership"
    ],
    "status": "The preview is illustrative. No unverified performance or business metrics are presented."
  },
  "vice": {
    "title": "V-ICE",
    "kind": "Independent project / vectorization / R&D",
    "art": "vector",
    "intro": "Recover the geometry behind a raster image. Not its staircase of pixels.",
    "role": "Research into primitives, shared boundaries, antialiasing, corner classification, stroke consistency and editable vector output.",
    "proof": "Raster input → generated SVG → reference comparison. The interactive shape on this site is a synthetic study, not V-ICE output.",
    "scope": [
      "Ambiguous edges",
      "Geometric hypotheses",
      "Editable output"
    ],
    "status": "In development. Low-resolution detail and shape idealization remain active research areas. No production-readiness or competitor-parity claim."
  },
  "companion": {
    "title": "Companion / Nervous System",
    "kind": "Independent project / behavioural prototype",
    "art": "pet",
    "intro": "A character to connect with. Not a collection of random animations.",
    "role": "Expressive eyes, brows, body language and readable links between your actions and the character’s state.",
    "proof": "The intended case study follows an actual session: action → state → expression → response. This site offers a small, locally scripted interaction study.",
    "scope": [
      "Attention & expression",
      "Cause & readable response",
      "Behaviour into movement"
    ],
    "status": "This showcase does not run the Nervous System runtime, long-term memory or learning."
  },
  "party": {
    "title": "Local Party",
    "kind": "Independent collection / Wi-Fi party games",
    "art": "party",
    "intro": "One shared screen. Phones as controllers. No extra gamepads.",
    "role": "Exploring QR joining, personal controllers, shared-screen UI, left- and right-handed layouts, scoring and rounds.",
    "proof": "The project case will show a real multi-phone session. This site’s mini race is a single-browser demo against bots.",
    "scope": [
      "A shared joining flow",
      "Personal & shared screens",
      "A collection of party games"
    ],
    "status": "Games are at different stages of development. The network server and QR joining flow are not running in this showcase."
  },
  "elemental": {
    "title": "El Emental",
    "kind": "Independent game / Unity / in development",
    "art": "rock",
    "intro": "Visuals, animation, physics and VFX working toward one feeling: magic with weight.",
    "role": "Game-feel studies around lifting and throwing stones, destruction, character movement, interfaces and stylized environments.",
    "proof": "Original Unity footage will show the action and its layers. The rock here is a separate Canvas interaction study.",
    "scope": [
      "Weight & inertia",
      "Feedback & destruction",
      "Animation, UI & VFX"
    ],
    "status": "The original Unity build is not embedded. Build-level performance requires testing in Unity on the target device."
  },
  "color": {
    "title": "Color Prime",
    "kind": "Independent Blender tool / in development",
    "art": "poly2",
    "intro": "Material families, main and accent colours, and a shorter path to an icon.",
    "role": "Exploring material inheritance, colour workflows, studio lighting, camera setup and scene preparation for icons.",
    "proof": "A repeatable add-on workflow will show one input asset, the artist’s choices and the exported result. The colour study here illustrates the idea.",
    "scope": [
      "Materials & colour families",
      "Icon preparation",
      "Artist-focused tooling"
    ],
    "status": "This is not the add-on interface. Time savings have not been measured in this showcase."
  },
  "hex": {
    "title": "HexWords",
    "kind": "Independent mobile prototype",
    "art": "tiles",
    "intro": "Words on a hexagonal grid. A considered response to every gesture.",
    "role": "Swipe interaction, word validation, scoring, hints, DOTween animation and responsive UI.",
    "proof": "The case study will show a real swipe, accepted and rejected words, and score feedback. The original build is not embedded here.",
    "scope": [
      "Swipe interaction",
      "UI feedback",
      "Result animation"
    ],
    "status": "HexWords / Hex_Module is a separate personal prototype, not Hex Defense."
  },
  "painterly": {
    "title": "Painterly Rocks",
    "kind": "Visual research / shader",
    "art": "rock",
    "intro": "A painted surface that holds its facets, light and sense of volume.",
    "role": "Exploring silhouettes, volumetric brush marks and how stylized materials respond to light.",
    "proof": "Actual material versions, from the same camera and under the same light, will document the progression.",
    "scope": [
      "Surface & silhouette",
      "Volumetric marks",
      "Light & performance"
    ],
    "status": "An independent visual study, not a claim to reproduce the original Dreams technology."
  },
  "fire": {
    "title": "Fire & Motion",
    "kind": "VFX / research & implementation",
    "art": "poly2",
    "intro": "Fire, impact and small particles as one expressive gesture.",
    "role": "Stylized fire, evolving volume dissolution, glow and environmental feedback.",
    "proof": "Original effect footage and a breakdown of its layers and constraints will be added.",
    "scope": [
      "Shape & dissolution",
      "Glow",
      "Small particles"
    ],
    "status": "Independent research. No claim to use the original Zelda technology."
  },
  "pipeline": {
    "title": "AI Asset Workflows",
    "kind": "Workflow experiments / ComfyUI",
    "art": "vector",
    "intro": "There is important craft between an AI image and a usable game asset.",
    "role": "Generation and editing, background removal, segmentation, part preparation and visual quality control.",
    "proof": "A reproducible workflow will show inputs, intermediate stages, manual decisions and final export.",
    "scope": [
      "Style control",
      "Asset preparation",
      "Repeatability"
    ],
    "status": "Individual experiments, not a claim of a completed production platform."
  },
  "fluid": {
    "title": "Fluid Experiments",
    "kind": "Research direction / visualization",
    "art": "type",
    "intro": "Making complex movement understandable through interaction.",
    "role": "Exploring interactive ways to explain the dynamics of fluids.",
    "proof": "A focused demonstration will state its mathematical assumptions and what it actually computes.",
    "scope": [
      "Visualization",
      "Interaction",
      "Explanation"
    ],
    "status": "Research in progress. No standalone finished solver or new mathematical result is claimed."
  },
  "dragon": {
    "title": "Dragon Heist",
    "kind": "Work project / publication approval pending",
    "art": "dragon",
    "intro": "Character, action and a game outcome you can read through motion.",
    "role": "Dragon reactions, button presses, platform and gold-bar movement, wheel states and bonus transitions.",
    "proof": "Approved footage will be accompanied by a clear breakdown of personal contributions.",
    "scope": [
      "Action direction",
      "Character reactions",
      "States & transitions"
    ],
    "status": "Schematic preview only. Original artwork and commercial results require separate approval."
  },
  "chick": {
    "title": "Chick Fiesta",
    "kind": "Work concept / publication approval pending",
    "art": "chick",
    "intro": "A character and interface inspired by a Filipino festival setting.",
    "role": "Mobile UI clarity, simpler backgrounds, readable character design, harmless round endings and animation-ready parts.",
    "proof": "Approved concept iterations and changes informed by partner feedback will document the work.",
    "scope": [
      "Visual concept",
      "Mobile UI",
      "Character & animation"
    ],
    "status": "The preview is not original project art. Release and conversion claims are not made here."
  },
  "bonus": {
    "title": "Bonus flows",
    "kind": "Work direction / UI & animation",
    "art": "reels",
    "intro": "A bonus mechanic that explains itself through timing and sequence.",
    "role": "Entry banners, three-window reveals, staggered stops, scale and alpha accents, and the return to the main game.",
    "proof": "Original footage and a state diagram will identify the specific contribution.",
    "scope": [
      "Sequence",
      "Attention hierarchy",
      "Return transition"
    ],
    "status": "Illustrative preview. No public-release or business-metric claims."
  }
};
    // Reuse the original explicitly illustrative art; these are not product captures.
    $$('.bento-tile[data-case]').forEach(el=>{const frame=$('.bento-frame',el),c=caseInfo[el.dataset.case];if(frame&&c){frame.innerHTML=artSvg(c.art);frame.dataset.slot='VISUAL STUDY';}});
    function baseCase(id) { let f; for (const exp of DATA.experience) {
        const c = exp.cases.find(c => c.id === id);
        if (c) {
            f = { c, exp };
            break;
        }
    } if (!f) {
        const p = DATA.chapters.find(p => p.id === id || p.caseId === id);
        if (p)
            return { title: p.name, kind: p.kind, art: p.cover || 'vector', intro: p.description, role: p.details || 'Independent project. Detailed notes are being prepared.', proof: p.note, scope: [], status: p.note };
    } if (!f)
        return { title: 'Exploration', kind: 'Portfolio / material in preparation', art: 'type', intro: 'Project story', role: 'Project notes are being prepared from verified material.', proof: 'Original media and a breakdown of personal contributions will be added here.', scope: [], status: 'Case study in preparation.' }; return { title: f.c.name, kind: `${f.exp.company} / ${f.exp.dates}`, art: f.c.art, intro: f.exp.summary, role: f.exp.role + '. ' + (f.exp.id === 'rocketscience' ? 'Art, animation, VFX, optimization, interfaces and store assets across this period. Project-specific contributions are documented separately.' : f.exp.id === 'pandaplay' ? 'Hypercasual visuals, team leadership, competitive visual research and optimization.' : 'Project-specific contributions will be detailed with the original material.'), proof: 'Original footage and imagery will sit alongside a clear breakdown of personal contributions.', scope: f.exp.skills, status: 'Role and dates follow the original professional profile. This preview is a case-study draft, not a claim of unverified outcomes.' }; }
    // Opaque-origin srcdoc previews may reject History API writes. Navigation still works.
    function writeHistory(method, state, hash) { try {
        history[method](state, '', hash);
        return true;
    }
    catch (e) {
        window.portfolioHistoryFallback = String(e);
        return false;
    } }
    function openCase(id) {
      const c=caseInfo[id]||baseCase(id);
      openDialog(`<article class="case-shell case-project">
        <header class="sheet-title"><div class="eyebrow">${escapeHtml(c.kind)}</div><h2 id="dialogTitle">${escapeHtml(c.title)}</h2></header>
        <div class="case-mosaic">
          <figure class="case-cover">${artSvg(c.art)}<figcaption>ILLUSTRATIVE STUDY · NOT ORIGINAL PRODUCT IMAGERY</figcaption></figure>
          <aside class="case-brief"><div class="case-label">THE IDEA</div><p class="case-lead">${escapeHtml(c.intro)}</p><div class="skill-list">${c.scope.map(v=>`<span class="skill">${escapeHtml(v)}</span>`).join('')}</div><span class="case-kind">PROJECT NOTES / IN PROGRESS</span></aside>
        </div>
        <div class="case-editorial"><section><div class="case-label">01 / MY FOCUS</div><p>${escapeHtml(c.role)}</p></section><section><div class="case-label">02 / CASE-STUDY MATERIAL</div><p>${escapeHtml(c.proof)}</p></section></div>
        <div class="case-meta">${escapeHtml(c.status)}</div>
        <footer class="case-foot"><span>Details, not just the outcome.</span><div class="case-actions"><button data-close>Back to the story ↙</button><a href="${DATA.person.linkedin}" target="_blank" rel="noopener noreferrer">Let’s talk ↗</a></div></footer>
      </article>`, 'HLEB / PROJECT NOTES', id);
    }
    function openMenu() { const links = [['story', '01', 'Work history'], ['vice', '02.1', 'V-ICE'], ['companion', '02.2', 'Companion'], ['party', '02.3', 'Local Party'], ['elemental', '02.4', 'El Emental'], ['lab', '03', 'All experiments'], ['contact', '04', 'The next chapter']]; openDialog('<div class="eyebrow">TAKE A SHORTCUT / EXPLORE FREELY</div><h2 id="dialogTitle">Where to next?</h2><nav class="menu-list" aria-label="Site index">' + links.map(([id, n, t]) => `<a data-jump="${id}" href="#${id}"><small>${n}</small>${t}<span>↗</span></a>`).join('') + '</nav><div class="menu-secondary"><a class="external" href="' + DATA.person.linkedin + '" target="_blank" rel="noopener noreferrer">LinkedIn</a><a class="external" href="' + DATA.person.behance + '" target="_blank" rel="noopener noreferrer">Behance</a></div>', 'HLEB / INDEX'); }

    function openPlan() { openDialog(`<div class="eyebrow">NOCTURNE / R14 — CONTINUITY</div><h2 id="dialogTitle">Light. Depth.<br>A little life.</h2><p>An independent portfolio experience, built around native scrolling, tactile surfaces and interactive studies.</p><h3>One motion language</h3><p>Cursor-driven lettering, reversible word reveals, curved optical apertures and source-aware glass sheets share a single frame clock. Motion can be reduced in the settings.</p><h3>The night scene</h3><p>WebGL renders the procedural grass, light and depth of field. When 3D is unavailable, a lighter Canvas presentation preserves the same atmosphere without claiming to simulate the original scene.</p><h3>Real projects, illustrative previews</h3><p>The roles and projects come from the original portfolio. The graphic studies are not original product footage, and their limitations are labelled. Local media replacements stay on your device and reset on reload.</p><h3>Offline by design</h3><p>Rendering and interactions need no external framework or server. Optional Google Fonts improve typography online; the name has its original offline SVG outlines. No font binaries are bundled.</p><div class="case-actions"><button data-close>Back to exploring ↙</button></div>`, 'HLEB / R14'); }
    $('.close-dialog').addEventListener('click', () => closeDialog());
    dialog.addEventListener('cancel', e => { e.preventDefault(); closeDialog(); });
    dialog.addEventListener('keydown',e=>{
      if(e.key!=='Tab'||!dialog.open)return;
      const list=$$('button:not([disabled]),a[href],input:not([disabled]),select,textarea,video[controls],[tabindex="0"]',dialog).filter(el=>el.getClientRects().length&&!el.closest('[hidden],[inert]')&&getComputedStyle(el).visibility!=='hidden');
      if(!list.length){e.preventDefault();return;}
      const first=list[0],last=list[list.length-1],active=document.activeElement;
      if(e.shiftKey&&(active===first||!dialog.contains(active))){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&(active===last||!dialog.contains(active))){e.preventDefault();first.focus();}
    });
    document.addEventListener('click', e => { const b = e.target.closest('button,a'); if (!b)
        return; if (b.dataset.case) {
        openCase(b.dataset.case);
    }
    else if (b.hasAttribute('data-open-menu'))
        openMenu();
    else if (b.hasAttribute('data-open-plan'))
        openPlan();
    else if (b.hasAttribute('data-close'))
        closeDialog();
    else if (b.dataset.jump) {
        e.preventDefault();
        const id = b.dataset.jump;
        closeDialog().then(()=>navigate(id));
    }
    else if (!e.defaultPrevented && b.matches('a[href^="#"]')) {
        const id = b.getAttribute('href').slice(1);
        if (document.getElementById(id)) {
            e.preventDefault();
            navigate(id,true,b.matches(".glass-nav a"));
        }
    } });

    function navigate(id,record=true,menu=false) {
        const el=document.getElementById(id);if(!el)return;
        if(record)writeHistory('replaceState',{},'#'+id);
        if(el.matches('[data-chapter]'))window.LiquidPortfolio?.seek(id,.14);
        else {const y=window.scrollY+el.getBoundingClientRect().top-(id==='top'||id==='projects'?0:84);window.NocturneScroll?.to(y,{instant:reduced,menu});}
        dirty=true;requestTick();
    }
    window.portfolioNavigate=navigate;
    $$('.exp').forEach(el => el.addEventListener('toggle', () => { dirty = true; requestTick(); }));
    $$('[data-filter]').forEach(b => b.addEventListener('click', () => { const f = b.dataset.filter; $$('[data-filter]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); $$('.project-row').forEach(x => x.hidden = f !== 'all' && x.dataset.category !== f); dirty = true; requestTick(); }));
    $('#utilityToggle').addEventListener('click', () => { const b = $('#utilityToggle'), open = b.getAttribute('aria-expanded') !== 'true'; b.setAttribute('aria-expanded', String(open)); $('#utilityOptions').hidden = !open; });
    $('#authorToggle').addEventListener('click', () => { author = !author; document.body.classList.toggle('author-mode', author); $('#authorToggle').setAttribute('aria-pressed', String(author)); dirty = true; requestTick(); if (author)
        toast('Local media stays on your device.'); });
    let uploadId = '';
    $$('[data-upload]').forEach(b => b.addEventListener('click', () => { uploadId = b.dataset.upload; $('#mediaInput').click(); }));
    $('#mediaInput').addEventListener('change', e => { const file = e.target.files[0]; if (!file)
        return; if (!/^image\/|^video\//.test(file.type)) {
        toast('Choose an image or video.');
        return;
    } const id = uploadId; if (!id)
        return; const host = $(`#${id} .project-art`); if (mediaUrls.has(id))
        URL.revokeObjectURL(mediaUrls.get(id)); const u = URL.createObjectURL(file); mediaUrls.set(id, u); host.dataset.media = 'true'; host.innerHTML = file.type.startsWith('video/') ? `<video class="uploaded-media" controls playsinline preload="metadata" src="${u}"></video>` : `<img class="uploaded-media" src="${u}" alt="Local project media ${escapeHtml(id)}">`; host.style.transform = 'none'; host.style.display = 'block'; toast('Media replaced. Reload to restore the original study.'); e.target.value = ''; dirty = true; requestTick(); });
    window.addEventListener('beforeunload', () => { mediaUrls.forEach(u => URL.revokeObjectURL(u)); });
    // Single render coordinator. FLOW57 drives real document scroll from this same clock.
    const sceneEls = $$('.scene');
    const scenes = {};
    sceneEls.forEach(el => { scenes[el.dataset.scene] = { el, p: 0, visible: false, phase: -1 }; });

    let vectorManual = false, vectorAmount = 0;
    function updateScroll() {
        const H = innerHeight, Y = window.scrollY;
        scrollY = Y;
        const max = document.documentElement.scrollHeight - H;
        $('.page-progress').style.transform = `scaleX(${max > 0 ? clamp(Y / max) : 0})`;
        let closest = null, dist = Infinity;
        $$('.exp').map(el => ({el,r:el.getBoundingClientRect()})).forEach(({el,r}) => { const d = Math.abs(r.top + 50 - H * .44); if (d < dist) {
            dist = d;
            closest = el;
        } el.style.setProperty('--row-x', `${reduced ? 0 : clamp((r.top - H * .45) / H, -1, 1) * 5}px`); });
        if (closest) {
            $$('.exp').forEach(el => el.classList.toggle('is-active', el === closest));
            const exp = DATA.experience.find(x => x.id === closest.id);
            if (exp) {
                if($('.current-year').textContent!==String(exp.year))$('.current-year').textContent = exp.year;
                if($('.current-caption').textContent!==exp.chapter)$('.current-caption').textContent = exp.chapter;
                $('.story-progress i').style.transform = `scaleX(${(DATA.experience.indexOf(exp) + 1) / DATA.experience.length})`;
            }
        }
        let current = 'story';
        for (const key of ['story', 'projects', 'vice', 'companion', 'party', 'elemental', 'tools', 'bento', 'lab', 'contact']) {
            const r = document.getElementById(key)?.getBoundingClientRect();
            if (r && r.top < H * .42)
                current = key;
        }
        activeChapter = current;
        $$('.chapter-rail a').forEach(a => { const on = a.hash === '#' + current; a.classList.toggle('active', on); if (on)
            a.setAttribute('aria-current', 'location');
        else
            a.removeAttribute('aria-current'); });
        window.LiquidPortfolio?.update(Y, H, reduced, current);
        sceneEls.forEach(el => { const ss = scenes[el.dataset.scene], r = el.getBoundingClientRect(); ss.visible = !mediaUrls.has(el.dataset.scene) && (window.LiquidPortfolio?.isStudyVisible(el.dataset.scene) ?? (r.top < H && r.bottom > 0)); ss.p = reduced ? .36 : (window.LiquidPortfolio?.stateProgress(el.dataset.scene) ?? 0); const progress = reduced ? .82 : clamp((ss.p - .01) / .24); el.style.setProperty('--p', progress.toFixed(4)); if (el.dataset.scene === 'vice' && !vectorManual) {
            vectorAmount = progress;
            const slider=$('#contour');if(slider)slider.value = Math.round(progress * 100);
        } });
        const ir = $('.intro').getBoundingClientRect();
        ribbonVisible = ir.bottom > 0 && ir.top < H;
        for (const v of $$('video')) {
            const r = v.getBoundingClientRect();
            if (r.bottom < 0 || r.top > H)
                v.pause();
        }
        dirty = false;
    }
    function setMotion(value) { reduced = value; document.body.classList.toggle('reduced', value); const btn = $('#motionToggle'); btn.setAttribute('aria-pressed', String(value)); btn.textContent = value ? 'Motion: off' : 'Motion: on'; dirty = true; resizeCanvases(); window.LiquidPortfolio?.invalidate(); window.NocturneMotion?.measure(); requestTick(); }
    $('#motionToggle').addEventListener('click',()=>{manualMotion=true;setMotion(!reduced);window.NocturneScroll?.cancel();});
    const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
    motionQuery.addEventListener('change', e => { if (!manualMotion)
        setMotion(e.matches); });
    let resizeTimer;
    window.addEventListener('resize', () => { dirty = true; clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { resizeCanvases(); dirty = true; requestTick(); }, 140); requestTick(); });
    window.addEventListener('scroll', () => { dirty = true; requestTick(); }, { passive: true });
    document.addEventListener('visibilitychange', () => { if (document.hidden) {
        cancelAnimationFrame(rafId);
        rafId = 0;
    }
    else {
        dirty = true;
        lastTime = 0;
        requestTick();
    } });
    const ctxs = {};
    function makeCanvas(id) { const canvas = document.getElementById(id); const ctx = canvas?.getContext('2d'); if (!ctx)
        return null; ctxs[id] = { canvas, ctx, w: 1, h: 1, dpr: 1 }; return ctxs[id]; }
    ['ribbon', 'vectorCanvas', 'petCanvas', 'partyCanvas', 'rockCanvas'].forEach(makeCanvas);
    function resizeCanvases() { for (const c of Object.values(ctxs)) {
        if (!c.canvas.isConnected)
            continue;
        const r = c.canvas.getBoundingClientRect();
        if (!r.width || !r.height)
            continue;
        const d = Math.min(devicePixelRatio || 1, 2);
        c.w = r.width;
        c.h = r.height;
        c.dpr = d;
        c.canvas.width = Math.round(r.width * d);
        c.canvas.height = Math.round(r.height * d);
        c.ctx.setTransform(d, 0, 0, d, 0, 0);
    } }
    function clear(c) { c.ctx.clearRect(0, 0, c.w, c.h); }
    let ribbonVisible = true;
    let pointer = { x: 0, y: 0 };
    window.addEventListener('pointermove', e => { pointer = { x: e.clientX / innerWidth - .5, y: e.clientY / innerHeight - .5 }; requestTick(); }, { passive: true });
    function rotate3(v, rx, ry, rz = 0) { let [x, y, z] = v; let yy = y * Math.cos(rx) - z * Math.sin(rx), zz = y * Math.sin(rx) + z * Math.cos(rx); y = yy; z = zz; let xx = x * Math.cos(ry) + z * Math.sin(ry); zz = -x * Math.sin(ry) + z * Math.cos(ry); x = xx; z = zz; xx = x * Math.cos(rz) - y * Math.sin(rz); yy = x * Math.sin(rz) + y * Math.cos(rz); return [xx, yy, z]; }
    function drawRibbon() { /* Scene ribbon belongs to renderer.js. */ }

    const baseNodes = [[.32, .14], [.60, .12], [.79, .34], [.79, .63], [.62, .84], [.36, .85], [.17, .67], [.13, .38]];
    let nodes = baseNodes.map(v => [...v]);
    let selected = 0, drag = -1;
    function outline(ctx, w, h, arr = nodes) { const pad = .1; const p = arr.map(([x, y]) => [w * (pad + x * (1 - 2 * pad)), h * (pad + y * (1 - 2 * pad))]); ctx.beginPath(); p.forEach((q, i) => { const n = p.length, prev = p[(i - 1 + n) % n], next = p[(i + 1) % n], next2 = p[(i + 2) % n]; if (!i)
        ctx.moveTo(...q); ctx.bezierCurveTo(q[0] + (next[0] - prev[0]) / 6, q[1] + (next[1] - prev[1]) / 6, next[0] - (next2[0] - q[0]) / 6, next[1] - (next2[1] - q[1]) / 6, ...next); }); ctx.closePath(); return p; }
    const rasterCanvas = document.createElement('canvas');
    rasterCanvas.width = 36;
    rasterCanvas.height = 30;
    const rasterCtx = rasterCanvas.getContext('2d');
    function drawVector() {
        const c = ctxs.vectorCanvas;
        if (!c.canvas.isConnected)
            return;
        clear(c);
        const { ctx, w, h } = c, v = vectorAmount;
        const side = Math.min(w * .84, h * 1.03), X = (w - side) / 2, Y = (h - side) / 2;
        ctx.save();
        ctx.translate(X, Y);
        const clean = ease(clamp((v - .17) / .64));
        rasterCtx.clearRect(0, 0, 36, 30);
        outline(rasterCtx, 36, 30);
        rasterCtx.fillStyle = '#172013';
        rasterCtx.fill();
        rasterCtx.globalCompositeOperation = 'destination-out';
        rasterCtx.beginPath();
        rasterCtx.ellipse(19, 15, 4.2, 5.2, -.38, 0, TAU);
        rasterCtx.fill();
        rasterCtx.globalCompositeOperation = 'source-over';
        ctx.imageSmoothingEnabled = false;
        ctx.globalAlpha = 1 - clean;
        ctx.drawImage(rasterCanvas, 0, 0, 36, 30, 0, 0, side, side);
        ctx.globalAlpha = 1;
        const p = outline(ctx, side, side);
        ctx.globalAlpha = clean;
        ctx.fillStyle = '#1c2616';
        ctx.fill();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.ellipse(side * 19 / 36, side * .5, side * 4.2 / 36, side * 5.2 / 30, -.38, 0, TAU);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        const wire = clamp((v - .3) / .4);
        if (wire > 0) {
            ctx.globalAlpha = wire;
            outline(ctx, side, side);
            ctx.strokeStyle = '#789136';
            ctx.lineWidth = 1.2;
            ctx.stroke();
            for (let i = 0; i < p.length; i++) {
                const q = p[i], prev = p[(i - 1 + p.length) % p.length], next = p[(i + 1) % p.length];
                const a = [q[0] + (next[0] - prev[0]) / 6, q[1] + (next[1] - prev[1]) / 6], b = [q[0] - (next[0] - prev[0]) / 6, q[1] - (next[1] - prev[1]) / 6];
                ctx.strokeStyle = '#859752aa';
                ctx.lineWidth = .7;
                ctx.beginPath();
                ctx.moveTo(...b);
                ctx.lineTo(...a);
                ctx.stroke();
                for (const d of [a, b]) {
                    ctx.beginPath();
                    ctx.arc(...d, 2.6, 0, TAU);
                    ctx.fillStyle = '#d8edb1';
                    ctx.fill();
                    ctx.strokeStyle = '#789136';
                    ctx.stroke();
                }
                ctx.fillStyle = i === selected ? '#d2fc59' : '#e9eddc';
                ctx.strokeStyle = '#506523';
                ctx.lineWidth = 1.2;
                ctx.fillRect(q[0] - 3.3, q[1] - 3.3, 6.6, 6.6);
                ctx.strokeRect(q[0] - 3.3, q[1] - 3.3, 6.6, 6.6);
            }
        }
        ctx.restore();
        ctx.globalAlpha = 1;
        const hint = $('#nodeHint');
        if (hint)
            hint.textContent = v > .7 ? 'DRAG THE POINTS' : v > .3 ? 'SHAPE HYPOTHESIS' : 'PIXELS ≠ GEOMETRY';
    }
    const vectorCanvas = ctxs.vectorCanvas.canvas;
    vectorCanvas.tabIndex = 0;
    vectorCanvas.setAttribute('aria-label', 'Illustrative contour. The slider controls the transition. Arrow keys move the selected point; [ and ] select a point.');
    $('#contour').addEventListener('input', e => { vectorManual = true; vectorAmount = Number(e.target.value) / 100; requestTick(); });
    $('#vectorReset').addEventListener('click', () => { nodes = baseNodes.map(v => [...v]); vectorManual = false; dirty = true; requestTick(); toast('Shape reset. The transition follows scrolling again.'); });
    function canvasPoint(e, c) { const r = c.canvas.getBoundingClientRect(); if (c.canvas.id === 'vectorCanvas') {
        const m = new DOMMatrix(getComputedStyle(c.canvas.closest('.vector-window')).transform), a = Math.atan2(m.b, m.a), x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
        return [x * Math.cos(a) + y * Math.sin(a) + c.w / 2, -x * Math.sin(a) + y * Math.cos(a) + c.h / 2];
    } return [(e.clientX - r.left) * c.w / r.width, (e.clientY - r.top) * c.h / r.height]; }
    vectorCanvas.addEventListener('pointerdown', e => { if (e.pointerType === 'touch' || vectorAmount < .55)
        return; const c = ctxs.vectorCanvas, [px, py] = canvasPoint(e, c), side = Math.min(c.w * .84, c.h * 1.03), X = (c.w - side) / 2, Y = (c.h - side) / 2; let min = 28; nodes.forEach(([x, y], i) => { const d = Math.hypot(px - X - side * (.1 + x * .8), py - Y - side * (.1 + y * .8)); if (d < min) {
        min = d;
        drag = i;
        selected = i;
    } }); if (drag >= 0) {
        vectorCanvas.dataset.directManipulation='true';
        window.NocturneScroll?.cancel('vector-drag');
        vectorCanvas.setPointerCapture(e.pointerId);
        vectorCanvas.style.touchAction = 'none';
        vectorManual = true;
        e.preventDefault();
        requestTick();
    } });
    vectorCanvas.addEventListener('pointermove', e => { if (drag < 0)
        return; const c = ctxs.vectorCanvas, [px, py] = canvasPoint(e, c), side = Math.min(c.w * .84, c.h * 1.03); nodes[drag] = [clamp(((px - (c.w - side) / 2) / side - .1) / .8, .05, .95), clamp(((py - (c.h - side) / 2) / side - .1) / .8, .05, .95)]; requestTick(); });
    const stopVectorDrag = () => { drag = -1; delete vectorCanvas.dataset.directManipulation; vectorCanvas.style.touchAction = 'pan-y'; };
    vectorCanvas.addEventListener('pointerup', stopVectorDrag);
    vectorCanvas.addEventListener('pointercancel', stopVectorDrag);
    vectorCanvas.addEventListener('lostpointercapture', stopVectorDrag);
    vectorCanvas.style.touchAction = 'pan-y';
    vectorCanvas.addEventListener('keydown', e => { if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '[', ']'].includes(e.key)) {
        e.preventDefault();
        vectorManual = true;
        vectorAmount = 1;
        if (e.key === '[')
            selected = (selected + nodes.length - 1) % nodes.length;
        else if (e.key === ']')
            selected = (selected + 1) % nodes.length;
        else {
            const q = nodes[selected];
            if (e.key === 'ArrowLeft')
                q[0] -= .02;
            if (e.key === 'ArrowRight')
                q[0] += .02;
            if (e.key === 'ArrowUp')
                q[1] -= .02;
            if (e.key === 'ArrowDown')
                q[1] += .02;
            nodes[selected] = q.map(x => clamp(x, .05, .95));
        }
        $('#contour').value = 100;
        requestTick();
    } });
    // Small, transparent local state machine for the companion display.
    let petMood = 'curious', petActionAt = -100, petLook = { x: 0, y: 0 }, petTarget = { x: 0, y: 0 }, petTime = 0;
    function petAction(kind) { petMood = kind; petActionAt = performance.now() / 1000; $('#petState') && ($('#petState').textContent = kind === 'hello' ? 'happy to see you' : 'let’s play'); $('#petResponse') && ($('#petResponse').textContent = kind === 'hello' ? 'Hello. A little closer now.' : 'Now this is interesting.'); requestTick(); }
    $('#petHello').addEventListener('click', () => petAction('hello'));
    $('#petPlay').addEventListener('click', () => petAction('play'));
    ctxs.petCanvas.canvas.addEventListener('pointermove', e => { const c = ctxs.petCanvas, [x, y] = canvasPoint(e, c); petTarget = { x: (x / c.w - .5) * 2, y: (y / c.h - .5) * 2 }; requestTick(); }, { passive: true });
    ctxs.petCanvas.canvas.addEventListener('pointerleave', () => { petTarget = { x: 0, y: 0 }; requestTick(); });
    ctxs.petCanvas.canvas.addEventListener('click', () => petAction('hello'));
    function drawPet(t, dt) {
        const c = ctxs.petCanvas;
        if (!c.canvas.isConnected)
            return;
        clear(c);
        const { ctx, w, h } = c;
        const age = t - petActionAt, acting = age >= 0 && age < 2.7;
        const strength = acting ? Math.sin(clamp(age / 2.7) * Math.PI) : 0;
        petLook.x = mix(petLook.x, petTarget.x, reduced ? 1 : clamp(dt * 5));
        petLook.y = mix(petLook.y, petTarget.y, reduced ? 1 : clamp(dt * 5));
        if (!acting && petMood !== 'curious') {
            petMood = 'curious';
            $('#petState') && ($('#petState').textContent = 'curious');
            $('#petResponse') && ($('#petResponse').textContent = 'You’ve caught someone’s attention.');
        }
        const radius = Math.min(w * .29, h * .32), baseX = w * .5, baseY = h * .46;
        const bounce = reduced ? 0 : (petMood === 'play' ? Math.abs(Math.sin(age * 7)) * radius * .10 * strength : Math.sin(t * 1.45) * radius * .018);
        ctx.save();
        ctx.translate(baseX, baseY - bounce);
        const tilt = reduced ? 0 : petLook.x * .07 + (petMood === 'hello' ? Math.sin(age * 5) * .04 * strength : 0);
        ctx.rotate(tilt);
        ctx.fillStyle = '#0005';
        ctx.beginPath();
        ctx.ellipse(0, radius * 1.18 + bounce, radius * .72, Math.max(5, radius * .10 - bounce * .09), 0, 0, TAU);
        ctx.fill();
        const sx = 1 + (petMood === 'play' && !reduced ? Math.sin(age * 7) * .035 * strength : 0), sy = 1 - (sx - 1);
        ctx.scale(sx, sy);
        const body = new Path2D();
        body.moveTo(-radius * .78, radius * .72);
        body.bezierCurveTo(-radius * 1.17, radius * .10, -radius * .97, -radius * .92, -radius * .13, -radius * 1.06);
        body.bezierCurveTo(radius * .50, -radius * 1.28, radius * 1.03, -radius * .49, radius * .96, radius * .31);
        body.bezierCurveTo(radius * 1.10, radius * .91, radius * .28, radius * 1.08, -radius * .06, radius * .88);
        body.bezierCurveTo(-radius * .40, radius * 1.07, -radius * .69, radius * .99, -radius * .78, radius * .72);
        body.closePath();
        ctx.fillStyle = '#f0eee8';
        ctx.fill(body);
        let blink = 1;
        if (!reduced && t % 6.8 > 6.57)
            blink = .12 + Math.abs((t % 6.8 - 6.685) / .115) * .88;
        const happiness = petMood === 'hello' ? strength : 0;
        const eyeY = -radius * .07, eyeRX = radius * .155, eyeRY = radius * .235 * (1 - happiness * .16);
        for (const sign of [-1, 1]) {
            const ex = sign * radius * .28;
            ctx.save();
            ctx.translate(ex, eyeY);
            ctx.rotate(sign * (happiness * .09));
            ctx.scale(1, clamp(blink, .12, 1));
            ctx.fillStyle = '#16151a';
            ctx.beginPath();
            ctx.ellipse(0, 0, eyeRX, eyeRY, 0, 0, TAU);
            ctx.fill();
            ctx.fillStyle = '#f0eee8';
            ctx.beginPath();
            ctx.ellipse(petLook.x * radius * .043 + (petMood === 'play' ? Math.sin(age * 3) * radius * .013 : 0), petLook.y * radius * .055 + radius * .01, eyeRX * .48, eyeRY * .5, 0, 0, TAU);
            ctx.fill();
            ctx.restore();
            ctx.strokeStyle = '#9c9a96';
            ctx.lineWidth = radius * .024;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(ex - radius * .14, -radius * .39 - sign * petLook.x * .027 * radius - happiness * radius * .06);
            ctx.quadraticCurveTo(ex, -radius * .44 - happiness * radius * .08, ex + radius * .13, -radius * .38 - happiness * radius * .04);
            ctx.stroke();
        }
        if (petMood === 'play' && acting && !reduced) {
            ctx.strokeStyle = '#cbb9e9';
            ctx.lineWidth = 1;
            for (let i = 0; i < 3; i++) {
                const ang = -1.2 + i * .7;
                const rr = radius * (1.28 + .06 * Math.sin(age * 7 + i));
                const xx = Math.cos(ang) * rr, yy = Math.sin(ang) * rr;
                ctx.beginPath();
                ctx.moveTo(xx - 5, yy);
                ctx.lineTo(xx + 5, yy);
                ctx.moveTo(xx, yy - 5);
                ctx.lineTo(xx, yy + 5);
                ctx.stroke();
            }
        }
        ctx.restore();
    }
    // Tap runner: single browser only; no network claims.
    let race = { running: false, finished: false, progress: [0, 0, 0, 0], taps: 0, elapsed: 0 };
    function resetRace() { race = { running: true, finished: false, progress: [0, 0, 0, 0], taps: 0, elapsed: 0 }; $('#raceStatus') && ($('#raceStatus').textContent = 'GO!'); $('#startRace') && ($('#startRace').textContent = 'Race again ↺'); $('#raceFeedback') && ($('#raceFeedback').textContent = 'Tap to run. Reach the finish in 16 taps.'); $('#tapScore') && ($('#tapScore').textContent = '00'); requestTick(); }
    function tap() { if (!race.running) {
        resetRace();
    } race.taps++; race.progress[0] = clamp(race.taps / 16); $('#tapScore') && ($('#tapScore').textContent = String(race.taps).padStart(2, '0')); if (race.progress[0] >= 1)
        finishRace(true); requestTick(); }
    function finishRace(won) { race.running = false; race.finished = true; $('#raceStatus') && ($('#raceStatus').textContent = won ? 'YOU WIN!' : 'THE BOT WINS'); $('#raceFeedback') && ($('#raceFeedback').textContent = won ? 'Nice! Use the button on the left for another round.' : 'So close. Start again and tap a little faster.'); $('#startRace') && ($('#startRace').textContent = 'Race again ↺'); }
    $('#startRace').addEventListener('click', resetRace);
    $('#tapButton').addEventListener('click', tap);
    function drawParty(t, dt) {
        const c = ctxs.partyCanvas;
        if (!c.canvas.isConnected)
            return;
        clear(c);
        const { ctx, w, h } = c;
        if (race.running) {
            race.elapsed += dt;
            for (let i = 1; i < 4; i++)
                race.progress[i] = clamp(race.progress[i] + dt * (.055 + i * .009));
            if (race.progress.slice(1).some(x => x >= 1))
                finishRace(false);
        }
        ctx.fillStyle = '#151910';
        ctx.fillRect(0, 0, w, h);
        const x0 = w * .11, x1 = w * .90, y0 = h * .19, gap = h * .22;
        const colors = ['#d2fc59', '#bcaade', '#e9e7d6', '#ed9975'];
        for (let i = 0; i < 4; i++) {
            const y = y0 + i * gap;
            ctx.strokeStyle = '#69744b40';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 7]);
            ctx.beginPath();
            ctx.moveTo(x0, y + gap * .48);
            ctx.lineTo(x1, y + gap * .48);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = '#aab394';
            ctx.font = `${Math.max(5, w * .014)}px monospace`;
            ctx.fillText(String(i + 1).padStart(2, '0'), w * .035, y + 3);
            const p = race.progress[i], x = mix(x0, x1, p);
            if (p > 0) {
                ctx.fillStyle = colors[i] + '25';
                ctx.fillRect(x0, y - 4, (x - x0), 8);
            }
            ctx.save();
            ctx.translate(x, y);
            ctx.fillStyle = '#0004';
            ctx.beginPath();
            ctx.ellipse(0, h * .038, w * .023, h * .015, 0, 0, TAU);
            ctx.fill();
            ctx.fillStyle = colors[i];
            ctx.beginPath();
            ctx.arc(0, 0, Math.max(6, w * .022), 0, TAU);
            ctx.fill();
            ctx.fillStyle = '#171d10';
            ctx.beginPath();
            ctx.arc(w * .006, -h * .005, Math.max(1.5, w * .004), 0, TAU);
            ctx.fill();
            ctx.restore();
        }
        const size = Math.max(4, w * .015);
        for (let x = 0; x < 2; x++)
            for (let y = 0; y < Math.ceil(h / size); y++) {
                ctx.fillStyle = (x + y) % 2 ? '#82906830' : '#c4cda47c';
                ctx.fillRect(x1 + x * size, h * .04 + y * size, size, size);
            }
        if (race.finished) {
            ctx.fillStyle = '#141910c9';
            ctx.fillRect(w * .2, h * .33, w * .61, h * .25);
            ctx.strokeStyle = '#d2fc5955';
            ctx.strokeRect(w * .2, h * .33, w * .61, h * .25);
            ctx.fillStyle = '#eef5dc';
            ctx.textAlign = 'center';
            ctx.font = `${Math.max(11, w * .035)}px 'Space Grotesk', sans-serif`;
            ctx.fillText(race.progress[0] >= 1 ? 'NICE. ONCE MORE?' : 'ONE MORE TRY?', w * .51, h * .485);
            ctx.textAlign = 'left';
        }
    }
    // Faceted volume study. CPU projection illustrates depth without loading a 3D engine.
    const phi = (1 + Math.sqrt(5)) / 2;
    const vertices = [[-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0], [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi], [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1]].map(v => { let n = Math.hypot(...v); return v.map(x => x / n); });
    const faces = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
    let liftTarget = 0, lift = 0, liftV = 0, breakAt = -100;
    $('#liftRock').addEventListener('click', () => { liftTarget = liftTarget ? 0 : 1; $('#liftRock').textContent = liftTarget ? 'Lower ↓' : 'Lift ↑'; requestTick(); });
    $('#breakRock').addEventListener('click', () => { breakAt = performance.now() / 1000; requestTick(); });
    ctxs.rockCanvas.canvas.addEventListener('click', () => { breakAt = performance.now() / 1000; requestTick(); });
    function polyRock(ctx, cx, cy, r, t, explode = 0) {
        let pts = vertices.map((v, i) => rotate3([v[0] * (1 + .10 * Math.sin(i * 4)), v[1] * 1.13, v[2] * (1 + .09 * Math.cos(i * 2))], -.4 + t * .09, .35 + t * .13, .16));
        const fs = faces.map((f, i) => { const ps = f.map(i => pts[i]), center = ps.reduce((a, v) => a.map((n, k) => n + v[k] / 3), [0, 0, 0]); return { ps, center, i, z: center[2] }; }).sort((a, b) => a.z - b.z);
        for (const f of fs) {
            let p = f.ps;
            const a = p[0], b = p[1], c = p[2], ab = b.map((n, k) => n - a[k]), ac = c.map((n, k) => n - a[k]);
            const norm = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
            const n = Math.hypot(...norm) || 1;
            const li = clamp((norm[0] * -.4 + norm[1] * -.8 + norm[2] * .6) / n, -.3, 1);
            const br = Math.round(112 + li * 105);
            const ex = explode * (1 + .32 * Math.sin(f.i * 7));
            ctx.beginPath();
            p.forEach((v, i) => { const vv = v.map((a, k) => a + f.center[k] * ex), pers = 4 / (4 - vv[2] * .2); const x = cx + vv[0] * r * pers, y = cy + vv[1] * r * pers + ex * ex * r * .07; if (i)
                ctx.lineTo(x, y);
            else
                ctx.moveTo(x, y); });
            ctx.closePath();
            ctx.fillStyle = `rgb(${br - 7},${br + 3},${br - 13})`;
            ctx.fill();
            ctx.strokeStyle = `rgba(${br + 3},${br + 14},${br - 3},.8)`;
            ctx.lineWidth = .6;
            ctx.stroke();
        }
    }
    function drawRock(t, dt) {
        const c = ctxs.rockCanvas;
        if (!c.canvas.isConnected)
            return;
        clear(c);
        const { ctx, w, h } = c;
        const force = (liftTarget - lift) * 48 - liftV * 10;
        if (reduced) {
            lift = liftTarget;
            liftV = 0;
        }
        else {
            liftV += force * dt;
            lift += liftV * dt;
        }
        const r = Math.min(w * .22, h * .255), x = w * .53, y = h * .50 - lift * h * .16;
        const age = t - breakAt;
        const explosion = age >= 0 && age < 2.4 ? (reduced ? .8 : Math.sin(age / 2.4 * Math.PI) ** 1.1 * 1.35) : 0;
        const time = reduced ? 3 : t;
        ctx.strokeStyle = '#9caf8620';
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.ellipse(x, h * .78, r * (1.28 + i * .32), r * .19 + i * 3, -.09, 0, TAU);
            ctx.stroke();
        }
        const shadow = ctx.createRadialGradient(x, h * .78, 1, x, h * .78, r * 1.3);
        shadow.addColorStop(0, '#adcb7730');
        shadow.addColorStop(1, '#adcb7700');
        ctx.fillStyle = shadow;
        ctx.save();
        ctx.translate(x, h * .78);
        ctx.scale(1, .22);
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.3, 0, TAU);
        ctx.fill();
        ctx.restore();
        polyRock(ctx, x, y, r, time, explosion);
        for (let i = 0; i < 5; i++) {
            const a = i * 1.7 + 1.2, sr = r * (.09 + (i % 3) * .026), xx = x + Math.cos(a) * r * 1.48, yy = y + Math.sin(a) * r * .76 + (reduced ? 0 : Math.sin(t * .9 + i) * 7);
            polyRock(ctx, xx, yy, sr, time + i * 5, explosion * .3);
        }
        if (explosion > 0) {
            ctx.strokeStyle = '#bfd6a26b';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(x, h * .78, r * (1.4 + explosion), r * .19 * (1.4 + explosion), -.1, 0, TAU);
            ctx.stroke();
        }
    }
    let colorIndex = 0;
    const palettes = [['#252823', '#c8d4ba', '#d2fc59'], ['#2d2533', '#c3b6d6', '#896ac2'], ['#492e26', '#efbba2', '#ed7654'], ['#1f3839', '#a9cccc', '#79bcc0']];
    $('#swapColor').addEventListener('click', () => { colorIndex = (colorIndex + 1) % palettes.length; $$('.specimen').forEach((n, i) => n.style.background = palettes[colorIndex][i]); toast('Colour family ' + (colorIndex + 1) + ' / ' + palettes.length); });
    function frame(timestamp) {
        rafId = 0;
        if (document.hidden)
            return;
        const t = timestamp / 1000, uiDt = lastTime ? clamp(t - lastTime, 0, .2) : .016, dt = Math.min(uiDt,.04);
        lastTime = t;
        if(window.NocturneScroll?.active()){window.NocturneScroll.tick(timestamp);dirty=true;}
        // One layout snapshot per presented frame. Reading window.scrollY
        // between modules' style writes forces a synchronous style flush.
        window.NocturneFrame={scrollY:window.scrollY,innerWidth,innerHeight};
        if (dirty)
            updateScroll();
        window.NocturneR14?.read(t);
        window.NocturneFX?.read();
        window.Nocturne?.read?.();
        window.NocturneLab?.tick(t,uiDt);
        window.LiquidPortfolio?.tick(t, uiDt, reduced);
        window.NocturneMotion?.tick(t,uiDt,reduced);
        window.NocturneR14?.tick(t,uiDt,reduced);
        for(const el of sceneEls){const ss=scenes[el.dataset.scene];ss.visible=!dialog.open&&!mediaUrls.has(el.dataset.scene)&&!!window.LiquidPortfolio?.isStudyVisible(el.dataset.scene);}
        window.Nocturne?.tick(timestamp, uiDt, reduced);
        window.NocturneFX?.tick(t,uiDt,reduced);
        if (ribbonVisible)
            drawRibbon(t);
        if (!dialog.open && scenes.vice.visible)
            drawVector();
        if (!dialog.open && scenes.companion.visible)
            drawPet(t, dt);
        if (!dialog.open && scenes.party.visible)
            drawParty(t, dt);
        if (!dialog.open && scenes.elemental.visible)
            drawRock(t, dt);
        const motionVisible = ribbonVisible || scenes.companion.visible || scenes.elemental.visible || (scenes.party.visible && race.running);
        const userAnim = (race.running && scenes.party.visible) || (!reduced && ((scenes.companion.visible && t - petActionAt < 2.8) || (scenes.elemental.visible && (Math.abs(lift - liftTarget) > .005 || t - breakAt < 2.5))));
        if ((!reduced && (motionVisible || window.LiquidPortfolio?.needsFrame() || window.NocturneMotion?.needsFrame() || window.Nocturne?.needsFrame())) || userAnim || window.NocturneScroll?.active() || window.NocturneLab?.needsFrame())
            requestTick();
        window.NocturneFrame=null;
    }
    function requestTick() { if (!rafId && !document.hidden)
        rafId = requestAnimationFrame(frame); }
    setMotion(reduced);
    resizeCanvases();
    updateScroll();
    requestTick();
    new ResizeObserver(() => { resizeCanvases(); dirty = true; requestTick(); }).observe($('.timeline'));
    if (document.fonts?.ready)
        document.fonts.ready.then(() => { resizeCanvases(); dirty = true; requestTick(); });
    if (location.hash.startsWith('#case/')) {
        const id = decodeURIComponent(location.hash.slice(6));
        oldHash = '';
        openCase(id);
    }
    // Exposes only transparent local QA state; no telemetry, backend, or hidden network calls.
    window.portfolioRenderStudy = (id, t) => { if (id === 'vice') {
        vectorAmount = (Math.sin(t * 1.6 - Math.PI / 2) + 1) / 2;
        drawVector();
        return ctxs.vectorCanvas.canvas.toDataURL('image/png');
    } if (id === 'companion') {
        petMood = 'hello';
        petActionAt = 0;
        drawPet(t, .04);
        return ctxs.petCanvas.canvas.toDataURL('image/png');
    } if (id === 'elemental') {
        liftTarget = 1;
        breakAt = 1.0;
        drawRock(t, .04);
        return ctxs.rockCanvas.canvas.toDataURL('image/png');
    } if (id === 'party') {
        race.running = true;
        race.progress = [t * .28, t * .19, t * .23, t * .16].map(v => clamp(v));
        drawParty(t, 0);
        return ctxs.partyCanvas.canvas.toDataURL('image/png');
    } };
    window.portfolioWake = () => { dirty = true; requestTick(); };
    window.portfolioOpenCase = openCase;
    window.portfolioOpenDialog = openDialog;
    window.portfolioCloseDialog = closeDialog;
    window.portfolioArt = artSvg;
    window.portfolioDebug = () => ({ reduced, activeChapter, race: { ...race }, sceneProgress: Object.fromEntries(Object.entries(scenes).map(([k, s]) => [k, s.p])), vectorAmount, vectorNodes: nodes.map(p => [...p]), petMood, liftTarget, media: [...mediaUrls.keys()] });
})();

// Fine monochrome film grain, generated once and composited only over the world.
(() => {
  const world=document.querySelector('.world-host'),options=document.querySelector('.utility-options');
  if(!world||!options)return;
  const grain=document.createElement('div');grain.className='film-grain';grain.setAttribute('aria-hidden','true');
  const tile=document.createElement('canvas');tile.width=192*12;tile.height=192;
  const ctx=tile.getContext('2d'),pixels=ctx.createImageData(192,192);
  let seed=7319;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let frame=0;frame<12;frame++){
    for(let i=0;i<pixels.data.length;i+=4){const v=Math.round(128+(random()+random()+random()-1.5)*76);pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=v;pixels.data[i+3]=255;}
    ctx.putImageData(pixels,frame*192,0);
  }grain.style.backgroundImage=`url(${tile.toDataURL()})`;world.append(grain);
  const bootGrain=grain.cloneNode();document.querySelector('#bootLoader')?.append(bootGrain);
  const button=document.createElement('button');button.type='button';button.id='grainToggle';options.append(button);
  let enabled=true;try{enabled=localStorage.getItem('nocturne-film-grain')!=='off';}catch{}
  function apply(){grain.hidden=bootGrain.hidden=!enabled;button.textContent=enabled?'Film grain: on':'Film grain: off';button.setAttribute('aria-pressed',String(enabled));}
  button.addEventListener('click',()=>{enabled=!enabled;apply();try{localStorage.setItem('nocturne-film-grain',enabled?'on':'off');}catch{}});
  apply();
})();

(() => {
  const players=new Set();
  function setup(){document.querySelectorAll('.card-glass video').forEach(v=>{
    if(v.dataset.playerReady)return;v.dataset.playerReady='true';v.controls=false;v.muted=true;v.loop=true;v.playsInline=true;v.preload='metadata';
    v.setAttribute('controlslist','nodownload noremoteplayback');v.disablePictureInPicture=true;
    const host=v.closest('.card-glass');host.classList.add('film-player');
    host.querySelector('.media-play')?.remove();
    const center=document.createElement('button');center.className='film-play';center.type='button';
    const bar=document.createElement('div');bar.className='film-controls';
    bar.innerHTML='<input type="range" min="0" max="1000" value="0" aria-label="Video timeline"><button type="button" class="film-mute" aria-label="Enable sound">Sound off</button><button type="button" class="film-full" aria-label="Fullscreen">⛶</button>';
    host.append(center,bar);const slider=bar.querySelector('input'),mute=bar.querySelector('.film-mute');
    const state=()=>{host.classList.toggle('is-playing',!v.paused);center.textContent=v.paused?'▶':'Ⅱ';center.setAttribute('aria-label',v.paused?'Play video':'Pause video');};
    center.onclick=e=>{e.stopPropagation();v.dataset.userPaused=v.paused?'false':'true';if(v.paused)v.play().catch(()=>{});else v.pause();};
    for(const type of ['pointerdown','click'])bar.addEventListener(type,e=>e.stopPropagation());
    slider.oninput=()=>{if(Number.isFinite(v.duration))v.currentTime=Number(slider.value)/1000*v.duration;};
    mute.onclick=()=>{v.muted=!v.muted;mute.textContent=v.muted?'Sound off':'Sound on';mute.setAttribute('aria-label',v.muted?'Enable sound':'Mute video');};
    bar.querySelector('.film-full').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen();else host.requestFullscreen?.().catch(()=>{});};
    v.addEventListener('timeupdate',()=>{if(v.duration)slider.value=v.currentTime/v.duration*1000;});
    v.addEventListener('play',state);v.addEventListener('pause',state);v.addEventListener('error',()=>{center.textContent='Unavailable';center.disabled=true;});state();players.add(v);document.dispatchEvent(new CustomEvent('portfolio-player-ready'));
  });}
  setup();new MutationObserver(setup).observe(document.querySelector('main'),{childList:true,subtree:true});
  setInterval(()=>{for(const v of players){if(!v.isConnected){players.delete(v);continue;}const card=v.closest('.media-card'),r=v.getBoundingClientRect();const active=!document.hidden&&!window.NocturneMedia?.isOpen&&!window.NocturneLab?.inlineOpen&&!document.querySelector('#dialog').open&&card?.classList.contains('is-center')&&!v.closest('[inert]')&&r.top<innerHeight&&r.bottom>0&&getComputedStyle(card).visibility!=='hidden';if(active&&v.paused&&v.dataset.userPaused!=='true')v.play().catch(()=>{});else if(!active&&!v.paused)v.pause();}},300);
})();
