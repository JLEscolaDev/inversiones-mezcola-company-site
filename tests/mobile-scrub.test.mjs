import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
const root = path.resolve(__dirname, '..');
const original = process.env.ORIGINAL_SCRUB_SOURCE;

function mount({ failDecode = false } = {}) {
  const states = [];
  const frames = ['a','b'].map(name => ({basePath: `/${name}`, count: 10, sheetCount: 5,
    frameWidth: 900, frameHeight:1600,columns:2,rows:1,
    preview: {src:`/${name}.webp`,count:10,frameWidth:180,frameHeight:320,columns:10,rows:1}}));
  const requests = new Map();
  const draws = [];
  const bitmaps = [];
  const rafs = new Map();
  const events = new Map();
  const effects = [];
  let id = 0, y = 0, width = 390;
  class Bitmap {
    constructor(src) { this.src=src; this.width=1800; this.height=1600;this.closed=false;bitmaps.push(this); }
    close() { this.closed = true; }
  }
  const request = (src, finish) => { const list=requests.get(src)||[]; list.push(finish); requests.set(src,list); };
  class FakeImage {
    set src(value) { this._src=value; request(value,()=>this.onload?.()); }
    get src() { return this._src; }
    async decode() { if (failDecode) throw new Error('Unsupported image codec'); }
  }
  const createBitmap=async image => { if (failDecode) throw new Error('Unsupported image codec'); return new Bitmap(image.src); };
  const react = {useRef:value=>({current:value}),useEffect:effect=>effects.push(effect),useMemo:f=>f(),useState:value=>{ const index=states.push(value)-1;return [value,next=>{states[index]=next}]; }};
  function jsx(type, props={}) {
    const node={style:{},offsetHeight: props.style?.height ? parseFloat(props.style.height)*844/100 : 844,
      get clientWidth(){return width},clientHeight:844,width:300,height:150,
      getBoundingClientRect:()=>({top:-y,width,height:844}),
      querySelectorAll:()=>[],getContext:()=>({drawImage:(image,...args)=>{assert.equal(image.closed,false,'draws closed bitmap');draws.push({src:image.src,args,width});},clearRect:()=>{}})};
    if (typeof props.ref==='function') props.ref(node);
    else if (props.ref) props.ref.current=node;
    return node;
  }
  const browser = {Image:FakeImage,createImageBitmap:createBitmap,devicePixelRatio:1,innerHeight:844,
    requestAnimationFrame:fn=>{rafs.set(++id,fn);return id},cancelAnimationFrame:key=>rafs.delete(key),
    setTimeout:()=>++id,clearTimeout:()=>{},addEventListener:(event,fn)=>events.set(event,fn),removeEventListener:()=>{}};
  const context = vm.createContext({console,Promise,Map,Set,Date,Math,Number,String,Array,Error,AbortController,
    URL:{createObjectURL:blob=>blob.src,revokeObjectURL:()=>{}},queueMicrotask,window:browser,Image:FakeImage,ImageBitmap:Bitmap,createImageBitmap:createBitmap,
    requestAnimationFrame:browser.requestAnimationFrame,cancelAnimationFrame:browser.cancelAnimationFrame,
    fetch:(src)=>new Promise(resolve=>request(src,()=>resolve({ok:true,blob:async()=>({src})}))),
    setTimeout:browser.setTimeout,clearTimeout:browser.clearTimeout});
  let store;
  function load(source) {
    const compiledModule={exports:{}};
    const requireStub=name=>{
      if(name==='react') return react;
      if(name==='react/jsx-runtime') return {jsx,jsxs:jsx};
      if(name==='@/lib/sprite-store') return store;
      if(name==='gsap') return {__esModule:true,default:{registerPlugin(){}}};
      return {__esModule:true,default:{},ScrollTrigger:{}};
    };
    const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
    vm.runInContext(`(function(require,module,exports){${js}\n})`,context)(requireStub,compiledModule,compiledModule.exports);
    return compiledModule.exports;
  }
  store=load(fs.readFileSync(path.join(root,'src/lib/sprite-store.ts'),'utf8'));
  const source=original ? fs.readFileSync(original,'utf8')+'\nexport { MobileScrubStack, loadSprite, spriteCache };' : fs.readFileSync(path.join(root,'src/components/MobileScrubStack.tsx'),'utf8');
  const api=load(source);
  api.MobileScrubStack({sceneLayers:[null,null,null],frameSequences:frames,posterSrcs:['/p1','/p2']});
  const cleanup=effects.at(-1)();
  const flush=async()=>{for(let i=0;i<20;i++) await Promise.resolve();};
  const ticks=async(n=100)=>{await flush();for(let i=0;i<n&&rafs.size;i++){const batch=[...rafs];rafs.clear();batch.forEach(([,fn])=>fn());await flush();}};
  const deliver=async(predicate=()=>true)=>{for(let round=0;round<10;round++){await flush();const keys=[...requests.keys()].filter(predicate);if(!keys.length)break;for(const key of keys){const callbacks=requests.get(key);requests.delete(key);callbacks.forEach(fn=>fn());}await ticks();}};
  return {draws,bitmaps,requests,api,cleanup,flush,ticks,deliver,states,
    scroll:async progress=>{y=progress*(2*135*844/100);events.get('scroll')?.();await ticks();},
    resize:async value=>{width=value;events.get('resize')?.();await ticks();}};
}

test('late prior sequence completion cannot overwrite the active shared canvas',async()=>{
  const h=mount();await h.scroll(0.2);await h.scroll(0.7);
  await h.deliver(src=>src.startsWith('/b'));
  assert.ok(h.draws.at(-1)?.src.startsWith('/b'),'active sequence must paint');
  await h.deliver(src=>src.startsWith('/a'));
  assert.ok(h.draws.at(-1)?.src.startsWith('/b'),'late sequence A overwrote current B');h.cleanup();
});

test('resize repaints an unchanged frame at the current canvas size',async()=>{
  const h=mount();await h.scroll(0.2);await h.deliver();
  assert.ok(h.draws.length);await h.resize(430);
  assert.equal(h.draws.at(-1).width,430);h.cleanup();
});

test('unmount closes resident and late bitmaps and suppresses late drawing',async()=>{
  const h=mount();await h.scroll(0.2);await h.deliver();
  const before=h.draws.length;h.cleanup();await h.deliver();
  assert.equal(h.draws.length,before);
  assert.ok(h.bitmaps.length>0);
  assert.ok(h.bitmaps.every(image=>image.closed),'bitmap resources leaked on unmount');
});

test('complete preview renders an uncached exact frame while detail is delayed',async()=>{
  const h=mount();await h.scroll(0.2);await h.deliver(src=>src.endsWith('.webp'));
  const first=h.draws.length;await h.scroll(0.3);
  assert.ok(h.draws.length>first,'cold high-detail data blocked motion');
  assert.equal(h.draws.at(-1).src,'/a.webp');h.cleanup();
});


test('detail arriving after scroll stops upgrades the same frame without another gesture',async()=>{
  const h=mount();await h.scroll(0.2);await h.deliver(src=>src.endsWith('.webp'));
  assert.equal(h.draws.at(-1).src,'/a.webp');
  await h.scroll(0.2);const before=h.draws.length;await h.deliver(src=>src.endsWith('.jpg'));
  assert.ok(h.draws.length>before,'loaded detail must repaint an idle canvas');
  assert.ok(h.draws.at(-1).src.startsWith('/a/sheet_'));h.cleanup();
});


test('unsupported preview decoder immediately requests static fallback before timeout',async()=>{
  const h=mount({failDecode:true});await h.ticks();await h.deliver(src=>src.endsWith('.webp'));
  assert.equal(h.states[2],true,'decoder error must request fallback without waiting20s');
  assert.equal(h.draws.length,0);h.cleanup();
});
