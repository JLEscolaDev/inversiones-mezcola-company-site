import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function mount() {
  const videos = [], draws = [], timers = new Set();
  let width=390, failures=0, callbacks=0;
  class Video {
    listeners=new Map();currentTime=0;readyState=0;videoWidth=900;videoHeight=1600;seeking=false;
    style={}; attrs={}; removed=false;loads=0;
    setAttribute(name,value){this.attrs[name]=value}
    removeAttribute(name){delete this[name]}
    addEventListener(name,fn){this.listeners.set(name,fn)}
    removeEventListener(name){this.listeners.delete(name)}
    load(){this.loads++} pause(){} remove(){this.removed=true}
    emit(name){this.listeners.get(name)?.()}
    loaded(){this.readyState=2;this.emit('loadeddata')}
    finish(){this.seeking=false;this.emit('seeked')}
  }
  const canvas={clientHeight:844,dataset:{},get clientWidth(){return width},getContext:()=>({drawImage:(video,...args)=>draws.push({video,time:video.currentTime,width:canvas.width,args})})};
  const host={appendChild:video=>videos.push(video)};
  const compiledModule={exports:{}};
  const source=ts.transpileModule(fs.readFileSync(new URL('../src/lib/video-scrubber.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const context=vm.createContext({module:compiledModule,exports:compiledModule.exports,document:{createElement:()=>new Video()},window:{devicePixelRatio:2,setTimeout:fn=>{timers.add(fn);return fn},clearTimeout:fn=>timers.delete(fn)}});
  vm.runInContext(source,context);
  const sequence={count:92,fps:18,width:900,height:1600,bytes:100,src:'/test.mp4'};
  const scrubber=new compiledModule.exports.VideoScrubber(canvas,host,Array(7).fill(sequence),Array.from({length:7},(_,i)=>`blob:${i}`),()=>callbacks++,()=>failures++);
  return {scrubber,videos,draws,canvas,timers,resize:value=>width=value,get failures(){return failures},get callbacks(){return callbacks}};
}

test('continuous scrolling keeps one seek in flight and paints its completion before latest target',()=>{
  const h=mount();h.scrubber.request(0,0);h.videos[0].loaded();
  h.scrubber.request(0,10);const first=h.videos[0].currentTime;
  h.scrubber.request(0,20);h.scrubber.request(0,30);
  assert.equal(h.videos[0].currentTime,first,'must not cancel in-flight decoder work');
  h.videos[0].finish();
  assert.equal(h.canvas.dataset.frame,'10','first completed frame must paint during motion');
  assert.ok(h.videos[0].currentTime>30/18,'latest desired position must follow completion');
  h.videos[0].finish();assert.equal(h.canvas.dataset.frame,'30');
  h.scrubber.dispose();
});

test('late callbacks from previous sequence never repaint the active canvas',()=>{
  const h=mount();h.scrubber.request(0,0);h.videos[0].loaded();h.scrubber.request(0,20);
  const oldCallback=h.videos[0].listeners.get('seeked');
  h.scrubber.request(1,0);h.videos[1].loaded();
  const before=h.draws.length;oldCallback();
  assert.equal(h.draws.length,before);assert.equal(h.canvas.dataset.sequence,'1');h.scrubber.dispose();
});

test('resize and re-entry repaint unchanged full-resolution frames; idle does not redraw',()=>{
  const h=mount();h.scrubber.request(0,0);h.videos[0].loaded();const before=h.draws.length;
  h.scrubber.request(0,0);assert.equal(h.draws.length,before);
  h.resize(430);h.scrubber.request(0,0);assert.equal(h.draws.at(-1).width,860);
  h.scrubber.request(1,0);h.videos[1].loaded();h.scrubber.request(0,0);h.videos.at(-1).loaded();
  assert.equal(h.canvas.dataset.sequence,'0');h.scrubber.dispose();
});

test('only current/next native surfaces retained, all sources released on unmount',()=>{
  const h=mount();for(let i=0;i<7;i++)h.scrubber.request(i,20);
  assert.ok(h.videos.filter(v=>!v.removed).length<=2);
  const late=h.videos.at(-1).listeners.get('loadeddata');const before=h.draws.length;
  h.scrubber.dispose();late();
  assert.ok(h.videos.every(v=>v.removed&&!v.src));assert.equal(h.timers.size,0);
  assert.equal(h.draws.length,before);
});

test('unexpected low-resolution media is rejected before any frame is drawn',()=>{
  const h=mount();h.scrubber.request(0,0);h.videos[0].videoWidth=144;h.videos[0].videoHeight=256;h.videos[0].loaded();
  assert.equal(h.failures,1);assert.equal(h.draws.length,0);h.scrubber.dispose();
});


test('cold jump seeks to the requested position before revealing a new clip',()=>{
  const h=mount();h.scrubber.request(4,50);h.videos[0].loaded();
  assert.equal(h.draws.length,0,'must not flash the first frame of a jumped-to transition');
  h.videos[0].finish();assert.equal(h.canvas.dataset.frame,'50');h.scrubber.dispose();
});
