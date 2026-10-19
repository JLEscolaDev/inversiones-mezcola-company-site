import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function mount(source) {
  const effects=[], timers=new Map();let now=0,id=0,ended=0,video;
  const react={useRef:value=>({current:value}),useState:value=>[value,()=>{}],useCallback:fn=>fn,useEffect:fn=>effects.push(fn)};
  const browser={setTimeout:(fn,ms)=>{timers.set(++id,{fn,time:now+ms});return id},clearTimeout:id=>timers.delete(id),
    requestAnimationFrame:()=>++id,cancelAnimationFrame:()=>{}};
  const jsx=(type,props)=>{if(type==='video'){video=props;props.ref.current={duration:5,currentTime:0,play:async()=>{},pause(){}}}return {type,props}};
  const compiled={exports:{}};
  const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(`(function(require,module,exports){${js}})`,{window:browser,IntersectionObserver:class {observe(){}disconnect(){}}})(
    name=>name==='react'?react:{jsx,jsxs:jsx},compiled,compiled.exports);
  compiled.exports.TransitionVideo({id:'test',videoSrc:'/clip.mp4',posterSrc:'/poster',reducedMotion:false,onEnded:()=>ended++,classNames:{}});
  const cleanup=effects.map(effect=>effect());
  return {video,get ended(){return ended},dispose:()=>cleanup.forEach(fn=>fn?.()),advance(ms){now+=ms;for(const [key,timer] of [...timers])if(timer.time<=now){timers.delete(key);timer.fn()}}};
}
const source=fs.readFileSync(new URL('../src/components/TransitionVideo.tsx',import.meta.url),'utf8');
test('valid cold video is not skipped after the old 1.2s deadline',()=>{
  const h=mount(source);h.advance(1500);assert.equal(h.ended,0);h.dispose();
});
test('network progress keeps the startup watchdog alive, ended fires once',()=>{
  const h=mount(source);h.advance(15000);h.video.onProgress();h.advance(15000);assert.equal(h.ended,0);
  h.video.onEnded();h.video.onEnded();assert.equal(h.ended,1);h.dispose();
});
test('genuine prolonged stall can complete without locking desktop navigation',()=>{
  const h=mount(source);h.advance(21000);assert.equal(h.ended,1);h.dispose();
});


test('download progress during valid playback cannot arm a completion timer',()=>{
  const h=mount(source);h.video.onPlaying();h.video.onProgress();h.advance(21000);
  assert.equal(h.ended,0,'progress after playing must not skip a valid long video');h.dispose();
});
