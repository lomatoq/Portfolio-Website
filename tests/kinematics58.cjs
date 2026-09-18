'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'src/scroll.js'),'utf8');
const fn=source.slice(source.indexOf('function springStep('),source.indexOf('\n  function start(',source.indexOf('function springStep(')));
const step=Function('return ('+fn+')')(),checks=[];
function check(name,fn){try{const details=fn();checks.push({name,pass:true,details});console.log('PASS',name);}catch(e){checks.push({name,pass:false,error:e.message});console.log('FAIL',name,e.message);}}
function integrate(fps,target=600,time=.5){let x=0,v=0;for(let i=0;i<Math.round(fps*time);i++){const s=step(x,v,target,4.75/.3,1/fps);x=s.x;v=s.v;}return {x,v};}
check('Exact spring is frame-rate independent at 30/60/120/144 Hz',()=>{let a=integrate(30);for(const fps of [60,120,144]){let b=integrate(fps);assert.ok(Math.abs(b.x-a.x)<1e-8);assert.ok(Math.abs(b.v-a.v)<1e-7);}return a;});
check('Default response reaches 95% of a wheel step in 300 ms',()=>{const s=integrate(120,600,.3);assert.ok(s.x/600>.949);return s.x/600;});
check('Approach from rest is monotone without an overshoot',()=>{let x=0,v=0;for(let i=0;i<300;i++){let s=step(x,v,100,4.75/.3,1/120);assert.ok(s.x>=x-1e-9&&s.x<=100+1e-9);x=s.x;v=s.v;}});
check('Retargeting preserves position and current velocity at t=0',()=>{const s=integrate(60,600,.1),q=step(s.x,s.v,900,4.75/.3,0);assert.ok(Math.abs(q.x-s.x)<1e-10);assert.ok(Math.abs(q.v-s.v)<1e-10);});
check('Reversal dissipates velocity and reaches the new target',()=>{let s=integrate(60,600,.1);for(let i=0;i<240;i++)s=step(s.x,s.v,0,4.75/.3,1/120);assert.ok(Math.abs(s.x)<.001);assert.ok(Math.abs(s.v)<.001);return s;});
check('No gesture freshness, gate, hold or lock state machine in runtime',()=>{for(const banned of ['holdUntil','freshGesture','gateUntil','armedAt','gestureFresh','lockedUntil'])assert.ok(!source.includes(banned),banned);});
const js=fs.readdirSync(path.join(root,'src')).filter(n=>n.endsWith('.js'));
check('Every JavaScript source parses',()=>{const vm=require('node:vm');for(const n of js)new vm.Script(fs.readFileSync(path.join(root,'src',n),'utf8'),{filename:n});return js.length;});
fs.writeFileSync(path.join(root,'tests/flow58/kinematics.json'),JSON.stringify({checks},null,2));
if(checks.some(c=>!c.pass))process.exitCode=1;
