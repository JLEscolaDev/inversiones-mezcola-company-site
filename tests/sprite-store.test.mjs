import { fileURLToPath } from 'node:url';
import path from 'node:path';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source=fs.readFileSync(path.join(__dirname,'../src/lib/sprite-store.ts'),'utf8');
const moduleObject={exports:{}};
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,
 {module:moduleObject,exports:moduleObject.exports,AbortController,queueMicrotask,console,fetch,Date,Blob,URL});
const {SpriteStore,DecodedSprites}=moduleObject.exports;
const flush=async()=>{for(let i=0;i<30;i++)await Promise.resolve()};

test('network concurrency is bounded and current data jumps ahead of warmup',async()=>{
 const started=[],finish=new Map();
 const store=new SpriteStore((src)=>new Promise(resolve=>{started.push(src);finish.set(src,resolve)}),2);
 const all=['background1','background2','background3'].map(src=>store.request(src,3));
 const current=store.request('current',0);await flush();
 assert.deepEqual(started,['current','background1']);
 finish.get('current')(new Blob());await current;await flush();
 assert.deepEqual(started,['current','background1','background2']);
 finish.get('background1')(new Blob());await flush();
 finish.get('background2')(new Blob());await flush();
 finish.get('background3')(new Blob());await Promise.all(all);store.dispose();
});

test('duplicate pending loads share one request and failed loads can retry',async()=>{
 let attempts=0;const store=new SpriteStore(async()=>{attempts++;if(attempts===1)throw Error('network');return new Blob()});
 const a=store.request('a',2),b=store.request('a',0);assert.equal(a,b);await assert.rejects(a);await flush();
 await store.request('a',0);assert.equal(attempts,2);store.dispose();
});

test('obsolete queued detail is cancelled before network; running loads abort on disposal',async()=>{
 let signal;const store=new SpriteStore(async(src,s)=>{signal=s;return new Promise(()=>{})},1);
 const active=store.request('active',0).catch(()=>{});const stale=store.request('stale',3);
 await flush();store.retain(new Set(['active']));await assert.rejects(stale);
 store.dispose();assert.equal(signal.aborted,true);await active;
});

test('late decoded images are closed instead of leaking after eviction',async()=>{
 let finish;const image={width:10,height:10,closed:false,close(){this.closed=true}};
 const store=new SpriteStore(async()=>new Blob());let notifications=0;
 const cache=new DecodedSprites(store,()=>notifications++,()=>new Promise(resolve=>{finish=resolve}));
 cache.retain(new Set(['a']));cache.load('a',0);await flush();
 cache.retain(new Set(['b']));finish(image);await flush();
 assert.equal(image.closed,true);assert.equal(cache.get('a'),undefined);assert.equal(notifications,0);cache.dispose();store.dispose();
});

test('decoded sprite resources stay within the configured memory budget',async()=>{
 const store=new SpriteStore(async()=>new Blob());let closed=0;
 const cache=new DecodedSprites(store,()=>{},async()=>({width:10,height:10,close(){closed++}}),400);
 cache.retain(new Set(['a','b']));cache.load('a',0);await flush();cache.load('b',0);await flush();
 assert.equal(closed,1);assert.equal(cache.get('a'),undefined);assert.ok(cache.get('b'));cache.dispose();store.dispose();assert.equal(closed,2);
});


test('returning to a superseded queued sheet retries immediately and needs no new gesture',async()=>{
  let unblock;const started=[];
  const store=new SpriteStore(src=>{started.push(src);return src==='gate'?new Promise(resolve=>{unblock=resolve}):Promise.resolve(new Blob())},1);
  const gate=store.request('gate',0);await flush();
  let cache;cache=new DecodedSprites(store,()=>cache.load('a',0),async()=>({width:10,height:10,close(){}}));
  cache.retain(new Set(['a']));cache.load('a',0);await flush();
  cache.retain(new Set(['b']));store.retain(new Set(['gate','b']));
  cache.retain(new Set(['a']));cache.load('a',0);await flush();
  unblock(new Blob());await gate;await flush();
  assert.deepEqual(started,['gate','a']);assert.ok(cache.get('a'),'cancelled request was poisoned by failure cooldown');
  cache.dispose();store.dispose();
});
