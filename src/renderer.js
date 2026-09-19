/* NOCTURNE R6.1 — shared WebGL 2 / WebGL 1 shaders; matched no-WebGL presentation.
 * Pipeline: instanced curved meshes -> multisample resolve -> depth-aware optics
 * -> procedural emissive ribbon -> scene-sampling glass -> crisp DOM typography.
 * UI text/media are NOT blurred, rasterized or displaced by the glass shader.
 */
(() => {
    'use strict';
    const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
    const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)), lerp = (a, b, t) => a + (b - a) * t;
    const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
    const escape = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const data = JSON.parse($('#portfolio-data').textContent), root = document.documentElement, body = document.body;
    const attachedGlass=!!window.NocturnePlatform?.attachedGlass;
    let canvas = $('#worldCanvas');
    let riverPoints = [], riverStops = [], followedRiverHead=null;
    let reduced = matchMedia('(prefers-reduced-motion:reduce)').matches, quality = 'full', started = performance.now(), introSkip = !!location.hash || scrollY > 50;
    let partingPower = 0, partVel = 0, partingDir = 0, moonPhase = -.55;
    let previousTime = 0, engine = null, layoutDirty = true, riverData = null, riverStart = 0, riverEnd = 1, mouse = [innerWidth / 2, innerHeight / 2], mouseSoft = [0, 0], clock = 0, lastDraw = 0, hiddenOnce = false;
    const rows = $$('.exp'), surfaces = new Map(), companyMedia = new Map(), letters = $$('.name-glyph');
    const report = { version: 'NOCTURNE R14 / CONTINUITY', renderer: 'initializing', mode: 'pending', attempts: [], fallbackReason: null, colorSpace: 'srgb', samples: 0, renderSize: [0, 0], instances: 0, riverVertices: 0, frames: 0, errors: [], quality: 'full', font: 'Pirata One / exact offline name outlines', intro: 0, sourceY: 0, visibleGlass: 0 };
    let sceneLift=0;
    let pulseReq = 0;
    const travelSpring={value:0,velocity:0};
    const rowMetrics=new Map();
    const W8 = { dir: 0, vel: 0, lastY: 0, surgeT: 9, power: 0, flare: 0 };
    const state = window.Nocturne = { pulse: (p = 1) => { pulseReq = Math.max(pulseReq, p); window.portfolioWake?.(); }, windState: () => W8, tick, needsFrame: () => !reduced, diagnostics: () => ({ ...report, embedded: window.self !== window.top, navigationHistory: window.portfolioHistoryFallback ? 'in-memory (opaque preview)' : 'browser' }), restartIntro, riverStops:()=>riverStops.map(v=>({...v})), layout: () => { layoutDirty = true; window.portfolioWake?.(); }, showCompany, quality: setQuality, pauseRendering: false, surfaces, registerSurface, shaderSources:()=>({...GLSL}), forceTime: null, retryRenderer: restartRenderer, graphics: openGraphics };
    report.glassComposition=attachedGlass?'attached-dom':'world-webgl';
    // GLSL pow has an undefined result for negative bases, even with exponent 2.
    // abs preserves the authored squared falloff on every GPU (including Metal).
    const GLSL = {
        quad: `#version 300 es
precision highp float;
layout(location=0) in vec2 position;out vec2 uv;
void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`,
        sky: `#version 300 es
precision highp float;
in vec2 uv;out vec4 frag;
uniform vec2 resolution;uniform vec2 sun;uniform float time;uniform float rise;uniform float burst;uniform float phase;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);}
float fbm(vec2 p){return .57*noise(p)+.28*noise(p*2.03+4.)+.15*noise(p*4.1);}
void main(){float aspect=resolution.x/resolution.y;vec2 q=(uv-sun)*vec2(aspect,1.);float d=length(q);
 float fog=exp(-pow(abs((uv.y-.48)*5.),2.));float focus=exp(-pow(abs((uv.x-.5)*aspect*1.2),2.));
 float n=fbm(uv*vec2(4.,8.)+vec2(time*.011,-time*.006));
 vec3 col=vec3(.017,.020,.023)+vec3(.115,.116,.115)*fog*(.48+.52*focus);
 col+=vec3(.17,.165,.15)*exp(-d*4.7)*(.86+.25*n)*rise;
 col+=vec3(.11,.107,.097)*exp(-d*12.)*rise;
 float disk=1.-smoothstep(.0085,.011,d);
 // Terminator across the disk: an ellipse whose waist is the phase.
 float ry=clamp(q.y/.0098,-1.,1.),rx=q.x/.0098;
 float term=phase*sqrt(max(0.,1.-ry*ry));
 float lit=smoothstep(-.10,.12,rx-term);
 float earth=.045+.055*(1.-abs(phase));
 disk*=mix(earth,1.,lit);
 col+=vec3(1.7,1.65,1.50)*disk*rise*(1.+burst*5.5);
 col+=vec3(.52,.55,.60)*exp(-d*19.)*burst*1.7+vec3(.30,.33,.38)*exp(-d*5.5)*burst*.8;
 col+=vec3(.4,.38,.32)*exp(-d*57.)*rise*mix(.35,1.,1.-abs(phase)*.7);
 float mist=n*fog*focus;col+=vec3(.025)*mist;
 float veil=1.-smoothstep(.06,.46,uv.y);col=mix(col,vec3(.006,.008,.010),veil*(.82+.06*n));
 col*=1.-.2*smoothstep(.25,.75,length((uv-.5)*vec2(.7,1.)));
 frag=vec4(col,1.);}`,
        groundVertex: `#version 300 es
precision highp float;layout(location=0) in vec3 position;uniform mat4 vp;out vec3 world;
void main(){world=position;gl_Position=vp*vec4(position,1.);}`,
        groundFragment: `#version 300 es
precision highp float;in vec3 world;out vec4 frag;uniform vec3 camera;
void main(){float depth=length(world-camera);float fog=1.-exp(-pow(depth*.012,1.7));vec3 col=mix(vec3(.009,.012,.015),vec3(.049,.054,.060),fog*.84);frag=vec4(col,clamp(depth/200.,.01,.99));}`,
        bladeVertex: `#version 300 es
precision highp float;
layout(location=0) in vec2 aShape;layout(location=1) in vec4 iOffset;layout(location=2) in vec4 iShape;layout(location=3) in vec4 iFlex;
uniform mat4 vp;uniform vec3 camera;uniform float time;uniform float windBoost;uniform float windDir;uniform float surge;uniform float surgeR;uniform float travel;uniform float part;uniform float partDir;uniform vec2 cursorUV;uniform float cursorEnergy;
out vec3 world;out vec3 normal;out float depth;out float height;out float tone;
vec3 surface(float h,float side){
 // Where this blade actually stands, resolved first so its height and lean can
 // depend on how close to the viewer it is.
 vec3 base=iOffset.xyz;
 base.z=12.-mod(12.-iOffset.z-travel,184.);
 float oldDepth=(12.-iOffset.z)/196.,newDepth=(12.-base.z)/196.;
 float oldEdge=.45+oldDepth*.85,newEdge=.45+newDepth*.85;
 base.x=sign(iOffset.x)*(newEdge+(abs(iOffset.x)-oldEdge)*(14.+newDepth*66.)/(14.+oldDepth*66.));
 // Foreground blades are ground cover, not towers: nothing blocks the view and
 // no lane has to be carved out of the field to keep it clear.
 float closeness=smoothstep(-22.,4.,base.z);
 float middle=1.-smoothstep(1.0,9.0,abs(base.x));
 float low=1.-closeness*middle*.78;
 float stalk=iOffset.w*low;
 float taper=pow(max(0.,1.-h),.72)*(1.+iFlex.y*sin(h*5.4));
 float angle=iShape.w+h*iFlex.z;
 float width=iShape.x*taper;vec3 p=vec3(side*width,h*stalk,(1.-abs(side))*.23*width);
 float wind=sin(time*.55+iOffset.x*.26+iOffset.z*.16)*.6+sin(time*.31+iOffset.z*.08)*.4;
 float front=sin(time*.21-iOffset.x*.022+iOffset.z*.014)*.65+sin(time*.093+iOffset.z*.021)*.45;float gust=pow(max(0.,front),2.6)*5.4;
 float shiver=sin(time*3.1+iOffset.x*.31+iOffset.z*.12)*.28+sin(time*5.3+iOffset.z*.2)*.14;
 wind=wind*(1.4+gust*windBoost)+gust*windBoost*(.85+shiver)+shiver*.9;
 wind+=windDir*(1.9+gust*.55)*(1.+shiver*.25);
 float rad=length(iOffset.xz);float front2=exp(-pow(abs((rad-surgeR)/17.),2.))*surge;
 wind+=front2*7.5*sign(iOffset.x+.001);
 float arc=h*h;float curl=sin(h*2.8)*h*iFlex.x;
 p.x+=iShape.y*arc+curl+wind*arc*(.09+iOffset.w*.021);
 p.z+=iShape.z*arc+sin(h*3.14159)*h*iFlex.x*.28+wind*arc*.065;
 p.xz=mat2(cos(angle),-sin(angle),sin(angle),cos(angle))*p.xz;
 // Recycle only behind the camera / inside the distant fog. The same path
 // is shared by position and differential normals; no normal discontinuity.
 // Passing by bends the near blades aside; it never moves where they grow, so
 // no gap is left behind us. The bend is strongest at the tip, carries a
 // sideways swish in the direction of travel, and breaks up along the field so
 // the whole front does not move as one wall.
 float away=sign(base.x+.0001);
 float ripple=.72+.34*sin(base.z*.47+base.x*.31+iOffset.w*.6);
 float lean=closeness*(.10+part*2.1)*ripple;
 float swish=closeness*partDir*ripple;
 float tip=h*h;
 vec4 projected=vp*vec4(base+vec3(0.,stalk*.65,0.),1.);
 vec2 screen=projected.xy/max(.01,projected.w)*.5+.5;
 vec2 delta=screen-cursorUV;
 float brush=exp(-dot(delta*vec2(1.7,1.),delta*vec2(1.7,1.))*38.)*cursorEnergy*step(.01,projected.w);
 p.x+=(delta.x/sqrt(delta.x*delta.x+.012))*brush*tip*.85;
 p.z-=brush*tip*.18;
 p.x+=away*lean*tip*3.4+swish*tip*1.35;
 p.x+=away*lean*tip*h*2.4;
 p.z-=lean*tip*1.25;
 p.y-=lean*h*.20;
 // A yaw about the base reads as the blade turning out of the way, not sliding.
 float turn=away*lean*.42+swish*.22;
 p.xz=mat2(cos(turn),-sin(turn),sin(turn),cos(turn))*p.xz;
 return p+base;
}
void main(){height=aShape.y;world=surface(aShape.y,aShape.x);float nh=min(aShape.y,.985);vec3 t=surface(nh+.008,aShape.x)-surface(max(0.,nh-.008),aShape.x);
 vec3 w=surface(nh,.9)-surface(nh,-.9);normal=normalize(cross(w,t));
 depth=length(camera-world);tone=iFlex.w;gl_Position=vp*vec4(world,1.);}`,
        bladeFragment: `#version 300 es
precision highp float;
in vec3 world;in vec3 normal;in float depth;in float height;in float tone;out vec4 frag;
uniform vec3 light;uniform vec3 camera;uniform float rise;uniform float time;uniform vec3 lantern;uniform float lanternPower;uniform float flare;
uniform vec2 titleUV;uniform vec2 resolution;uniform float titlePower;
void main(){vec3 n=normalize(normal);vec3 l=normalize(light-world);vec3 v=normalize(camera-world);if(!gl_FrontFacing)n=-n;
 float diffuse=max(0.,dot(n,l));float fres=pow(1.-abs(dot(n,v)),3.);float scatter=pow(max(0.,dot(-v,l)),5.);
 vec3 col=vec3(.011,.014,.017)+vec3(.047,.051,.057)*diffuse*rise*tone;
 col+=vec3(.072,.071,.063)*(fres*.62+scatter*.18)*rise;
 col+=vec3(.055,.068,.062)*flare*(.35+height*.9)*rise;
 vec3 ld=lantern-world;float ldist=length(ld);vec3 l2=ld/max(ldist,.001);
 float beam=lanternPower/(1.+ldist*ldist*.0040);
 float d2=max(0.,dot(n,l2));float s2=pow(max(0.,dot(-v,l2)),3.1);float f2=pow(1.-abs(dot(n,v)),2.1);
 col+=(vec3(.30,.34,.38)*d2*.55+vec3(.62,.66,.58)*s2+vec3(.20,.24,.29)*f2*.5)*beam*(.35+.65*height);
 // Broad, feathered emission from the title onto blade surfaces only.
 vec2 titleDelta=(gl_FragCoord.xy/resolution-titleUV)*vec2(1.35,2.1);
 float titleWash=exp(-dot(titleDelta,titleDelta)*4.5)*titlePower;
 col+=vec3(.032,.036,.043)*titleWash*(.30+.45*fres+.25*diffuse)*smoothstep(.04,.75,height);
 float distanceFog=1.-exp(-pow(depth*.012,1.7));vec3 mist=mix(vec3(.049,.054,.060),vec3(.17,.175,.175),smoothstep(-1.,7.,world.y));
 col=mix(col,mist,distanceFog*.84);
 float baseFog=(1.-smoothstep(.01,.40,height))*(1.-smoothstep(28.,125.,depth));
 vec3 rootColor=mix(vec3(.009,.012,.015),vec3(.049,.054,.060),distanceFog*.84);col=mix(col,rootColor,baseFog*.96);
 frag=vec4(col,clamp(depth/200.,.01,.99));}`,
        post: `#version 300 es
precision highp float;
in vec2 uv;out vec4 frag;uniform sampler2D scene;uniform vec2 resolution;uniform float quality;
// seam.x = the junction's height in viewport fractions, seam.y = its reach,
// seam.z = how hard it is pulling right now.
uniform vec3 seam;
vec3 at(vec2 p){return texture(scene,clamp(p,vec2(.001),vec2(.999))).rgb;}
void main(){
 vec2 uvw=uv;float lens=0.,pull=0.,wave=0.;
 if(seam.z>.001){
  float curve=seam.x+.12*pow(abs((uv.x-.5)/.88),2.);
  float d=(uv.y-curve)/max(.004,seam.y);
  lens=exp(-d*d)*seam.z;
  // The well itself: light is drawn toward the line, hardest just off it.
  pull=-d*exp(-d*d*.72)*seam.y*.24*seam.z;
  // A slow transverse wave riding the well, so it is a passing wave and not a
  // static bulge.
  wave=(sin(uv.y*23.+uv.x*4.1+seam.x*17.)*.7+sin(uv.y*41.-uv.x*2.3)*.3)*seam.y*.05*lens;
  uvw.y+=pull;uvw.x+=wave;
 }
 vec4 center=texture(scene,uvw);float dep=center.a;vec2 px=1./resolution;
 float nearBlur=1.-smoothstep(.035,.23,dep);float farBlur=smoothstep(.40,.90,dep);
 float radius=(nearBlur*9.5+farBlur*2.1)*mix(.42,1.,quality)+lens*2.5;vec3 col=center.rgb;float total=1.;
 for(int i=0;i<18;i++){float k=float(i);float a=k*2.399963;vec2 off=vec2(cos(a),sin(a))*sqrt((k+.5)/18.)*radius*px;
 vec4 tap=texture(scene,clamp(uvw+off,vec2(.001),vec2(.999)));float w=mix(.30,1.,smoothstep(-.04,.04,tap.a-dep));col+=tap.rgb*w;total+=w;}
 col/=total;vec2 q=uv-.5;vec2 shift=q*(1.+dot(q,q)*6.2)*px*3.7;
 // Dispersion, not a flat split: each wavelength takes a different path through
 // the well, so red lands short of blue along the pull and along the wave.
 float disp=lens*.075;
 vec2 dr=vec2(wave*.18,pull*disp);
 vec2 db=vec2(-wave*.18,-pull*disp*1.25);
 vec3 cr=at(uvw+shift+dr),cb=at(uvw-shift+db);
 float chroma=clamp(mix(.40,.18,nearBlur)+lens*.045,0.,1.);col.r=mix(col.r,cr.r,chroma);col.b=mix(col.b,cb.b,chroma);
 vec3 bloom=vec3(0.);for(int i=0;i<6;i++){float a=float(i)*1.047;vec3 s=at(uvw+vec2(cos(a),sin(a))*px*9.);bloom+=max(s-vec3(.55),vec3(0.));}col+=bloom*.046;col+=vec3(.026,.031,.038)*lens;
 col*=1.-.29*smoothstep(.30,.8,length(q*vec2(1.05,.9)));float lowMist=1.-smoothstep(.42,.66,uv.y);col=mix(col,vec3(.006,.008,.010),lowMist*.98);
 frag=vec4(col,1.);}`,
        riverVertex: `#version 300 es
precision highp float;
layout(location=0) in vec2 position;layout(location=1) in vec3 flow;
uniform vec2 viewport;uniform float scroll;uniform float caseShift;out vec3 flux;
void main(){flux=flow;vec2 p=vec2(position.x+caseShift,position.y-scroll);gl_Position=vec4(p.x/viewport.x*2.-1.,1.-p.y/viewport.y*2.,0.,1.);}`,
        riverFragment: `#version 300 es
precision highp float;
in vec3 flux;out vec4 frag;uniform float time;uniform float start;uniform float end;uniform float head;uniform float reveal;uniform float burst;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);}
float fbm(vec2 p){return n(p)*.58+n(p*2.04+8.)*.27+n(p*4.08)*.15;}
void main(){float along=flux.y-start;float appear=smoothstep(18.,255.,along);float vanish=1.-smoothstep(end-470.,end-60.,flux.y);
 float lead=1.-smoothstep(head-65.,head+12.,flux.y);
 // Across-stream falloff hides the quad edge. It must not be driven by the
 // distance to a card, or the stream breaks into separate pools between them.
 float endSpread=max(exp(-along/430.),exp(-pow(abs((flux.y-(end-200.))/420.),2.)));
 float across=abs(flux.x)/mix(240.,520.,endSpread);
 float alpha=appear*vanish*lead*reveal*(1.-smoothstep(.46,1.,across));
 float tail=exp(-max(0.,end-260.-flux.y)/300.)*(1.-smoothstep(end-300.,end-90.,flux.y));float crown=min(1.,exp(-along/250.)+tail*.26);
 float width=mix(3.6,10.5,smoothstep(0.,700.,along))+32.*exp(-along/250.)+5.*tail;float defocus=mix(24.,1.1,smoothstep(10.,340.,along))+28.*exp(-along/350.)+4.*tail;
 width+=endSpread*30.;defocus+=endSpread*68.;
 float adv=flux.y*.008-time*.82;float noise=fbm(vec2(flux.x*.038,adv));float warp=(noise-.5)*width*.80;
 // Contact is the card's own footprint, not a wide neighbourhood: the stream
 // stays sharp between the cards and only softens as it slides under one.
 float contact=1.-smoothstep(.34,1.34,flux.z);width+=contact*8.;defocus+=contact*15.;
 float x=flux.x-warp;float core=width*width*2.+defocus*defocus;float soft=exp(-x*x/core);
 float ab=5.+26.*crown;float sr=exp(-(x-ab)*(x-ab)/core),sb=exp(-(x+ab)*(x+ab)/core);float split=.20+.62*crown;
 float halo=exp(-x*x/(width*width*12.+defocus*defocus*4.));
 float filaments=0.;for(int i=0;i<5;i++){float k=float(i);float track=sin(adv*.67+k*1.45+noise*.7)*width*.52+sin(adv*1.9+k)*width*.16;
 float f=(x-track)/(1.05+defocus*.32);float stream=.48+.52*sin(adv*2.2+k*1.8);filaments+=exp(-f*f*.5)*(.08+stream*.10);}
 // Fine detail is retired before it passes under a card, so nothing flickers
 // through the glass.
 filaments*=1.-contact*.88;
 float ridge=exp(-pow(abs((abs(x)-width*.90)/(1.8+defocus)),2.));
 vec3 color=vec3(.51*mix(soft,sr,split),.53*soft,.54*mix(soft,sb,split))*(.60+noise*.48)+vec3(.19,.23,.28)*halo*(.50+tail*.7)+vec3(.95,.95,.84)*filaments*(1.-min(1.,crown)*.55);
 color+=ridge*vec3(x>0.?.21:.03,.095,x>0.?.03:.23)*.45;
 // Continuous signed-distance falloffs, no stroke dashes and no rectangular masks.
 float moon=exp(-pow(abs(along/(70.+620.*(1.-burst))),2.))*burst*reveal;
 vec3 flare=vec3(.88,.92,1.)*moon*exp(-x*x/(14000.*burst+1400.));
 // The moon flare shares the ribbon's feathered start and lateral bounds.
 // Without this envelope its first triangle exposed a horizontal rectangle.
 float flareEnvelope=appear*vanish*lead*(1.-smoothstep(.46,1.,across));
 frag=vec4(color*alpha*mix(1.,.05,contact)*.54+flare*flareEnvelope*1.05,0.);}`,
        present: `#version 300 es
precision highp float;in vec2 uv;out vec4 frag;uniform sampler2D scene;uniform vec2 resolution;uniform float caseBlur;uniform float themeBlue;
void main(){vec3 c=texture(scene,uv).rgb;
 if(caseBlur>.0001){vec2 stepUV=vec2(6.)/resolution;vec3 soft=c*.20;
 for(int i=0;i<8;i++){float a=float(i)*.785398;soft+=texture(scene,clamp(uv+vec2(cos(a),sin(a))*stepUV,vec2(.001),vec2(.999))).rgb*.10;}
 c=mix(c,soft,caseBlur);}
 c*=1.-caseBlur*.04;
 c=1.-(1.-c)*(1.-vec3(.2549,.00392,.9608)*themeBlue*.86);
 c=mix(c,vec3(.00784,.01961,.03922),caseBlur*.46);
 frag=vec4(c,1.);}`,
        glassVertex: `#version 300 es
precision highp float;
layout(location=0) in vec2 position;uniform vec2 viewport;uniform vec2 corners[4];out vec2 local;
void main(){local=position*.5+.5;vec2 p=mix(mix(corners[0],corners[1],local.x),mix(corners[2],corners[3],local.x),local.y);
 gl_Position=vec4(p.x/viewport.x*2.-1.,1.-p.y/viewport.y*2.,0.,1.);}`,
        glassFragment: `#version 300 es
precision highp float;
in vec2 local;out vec4 frag;uniform sampler2D scene;uniform vec2 resolution;uniform vec2 dimensions;
uniform vec2 pointer;uniform float hover;uniform float press;uniform float age;uniform vec2 clickPoint;uniform float time;uniform float radius;uniform float opacity;uniform float padding;uniform float apertureEntry;uniform float apertureExit;
// The energy rim belongs to the same primitive as the glass. Drawn in the DOM
// it drifted a frame behind the canvas on every scroll; here it cannot.
uniform float flow;uniform float lux;uniform vec3 tint;uniform vec4 radii;uniform float returnBlur;uniform float unfold;uniform float blueSheet;uniform float themeBlue;uniform float caseShade;
// Same local elliptical alpha aperture as the DOM summary. GPU glass must
// disappear with its content, not remain as a detached backplate.
float aperture(vec2 p){
 if(apertureEntry<.0005||apertureExit>.9995)return 0.;
 float rx=max(1.,dimensions.x*.84),feather=clamp(dimensions.y*.24,24.,135.);
 float edge=1.-feather/rx;float a=1.;
 vec2 q=vec2(p.x/rx,p.y-dimensions.y*.65);
 if(apertureEntry<.9995){float ry=max(1.,dimensions.y*1.86*sqrt(apertureEntry));a*=1.-smoothstep(edge,1.,length(vec2(q.x,q.y/ry)));}
 if(apertureExit>.0005){float ry=max(1.,dimensions.y*1.86*pow(apertureExit,1.15));a*=smoothstep(edge,1.,length(vec2(q.x,q.y/ry)));}
 return a;
}
float box(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return min(max(q.x,q.y),0.)+length(max(q,0.))-r;}
// Each card carries its own corner set, so no two are the same silhouette.
float cornerRadius(vec2 p){return p.x<0.?(p.y<0.?radii.x:radii.w):(p.y<0.?radii.y:radii.z);}
float sdf(vec2 p){
 float wing=unfold>=0.?p.x/dimensions.x+.5:.5-p.x/dimensions.x;
 // Broad end remains full; the inward-facing end pinches asymmetrically.
 float pinch=abs(unfold)*(1.-smoothstep(.05,.82,wing));
 vec2 shaped=p;shaped.y*=1.+pinch*.055;shaped.y+=pinch*dimensions.y*.012;
 float edge=box(shaped,dimensions*.5,cornerRadius(p));
 float wave=sin(p.x*.0295+time*.52)*sin(p.y*.0375-time*.41)*1.15+sin(p.x*.0102-p.y*.0061-time*.21)*.95;
 float tension=sin(p.y*.043+time*.65)*exp(-pow(abs((p.x-pointer.x)/120.),2.))*hover*1.8;
 return edge+wave+tension;}
vec3 sampleGlass(vec2 pos,vec2 warp,vec2 spread){vec3 c;c.r=texture(scene,clamp(pos+warp+spread,vec2(.001),vec2(.999))).r;c.g=texture(scene,clamp(pos+warp,vec2(.001),vec2(.999))).g;c.b=texture(scene,clamp(pos+warp-spread,vec2(.001),vec2(.999))).b;return c;}
vec3 frosted(vec2 pos,vec2 warp,vec2 spread,vec2 pixel,float amt){vec3 sum=vec3(0.);
 float taps=8.;
 for(int i=0;i<10;i++){if(float(i)>=taps)break;float fi=float(i);float a=fi*2.39996323;float rr=sqrt((fi+.6)/taps)*amt;
  vec2 off=vec2(cos(a),sin(a))*rr*pixel;sum+=sampleGlass(pos+off,warp,spread);}
 return sum/taps;}
void main(){vec2 p=(local-.5)*(dimensions+padding*2.);float d=sdf(p);float cover=1.-smoothstep(-1.1-returnBlur,1.6+returnBlur,d);
 if(d>padding-1.)discard;vec2 normal=normalize(vec2(sdf(p+vec2(.8,0))-sdf(p-vec2(.8,0)),sdf(p+vec2(0,.8))-sdf(p-vec2(0,.8)))+vec2(.0001));
 float rim=exp(-pow(abs((d+7.)/11.),2.));float inner=1.-smoothstep(-44.,-1.,d);
 vec2 toMouse=p-pointer;float lens=exp(-dot(toMouse,toMouse)/14500.)*hover;
 float r=length(p-clickPoint);float ripple=sin(r*.105-age*12.)*exp(-pow(abs((r-age*175.)/42.),2.))*exp(-age*2.2)*step(0.,age);
 vec2 rippleN=(p-clickPoint)/max(1.,r);
 vec2 warp=(normal*(rim*19.+press*5.)+toMouse*lens*.065+rippleN*ripple*7.);
 vec2 pixel=vec2(1.,-1.)/resolution;vec2 screen=gl_FragCoord.xy/resolution;
 float wing=unfold>=0.?local.x:1.-local.x;float wash=smoothstep(.52,1.,wing)*abs(unfold);float frost=26.-hover*6.+returnBlur*2.+wash*42.;
 vec3 refracted=frosted(screen,warp*pixel,normal*pixel*(rim*3.5+hover*1.1),pixel,frost);
 vec3 col=refracted*.62+vec3(.038,.044,.055)+vec3(.014,.016,.02)*inner;
 col=mix(col,vec3(.065,.105,.25)+refracted*.14+vec3(.18,.22,.30)*pow(max(0.,1.-local.y),3.)*.60,blueSheet*.90);
 float topLight=pow(abs(max(0.,dot(normal,normalize(vec2(-.46,-.88))))),2.);
 float sheen=exp(-dot((p-pointer)*vec2(.45,1.),(p-pointer)*vec2(.45,1.))/7500.);
 col+=vec3(.17,.19,.21)*sheen*(.18+hover*.58)*(1.-smoothstep(-3.,1.,d));
 float thin=exp(-pow(abs((d+.9)/(1.05+returnBlur*.4)),2.))*1.05/(1.05+returnBlur*.4);col+=vec3(.5,.53,.57)*thin*(.23+.77*topLight);
 float band=exp(-pow(abs((d+4.)/(2.3+returnBlur*.35)),2.))*2.3/(2.3+returnBlur*.35);vec3 spectrum=.5+.5*cos(vec3(0.,2.1,4.2)+atan(normal.y,normal.x)*2.0+time*.08);
 col+=mix(vec3(.8),spectrum,.65)*band*(.13+hover*.20);col+=vec3(.11,.14,.16)*rim*topLight;
 col+=vec3(.28,.32,.35)*max(0.,ripple)*hover*.4;
 float shadow=exp(-max(0.,d)*.14)*.045;
 // Flowing spectral rim, locked to the same signed distance as the body.
 float ang=atan(p.y,p.x*max(.35,dimensions.y/max(1.,dimensions.x)))*.15915494+.5;
 float u2=fract(ang-flow);
 vec3 rimCol=mix(vec3(.60,.68,.78),tint,.42);
 rimCol+=vec3(.33,.78,1.05)*exp(-pow(abs((u2-.215)/.052),2.))*.85;
 rimCol+=vec3(1.05,.70,.93)*exp(-pow(abs((u2-.305)/.052),2.))*.85;
 rimCol+=vec3(1.)*exp(-pow(abs((u2-.26)/.030),2.))*1.25;
 rimCol+=vec3(.58,.80,1.)*exp(-pow(abs((u2-.775)/.075),2.))*.62;
 float line=exp(-pow(abs((d+1.35)/(1.05+lux*.35)),2.));
 float bloom=exp(-pow(abs((d+3.4)/(5.4+lux*4.2)),2.));
 float rimPower=.34+lux*.58;
 col+=rimCol*line*rimPower*1.05+rimCol*bloom*(.055+lux*.17);
 // Blue sheets get a brighter ice rim, confined to the inside of the silhouette.
 float innerGlow=exp(-max(0.,-d)/14.)*(1.-smoothstep(-.6,.6,d));
 col+=blueSheet*(vec3(.74,.87,1.)*line*.72+vec3(.43,.66,1.)*innerGlow*.18);
 float a=(cover+shadow*(1.-cover))*opacity*aperture(p)*(1.-smoothstep(.62,1.02,wing)*abs(unfold));
 a=max(a,min(1.,line*rimPower*1.15)*opacity*aperture(p));
 a*=1.-smoothstep(.60,1.01,wing)*abs(unfold);a=mix(a,cover*opacity*aperture(p),blueSheet*.72);
 // Theme and backdrop are composed before the foreground rim, not over it.
 col=1.-(1.-col)*(1.-vec3(.2549,.00392,.9608)*themeBlue*.86);
 col=mix(col,vec3(.00784,.01961,.03922),caseShade*.46);
 float whiteRim=1.-smoothstep(.65,1.8,abs(d+1.8));
 col=mix(col,vec3(1.),blueSheet*whiteRim);
 a=max(a,blueSheet*whiteRim*opacity*aperture(p));frag=vec4(col,a);}`
    };
    // Reuse the exact sky radiance for the far-ground fog limit.
    {
        const skyFn = GLSL.sky.replace('in vec2 uv;out vec4 frag;', '').replace('void main(){', 'vec3 skyRadiance(vec2 uv){').replace('frag=vec4(col,1.);}', 'return col;}');
        GLSL.groundFragment = skyFn + `
in vec3 world;uniform vec3 camera;out vec4 frag;
void main(){float d=length(world-camera);float fog=1.-exp(-pow(d*.012,1.7));vec3 c=mix(vec3(.009,.012,.015),vec3(.049,.054,.060),fog*.84);c=mix(c,skyRadiance(gl_FragCoord.xy/resolution),smoothstep(45.,175.,d));frag=vec4(c,clamp(d/200.,.01,.99));}`;
    }
    function vpMatrix(camera, look, aspect) { const sub = (a, b) => a.map((v, i) => v - b[i]), norm = a => { const l = Math.hypot(...a); return a.map(v => v / l); }, cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0); const z = norm(sub(camera, look)), x = norm(cross([0, 1, 0], z)), y = cross(z, x); const v = [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, camera), -dot(y, camera), -dot(z, camera), 1], f = 1 / Math.tan(47 * Math.PI / 360), near = .2, far = 240, p = [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) / (near - far), -1, 0, 0, 2 * far * near / (near - far), 0], out = new Float32Array(16); for (let c = 0; c < 4; c++)
        for (let r = 0; r < 4; r++) {
            let a = 0;
            for (let k = 0; k < 4; k++)
                a += p[k * 4 + r] * v[c * 4 + k];
            out[c * 4 + r] = a;
        } return out; }
    function project(p, m) { const w = m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15]; return [(m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12]) / w * .5 + .5, (m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13]) / w * .5 + .5]; }
    function geometry() { let seed = 38271; const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; return (seed >>> 0) / 4294967296; }; const pos = [], indices = []; const segments = 14;
        // Same triangles and winding, with 45 unique vertices per blade
        // instead of 168 vertex records. The five differential samples in the
        // vertex shader now benefit from the GPU's post-transform cache.
        for (let s = 0; s <= segments; s++)for(let side = -1; side <= 1; side++)pos.push(side,s/segments);
        for (let s = 0; s < segments; s++)
        for (let side = 0; side < 2; side++) {
            const a = s*3+side, b = a+1;
            indices.push(a,b,a+3,b,b+3,a+3);
        } const offset = [], shape = [], flex = [], count = innerWidth < 761 ? 640 : 1150; for (let i = 0; i < count; i++) {
        const side = rnd() > .5 ? 1 : -1, z = 8 - Math.pow(rnd(), .82) * 184, depth = (12 - z) / 196;
        // The field is continuous. The empty lane down the middle used to be
        // generated here, which is why remapping it in the shader changed
        // nothing; blades in the foreground are kept low instead.
        const edge = .45 + depth * .85;
        const x = side * (edge + Math.pow(rnd(), 1.65) * (14 + depth * 66));
        let h = 1.6 + Math.pow(rnd(), 1.15) * 10.3;
        if (i % 9 === 0)
            h *= 1.3;
        const w = (.09 + Math.pow(rnd(), 1.65) * .86) * (h / 6.) ** .35;
        offset.push(x, -3.5 + rnd() * .5, z, h);
        shape.push(w, (rnd() - .60) * h * .85, (rnd() - .5) * h * .58, (rnd() - .5) * 1.65);
        flex.push((rnd() - .5) * h * .39, .35 * rnd(), (rnd() - .5) * .65, .55 + rnd() * .85);
    } report.instances = count; report.bladeVertices = pos.length/2; report.bladeIndices = indices.length;
      return { position: new Float32Array(pos), indices: new Uint16Array(indices), offset: new Float32Array(offset), shape: new Float32Array(shape), flex: new Float32Array(flex), count, vertices: pos.length / 2 }; }
    // R6.1: shared radiance and meshes in WebGL 2 and WebGL 1.
    // No remote renderer dependency. A failed context never silently selects unrelated artwork.
    function newCanvas() { const c = document.createElement('canvas'); c.id = 'worldCanvas'; c.setAttribute('aria-hidden', 'true'); return c; }
    function installCanvas(next) { const old = canvas; canvas = next; if (old?.parentNode)
        old.replaceWith(next);
    else
        $('.world-host').append(next); }
    function attempt(type, stage, reason) { report.attempts.push({ type, stage, reason: String(reason).slice(0, 600) }); report.fallbackReason = String(reason).slice(0, 600); }
    function setMode(mode, label) { report.mode = mode; report.renderer = label; body.dataset.renderer = mode; body.classList.toggle('gpu-ready', mode === 'webgl2' || mode === 'webgl1'); body.classList.toggle('compat-ready', mode === 'canvas2d'); const b = $('#renderStatus'); if (b) {
        b.textContent = mode === 'canvas2d' ? '2D · WebGL unavailable' : mode === 'poster' ? 'Static poster' : mode === 'webgl1' ? '3D · WebGL 1' : '3D · WebGL 2';
        b.title = 'Graphics status — open diagnostics';
    } }
    function toWebGL1(source, isFragment) { return source.replace(/^#version 300 es\s*/, '').replace(/layout\s*\(location\s*=\s*\d+\)\s*in\s+/g, 'attribute ').replace(/\bin\s+(vec[234]|float)\s+/g, 'varying $1 ').replace(/\bout\s+vec4\s+frag\s*;/g, '').replace(/\bout\s+(vec[234]|float)\s+/g, 'varying $1 ').replace(/\btexture\s*\(/g, 'texture2D(').replace(/\bfrag\b/g, 'gl_FragColor'); }
    function initGPU(kind = 'webgl2') {
        const candidate = newCanvas();
        let gl, creationError = '';
        candidate.addEventListener('webglcontextcreationerror', e => creationError = e.statusMessage || 'context creation error');
        try {
            gl = candidate.getContext(kind, { alpha: false, antialias: false, depth: true, powerPreference: 'default', failIfMajorPerformanceCaveat: false, preserveDrawingBuffer: false });
        }
        catch (e) {
            creationError = String(e);
        }
        if (!gl) {
            attempt(kind, 'context', creationError || `${kind} context returned null`);
            return null;
        }
        const is2 = kind === 'webgl2', inst = is2 ? null : gl.getExtension('ANGLE_instanced_arrays');
        if (!is2 && !inst) {
            attempt(kind, 'extension', 'ANGLE_instanced_arrays unavailable');
            gl.getExtension('WEBGL_lose_context')?.loseContext();
            return null;
        }
        try {
            if ('drawingBufferColorSpace' in gl)
                gl.drawingBufferColorSpace = 'srgb';
        }
        catch { }
        const resources = { program: new Set(), buffer: new Set(), texture: new Set(), fb: new Set(), rb: new Set() };
        let width = 1, height = 1, sceneTarget = null, envTarget = null, multiTarget = null, sampleCount = 0, lost = false, disposed = false, firstFrame = true;
        const types = { program: 'Program', buffer: 'Buffer', texture: 'Texture', fb: 'Framebuffer', rb: 'Renderbuffer' };
        const make = type => { const x = gl['create' + types[type]](); if (!x)
            throw Error('Allocation failed: ' + type); resources[type].add(x); return x; };
        function free(type, x) { if (x && resources[type].delete(x))
            gl['delete' + types[type]](x); }
        function dispose() { if (disposed)
            return; disposed = true;
            for(const vao of vertexArrays.values()){
                if(is2)gl.deleteVertexArray(vao);else vaoExt.deleteVertexArrayOES(vao);
            }
            vertexArrays.clear();boundAttributes=null;
            for (const [type, set] of Object.entries(resources))
            for (const x of [...set])
                free(type, x); }
        function program(name, v, f) { const p = make('program'); for (const [type, source] of [[gl.VERTEX_SHADER, v], [gl.FRAGMENT_SHADER, f]]) {
            const s = gl.createShader(type);
            if (!s)
                throw Error(name + ': allocation');
            gl.shaderSource(s, is2 ? source : toWebGL1(source, type === gl.FRAGMENT_SHADER));
            gl.compileShader(s);
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
                const log = gl.getShaderInfoLog(s);
                gl.deleteShader(s);
                throw Error(name + ': ' + log);
            }
            gl.attachShader(p, s);
            gl.deleteShader(s);
        } for (const m of v.matchAll(/layout\s*\(location\s*=\s*(\d+)\)\s*in\s+\w+\s+(\w+)/g))
            gl.bindAttribLocation(p, Number(m[1]), m[2]); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS))
            throw Error(name + ': ' + gl.getProgramInfoLog(p)); const loc = new Map(); return { p, u(n) { if (!loc.has(n))
                loc.set(n, gl.getUniformLocation(p, n)); return loc.get(n); } }; }
        function buffer(a, target = gl.ARRAY_BUFFER) { const b = make('buffer'); gl.bindBuffer(target, b); gl.bufferData(target, a, gl.STATIC_DRAW); return b; }
        function divisor(index, n) { if (is2)
            gl.vertexAttribDivisor(index, n);
        else
            inst.vertexAttribDivisorANGLE(index, n); }
        const attributeCount = Math.min(8, gl.getParameter(gl.MAX_VERTEX_ATTRIBS));
        const vaoExt = is2 ? null : gl.getExtension('OES_vertex_array_object');
        const vertexArrays = new Map();
        let boundAttributes = null;
        const bindVAO = vao => is2 ? gl.bindVertexArray(vao) : vaoExt.bindVertexArrayOES(vao);
        function attributes(spec) {
            if(boundAttributes===spec)return;
            boundAttributes=spec;
            if(is2||vaoExt){
                if(vertexArrays.has(spec)){bindVAO(vertexArrays.get(spec));return;}
                const vao=is2?gl.createVertexArray():vaoExt.createVertexArrayOES();
                if(!vao)throw Error('Vertex array allocation failed');
                vertexArrays.set(spec,vao);bindVAO(vao);
            }
            for (let i = 0; i < attributeCount; i++) {
            gl.disableVertexAttribArray(i);
            divisor(i, 0);
        } for (const [l, b, n, stride = 0, offset = 0, div = 0] of spec) {
            gl.bindBuffer(gl.ARRAY_BUFFER, b);
            gl.enableVertexAttribArray(l);
            gl.vertexAttribPointer(l, n, gl.FLOAT, false, stride, offset);
            divisor(l, div);
        }
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,spec.indices||null);
        }
        function dropTarget(t) { if (!t)
            return; free('texture', t.tex); free('rb', t.col); free('rb', t.depth); free('fb', t.fb); }
        function target(samples = 0, withDepth = false) { const t = { fb: make('fb') }; gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb); try {
            if (samples) {
                t.col = make('rb');
                gl.bindRenderbuffer(gl.RENDERBUFFER, t.col);
                gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.RGBA8, width, height);
                gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, t.col);
            }
            else {
                t.tex = make('texture');
                gl.bindTexture(gl.TEXTURE_2D, t.tex);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t.tex, 0);
            }
            if (withDepth) {
                t.depth = make('rb');
                gl.bindRenderbuffer(gl.RENDERBUFFER, t.depth);
                if (samples)
                    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.DEPTH_COMPONENT16, width, height);
                else
                    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
                gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, t.depth);
            }
            const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER), error = gl.getError();
            if (status !== gl.FRAMEBUFFER_COMPLETE || error !== gl.NO_ERROR)
                throw Error('Framebuffer: ' + status + ' / GL ' + error);
            return t;
        }
        catch (e) {
            dropTarget(t);
            throw e;
        } }
        try {
            const pSky = program('sky', GLSL.quad, GLSL.sky), pGround = program('ground', GLSL.groundVertex, GLSL.groundFragment), pBlade = program('blades', GLSL.bladeVertex, GLSL.bladeFragment), pPost = program('optics', GLSL.quad, GLSL.post), pRiver = program('river', GLSL.riverVertex, GLSL.riverFragment), pPresent = program('present', GLSL.quad, GLSL.present), pGlass = program('glass', GLSL.glassVertex, GLSL.glassFragment);
            const q = buffer(new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1])), quad = [[0, q, 2]], g = geometry();
            const ground = [[0, buffer(new Float32Array([-220, -3.3, 25, 220, -3.3, 25, -220, -3.3, -230, -220, -3.3, -230, 220, -3.3, 25, 220, -3.3, -230])), 3]];
            const blades = [[0, buffer(g.position), 2], [1, buffer(g.offset), 4, 0, 0, 1], [2, buffer(g.shape), 4, 0, 0, 1], [3, buffer(g.flex), 4, 0, 0, 1]];
            blades.indices=buffer(g.indices,gl.ELEMENT_ARRAY_BUFFER);
            const riverBuffer = buffer(new Float32Array(5)), riverSpec = [[0, riverBuffer, 2, 20, 0], [1, riverBuffer, 3, 20, 8]];
            let riverN = 0, themeBlue=body.classList.contains('mx-blue')?1:0, themeAt=performance.now();
            let samples = [];
            if (is2) {
                try {
                    const c = [...gl.getInternalformatParameter(gl.RENDERBUFFER, gl.RGBA8, gl.SAMPLES)], d = [...gl.getInternalformatParameter(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, gl.SAMPLES)];
                    samples = c.filter(n => n > 0 && n <= 2 && d.includes(n)).sort((a, b) => b - a);
                }
                catch (e) {
                    attempt(kind, 'sample-query', String(e));
                }
            }
            samples.push(0);
            const vpLimit = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
            const renderLimit = Math.min(4096, gl.getParameter(gl.MAX_TEXTURE_SIZE), gl.getParameter(gl.MAX_RENDERBUFFER_SIZE), vpLimit[0], vpLimit[1]);
            let resizeKey='';
            function resize() {
                if (disposed || lost)
                    return;
                const W = Math.max(1, innerWidth), H = Math.max(1, innerHeight), limit=renderLimit;
                const key=[W,H,devicePixelRatio||1,quality].join('/');
                if(key===resizeKey)return;
                const budget=quality==='eco'?(W<761?800000:1250000):(W<761?1400000:2400000);
                let ratio = Math.min(quality === 'eco' ? .9 : Math.max(devicePixelRatio || 1,1),1.4,limit/W,limit/H,Math.sqrt(budget/(W*H)));
                let ok = false;
                for (const factor of [1, .75, .5]) {
                    dropTarget(sceneTarget);
                    dropTarget(envTarget);
                    dropTarget(multiTarget);
                    sceneTarget = envTarget = multiTarget = null;
                    width = Math.max(1, Math.floor(W * ratio * factor));
                    height = Math.max(1, Math.floor(H * ratio * factor));
                    try {
                        sceneTarget = target(0, true);
                        envTarget = target();
                        sampleCount = 0;
                        for (const n of (quality==='eco'?[0]:samples)) {
                            if (!n)
                                break;
                            try {
                                multiTarget = target(n, true);
                                sampleCount = n;
                                break;
                            }
                            catch (e) {
                                attempt(kind, 'msaa-' + n, String(e));
                            }
                        }
                        ok = true;
                        break;
                    }
                    catch (e) {
                        attempt(kind, 'target-' + width + 'x' + height, String(e));
                    }
                }
                if (!ok)
                    throw Error('No complete render target fits GPU limits');
                candidate.width = width;
                candidate.height = height;
                gl.bindFramebuffer(gl.FRAMEBUFFER, null);
                report.renderSize = [width, height];
                report.samples = sampleCount;
                report.antialiasing = sampleCount ? 'MSAA ' + sampleCount + '×' : 'supersampling + depth optics';
                firstFrame = true;
                resizeKey=key;
                report.targetAllocations=(report.targetAllocations||0)+1;
            }
            const use = (p, spec = quad) => { gl.useProgram(p.p); attributes(spec); }, f = (p, n, v) => gl.uniform1f(p.u(n), v), v2 = (p, n, a, b) => gl.uniform2f(p.u(n), a, b), v3 = (p, n, v) => gl.uniform3fv(p.u(n), v);
            function sampler(p, tex) { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(p.u('scene'), 0); }
            function updateRiver(a) { if (!a || disposed)
                return; gl.bindBuffer(gl.ARRAY_BUFFER, riverBuffer); gl.bufferData(gl.ARRAY_BUFFER, a, gl.STATIC_DRAW); riverN = a.length / 5; report.riverVertices = riverN; }
            function render(u, skins) {
                const themeNow=performance.now(),themeDt=Math.min(.05,(themeNow-themeAt)/1000);themeAt=themeNow;
                themeBlue=lerp(themeBlue,body.classList.contains('mx-blue')?1:0,1-Math.exp(-themeDt*5));
                if (lost || disposed)
                    return;
                gl.viewport(0, 0, width, height);
                gl.bindFramebuffer(gl.FRAMEBUFFER, (multiTarget || sceneTarget).fb);
                gl.disable(gl.BLEND);
                gl.disable(gl.CULL_FACE);
                gl.enable(gl.DEPTH_TEST);
                gl.depthMask(true);
                gl.clearColor(0, 0, 0, 1);
                gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
                gl.disable(gl.DEPTH_TEST);
                gl.depthMask(false);
                use(pSky);
                v2(pSky, 'resolution', width, height);
                v2(pSky, 'sun', ...u.sun);
                f(pSky, 'time', u.time);
                f(pSky, 'rise', u.rise);
                f(pSky, 'burst', u.moon);
                f(pSky, 'phase', u.phase);
                gl.drawArrays(gl.TRIANGLES, 0, 6);
                gl.enable(gl.DEPTH_TEST);
                gl.depthMask(true);
                use(pGround, ground);
                gl.uniformMatrix4fv(pGround.u('vp'), false, u.vp);
                v3(pGround, 'camera', u.camera);
                v2(pGround, 'resolution', width, height);
                v2(pGround, 'sun', ...u.sun);
                f(pGround, 'time', u.time);
                f(pGround, 'rise', u.rise);
                gl.drawArrays(gl.TRIANGLES, 0, 6);
                use(pBlade, blades);
                gl.uniformMatrix4fv(pBlade.u('vp'), false, u.vp);
                v3(pBlade, 'camera', u.camera);
                v3(pBlade, 'light', u.light);
                f(pBlade, 'time', u.time);
                f(pBlade, 'travel', u.travel || 0);
                f(pBlade, 'part', u.part || 0);
                f(pBlade, 'partDir', u.partDir || 0);
                const brush=window.NocturneLab;
                v2(pBlade,'cursorUV',(brush?.pointer.grassX??innerWidth/2)/innerWidth,1-(brush?.pointer.grassY??innerHeight/2)/innerHeight);
                f(pBlade,'cursorEnergy',brush?.flags.grassPointer?brush.pointer.grassPower||0:0);
                v2(pBlade,'resolution',width,height);
                v2(pBlade,'titleUV',titleGlow.x,titleGlow.y);
                f(pBlade,'titlePower',titleGlow.power);
                f(pBlade, 'rise', u.rise);
                v3(pBlade, 'lantern', u.lantern);
                f(pBlade, 'lanternPower', u.lanternPower);
                f(pBlade, 'windBoost', u.windBoost);
                f(pBlade, 'windDir', u.windDir || 0);
                f(pBlade, 'surge', u.surge || 0);
                f(pBlade, 'surgeR', u.surgeR || 0);
                f(pBlade, 'flare', u.flare || 0);
                if (is2)
                    gl.drawElementsInstanced(gl.TRIANGLES, g.indices.length, gl.UNSIGNED_SHORT, 0, g.count);
                else
                    inst.drawElementsInstancedANGLE(gl.TRIANGLES, g.indices.length, gl.UNSIGNED_SHORT, 0, g.count);
                if (multiTarget) {
                    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, multiTarget.fb);
                    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, sceneTarget.fb);
                    gl.blitFramebuffer(0, 0, width, height, 0, 0, width, height, gl.COLOR_BUFFER_BIT, gl.NEAREST);
                }
                gl.bindFramebuffer(gl.FRAMEBUFFER, envTarget.fb);
                gl.disable(gl.DEPTH_TEST);
                gl.depthMask(false);
                use(pPost);
                sampler(pPost, sceneTarget.tex);
                v2(pPost, 'resolution', width, height);
                gl.uniform3f(pPost.u('seam'), u.seam?u.seam[0]:0, u.seam?u.seam[1]:.05, u.seam?u.seam[2]:0);
                f(pPost, 'quality', 1);
                gl.drawArrays(gl.TRIANGLES, 0, 6);
                if (!state.captureClean && riverN && u.scroll < riverEnd + innerHeight) {
                    gl.enable(gl.BLEND);
                    gl.blendFunc(gl.ONE, gl.ONE);
                    use(pRiver, riverSpec);
                    v2(pRiver, 'viewport', innerWidth, innerHeight);
                    f(pRiver, 'scroll', u.scroll);f(pRiver,'caseShift',window.NocturneLab?.caseShift||0);
                    f(pRiver, 'time', u.time);
                    f(pRiver, 'start', riverStart);
                    f(pRiver, 'end', riverEnd);
                    f(pRiver, 'head', u.head);
                    f(pRiver, 'reveal', u.riverReveal);
                    f(pRiver, 'burst', u.burst);
                    gl.drawArrays(gl.TRIANGLES, 0, riverN);
                    gl.disable(gl.BLEND);
                }
                gl.bindFramebuffer(gl.FRAMEBUFFER, null);
                use(pPresent);
                sampler(pPresent, envTarget.tex);v2(pPresent,'resolution',innerWidth,innerHeight);f(pPresent,'caseBlur',window.NocturneLab?.caseProgress||0);
                f(pPresent,'themeBlue',themeBlue);
                gl.drawArrays(gl.TRIANGLES, 0, 6);
                report.visibleGlass = 0;
                if (skins.length && !state.captureClean && !body.classList.contains('no-glass')) {
                    gl.enable(gl.BLEND);
                    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
                    use(pGlass);
                    sampler(pGlass, envTarget.tex);
                    v2(pGlass, 'resolution', width, height);
                    v2(pGlass, 'viewport', innerWidth, innerHeight);
                    f(pGlass, 'time', u.time);
                    f(pGlass,'themeBlue',themeBlue);f(pGlass,'caseShade',window.NocturneLab?.caseProgress||0);
                    for (const s of [...skins].sort((a,b)=>Number(!!a.el.closest('.mx-expanded'))-Number(!!b.el.closest('.mx-expanded')))) {
                        if (s.alpha <= 0 || s.rect.bottom < -80 || s.rect.top > innerHeight + 80)
                            continue;
                        const pad = 18;
                        gl.uniform2fv(pGlass.u('corners[0]'), skinCorners(s, pad));
                        v2(pGlass, 'dimensions', s.width, s.height);
                        v2(pGlass, 'pointer', s.x * s.width * .5, s.y * s.height * .5);
                        v2(pGlass, 'clickPoint', s.click[0], s.click[1]);
                        f(pGlass, 'hover', s.hover);
                        f(pGlass, 'press', 1 - s.scale);
                        f(pGlass, 'age', u.time - s.clickTime);
                        f(pGlass, 'radius', s.radius);
                        // All glass is composited after the world pass; dim background skins here too.
                        const caseP=window.NocturneLab?.caseProgress||0;
                        f(pGlass, 'opacity', s.alpha*(s.el.closest('.mx-expanded')?1:Math.pow(1-caseP,3)));
                        const expanded=s.el.closest('.mx-expanded');
                        f(pGlass,'blueSheet',expanded?themeBlue*Number(expanded.dataset.mxProgress||0):0);
                        f(pGlass,'unfold',expanded?(expanded.classList.contains('mx-expand-left')?-1:1)*Number(expanded.dataset.mxProgress||0):0);
                        f(pGlass, 'apertureEntry', s.apertureEntry ?? 1);
                        f(pGlass, 'apertureExit', s.apertureExit ?? 0);
                        f(pGlass, 'padding', pad);
                        f(pGlass, 'flow', s.flow ?? 0);
                        f(pGlass, 'lux', s.lux ?? 0);
                        f(pGlass, 'returnBlur', Math.max(window.NocturneR14?.returnBlur?.(s.el)||0,Number(s.anchor.dataset.motionBlur||0),s.el.closest('.mx-expanded')?0:(window.NocturneLab?.caseProgress||0)*4));
                        gl.uniform4fv(pGlass.u('radii'), s.radii || cornerDefault(s.radius));
                        v3(pGlass, 'tint', tintRgb(s.tint));
                        gl.drawArrays(gl.TRIANGLES, 0, 6);
                        report.visibleGlass++;
                    }
                    gl.disable(gl.BLEND);
                }
                gl.depthMask(true);
                if (firstFrame) {
                    const error = gl.getError();
                    if (error !== gl.NO_ERROR)
                        throw Error('First frame GL error ' + error);
                    firstFrame = false;
                    setMode(is2 ? 'webgl2' : 'webgl1', 'WebGL ' + (is2 ? '2' : '1') + ' / shared shaders / ' + report.antialiasing);
                }
                report.frames++;
                if (state.captureCallback) {
                    const done = state.captureCallback;
                    state.captureCallback = null;
                    done(candidate.toDataURL('image/png'));
                }
            }
            candidate.addEventListener('webglcontextlost', e => { e.preventDefault(); lost = true; attempt(kind, 'context-lost', 'WebGL context lost'); if (canvas === candidate) {
                engine = initCanvas2D();
                layoutDirty = true;
                window.portfolioWake?.();
            } });
            candidate.addEventListener('webglcontextrestored', () => { if (disposed)
                return; dispose(); restartRenderer(); }, { once: true });
            resize();
            installCanvas(candidate);
            return { render, resize, updateRiver, dispose, kind };
        }
        catch (e) {
            attempt(kind, 'initialization', String(e));
            dispose();
            gl.getExtension('WEBGL_lose_context')?.loseContext();
            return null;
        }
    }
    function restartRenderer(preferred = 'auto') {
        const old = engine;
        engine = null;
        if (old)
            old.dispose();
        body.classList.remove('gpu-ready', 'compat-ready');
        const modes = preferred === 'webgl1' ? ['webgl'] : preferred === 'canvas2d' ? [] : ['webgl2', 'webgl'];
        for (const type of modes) {
            engine = initGPU(type);
            if (engine)
                break;
        }
        if (!engine)
            engine = initCanvas2D();
        if (!engine) {
            setMode('poster', 'Matched poster / Canvas unavailable');
        }
        layoutDirty = true;
        window.portfolioWake?.();
        return engine;
    }
    // No-WebGL mode: a clean capture of this SAME scene, not a second art direction.
    // The backdrop is a poster (minor 2D warp); the energy stream is evaluated on CPU.
    // DOM hover / spring / dialogs are retained. This mode does not claim real 3D grass or GPU glass.
    function initCanvas2D() {
        const candidate = newCanvas();
        let ctx;
        try {
            ctx = candidate.getContext('2d', { alpha: false, colorSpace: 'srgb' });
        }
        catch (e) {
            attempt('canvas2d', 'context', String(e));
        }
        if (!ctx) {
            attempt('canvas2d', 'context', 'Canvas 2D unavailable');
            return null;
        }
        const poster = $('#environmentPoster'), base = document.createElement('canvas'), river = document.createElement('canvas');
        const bg = base.getContext('2d', { alpha: false }), flow = river.getContext('2d');
        if (!bg || !flow)
            return null;
        let W = 1, H = 1, ratio = 1, flowScale = .55, field = null, dirty = true, disposed = false, last = -100;
        report.instances = 0;
        report.riverVertices = 0;
        const resize = () => { W = Math.max(1, innerWidth); H = Math.max(1, innerHeight); ratio = Math.min(quality==='eco'?.85:Math.max(devicePixelRatio||1,1),1.25,Math.sqrt(1800000/(W*H)),4096/W,4096/H); candidate.width = base.width = Math.max(1, Math.round(W * ratio)); candidate.height = base.height = Math.max(1, Math.round(H * ratio)); flowScale = W < 761 ? .7 : .5; river.width = Math.max(1, Math.ceil(W * flowScale)); river.height = Math.max(1, Math.ceil(H * flowScale));  dirty = true; report.renderSize = [candidate.width, candidate.height]; report.samples = 0; report.antialiasing = 'bounded poster buffer / vector light ribbon'; report.poster = 'Same R6 WebGL scene, clean environment capture'; };
        function paintBase() { bg.fillStyle = '#050607'; bg.fillRect(0, 0, base.width, base.height); if (!poster?.complete || !poster.naturalWidth)
            return false; const iw = poster.naturalWidth, ih = poster.naturalHeight, sw = Math.min(iw, ih * W / H), sx = (iw - sw) / 2; bg.imageSmoothingEnabled = true; bg.imageSmoothingQuality = 'high'; bg.drawImage(poster, sx, 0, sw, ih, 0, 0, base.width, base.height); dirty = false; return true; }
        function paintRiver(u) {
            flow.setTransform(flowScale,0,0,flowScale,0,0);
            flow.clearRect(0,0,W,H);
            if(!riverPoints.length||u.scroll>riverEnd+H||u.riverReveal<=0)return;
            // A bounded vector ribbon: six soft strokes rather than thousands
            // of CPU-noise evaluations per scanline. No pixel readback.
            const start=Math.max(riverStart,u.scroll-60),end=Math.min(riverEnd,u.scroll+H+60,u.head+12);
            if(end<=start)return;
            const path=new Path2D();let seg=0,first=true;
            for(let y=start;y<=end;y+=8){
                while(seg<riverPoints.length-2&&y>riverPoints[seg+1].y)seg++;
                const a=riverPoints[seg],b=riverPoints[seg+1],v=clamp((y-a.y)/Math.max(1,b.y-a.y));
                const x=lerp(a.x,b.x,v*v*(3-2*v));
                if(first){path.moveTo(x,y-u.scroll);first=false;}else path.lineTo(x,y-u.scroll);
            }
            const grad=flow.createLinearGradient(0,start-u.scroll,0,end-u.scroll);
            grad.addColorStop(0,'rgba(180,218,232,0)');grad.addColorStop(.12,'rgba(165,207,229,.25)');
            grad.addColorStop(.62,'rgba(226,218,237,.39)');grad.addColorStop(.88,'rgba(181,213,235,.22)');grad.addColorStop(1,'rgba(185,211,229,0)');
            flow.lineCap='round';flow.lineJoin='round';flow.strokeStyle=grad;
            for(const [width,alpha] of [[66,.14],[38,.17],[21,.26],[11,.4],[4.5,.6],[1.2,.75]]){
                flow.lineWidth=width;flow.globalAlpha=alpha*u.riverReveal;flow.stroke(path);
            }
            flow.setLineDash([38,135,8,58]);flow.lineDashOffset=-u.time*43;
            flow.lineWidth=1.6;flow.globalAlpha=.64*u.riverReveal;flow.stroke(path);
            flow.setLineDash([]);flow.globalAlpha=1;
            flow.globalCompositeOperation='destination-out';
            for(const stop of riverStops){
                const y=stop.center-u.scroll,spread=stop.height*.5+100;
                if(y+spread<0||y-spread>H)continue;
                const fade=flow.createLinearGradient(0,y-spread,0,y+spread);
                fade.addColorStop(0,'#0000');fade.addColorStop(.22,'#0008');fade.addColorStop(.42,'#000f');fade.addColorStop(.58,'#000f');fade.addColorStop(.78,'#0008');fade.addColorStop(1,'#0000');
                flow.fillStyle=fade;flow.fillRect(0,y-spread,W,spread*2);
            }
            flow.globalCompositeOperation='source-over';
        }
        function render(u) {
            if (disposed)
                return;
            if (dirty && !paintBase())
                return;
            const fixed = state.forceTime != null;
            if (!fixed && !reduced && u.time - last < 1 / 30)
                return;
            last = u.time;
            ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
            ctx.globalCompositeOperation = 'source-over';
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            const zoom=reduced?0:Math.min(.025,Math.abs(W8.dir)*.02)+.0025*(1+Math.sin(u.travel*.25));
            ctx.drawImage(base,-W*zoom/2,-H*zoom*.36,W*(1+zoom),H*(1+zoom));
            // Coherent subpixel sway on the baked foreground, not a substitute for 3D geometry.
            if (!reduced && !fixed) {
                for (let y = H * .29; y < H * .67; y += 12) {
                    const h = Math.min(12, H - y), weight = Math.sin((y / H - .29) / .38 * Math.PI), dx = Math.sin((u.time - 16) * .45 + y / H * 8) * weight * 1.0;
                    ctx.drawImage(base, 0, y * ratio, base.width, h * ratio, dx, y, W, h + .35);
                }
            }
            const flash=window.NocturneR14?.moonPower||0;
            if(flash>.001&&!state.captureClean){
                ctx.globalCompositeOperation='screen';ctx.globalAlpha=flash*.62;
                ctx.drawImage(base,0,0,W,H);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
            }
            if (!state.captureClean) {
                paintRiver(u);
                ctx.globalCompositeOperation = 'lighter';
                ctx.drawImage(river, 0, 0, W, H);
                ctx.globalCompositeOperation = 'source-over';
            }
            if (report.mode !== 'canvas2d')
                setMode('canvas2d', 'Canvas 2D / matched scene poster + vector light ribbon');
            report.frames++;
            report.visibleGlass = 0;
            if (state.captureCallback) {
                const fn = state.captureCallback;
                state.captureCallback = null;
                fn(candidate.toDataURL('image/png'));
            }
        }
        const loaded = () => { dirty = true; window.portfolioWake?.(); };
        poster?.addEventListener('load', loaded);
        resize();
        installCanvas(candidate);
        return { kind: 'canvas2d', resize, render, updateRiver() { }, dispose() { disposed = true; poster?.removeEventListener('load', loaded); base.width = base.height = river.width = river.height = 1; } };
    }
    function openGraphics() { const names = { webgl2: 'Live 3D scene · WebGL 2', webgl1: 'Live 3D scene · WebGL 1', canvas2d: 'Compatible 2D mode', poster: 'Static poster' }; const attempts = report.attempts.map(a => `<p class="graphics-attempt"><b>${escape(a.type)} / ${escape(a.stage)}</b><br>${escape(a.reason)}</p>`).join(''); const isFallback = report.mode === 'canvas2d' || report.mode === 'poster'; window.portfolioOpenDialog?.(`<div class="eyebrow">NOCTURNE R14 / GRAPHICS</div><h2 id="dialogTitle">${names[report.mode] || 'Initializing'}</h2><p>${isFallback ? 'WebGL could not start here. The background uses a frame of the same scene, with a lighter animated stream and interface. This fallback does not simulate 3D grass or GPU glass refraction.' : 'A live scene with procedural geometry, light, depth of field and a flowing light ribbon. WebGL 1 and WebGL 2 share the same materials.'}</p><p style="margin-top:18px">Buffer: ${report.renderSize.join(' × ')}<br>Antialiasing: ${escape(report.antialiasing || '—')}<br>Colour output: sRGB<br>Frames: ${report.frames}</p>${attempts ? '<h3>Startup attempts</h3>' + attempts : ''}<div class="case-actions"><button id="retryGraphics">Retry 3D ↗</button><button id="saveGraphicsReport">Save diagnostics</button><button data-close>Back</button></div>`, 'GRAPHICS / R14'); $('#retryGraphics')?.addEventListener('click', () => { window.portfolioCloseDialog?.(); restartRenderer(); }); $('#saveGraphicsReport')?.addEventListener('click', () => { const blob = new Blob([JSON.stringify(state.diagnostics(), null, 2)], { type: 'application/json' }), url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = 'nocturne-graphics.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }); }
    const cornerCache = new Map();
    function cornerDefault(r) {
        let v = cornerCache.get(r);
        if (!v) { v = new Float32Array([r, r, r, r]); cornerCache.set(r, v); }
        return v;
    }
    // One cached parse per tint; the rim colour is authored in CSS.
    const tintCache = new Map(), tintFallback = new Float32Array([.81, .90, 1]);
    function tintRgb(css) {
        if (!css) return tintFallback;
        const key = css.trim();
        let v = tintCache.get(key);
        if (v) return v;
        const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(key);
        if (!m) { tintCache.set(key, tintFallback); return tintFallback; }
        const h = m[1].length === 3 ? [...m[1]].map(c => c + c).join('') : m[1];
        v = new Float32Array([parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255]);
        tintCache.set(key, v);
        return v;
    }
    // CSS transform and the shader plane use exactly the same projected corners.
    function skinCorners(s, pad) {
        const w = s.width, h = s.height, cx = s.rect.left + s.rect.width * .5, cy = s.rect.top + s.rect.height * .5;
        const rad = Math.PI / 180, rx = s.rx * rad, ry = s.ry * rad, rz = s.rz * rad, out = [];
        const parentScale = s.rect.width / w;
        for (const [x, y] of [[-w / 2 - pad, -h / 2 - pad], [w / 2 + pad, -h / 2 - pad], [-w / 2 - pad, h / 2 + pad], [w / 2 + pad, h / 2 + pad]]) {
            let xx = x * s.scale * (s.bounce || 1), yy = y * s.scale * (s.bounce || 1), z = 0;
            const xx0 = xx;
            xx = xx * Math.cos(rz) - yy * Math.sin(rz);
            yy = xx0 * Math.sin(rz) + yy * Math.cos(rz);
            const x1 = xx;
            xx = xx * Math.cos(ry);
            z = -x1 * Math.sin(ry);
            const y1 = yy;
            yy = yy * Math.cos(rx) - z * Math.sin(rx);
            z = y1 * Math.sin(rx) + z * Math.cos(rx);
            const p = 1100 / (1100 - z);
            out.push(cx + (xx * p + s.tx) * parentScale, cy + (yy * p + s.ty) * parentScale);
        }
        return new Float32Array(out);
    }
    function registerSurface(el, anchor = el, kind = 'career') {
        if(!el)return null;
        if(surfaces.has(el))return surfaces.get(el);
        const s = { el, anchor, kind, x: 0, y: 0, dx: 0, dy: 0, tx: 0, ty: 0, rx: 0, ry: 0, rz: 0, hover: 0, hoverTo: 0, pressed: false, scale: 1, sv: 0, click: [0, 0], clickTime: -100, rect: { top: 0, bottom: 0, left: 0, width: 1, height: 1 }, width: 1, height: 1, radius: 32, alpha: 1 };
        surfaces.set(el, s);
        el.addEventListener('pointerenter', e => { if (e.pointerType !== 'touch')
            s.hoverTo = 1; window.portfolioWake?.(); });
        el.addEventListener('pointermove', e => { if (e.pointerType === 'touch')
            return; s.hoverTo = 1; const r = el.getBoundingClientRect(); s.dx = clamp((e.clientX - r.left) / r.width * 2 - 1, -1, 1); s.dy = clamp((e.clientY - r.top) / r.height * 2 - 1, -1, 1); window.portfolioWake?.(); }, { passive: true });
        el.addEventListener('pointerleave', () => { s.hoverTo = 0; s.dx = 0; s.dy = 0; s.pressed = false; window.portfolioWake?.(); });
        el.addEventListener('pointerdown', e => { if (e.button !== 0)
            return; s.pressed = true; const r = el.getBoundingClientRect(); s.click = [(e.clientX - r.left - r.width / 2), (e.clientY - r.top - r.height / 2)]; s.clickTime = clock; window.portfolioWake?.(); });
        for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'])
            el.addEventListener(type, () => { s.pressed = false; window.portfolioWake?.(); });
        return s;
    }
    let railPointer=null;
    // Delegated tracking survives inert carousel cards becoming active again.
    document.addEventListener('pointermove',e=>{
      if(e.pointerType==='touch')return;
      railPointer={x:e.clientX,y:e.clientY};
      const card=e.target.closest?.('.media-card');const el=card?.querySelector('.card-glass');if(!el||el.closest('[inert]'))return;
      const s=surfaces.get(el)||registerSurface(el,el,'media'),r=el.getBoundingClientRect();
      s.hoverTo=1;s.dx=clamp((e.clientX-r.left)/r.width*2-1,-1,1);s.dy=clamp((e.clientY-r.top)/r.height*2-1,-1,1);
      window.portfolioWake?.();
    },{capture:true,passive:true});
    let pointerHeld = false;
    addEventListener('pointerdown', e => { if (e.button === 0) pointerHeld = true; }, true);
    for (const type of ['pointerup', 'pointercancel'])
        addEventListener(type, () => { pointerHeld = false; }, true);
    addEventListener('blur', () => { pointerHeld = false; });
    // A click that opens a modal steals the pointer sequence: without this the
    // card keeps its pressed tilt for good and the perspective never returns.
    function releaseSurfaces(all = false) {
        let changed = false;
        for (const [el, s] of surfaces) {
            if (!s.pressed && !s.hoverTo && !s.dx && !s.dy) continue;
            if (!all && el.matches?.(':hover')) { s.pressed = false; changed = true; continue; }
            s.pressed = false; s.hoverTo = 0; s.dx = 0; s.dy = 0; changed = true;
        }
        if (changed) window.portfolioWake?.();
    }
    for (const type of ['pointerup', 'pointercancel', 'blur'])
        window.addEventListener(type, () => releaseSurfaces(false), true);
    document.addEventListener('visibilitychange', () => releaseSurfaces(true));
    $('#dialog')?.addEventListener('close', () => releaseSurfaces(true));
    const dialogNode = $('#dialog');
    if (dialogNode && typeof MutationObserver === 'function')
        new MutationObserver(() => { if (dialogNode.open) releaseSurfaces(true); }).observe(dialogNode, { attributes: true, attributeFilter: ['open'] });
    rows.forEach((r, i) => { const summary = $('summary', r), el = $('.career-bubble', r); const s = registerSurface(el, summary); s.index = i; summary.addEventListener('click', e => { e.preventDefault(); if (summary.dataset.opening)
        return; summary.dataset.opening = '1'; showCompany(r.id,summary); delete summary.dataset.opening; }); });
    // Navigation is a flat CSS glass surface; do not render a second inflated GPU skin.
    $$('.card-glass').forEach(el => registerSurface(el, el, 'media'));
    function updateSurfaces(t, dt) {
        const {innerWidth,innerHeight}=window;
        const visible=[],batch=[],modal=$('#dialog').open;
        // Read all bounds before changing transforms. Avoid read/write ping-pong.
        for(const [el,s] of surfaces){
            if(!el.isConnected){surfaces.delete(el);continue;}
            // The sheet is translucent now, so the page's own glass has to keep
            // rendering behind it; only the sheet's own surfaces are gated.
            if(!modal&&el.closest('#dialog'))continue;
            if(el.closest('[inert]'))continue;
            // Read the transformed anchor in this frame, including the story gate and focus.
            // The former hand-built box omitted ancestor transforms and summary offsets.
            const analytic=s.kind==='career'?null:s.box;
            const cached=attachedGlass&&s.kind==='career'&&!s.el.closest('.mx-expanded')?rowMetrics.get(s.el.closest('.exp')):null;
            const bounds=cached?{top:cached.top-scrollY,bottom:cached.top-scrollY+cached.height,left:cached.left,width:cached.bw,height:cached.bh}:analytic||s.anchor.getBoundingClientRect();
            if(bounds.bottom < -120||bounds.top > innerHeight+120||bounds.width<1||bounds.height<1)continue;
            // Self-healing: a pointer sequence swallowed by a modal, a rail
            // re-render or a focus change can never leave a card stuck in its
            // pressed or tilted state. Checking :hover is a style read, so it is
            // only done when something is actually held, and only now and then.
            if(s.pressed&&!pointerHeld)s.pressed=false;
            if((s.hoverTo||s.dx||s.dy)&&t-(s.hoverCheck||0)>.25){
                s.hoverCheck=t;
                const hoverRoot=s.kind==='media'?el.closest('.media-card'):el;
                if(!hoverRoot?.matches(':hover')){s.hoverTo=0;s.dx=0;s.dy=0;}
            }
            if(s.kind==='media'&&railPointer){
              const card=el.closest('.media-card'),r=card.getBoundingClientRect();
              const on=!modal&&card.classList.contains('is-center')&&railPointer.x>=r.left&&railPointer.x<=r.right&&railPointer.y>=r.top&&railPointer.y<=r.bottom;
              s.hoverTo=on?1:0;s.dx=on?clamp((railPointer.x-r.left)/r.width*2-1,-1,1):0;s.dy=on?clamp((railPointer.y-r.top)/r.height*2-1,-1,1):0;
            }
            const opacityRow=s.kind==='career'?s.el.closest('.exp'):null;
            batch.push([s,bounds,cached?cached.bw:analytic?s.boxW:s.el.offsetWidth,cached?cached.bh:analytic?s.boxH:s.el.offsetHeight,opacityRow&&!attachedGlass?Number(getComputedStyle(opacityRow).opacity):1]);
        }
        for(const [s,bounds,width,height,rowOpacity] of batch){
            const expandedRow=s.el.closest('.mx-expanded');
            s.rect=bounds;s.width=expandedRow?Number(expandedRow.dataset.mxLocalWidth||width):width;s.height=expandedRow?Number(expandedRow.dataset.mxLocalHeight||height):height;
            if(window.NocturneLab?.inlineOpen){s.hoverTo=0;s.dx=0;s.dy=0;s.pressed=false;}
            // The CSS `scale` property composes on top of the transform; the GPU
            // silhouette has to follow it or the merge bounce tears apart.
            s.bounce=window.NocturneR14?.cardScale?.(s.el)??1;
            const landingRow=s.el.closest('.exp');
            if(landingRow?._landingAt!==undefined){
                const phase=reduced?1:clamp((performance.now()-landingRow._landingAt)/1250);
                s.bounce*=1-.052*Math.pow(Math.sin(Math.PI*phase),2)*Math.exp(-3*phase);
                if(phase===1)delete landingRow._landingAt;
            }
            s.el.style.scale=s.bounce===1?'':s.bounce.toFixed(5);
            s.x=lerp(s.x,s.dx,1-Math.exp(-dt*9));s.y=lerp(s.y,s.dy,1-Math.exp(-dt*9));
            s.hover=lerp(s.hover,reduced?0:s.hoverTo,1-Math.exp(-dt*8));
            // Analytic spring survives slow frames without an unstable scale kick.
            const ss={value:s.scale,velocity:s.sv};
            window.NocturneMotion.spring(ss,reduced?1:(s.pressed?.985:1+s.hover*.007),17,dt);
            s.scale=ss.value;s.sv=ss.velocity;
            const gentle=s.kind==='detail'?.58:1;
            s.rx=reduced?0:-s.y*s.hover*5*gentle;
            // Entrance rotation is authored on the anchor so the DOM card and
            // the GPU silhouette turn as one object.
            const inYaw=reduced?0:Number(s.anchor.style.getPropertyValue('--in-yaw')||0);
            const inRot=reduced?0:Number(s.anchor.style.getPropertyValue('--in-rot')||0);
            s.ry=(reduced?0:s.x*s.hover*6*gentle)+(reduced?0:s.baseRy||0)+inYaw;
            s.rz=(reduced?0:s.x*s.hover*.45*gentle)+(reduced?0:s.baseRz||0)+inRot;
            s.tx=reduced?0:s.x*s.hover*1.5;
            s.ty=reduced?0:-s.hover*2.5;
            const openRow=s.el.closest('.mx-expanded');
            if(openRow){const p=Number(openRow.dataset.mxProgress||0);s.rx*=1-p;s.ry*=1-p;s.rz*=1-p;s.tx*=1-p;s.ty*=1-p;s.scale=lerp(s.scale,1,p);openRow.style.setProperty('--mx-rx',s.rx+'deg');openRow.style.setProperty('--mx-ry',s.ry+'deg');openRow.style.setProperty('--mx-rz',s.rz+'deg');}
            const returnedRow=s.el.closest('.exp');
            if(returnedRow&&(returnedRow.classList.contains('mx-return-focus')||(!openRow&&returnedRow._hoverReleaseAt!==undefined))){
                const elapsed=returnedRow.classList.contains('mx-return-focus')?0:clamp((performance.now()-returnedRow._hoverReleaseAt)/1800);
                const gain=elapsed*elapsed*elapsed*(10+elapsed*(-15+6*elapsed));
                s.rx*=gain;s.ry*=gain;s.rz*=gain;s.tx*=gain;s.ty*=gain;s.scale=lerp(1,s.scale,gain);
                if(elapsed===1)delete returnedRow._hoverReleaseAt;
            }
            const st=s.el.style;
            st.setProperty('--rx',s.rx.toFixed(3)+'deg');st.setProperty('--ry',s.ry.toFixed(3)+'deg');st.setProperty('--rz',s.rz.toFixed(3)+'deg');
            st.setProperty('--px',s.tx.toFixed(2)+'px');st.setProperty('--py',s.ty.toFixed(2)+'px');st.setProperty('--ps',s.scale.toFixed(4));
            st.setProperty('--hover',(.16+s.hover*.74).toFixed(3));st.setProperty('--light-x',((s.x*.5+.5)*100).toFixed(2)+'%');st.setProperty('--light-y',((s.y*.5+.5)*100).toFixed(2)+'%');
            if(s.kind!=='career')continue;
            s.radius=innerWidth<=760?34:46;
            // Hand-varied silhouette and a slight yaw of the inner edge toward
            // the spine: a column of identical rectangles reads as a table.
            const shapeKey=s.radius+'/'+(s.index||0);
            if(s.shapeKey!==shapeKey){
                s.shapeKey=shapeKey;
                const i=s.index||0,side=i%2?1:-1;
                const m=[1+Math.sin(i*2.13)*.20,1+Math.sin(i*1.61+2.2)*.17,1+Math.sin(i*2.47+4.1)*.19,1+Math.sin(i*1.29+5.6)*.16];
                s.radii=new Float32Array(m.map(v=>s.radius*Math.max(.55,v)));
                s.el.style.borderRadius=[...s.radii].map(v=>v.toFixed(1)+'px').join(' ');
                s.baseRy=side*3.1;s.baseRz=side*-.85;
            }
            // The glass follows the DOM card exactly: the story gate and the
            // sheet merge dissolve both at once, never one without the other.
            const merge=Number(s.el.style.getPropertyValue('--merge')||1);
            s.alpha=Number(s.anchor.dataset.visibility??1)*(reduced?1:clamp(window.NocturneR14?.storyGate??1))*clamp(merge);
            s.flow=Number(s.el.style.getPropertyValue('--flow')||0);
            s.lux=Number(s.el.style.getPropertyValue('--lux')||0)+Number(s.anchor.dataset.focus||0)*.12;
            const row=s.el.closest('.exp');s.alpha*=rowOpacity;
            if(row?.classList.contains('mx-expanded'))s.alpha=lerp(s.alpha,1,Number(row.dataset.mxProgress||0));
            s.tint=s.el.style.getPropertyValue('--nrg')||'#cfe6ff';
            s.apertureEntry=reduced?1:Number(s.anchor.dataset.arcEntry??1);s.apertureExit=reduced?0:Number(s.anchor.dataset.arcExit??0);
            if(s.el.closest('.mx-expanded')){const p=Number(s.el.closest('.mx-expanded').dataset.mxProgress||0);s.apertureEntry=lerp(s.apertureEntry,1,p);s.apertureExit*=1-p;}
            if(s.anchor._returnPose){const from=s.anchor._returnPose,k=s.anchor._returnBlend||0;s.alpha=lerp(from.gpuAlpha,s.alpha,k);s.apertureEntry=lerp(from.entry,s.apertureEntry,k);s.apertureExit=lerp(from.exit,s.apertureExit,k);}
            if(!attachedGlass)visible.push(s);
        }
        return visible;
    }
    function layout() {
        // Reparenting a case must never turn its fixed viewport box into a river knot.
        if(document.querySelector('.exp.mx-expanded'))return;
        const documentBox=el=>{let left=0,top=0,node=el;while(node){left+=node.offsetLeft;top+=node.offsetTop;node=node.offsetParent;}return {left,top,width:el.offsetWidth,height:el.offsetHeight};};
        const W = innerWidth, H = innerHeight;
        const first = rows[0], last = rows.at(-1);
        if (!first)
            return;
        riverStops=rows.map(row=>{const b=documentBox($('summary',row));return {id:row.id,top:b.top,bottom:b.top+b.height,center:b.top+b.height*.5,height:b.height};});
        const points = [{ x: W * .5, y: H * .54 }];
        for (const row of rows) {
            const r = documentBox(row);
            const sm=$('summary',row),bub=$('.career-bubble',row);
            // Measure the row untransformed: by the time a relayout happens the
            // summary already carries the previous frame's arrival transform.
            const sb=documentBox(sm);
            // The card's static box is measured once per layout. Reading it back
            // every frame — after the same frame had written its transform —
            // forced a full style/layout pass and was what made the glass trail
            // the text and the scroll feel notched.
            rowMetrics.set(row,{top:r.top,height:r.height,summary:sm,
                left:sb.left,width:sb.width,boxH:sb.height,
                bw:bub?bub.offsetWidth:sb.width,bh:bub?bub.offsetHeight:sb.height});
            points.push({ x: W * .5 + (r.left + r.width * .5 - W * .5) * (W<=760?.9:.42), y: r.top + r.height * .50 });
        }
        const r = documentBox(last);
        points.push({ x: W * .5, y: r.top + r.height + 620 });
        riverStart = points[0].y;
        riverEnd = points.at(-1).y;
        const a = [];
        const support = 520;
        for (let j = 0; j < points.length - 1; j++) {
            const p = points[j], q = points[j + 1], dy = q.y - p.y;
            if (dy < 1)
                continue;
            const n = Math.max(16, Math.ceil(dy / 4.5));
            const at = (t, side) => { const f = t * t * (3 - 2 * t), slope = (q.x - p.x) * 6 * t * (1 - t) / dy, normal = 1 / Math.sqrt(1 + slope * slope); return [p.x + (q.x - p.x) * f + side * support, p.y + dy * t, side * support * normal, p.y + dy * t, riverStops.reduce((d,r)=>Math.min(d,Math.abs(p.y+dy*t-r.center)/Math.max(1,r.height*.5)),12)]; };
            for (let k = 0; k < n; k++) {
                const t = k / n, u = (k + 1) / n;
                for (const [v, side] of [[t, -1], [t, 1], [u, -1], [t, 1], [u, 1], [u, -1]])
                    a.push(...at(v, side));
            }
        }
        report.riverKnots=points.map(p=>({...p}));
        riverPoints = points;
        riverData = new Float32Array(a);
        engine?.updateRiver(riverData);
        report.sourceY = riverStart;
        layoutDirty = false;
    }
    function fitName() { const name = $('.name-sculpture'), parent = $('.hero-center'); if (!name || !parent)
        return; const max = parent.clientWidth; root.style.setProperty('--name-size', '100px'); const natural = name.scrollWidth; let size = Math.min(innerWidth < 761 ? 100 : Math.min(320, innerHeight * .30), 100 * max / Math.max(1, natural)); size = Math.max(28, size * .96); root.style.setProperty('--name-size', size.toFixed(2) + 'px'); report.nameFontSize = size; report.nameWidth = name.getBoundingClientRect().width; report.viewport = innerWidth; layoutDirty = true; window.NocturneMotion?.measure(); }
    let fontTimer;
    function loadFonts() { const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = 'https://fonts.googleapis.com/css2?family=Pirata+One&family=Syne:wght@500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap'; link.onload = () => { document.fonts.load('100px "Pirata One"').then(f => { if (f.length) {
        body.classList.add('webfont-ready');
        report.font = 'Pirata One / live text';
        fitName();
        window.portfolioWake?.();
    } }).catch(() => { }); }; document.head.append(link); fontTimer = setTimeout(() => { fitName(); window.portfolioWake?.(); }, 1800); }
    const titleGlow={x:.5,y:.5,power:0};
    const titleElement=$('#intro-title');
    let titleRect=null;
    state.read=()=>{if((window.NocturneFrame?.scrollY??scrollY)<innerHeight&&titleElement)titleRect=titleElement.getBoundingClientRect();};
    let introSettled=false,lastIntroScroll=-1;
    const settledIntro={rise:1,riverReveal:1,world:1,burst:0,descend:1};
    function updateIntro(t) {
        const {scrollY,innerWidth,innerHeight}=window.NocturneFrame||window;
        if(introSettled&&lastIntroScroll===scrollY)return settledIntro;
        lastIntroScroll=scrollY;
        
        const age = (t - started * .001) * 1.65;
        const skip = introSkip || reduced || scrollY > innerHeight * .22;
        const lightSkip=introSkip||reduced;
        const world = lightSkip ? 1 : smooth(.95, 3.35, age);
        $('.world-host').style.setProperty('--intro-light', world.toFixed(4));
        report.intro = world;
        for (let i = 0; i < letters.length; i++) {
            const el = letters[i], order = i;
            const p = skip ? 1 : clamp((age - .65 - order * .15) / 2.0), ease = 1 - Math.pow(1 - p, 4);
            el.style.opacity = smooth(0, .4, p);
            el.style.transform = `translate3d(${(1 - ease) * (i < 4 ? -13 : 13)}px,${(1 - ease) * (45 + (i % 3) * 7)}px,0) rotateX(${(1 - ease) * -74}deg) rotateY(${(1 - ease) * (i % 2 ? 16 : -16)}deg)`;
            el.style.filter = `blur(${((1 - ease) * 14).toFixed(2)}px)`;
            el.style.setProperty('--glyph-flare', (Math.sin(Math.PI * p) * .70).toFixed(3));
            el.style.setProperty('--ab-boot', ((1 - ease) * 11).toFixed(2) + 'px');
        }
        const groups = [[$('.floating-ui'), 0, -30, 0, .06], [$('.hero-eyebrow'), 0, 14, 0, .26], [$('.hero-side'), -34, 0, -1, .34], [$('.hero-side.right'), 34, 0, 1, .34], [$('.hero-tagline'), 0, 20, 0, .5], [$('.hero-bottom'), 0, 26, 0, .66]];
        for (const [el, dx, dy, dir, delay] of groups) {
            if (!el)
                continue;
            const raw = skip ? 1 : smooth((el.classList.contains('floating-ui')?.03:1.0) + delay, (el.classList.contains('floating-ui')?.7:2.05) + delay, age);
            const back = raw >= 1 ? 1 : 1 - Math.pow(1 - raw, 2.6) * (1 - Math.sin(raw * Math.PI) * .16);
            const depart=reduced||el.classList.contains('floating-ui')?0:smooth(innerHeight*.02,innerHeight*(.53+delay*.12),scrollY);
            el.style.opacity = (raw * raw * (3 - 2 * raw)*(1-depart)).toFixed(3);
            el.style.transform = `translate3d(${((1 - back) * dx+depart*(dir===1?55:dir===-1?-55:0)).toFixed(2)}px,${((1 - back) * dy-depart*(105+delay*38)).toFixed(2)}px,0) scale(${(1 - (1 - back) * .035).toFixed(4)})`;
            el.style.filter = `blur(${((1 - raw) * 7+depart*13).toFixed(2)}px)`;
            if (dir)
                el.style.letterSpacing = (.15 + (1 - back) * .34).toFixed(3) + 'em';
        }
        $('.boot-veil')?.style.setProperty('--boot', (skip ? 0 : 1 - smooth(.12, 2.75, age)).toFixed(4));
        const sweepEl = $('.hero-center');
        if (sweepEl)
            sweepEl.style.setProperty('--sweep', (skip ? 0 : Math.max(0, smooth(1.55, 2.05, age) * (1 - smooth(2.15, 3.1, age)))).toFixed(3));
        body.classList.toggle('opening', !skip && age < 3.5);
        // Keep the initial moon flash, then release its energy over five seconds.
        // A quintic envelope has zero velocity and acceleration at both ends.
        const release=clamp((age-1.65)/8.25);
        const envelope=1-release**3*(10-15*release+6*release*release);
        const burst = introSkip || reduced ? 0 : smooth(1.02,1.42,age)*envelope;
        report.introBurst=burst;
        const descend = lightSkip ? 1 : smooth(1.30, 5.0, age);
        if(introSkip||reduced||age>=12)introSettled=true;
        // Critically damped arrival: the moon decelerates into place and its
        // velocity fades to nothing instead of stopping on a curve's end.
        const settle = (u, w) => { if (u <= 0) return 0; const x = Math.min(u * w, 40); return 1 - Math.exp(-x) * (1 + x); };
        const rise=lightSkip?1:settle(age-.5,2.05);
        report.introRise=rise;
        return { rise, riverReveal: lightSkip ? 1 : settle(age - 1.05, 2.6), world, burst, descend };
    }
    function restartIntro() { introSettled=false; introSkip = false; started = performance.now(); window.scrollTo({ top: 0, behavior: 'instant' }); window.portfolioWake?.(); }
    function tick(ts, dt, isReduced) {
        const {scrollY,innerWidth,innerHeight}=window.NocturneFrame||window;
        reduced = !!isReduced;
        dt = clamp(dt, .001, .08);
        clock = state.forceTime ?? ts * .001;
        const intro = updateIntro(clock);
        const lightTarget=intro.world*(1-smooth(innerHeight*.02,innerHeight*.70,scrollY));
        titleGlow.power+=(lightTarget-titleGlow.power)*(1-Math.exp(-dt*3));
        if(titleElement&&scrollY<innerHeight){
            const r=titleRect||titleElement.getBoundingClientRect();
            titleGlow.x=(r.left+r.width*.5)/innerWidth;
            titleGlow.y=1-(r.top+r.height*.70)/innerHeight;
        }
        report.titleGlow={...titleGlow};
        if (layoutDirty)
            layout();
        for (let i = 0; i < rows.length; i++) {
            const r=rows[i],m=rowMetrics.get(r);if(!m)continue;const rect={top:m.top-scrollY,bottom:m.top-scrollY+m.height},s=m.summary;
            if((rect.bottom < -120 || rect.top > innerHeight+150)&&!s._returnPose)continue;
            if(r.classList.contains('mx-expanded'))continue;
            const amount = reduced ? 1 : smooth(innerHeight * 1.12, innerHeight * .34, rect.top);
            const e = 1 - Math.pow(1 - amount, 3.4), soft = Math.sin(Math.PI * Math.min(1, amount));
            // All layers inherit this one translation; the GPU reads the same anchor box.
            if(s.floatTime===undefined)s.floatTime=clock;
            else if(!$('#dialog').open&&!window.NocturneLab?.inlineOpen){
                const resume=s._floatResumeAt===undefined?1:clamp((performance.now()-s._floatResumeAt)/650);
                s.floatTime+=dt*resume*resume*(3-2*resume);
                if(resume===1)delete s._floatResumeAt;
            }
            const ft=s.floatTime;
            const float=reduced?0:(Math.sin(ft*.62+i*1.37)*3.2+Math.sin(ft*.29+i*2.1)*.8)*e;
            const floatX=reduced?0:Math.sin(ft*.38+i*1.71)*1.4*e;
            const focusTarget=reduced?0:Math.exp(-Math.pow((rect.top+m.boxH*.5-innerHeight*.5)/(innerHeight*.24),2));
            const focusState=s._focus||(s._focus={value:focusTarget,velocity:0});
            const focus=window.NocturneScroll?.synchronized?.()?focusTarget:window.NocturneMotion.spring(focusState,focusTarget,12,dt);
            if(window.NocturneScroll?.synchronized?.()){focusState.value=focusTarget;focusState.velocity=0;}
            s.dataset.focus=focus.toFixed(4);s.style.setProperty('--mx-focus',focus.toFixed(4));
            const focusX=focus*(innerWidth<=760?4:22)*(i%2?1:-1);
            const focusScale=1+focus*(innerWidth<=760?.025:.065);
            // The row carries only position and size; the turn is handed to the
            // card itself so the DOM face and the GPU silhouette rotate as one.
            const leaving=reduced?0:1-smooth(-m.height*.85,-m.height*.22,rect.top);
            const optical=Math.max(1-e,leaving*.85);
            const alpha=e*(1-leaving);
            // Every one of these is a style write the compositor has to take.
            // Writing them unchanged, sixty times a second, for rows that are
            // simply sitting there is what made the scroll feel notched.
            const w=s._w||(s._w={});
            let tx=(1-e)*(i%2?86:-86)+focusX+floatX+leaving*(i%2?100:-100),ty=(1-e)*52+float-leaving*45;
            let scaleX=(.84+.16*e)*focusScale,scaleY=scaleX,displayAlpha=alpha,displayBlur=optical*5;
            let displayYaw=reduced?0:(1-e)*(i%2?-12:12),displayRot=reduced?0:(1-e)*(i%2?3.6:-3.6);
            const returning=s._returnPose;
            if(returning){const t=reduced?1:clamp((performance.now()-returning.at)/480),blend=t*t*t*(10-15*t+6*t*t);s._returnBlend=blend;
                tx=lerp(returning.x,tx,blend);ty=lerp(returning.y,ty,blend);scaleX=lerp(returning.a,scaleX,blend);scaleY=lerp(returning.d,scaleY,blend);
                displayAlpha=lerp(returning.alpha,alpha,blend);displayBlur=lerp(returning.blur,displayBlur,blend);displayYaw=lerp(returning.yaw,displayYaw,blend);displayRot=lerp(returning.rot,displayRot,blend);
                if(t===1){delete s._returnPose;delete s._returnBlend;}
            }
            const tf='translate3d('+tx.toFixed(3)+'px,'+ty.toFixed(3)+'px,0) scale('+scaleX.toFixed(5)+','+scaleY.toFixed(5)+')';
            if(w.tf!==tf){w.tf=tf;s.style.transform=tf;}
            const al=displayAlpha.toFixed(4);
            if(w.al!==al){w.al=al;s.style.opacity=al;s.dataset.visibility=al;}
            const yaw=displayYaw.toFixed(3),rot=displayRot.toFixed(3);
            if(w.yaw!==yaw||w.rot!==rot){w.yaw=yaw;w.rot=rot;s.style.setProperty('--in-yaw',yaw);s.style.setProperty('--in-rot',rot);}
            const fl=reduced||displayBlur<.001?'none':`blur(${displayBlur.toFixed(3)}px)`;
            s.dataset.motionBlur=String(displayBlur);
            if(w.fl!==fl){w.fl=fl;s.style.filter=fl;}
            const ab=((1-e)*9+soft*2.2).toFixed(2)+'px';
            if(w.ab!==ab){w.ab=ab;s.style.setProperty('--ab-card',ab);}

        }
        const skins = updateSurfaces(clock, dt);
        mouseSoft[0] = lerp(mouseSoft[0], (mouse[0] / innerWidth - .5) * 2, 1 - Math.exp(-dt * 3));
        mouseSoft[1] = lerp(mouseSoft[1], (mouse[1] / innerHeight - .5) * 2, 1 - Math.exp(-dt * 3));
        const scroll=scrollY,drift=Math.min(1,scroll/Math.max(1,riverEnd));
        const travelTarget=reduced?0:scroll/Math.max(1,riverEnd)*4*2.6;
        const travel=window.NocturneMotion.spring(travelSpring,travelTarget,7,dt);
        // How hard the near blades are pushed aside: the viewer's own speed.
        // Slightly under-damped so the field springs back after we pass instead
        // of relaxing on a flat curve.
        const push=reduced?0:clamp(Math.abs(travelSpring.velocity)*.07,0,1.6);
        partVel+=(push-partingPower)*dt*46-partVel*dt*7.4;
        partingPower=Math.max(0,partingPower+partVel*dt);
        partingDir=lerp(partingDir,reduced?0:clamp(travelSpring.velocity*.05,-1.1,1.1),1-Math.exp(-dt*6));
        // A slow, continuous lunar cycle rather than a fixed disk.
        moonPhase=Math.sin(clock*.021+1.05)*.82;
        report.travel=+travel.toFixed(3);report.travelGain=2.6;
        const camera=[reduced?0:mouseSoft[0]*.30,2.95+drift*.32,12];
        const look = [0, 1.0, -70];
        const vp = vpMatrix(camera, look, innerWidth / innerHeight);
        const mdrift = reduced ? 0 : clock;
        const light = [1.0 + Math.sin(mdrift * .043) * 10.5, lerp(3.8, 28., intro.rise) + Math.sin(mdrift * .031) * 1.6, -100.], sun = project(light, vp);
        sceneLift=lerp(sceneLift,window.LiquidPortfolio?.ambient?.()??0,1-Math.exp(-dt*2.8));
        const moon = (window.NocturneR14?.moonPower||0)*.22 + sceneLift*.22 + intro.burst + (reduced ? 0 : Math.pow(.5 + .5 * Math.sin(clock * .17), 3) * .12 + Math.pow(.5 + .5 * Math.sin(clock * .041 + 1.7), 9) * .20);
        const fm = rows[0] ? rowMetrics.get(rows[0]) : null;
        const firstRow = fm ? { top: fm.top - scrollY, height: fm.height } : null;
        const gate = reduced ? 1 : (firstRow ? smooth(innerHeight * 1.02, innerHeight * .46, firstRow.top) : 0);
        const flowStart = firstRow ? scroll + firstRow.top + firstRow.height * .5 : riverStart + 30;
        const selectedRow=rows.find(row=>row.classList.contains('is-active'));
        const flowCard=riverStops.find(r=>r.id===selectedRow?.id)||riverStops[0];
        const baseHead=flowCard?flowCard.center:flowStart,lastFlow=riverStops.at(-1),tailProbe=scroll+innerHeight*.58;
        // Once the final role passes the reading line, release the current from
        // that card and let it fan into the chapter transition below it.
        const tailRelease=lastFlow?smooth(lastFlow.bottom+innerHeight*.04,lastFlow.bottom+innerHeight*.62,tailProbe):0;
        const targetHead=lerp(baseHead,riverEnd,tailRelease);
        followedRiverHead=followedRiverHead===null?targetHead:lerp(followedRiverHead,targetHead,1-Math.exp(-dt*3.2));
        const head=lerp(Math.max(riverStart+30,flowStart-innerHeight*.34),followedRiverHead,intro.descend*gate);
        report.riverContactViewportTop=(head-scroll)/innerHeight;
        // Runtime scalars are not inherited CSS: updating :root would invalidate
        // every descendant before the next layout read, including offscreen cases.
        state.riverHead = head;
        state.riverGate = gate;
        const cyc = clock * .058, phase = cyc - Math.floor(cyc), swing = Math.sin(phase * Math.PI);
        let streamX = .5;
        if (riverPoints.length > 1) {
            const y = scroll + innerHeight * .5;
            let k = 0;
            while (k < riverPoints.length - 2 && y > riverPoints[k + 1].y)
                k++;
            const a = riverPoints[k], b = riverPoints[k + 1], tt = clamp((y - a.y) / Math.max(1, b.y - a.y));
            streamX = lerp(a.x, b.x, tt * tt * (3 - 2 * tt)) / Math.max(1, innerWidth);
        }
        const along = clamp(scroll / Math.max(1, riverEnd));
        const glow = Math.pow(.5 + .5 * Math.sin(clock * .23 - along * 7.), 3.2);
        const lanternPower = reduced ? 0 : (.28 + glow * 1.5 + Math.pow(swing, 2.4) * .7) * intro.rise * intro.riverReveal * (.25 + gate * .75);
        const windBoost = reduced ? 1 : .75 + glow * 2.6 + Math.pow(swing, 2.) * .9;
        const lantern = [lerp(-58, 58, streamX) + Math.sin(clock * .11) * 6, 2.4 + glow * 5.4, -30 - Math.cos(phase * 6.2832) * 22];
        if (pulseReq > 0) {
            W8.surgeT = 0;
            W8.power = pulseReq;
            W8.flare = Math.max(W8.flare, pulseReq);
            pulseReq = 0;
        }
        const dv = clamp(scroll - W8.lastY,-innerHeight*.18,innerHeight*.18);
        W8.lastY = scroll;
        W8.vel = lerp(W8.vel, dv / Math.max(.004, dt), 1 - Math.exp(-dt * 5.5));
        W8.dir = reduced ? 0 : lerp(W8.dir, clamp(W8.vel / 1100, -1, 1), 1 - Math.exp(-dt * 2.4));
        W8.surgeT += dt;
        const surge = reduced ? 0 : W8.power * Math.exp(-W8.surgeT * 1.25) * (1 - Math.exp(-W8.surgeT * 11));
        const surgeR = 8 + W8.surgeT * 46;
        W8.flare = lerp(W8.flare, 0, 1 - Math.exp(-dt * 1.15));
        const flare = reduced ? 0 : W8.flare+(window.NocturneR14?.moonPower||0)*2.2;
        if (engine && !state.pauseRendering) {
            const interval = reduced ? 0 : engine.kind === 'canvas2d' ? 40 : quality === 'eco' ? 32 : 0;
            if (ts - lastDraw >= interval || reduced) {
                try {
                    engine.render({ time: reduced ? 16 : clock, travel, vp, camera, light, sun, rise: intro.rise+sceneLift*.15, riverReveal: intro.riverReveal * gate, scroll, head, burst: intro.burst, moon, lantern, lanternPower: lanternPower + flare * 2.3, windBoost: windBoost + flare * 1.5, windDir: W8.dir, surge, surgeR, flare, part: partingPower, partDir: partingDir, phase: moonPhase, seam: window.NocturneR14?.seam?.()||null }, skins);
                }
                catch (e) {
                    report.errors.push(String(e));
                    attempt(engine?.kind || 'render', 'frame', String(e));
                    engine?.dispose();
                    engine = initCanvas2D();
                    layoutDirty = true;
                    body.classList.remove('gpu-ready');
                }
                lastDraw = ts;
            }
        }
    }
    function setQuality(next) { quality = next || (quality === 'full' ? 'eco' : 'full'); report.quality = quality; body.classList.toggle('eco-effects',quality==='eco');body.dataset.effectTier=quality==='eco'?'light':'full'; $('#qualityToggle').textContent = quality === 'eco' ? 'Effects: light' : 'Effects: full'; $('#qualityToggle').setAttribute('aria-pressed', String(quality === 'eco')); try {
        engine?.resize();
    }
    catch (e) {
        attempt(engine?.kind || 'render', 'resize', String(e));
        engine?.dispose();
        engine = initCanvas2D();
        layoutDirty = true;
    } window.portfolioWake?.(); }
    function showCompany(id, opener) {
        const exp = data.experience.find(e => e.id === id), el = document.getElementById(id);
        if (!exp || !el)
            return;
        const frames = $('.frame-deck', el)?.outerHTML || '', note = $('.exp-note', el)?.textContent || '', own = companyMedia.get(id);
        const ownHtml = own ? (own.type.startsWith('video/') ? `<video class="company-owned-media" src="${own.url}" controls playsinline></video>` : `<img class="company-owned-media" src="${own.url}" alt="${escape(own.name)}">`) : '';
        const firstFrame=$('.float-frame',el),firstArt=$('.frame-art',el)?.innerHTML||$('.career-logo',el)?.innerHTML||'';
        const firstCase=firstFrame?.dataset.case;
        const artwork=ownHtml||firstArt;
        const html = `<article class="case-shell case-company">
 <header class="sheet-title"><div class="eyebrow">${escape(exp.role)}</div><h2 id="dialogTitle">${escape(exp.company)}</h2></header>
 <div class="case-mosaic">
  <figure class="case-cover">${firstCase&&!ownHtml?`<button class="case-cover-link" data-case="${escape(firstCase)}" aria-label="Explore ${escape(exp.company)} project">${artwork}<span class="cover-action">Explore the project ↗</span></button>`:artwork}<figcaption>${ownHtml?'LOCAL PROJECT MEDIA':'ILLUSTRATIVE STUDY · ORIGINAL MEDIA ADDED SEPARATELY'}</figcaption></figure>
  <aside class="case-brief"><span class="case-mark">${$('.career-logo',el).outerHTML}</span><p class="case-lead">${escape(exp.summary)}</p><dl class="case-facts"><div><dt>Period</dt><dd>${escape(exp.dates)}</dd></div><div><dt>Chapter</dt><dd>${escape(exp.year)} — ${escape(exp.end)}</dd></div></dl><div class="skill-list">${exp.skills.map(s=>`<span class="skill">${escape(s)}</span>`).join('')}</div></aside>
 </div>
 <section class="case-works"><div class="case-label">SELECTED PROJECTS & DIRECTIONS</div>${frames||'<p class="empty-exp">Original project media is not included yet.</p>'}${note?`<p class="exp-note">${escape(note)}</p>`:''}<button class="local-company-upload" data-company-upload="${escape(id)}">Add your image or video ↗</button></section>
 <footer class="case-foot"><span>Previews are illustrative studies.<br>Original product media is added separately.</span><button data-close>Back to the journey ↙</button></footer>
</article>`;
        const b = opener?.getBoundingClientRect();
        opener?.focus({ preventScroll: true });
        window.portfolioOpenDialog?.(html, `CAREER / ${exp.year} — ${exp.end}`);
    }
    $$('.mini-art[data-mini-art]').forEach(el => el.innerHTML = window.portfolioArt?.(el.dataset.miniArt) || '');
    document.addEventListener('click', e => { const b = e.target.closest('[data-company-upload]'); if (!b)
        return; const id = b.dataset.companyUpload, input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*,video/*'; input.addEventListener('change', () => { const f = input.files?.[0]; if (!f || !f.type.match(/^(image|video)\//))
        return; const old = companyMedia.get(id); if (old)
        URL.revokeObjectURL(old.url); companyMedia.set(id, { url: URL.createObjectURL(f), name: f.name, type: f.type }); showCompany(id); }); input.click(); });
    $('#qualityToggle')?.addEventListener('click', () => setQuality());
    $('#replayIntro')?.addEventListener('click', restartIntro);
    window.addEventListener('pointermove', e => mouse = [e.clientX, e.clientY], { passive: true });
    let resizeTimer=0,resizeWidth=innerWidth,resizeDpr=devicePixelRatio;
    function resizeRenderer(){try {
        engine?.resize();
    }
    catch (e) {
        attempt(engine?.kind || 'render', 'resize', String(e));
        engine?.dispose();
        engine = initCanvas2D();
        layoutDirty = true;
    } layoutDirty = true; window.portfolioWake?.();}
    window.addEventListener('resize', () => {
        const widthChanged=resizeWidth!==innerWidth||resizeDpr!==devicePixelRatio;
        resizeWidth=innerWidth;resizeDpr=devicePixelRatio;clearTimeout(resizeTimer);
        if(!attachedGlass||widthChanged){fitName();resizeRenderer();}
        else resizeTimer=setTimeout(resizeRenderer,160);
        layoutDirty=true;window.portfolioWake?.();
    });
    new ResizeObserver(() => { layoutDirty = true; window.portfolioWake?.(); }).observe($('.timeline'));
    window.addEventListener('pagehide', e => { if (e.persisted)
        return; companyMedia.forEach(m => URL.revokeObjectURL(m.url)); engine?.dispose(); clearTimeout(fontTimer); clearTimeout(resizeTimer); });
    $('#renderStatus')?.addEventListener('click', openGraphics);
    restartRenderer();
    fitName();
    layout();
    loadFonts();
    window.portfolioWake?.();
})();
