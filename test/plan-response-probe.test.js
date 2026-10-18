import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {Store} from '../src/store.js';
import {initPlanTrial,executePlanTrial} from '../scripts/chatgpt-plan-trial.mjs';
import {initPlanResponseProbe,executePlanResponseProbe,preflightPlanResponseProbe} from '../scripts/chatgpt-plan-response-probe.mjs';
import {readPlanTrialHistory} from '../scripts/chatgpt-plan-trial-history.mjs';
import {syntheticPlanHttp,trialApproval} from '../test-support/plan-trial-fixtures.js';
const approval=()=>({approveOneSubscriptionCall:true,allowFictionalEgress:true,acknowledgePriorFailedTrial:true,confirmNoExtraCredits:true,acknowledgeNoServerTokenCap:true});
const sse=event=>`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
const rejected=()=>new Response(sse({type:'response.output_item.added',item:{type:'reasoning',content:'PRIVATE-REJECTED-REASONING'}}),{headers:{'Content-Type':'text/event-stream'}});
export async function probeFixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'plan-response-probe-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));const d={root,parentDirectory:path.join(root,'parent'),directory:path.join(root,'probe'),connectionDirectory:path.join(root,'connection')};
 initPlanTrial(d.parentDirectory,trialApproval());const http=syntheticPlanHttp({onGenerate:()=>new Response('PRIVATE-PARENT',{headers:{'Content-Type':'application/json'}})});http.install();try{await executePlanTrial({directory:d.parentDirectory,connectionDirectory:d.connectionDirectory,onReady:http.onReady});}finally{http.restore();}
 const store=new Store(d.parentDirectory);delete Object.values(store.state.runs)[0].modelPortDiagnostic;store.state.planDreamTrial.proposal=JSON.parse(fs.readFileSync(new URL('../docs/proposals/gpt-plan-first-fictional-dream-v1-original.json',import.meta.url),'utf8'));store.save();store.close();return d;
}
function allText(root){return fs.readdirSync(root,{withFileTypes:true}).map(e=>e.isDirectory()?allText(path.join(root,e.name)):fs.readFileSync(path.join(root,e.name),'utf8')).join('\n');}
test('missing proposal approval is read-only and exact prior acknowledgement is required before new Store creation',async t=>{
 const d=await probeFixture(t);assert.equal(preflightPlanResponseProbe(d.directory,d.parentDirectory).reason,'probe_approval_required');assert.equal(fs.existsSync(d.directory),false);
 for(const a of [{}, {...approval(),acknowledgePriorFailedTrial:false},{...approval(),extra:true}])assert.throws(()=>initPlanResponseProbe(d.directory,d.parentDirectory,a));assert.equal(fs.existsSync(d.directory),false);
 await assert.rejects(executePlanResponseProbe({...d,onReady:()=>assert.fail('login')}),/probe_approval_required/);
 assert.throws(()=>initPlanResponseProbe(d.directory,path.join(d.root,'missing-parent'),approval()),/probe_prior_failed_trial_required/);assert.equal(fs.existsSync(d.directory),false);
});
test('one accepted synthetic scene saves only fixed diagnostics/usage; old book remains unchanged and replay cannot authenticate or dispatch',async t=>{
 const d=await probeFixture(t),before=fs.readFileSync(path.join(d.parentDirectory,'state.json'),'utf8');initPlanResponseProbe(d.directory,d.parentDirectory,approval());
 const http=syntheticPlanHttp();http.install();let out;try{out=await executePlanResponseProbe({...d,onReady:http.onReady});}finally{http.restore();}
 assert.equal(out.status,'accepted');assert.equal(out.external_calls_started,1);assert.equal(out.persistedGeneratedBody,false);assert.equal(out.usage.total_tokens,10);assert.equal(out.remoteRevocationConfirmed,true);assert.equal(http.bodies.length,1);assert.equal(http.revoked,1);assert.equal(out.qualityAssessed,false);
 const calls=http.calls.length;await executePlanResponseProbe({...d,onReady:()=>assert.fail('replay')});assert.equal(http.calls.length,calls);assert.equal(preflightPlanResponseProbe(d.directory,d.parentDirectory).ready,false);assert.equal(initPlanResponseProbe(d.directory,d.parentDirectory,approval()).ready,false);assert.equal(fs.readFileSync(path.join(d.parentDirectory,'state.json'),'utf8'),before);
 const store=new Store(d.directory);for(const key of ['runs','requests','sessions','entries','recalls'])assert.deepEqual(store.state[key],{});store.close();for(const marker of ['PRIVATE-PARENT','PRIVATE-REJECTED','SYNTHETIC-TRIAL-ACCESS','SYNTHETIC-TRIAL-REFRESH','A bowl'])assert.equal(allText(d.directory).includes(marker),false);
});
test('protocol rejection keeps one body-free code and no repair call, wake or original-response diagnosis',async t=>{
 const d=await probeFixture(t);initPlanResponseProbe(d.directory,d.parentDirectory,approval());const http=syntheticPlanHttp({onGenerate:rejected});http.install();let out;try{out=await executePlanResponseProbe({...d,onReady:http.onReady});}finally{http.restore();}
 assert.equal(out.status,'rejected');assert.equal(out.external_calls_started,1);assert.equal(out.validation_diagnostic.check,'plan_output_shape');assert.equal(out.usage,'unknown');assert.equal(http.bodies.length,1);assert.equal(out.oldTrialContinued,false);assert.equal(allText(d.directory).includes('PRIVATE-REJECTED'),false);assert.equal(readPlanTrialHistory(d.parentDirectory).validation_diagnostic,null);
});
test('queued cancellation consumes no call and durably consumes this probe without OAuth',async t=>{
 const d=await probeFixture(t);initPlanResponseProbe(d.directory,d.parentDirectory,approval());const controller=new AbortController();controller.abort();const out=await executePlanResponseProbe({...d,signal:controller.signal,onReady:()=>assert.fail('cancelled login')});assert.equal(out.status,'cancelled');assert.equal(out.external_calls_started,0);assert.equal(preflightPlanResponseProbe(d.directory,d.parentDirectory).ready,false);await executePlanResponseProbe({...d,onReady:()=>assert.fail('replay login')});
});
test('overlapping owner, parent changes, expiry and source withdrawal block dispatch and never refresh a grant',async t=>{
 const d=await probeFixture(t);initPlanResponseProbe(d.directory,d.parentDirectory,approval());const owner=new Store(d.directory);await assert.rejects(executePlanResponseProbe({...d,onReady:()=>assert.fail('owner login')}),/store_busy/);owner.close();
 let store=new Store(d.directory);const expires=store.state.planResponseProbe.expiresAt;store.state.planResponseProbe.approvedAt-=86400001;store.state.planResponseProbe.expiresAt-=86400001;store.save();store.close();assert.equal(preflightPlanResponseProbe(d.directory,d.parentDirectory).reason,'probe_expired');assert.throws(()=>initPlanResponseProbe(d.directory,d.parentDirectory,approval()),/probe_expired/);await assert.rejects(executePlanResponseProbe({...d,onReady:()=>assert.fail('expired login')}),/probe_expired/);
 store=new Store(d.directory);store.state.planResponseProbe.approvedAt=expires-86400000;store.state.planResponseProbe.expiresAt=expires;store.withdraw('fictional-plan-window-memory');store.close();await assert.rejects(executePlanResponseProbe({...d,onReady:()=>assert.fail('withdrawn login')}),/source_withdrawn/);
});
test('in-flight cancel suppresses a late successful body, keeps unknown usage and one intent',async t=>{
 const d=await probeFixture(t);initPlanResponseProbe(d.directory,d.parentDirectory,approval());const controller=new AbortController();let release,entered;const reached=new Promise(r=>entered=r),late=new Promise(r=>release=r);const http=syntheticPlanHttp({onGenerate:()=>{entered();return late;}});http.install();
 try{const pending=executePlanResponseProbe({...d,signal:controller.signal,onReady:http.onReady});await reached;controller.abort();const out=await pending;assert.equal(out.status,'cancelled');assert.equal(out.external_calls_started,1);assert.equal(out.usage,'unknown');assert.equal(http.bodies.length,1);release(rejected());assert.equal(allText(d.directory).includes('PRIVATE-REJECTED'),false);}finally{http.restore();}
});
test('process death after durable dispatch cannot log in or dispatch on replay',async t=>{
 const d=await probeFixture(t);initPlanResponseProbe(d.directory,d.parentDirectory,approval());const entry=new URL('../scripts/chatgpt-plan-response-probe.mjs',import.meta.url).href,fixture=new URL('../test-support/plan-trial-fixtures.js',import.meta.url).href;
 const code=`import {executePlanResponseProbe} from ${JSON.stringify(entry)};import {syntheticPlanHttp} from ${JSON.stringify(fixture)};const http=syntheticPlanHttp({onGenerate:()=>process.exit(47)});http.install();await executePlanResponseProbe({directory:process.argv[1],parentDirectory:process.argv[2],connectionDirectory:process.argv[3],onReady:http.onReady});`;
 const child=spawnSync(process.execPath,['--input-type=module','-e',code,d.directory,d.parentDirectory,d.connectionDirectory],{encoding:'utf8'});assert.equal(child.status,47,child.stderr);const out=await executePlanResponseProbe({...d,onReady:()=>assert.fail('crash login')});assert.equal(out.status,'uncertain');assert.equal(out.external_calls_started,1);assert.equal(out.remoteRevocationConfirmed,'unknown');assert.equal(out.validation_diagnostic,null);
});
test('initial authorizing persistence and durable intent failures prevent generation, while replay stays consumed',async t=>{
 for(const phase of ['authorizing','dispatched']){
  const d=await probeFixture(t);initPlanResponseProbe(d.directory,d.parentDirectory,approval());const save=Store.prototype.save;Store.prototype.save=function(){if(this.directory===d.directory&&this.state.planResponseProbe?.phase===phase)fs.mkdirSync(path.join(this.directory,'snapshot.tmp'));return save.call(this);};
  const http=syntheticPlanHttp();http.install();try{await assert.rejects(executePlanResponseProbe({...d,onReady:http.onReady}),/store_unavailable|storage_io_failure/);}finally{Store.prototype.save=save;http.restore();}
  assert.equal(http.bodies.length,0);if(phase==='authorizing')assert.equal(http.calls.length,0);else assert.equal(http.revoked,1);fs.rmdirSync(path.join(d.directory,'snapshot.tmp'));
  if(phase==='dispatched'){const out=await executePlanResponseProbe({...d,onReady:()=>assert.fail('intent failure replay')});assert.equal(out.status,'uncertain');assert.equal(out.external_calls_started,0);}
 }
});
test('diagnostic settlement failure cannot publish accepted metadata and cannot retry the retained unknown intent',async t=>{
 const d=await probeFixture(t);initPlanResponseProbe(d.directory,d.parentDirectory,approval());const save=Store.prototype.save;Store.prototype.save=function(){if(this.directory===d.directory&&this.state.planResponseProbe?.phase==='accepted')fs.mkdirSync(path.join(this.directory,'snapshot.tmp'));return save.call(this);};const http=syntheticPlanHttp();http.install();
 try{await assert.rejects(executePlanResponseProbe({...d,onReady:http.onReady}),/store_unavailable|storage_io_failure/);}finally{Store.prototype.save=save;http.restore();}assert.equal(http.bodies.length,1);assert.equal(http.revoked,1);fs.rmdirSync(path.join(d.directory,'snapshot.tmp'));
 const out=await executePlanResponseProbe({...d,onReady:()=>assert.fail('settle replay')});assert.equal(out.status,'uncertain');assert.equal(out.external_calls_started,1);assert.equal(out.usage,'unknown');assert.equal(out.persistedGeneratedBody,false);
});
test('source withdrawal during HTTP rejects late output across reopen and parent drift cannot be silently adopted',async t=>{
 const d=await probeFixture(t);initPlanResponseProbe(d.directory,d.parentDirectory,approval());let release,entered,owner;const reached=new Promise(r=>entered=r),late=new Promise(r=>release=r),save=Store.prototype.save;
 Store.prototype.save=function(){if(this.directory===d.directory)owner=this;return save.call(this);};
 const http=syntheticPlanHttp({onGenerate:()=>{entered();return late;}});http.install();
 try{const pending=executePlanResponseProbe({...d,onReady:http.onReady});await reached;owner.withdraw('fictional-plan-window-memory');release(rejected());const out=await pending;assert.equal(out.status,'rejected');assert.equal(out.error_category,'source_withdrawn');assert.equal(out.persistedGeneratedBody,false);assert.equal(http.bodies.length,1);assert.equal(allText(d.directory).includes('PRIVATE-REJECTED'),false);}
 finally{http.restore();Store.prototype.save=save;}
 assert.throws(()=>preflightPlanResponseProbe(d.directory,d.parentDirectory),/source_withdrawn/);await assert.rejects(executePlanResponseProbe({...d,onReady:()=>assert.fail('withdraw replay login')}),/source_withdrawn/);
 const parent=new Store(d.parentDirectory);parent.withdraw('fictional-plan-window-memory');parent.close();assert.throws(()=>preflightPlanResponseProbe(d.directory,d.parentDirectory),/probe_prior_failed_trial_required/);
});
test('timeout bounds a noncooperative response and an oversized stream remains one rejected call',async t=>{
 for(const kind of ['timeout','oversized']){
  const d=await probeFixture(t);initPlanResponseProbe(d.directory,d.parentDirectory,approval());const nativeTimer=globalThis.setTimeout;globalThis.setTimeout=(fn,ms,...args)=>nativeTimer(fn,ms===60000?20:ms,...args);
  const http=syntheticPlanHttp({onGenerate:()=>kind==='timeout'?new Promise(()=>{}):new Response(Buffer.alloc(65537,120),{headers:{'Content-Type':'text/event-stream'}})});http.install();let out;
  try{out=await executePlanResponseProbe({...d,onReady:http.onReady});}finally{http.restore();globalThis.setTimeout=nativeTimer;}
  assert.equal(out.status,'rejected');assert.equal(out.external_calls_started,1);assert.equal(http.bodies.length,1);assert.equal(out.usage,'unknown');assert.equal(out.persistedGeneratedBody,false);assert.equal(out.remoteRevocationConfirmed,true);if(kind==='timeout')assert.equal(out.error_category,'timeout');else assert.equal(out.validation_diagnostic.check,'http_stream_limit');
 }
});
test('CLI rejects unknown, API, retry, duplicate and broad approval flags before any Store or credential access',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'probe-cli-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));const cli=new URL('../scripts/chatgpt-plan-response-probe-cli.mjs',import.meta.url);
 for(const args of [['run'],['run','--live','--retry'],['init','--approve-all'],['preflight','--live'],['run','--live','--live'],['run','--api-key','SECRET']]){
  const child=spawnSync(process.execPath,[fileURLToPath(cli),...args],{encoding:'utf8',env:{...process.env,LOCALAPPDATA:root,NIGHTVOYAGE_DEEPSEEK_KEY:'SYNTHETIC-UNREAD-SECRET'}});assert.notEqual(child.status,0);assert.match(child.stderr,/probe_arguments_invalid/);assert.equal(child.stdout.includes('SECRET'),false);assert.deepEqual(fs.readdirSync(root),[]);
 }
});
test('immutable parent binding and phase/count consistency reject altered metadata before authorization',async t=>{
 const d=await probeFixture(t);initPlanResponseProbe(d.directory,d.parentDirectory,approval());let store=new Store(d.directory),original=structuredClone(store.state.planResponseProbe);store.state.planResponseProbe.externalCallIntents=1;store.save();store.close();await assert.rejects(executePlanResponseProbe({...d,onReady:()=>assert.fail('inconsistent login')}),/probe_record_invalid/);
 store=new Store(d.directory);store.state.planResponseProbe=original;store.save();store.close();const parent=new Store(d.parentDirectory);parent.state.planDreamTrial.remoteRevocationConfirmed=false;parent.save();parent.close();await assert.rejects(executePlanResponseProbe({...d,onReady:()=>assert.fail('parent altered login')}),/probe_prior_failed_trial_required/);
});
test('source manifest is LF/CRLF stable and an altered dependency blocks before approval or directory creation',async t=>{
 const d=await probeFixture(t),{planResponseProbeProposal}=await import('../scripts/chatgpt-plan-response-probe.mjs'),proposal=planResponseProbeProposal(),copy=path.join(d.root,'project');
 for(const file of [...Object.keys(proposal.sourcePins),'examples/gpt-plan-trial.snapshot.json','docs/proposals/gpt-plan-single-response-diagnostic-v1.json']){const dest=path.join(copy,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,fs.readFileSync(new URL('../'+file,import.meta.url),'utf8').replaceAll('\r\n','\n').replaceAll('\n','\r\n'));}
 const {pathToFileURL}=await import('node:url'),entry=pathToFileURL(path.join(copy,'scripts/chatgpt-plan-response-probe.mjs')).href;
 const code=`import {preflightPlanResponseProbe} from ${JSON.stringify(entry)};console.log(preflightPlanResponseProbe(process.argv[1],process.argv[2]).reason);`;
 const target=path.join(d.root,'must-not-create');let child=spawnSync(process.execPath,['--input-type=module','-e',code,target,d.parentDirectory],{encoding:'utf8'});assert.equal(child.status,0,child.stderr);assert.match(child.stdout,/probe_approval_required/);assert.equal(fs.existsSync(target),false);
 fs.appendFileSync(path.join(copy,'scripts/chatgpt-plan-http.mjs'),'\r\n// synthetic change\r\n');child=spawnSync(process.execPath,['--input-type=module','-e',code,target,d.parentDirectory],{encoding:'utf8'});assert.notEqual(child.status,0);assert.match(child.stderr,/probe_source_changed/);assert.equal(fs.existsSync(target),false);
});
