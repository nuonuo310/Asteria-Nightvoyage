import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {Store} from '../src/store.js';
import {planResource,planDiscovery} from '../scripts/chatgpt-plan-auth.mjs';
import {reviewPlanCatalogShape,validPlanCatalogShape} from '../scripts/plan-catalog-shape.mjs';
import {initPlanCatalogReview,preflightPlanCatalogReview,executePlanCatalogReview,planCatalogReviewProposal} from '../scripts/plan-catalog-review.mjs';
import {syntheticPlanHttp} from '../test-support/plan-trial-fixtures.js';
const approval=()=>({approveCatalogLogin:true,acknowledgeNoInference:true});
const catalog=()=>({models:[{slug:'gpt-5.6-sol',display_name:'Synthetic Model',visibility:'list',shell_type:'unified_exec',apply_patch_tool_type:'freeform',tool_mode:'direct',input_modalities:['text','image'],experimental_supported_tools:[],model_messages:{instructions_template:'SYNTHETIC-PRIVATE-INSTRUCTIONS'},private:'SYNTHETIC-PRIVATE-ACCOUNT'}]});
function dirs(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-catalog-review-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return {directory:path.join(root,'review'),connectionDirectory:path.join(root,'connection')};}
const disk=d=>fs.readdirSync(d,{recursive:true,withFileTypes:true}).filter(x=>x.isFile()).map(x=>fs.readFileSync(path.join(x.parentPath,x.name),'utf8')).join('\n');
async function run(t,{second=catalog,missingModel=false,revocationFail=false,cancelAtCatalog=false}={}){
 const d=dirs(t);initPlanCatalogReview(d.directory,approval());const http=syntheticPlanHttp({missingModel,revocationFail});http.install();const base=globalThis.fetch,calls=[];let count=0;const controller=new AbortController();
 globalThis.fetch=async(url,options)=>{calls.push(String(url));if(String(url)===`${planResource}/models`){count++;if(count===2){if(cancelAtCatalog)controller.abort();return Response.json(second());}}return base(url,options);};
 try{return {d,http,calls,count:()=>count,out:await executePlanCatalogReview({...d,onReady:http.onReady,signal:controller.signal})};}finally{http.restore();}
}
test('pure selected-model projection returns fixed shape labels only and never promotes metadata to native capability',()=>{
 const r=reviewPlanCatalogShape(catalog());assert.equal(validPlanCatalogShape(r),true);assert.equal(r.instructions,'text_present');assert.equal(r.nativeCompatibilityVerified,false);assert.equal(r.productionAdmission,false);assert.equal(JSON.stringify(r).includes('SYNTHETIC-PRIVATE'),false);
 const sparse=reviewPlanCatalogShape({models:[{slug:'gpt-5.6-sol'}]});assert.equal(sparse.shellType,'missing');assert.equal(sparse.experimentalTools,'missing');
 const odd=catalog();odd.models[0].shell_type='SYNTHETIC-PRIVATE-SHELL';odd.models[0].input_modalities=['unknown'];assert.equal(reviewPlanCatalogShape(odd).shellType,'unreviewed');assert.equal(reviewPlanCatalogShape(odd).inputModalities,'unreviewed');
 assert.throws(()=>reviewPlanCatalogShape({models:[]}),/selected_missing/);const duplicate=catalog();duplicate.models.push({...duplicate.models[0]});assert.throws(()=>reviewPlanCatalogShape(duplicate),/selected_duplicate/);
 let reads=0;assert.throws(()=>reviewPlanCatalogShape({get models(){reads++;return [];}}));assert.equal(reads,0);assert.equal(validPlanCatalogShape({...r,raw:'forbidden'}),false);
});
test('missing approval, invalid options and CLI flags cause no directory, login or inference',async t=>{
 const d=dirs(t),old=globalThis.fetch;globalThis.fetch=()=>assert.fail('network');try{
  assert.equal(preflightPlanCatalogReview(d.directory).ready,false);assert.equal(fs.existsSync(d.directory),false);
  for(const a of [{approveCatalogLogin:false,acknowledgeNoInference:true},{...approval(),retry:true}])assert.throws(()=>initPlanCatalogReview(d.directory,a));
  await assert.rejects(executePlanCatalogReview(d),/approval_required/);assert.equal(fs.existsSync(d.directory),false);
  let reads=0;await assert.rejects(executePlanCatalogReview({get directory(){reads++;return d.directory;}}));assert.equal(reads,0);
 }finally{globalThis.fetch=old;}
 const cli=fileURLToPath(new URL('../scripts/plan-catalog-review-cli.mjs',import.meta.url));
 for(const args of [['--live'],['run','--live'],['init','--approve-budget-cny','3'],['preflight','--model','other']]){const r=spawnSync(process.execPath,[cli,...args],{encoding:'utf8'});assert.equal(r.status,1);assert.equal(JSON.parse(r.stderr).realModelRequests,0);}
 const p=planCatalogReviewProposal();assert.equal(p.maxModelRequests,0);assert.equal(p.maxNativeChildren,0);assert.equal(p.maxTotalAuthenticatedCatalogGets,2);assert.ok(p.sourcePins['scripts/chatgpt-plan-login.mjs']);
});
test('synthetic OAuth plus one additional bounded catalog GET persists only the shape and terminal replay has no login',async t=>{
 const {d,http,calls,count,out}=await run(t);assert.equal(out.status,'observed');assert.equal(out.additionalCatalogGetIntents,1);assert.equal(count(),2);assert.equal(http.bodies.length,0);assert.equal(calls.some(x=>x.endsWith('/responses')),false);assert.equal(out.remoteRevocationConfirmed,true);assert.equal(out.realModelRequests,0);assert.equal(out.review.shellType,'unified_exec');
 const old=globalThis.fetch;globalThis.fetch=()=>assert.fail('replay network');try{assert.deepEqual(await executePlanCatalogReview(d),out);assert.equal(initPlanCatalogReview(d.directory,approval()).ready,false);}finally{globalThis.fetch=old;}
 const stored=disk(path.dirname(d.directory))+JSON.stringify(out);for(const marker of ['SYNTHETIC-PRIVATE','SYNTHETIC-TRIAL-ACCESS','SYNTHETIC-TRIAL-REFRESH','SYNTHETIC-TRIAL-CODE'])assert.equal(stored.includes(marker),false,marker);
});
test('missing selected account model and rejected second catalogue consume one authorization without inference or retry',async t=>{
 const a=await run(t,{missingModel:true});assert.equal(a.out.status,'failed');assert.equal(a.count(),1);assert.equal(a.out.additionalCatalogGetIntents,0);assert.equal(a.out.remoteRevocationConfirmed,true);
 const b=await run(t,{second:()=>({models:[]})});assert.equal(b.out.status,'failed');assert.equal(b.out.error,'catalog_selected_missing');assert.equal(b.out.review,null);assert.equal(b.out.remoteRevocationConfirmed,true);assert.equal(preflightPlanCatalogReview(b.d.directory).ready,false);
});
test('catalogue may contain bounded large irrelevant metadata; no raw field or instruction text is persisted',async t=>{
 const {d,out}=await run(t,{second:()=>({...catalog(),irrelevant:'SYNTHETIC-PRIVATE-PADDING'+'x'.repeat(180000)})});assert.equal(out.status,'observed');assert.equal(disk(d.directory).includes('SYNTHETIC-PRIVATE'),false);
});
test('queued cancellation, in-flight cancellation and expiry do not enable later authorization',async t=>{
 const d=dirs(t);initPlanCatalogReview(d.directory,approval());const c=new AbortController();c.abort();const old=globalThis.fetch;globalThis.fetch=()=>assert.fail('queued network');try{const r=await executePlanCatalogReview({...d,signal:c.signal});assert.equal(r.status,'cancelled');assert.equal(r.authorizationAttempts,0);assert.equal(initPlanCatalogReview(d.directory,approval()).ready,false);}finally{globalThis.fetch=old;}
 const x=await run(t,{cancelAtCatalog:true});assert.equal(x.out.status,'cancelled');assert.equal(x.out.review,null);assert.equal(x.out.remoteRevocationConfirmed,true);
 const e=dirs(t);initPlanCatalogReview(e.directory,approval());const s=new Store(e.directory);s.state.planCatalogReview.approvedAt-=86400001;s.state.planCatalogReview.expiresAt-=86400001;s.save();s.close();await assert.rejects(executePlanCatalogReview(e),/approval_expired/);assert.equal(initPlanCatalogReview(e.directory,approval()).ready,false);
});
test('failed revocation is explicit and metadata does not imply successful remote cleanup',async t=>{
 const {out}=await run(t,{revocationFail:true});assert.equal(out.status,'observed');assert.equal(out.remoteRevocationConfirmed,false);assert.equal(out.remoteCleanupMayBeRequired,true);assert.equal(out.productionAdmission,false);
});
test('crash-like durable authorizing state blocks re-login and requires cleanup review; foreign ownership is refused',async t=>{
 const d=dirs(t);initPlanCatalogReview(d.directory,approval());let s=new Store(d.directory);s.state.planCatalogReview.phase='authorizing';s.state.planCatalogReview.authorizationAttempts=1;s.state.planCatalogReview.remoteRevocationConfirmed='unknown';s.save();s.close();const old=globalThis.fetch;globalThis.fetch=()=>assert.fail('uncertain network');try{const r=await executePlanCatalogReview(d);assert.equal(r.status,'uncertain');assert.equal(r.remoteCleanupMayBeRequired,true);}finally{globalThis.fetch=old;}
 const f=dirs(t);s=new Store(f.directory);s.state.entries.foreign={};s.save();s.close();assert.throws(()=>initPlanCatalogReview(f.directory,approval()),/foreign_execution_owner/);
});
test('authorization-intent persistence failure prevents any OAuth request',async t=>{
 const d=dirs(t);initPlanCatalogReview(d.directory,approval());const oldSave=Store.prototype.save,oldFetch=globalThis.fetch;let calls=0;
 Store.prototype.save=function(){if(this.state?.planCatalogReview?.phase==='authorizing')throw Error('storage_io_failure');return oldSave.call(this);};globalThis.fetch=()=>{calls++;assert.fail('network');};
 try{await assert.rejects(executePlanCatalogReview(d),/storage_io_failure/);assert.equal(calls,0);}finally{Store.prototype.save=oldSave;globalThis.fetch=oldFetch;}
});
test('actual process exit after durable authorization or observed metadata cannot authorize a second login',async t=>{
 for(const phase of ['authorizing','observed']){
  const d=dirs(t);initPlanCatalogReview(d.directory,approval());
  const owner=new URL('../scripts/plan-catalog-review.mjs',import.meta.url).href,store=new URL('../src/store.js',import.meta.url).href,fixture=new URL('../test-support/plan-trial-fixtures.js',import.meta.url).href;
  const code=`import {executePlanCatalogReview} from ${JSON.stringify(owner)};import {Store} from ${JSON.stringify(store)};import {syntheticPlanHttp} from ${JSON.stringify(fixture)};const original=Store.prototype.save;Store.prototype.save=function(){const result=original.call(this);if(this.state.planCatalogReview?.phase===process.argv[3])process.exit(47);return result;};const http=syntheticPlanHttp({onGenerate:()=>{throw Error('no-inference');}});http.install();await executePlanCatalogReview({directory:process.argv[1],connectionDirectory:process.argv[2],onReady:http.onReady});`;
  const env={PATH:path.dirname(process.execPath)};if(process.platform==='win32'){env.SystemRoot=process.env.SystemRoot;env.WINDIR=process.env.SystemRoot;}
  const child=spawnSync(process.execPath,['--input-type=module','-e',code,d.directory,d.connectionDirectory,phase],{encoding:'utf8',timeout:20000,env});assert.equal(child.status,47,child.stderr);
  const old=globalThis.fetch;globalThis.fetch=()=>assert.fail('crash replay network');try{const r=await executePlanCatalogReview(d);assert.equal(r.status,phase==='authorizing'?'uncertain':'observed');assert.equal(r.remoteCleanupMayBeRequired,true);assert.equal(r.remoteRevocationConfirmed,'unknown');assert.equal(r.ready,false);}finally{globalThis.fetch=old;}
 }
});
test('overlap is refused while the first synthetic login is active and late cancelled catalogue body is discarded',async t=>{
 const d=dirs(t);initPlanCatalogReview(d.directory,approval());const http=syntheticPlanHttp();http.install();const base=globalThis.fetch;let gets=0,release,arrived;const gate=new Promise(resolve=>arrived=resolve),delayed=new Promise(resolve=>release=resolve),controller=new AbortController();
 globalThis.fetch=(url,options)=>{if(String(url)===`${planResource}/models`&&++gets===2){arrived();return delayed;}return base(url,options);};
 try{
  const pending=executePlanCatalogReview({...d,onReady:http.onReady,signal:controller.signal});await gate;
  await assert.rejects(executePlanCatalogReview(d),/store_busy/);controller.abort();const r=await pending;assert.equal(r.status,'cancelled');assert.equal(r.review,null);assert.equal(r.remoteRevocationConfirmed,true);release(Response.json(catalog()));await new Promise(resolve=>setImmediate(resolve));assert.equal(preflightPlanCatalogReview(d.directory).review,null);assert.equal(disk(d.directory).includes('SYNTHETIC-PRIVATE'),false);
 }finally{http.restore();}
});
