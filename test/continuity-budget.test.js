// Reuses project-owned coupled budget fault probes with a distinct candidate identity.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { BudgetedNightvoyage } from '../src/budgeted-runtime.js';
import { BudgetLedger, validateAllowance } from '../src/budget-ledger.js';
import { GatedDeepSeekClient } from '../src/gated-deepseek-client.js';
import { Store } from '../src/store.js';
import { normalizeContinuityScene, normalizeContinuityCheckpoint, buildContinuityRequest, continuityBudgetVersion, continuityDiagnostic, reviewedContinuityDiagnostic } from '../src/scene-continuity-protocol.js';
import { coupledAffectVersion } from '../src/coupled-affect-offline.js';
import { readAppraisalView } from '../src/appraisal-view.js';
import { singleSceneProposal } from '../src/single-scene-diagnostic.js';
import { neutral } from '../src/contract.js';

const probes=JSON.parse(fs.readFileSync(new URL('../fixtures/appraisal-probes.json',import.meta.url)));
const fixture=JSON.parse(fs.readFileSync(new URL('../fixtures/quality/sparse-context.json',import.meta.url)));
const seed=()=>{const s=structuredClone(fixture);s.sources[0].grant.modelEgress=true;return s;};
const pairs=JSON.parse(fs.readFileSync(new URL('../fixtures/coupled-affect-review.json',import.meta.url))).cases;
const wire=i=>{const v=structuredClone(pairs[i].coupled);v.evidence.push('梦');return v;};
const allowance=()=>({id:'continuity-stub-bound',mode:'stub',approved:true,expiresAt:Date.now()+60000,protocolVersion:continuityBudgetVersion,
  limits:{maxRuns:1,maxCalls:3,maxMicroCny:1000000},pricing:{model:'deepseek-flash',contextTokenLimit:1000,inputMicroCnyPerMillion:1000000,outputMicroCnyPerMillion:2000000,reference:'https://api-docs.deepseek.com/TEST-ONLY',checkedAt:1}});
function directory(t){const d=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-v2-billing-'));t.after(()=>fs.rmSync(d,{recursive:true,force:true}));return d;}
const http=data=>new Response(JSON.stringify({model:'deepseek-flash',choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(data)}}],usage:{prompt_tokens:100,completion_tokens:80,total_tokens:180}}));
function simulator(counter,mutate=()=>{}){return async(_url,r)=>{counter.calls++;const m=JSON.parse(JSON.parse(r.body).messages[1].content),data=m.stage==='wake'?{fragment:m.previousScenes.at(-1).event.split('。')[0]+'。',residue:0.1,associations:[]}:wire(m.sceneIndex);mutate(data,m);return http(data);};}
function setup(t,options={}){const d=directory(t),counter={calls:0},a=allowance(),e=new BudgetedNightvoyage(d,{allowance:a,mode:'stub',enabled:true,protocol:'scene-continuity-v1',credential:'DUMMY-COUPLED-BUDGET',fetchImpl:simulator(counter),...options});t.after(()=>e.close());return {d,e,a,counter};}
test('allowance binding is optional for legacy records, immutable when present and rejects unreviewed/offline versions',t=>{
  const d=directory(t),s=new Store(d),l=new BudgetLedger(s),legacy=allowance();delete legacy.protocolVersion;
  assert.equal(Object.hasOwn(validateAllowance(legacy),'protocolVersion'),false);l.approve(legacy);
  assert.throws(()=>l.approve({...legacy,protocolVersion:continuityBudgetVersion}),/allowance_conflict/);
  for(const version of [coupledAffectVersion,'arbitrary',null,{}])assert.throws(()=>validateAllowance({...legacy,protocolVersion:version}),/invalid_allowance_protocol/);
  l.approve({...allowance(),id:'bound'});assert.equal(l.status('bound').allowance.protocolVersion,continuityBudgetVersion);s.close();
});
test('candidate and offline coupled checkpoints have distinct identities and preserve counts',()=>{
  const first=normalizeContinuityScene(wire(0),neutral());assert.equal(first.appraisalBasis.protocolVersion,continuityBudgetVersion);assert.deepEqual(normalizeContinuityCheckpoint(first,neutral()),first);
  const request=buildContinuityRequest({stage:'scene',index:1,snapshot:fixture,scenes:[first]},{model:'deepseek-flash'}),m=JSON.parse(request.body.messages[1].content);
  assert.equal(request.protocolVersion,continuityBudgetVersion);assert.equal(m.previousScenes[0].appraisalBasis.protocolVersion,continuityBudgetVersion);assert.equal(m.previousScenes[0].normalizationAudit.discardedUnusedQuoteCount,1);
  const old=structuredClone(first);old.appraisalBasis.protocolVersion=coupledAffectVersion;assert.throws(()=>normalizeContinuityCheckpoint(old,neutral()),/invalid_continuity_checkpoint/);
  assert.throws(()=>buildContinuityRequest({stage:'scene',index:1,snapshot:fixture,scenes:[old]},{model:'deepseek-flash'}),/invalid_continuity_checkpoint/);
});
test('continuity budget without a matching immutable allowance binding is blocked before reservation or dispatch',async t=>{
  const d=directory(t),s=new Store(d),l=new BudgetLedger(s),a=allowance();delete a.protocolVersion;l.approve(a);let calls=0;
  const client=new GatedDeepSeekClient(s,{mode:'stub',enabled:true,protocol:'scene-continuity-v1',fetchImpl:async()=>{calls++;return http(wire(0));}});
  const args={allowanceId:a.id,requestId:'scope',runId:'scope',credential:'dummy',payload:{stage:'scene',index:0,snapshot:seed(),scenes:[]}};
  await assert.rejects(client.send(args),/allowance_protocol_mismatch/);assert.equal(calls,0);assert.equal(l.status(a.id).calls,0);client.close();
  const bound=allowance();bound.id='new-bound';l.approve(bound);const old=new GatedDeepSeekClient(s,{mode:'stub',enabled:true,protocol:'compact-appraisal-v1',fetchImpl:async()=>{calls++;}});
  await assert.rejects(old.send({...args,allowanceId:bound.id}),/allowance_protocol_mismatch/);assert.equal(calls,0);assert.equal(l.status(bound.id).calls,0);old.close();s.close();
});
test('continuity live transport requires a matching local reviewed approval before opening a Store',t=>{
  assert.throws(()=>new GatedDeepSeekClient(null,{mode:'live',enabled:true,protocol:'scene-continuity-v1'}),/continuity_live_entry_pending/);
  const d=path.join(directory(t),'missing');assert.throws(()=>new BudgetedNightvoyage(d,{mode:'live',enabled:true,protocol:'scene-continuity-v1'}),/continuity_live_entry_pending/);assert.equal(fs.existsSync(d),false);
});
test('integrated continuity commits audits, scenes and three settled rows atomically without touching an older hold',async t=>{
  const {e,a,counter}=setup(t),l=e.client.ledger,old={...a,id:'legacy-hold'};delete old.protocolVersion;l.approve(old);l.reserve(old.id,{requestId:'prior',runId:'prior',fingerprint:'a'.repeat(64),sourceRefs:[{id:'q-sparse-memory',version:'1'}],maxOutputTokens:400});l.unknown(old.id,'prior');const oldAccount=structuredClone(l.account(old.id));
  const id=e.start('v2-loop','v2-loop',seed());assert.equal(e.run(id).billingProtocolVersion,continuityBudgetVersion);assert.equal(e.run(id).appraisalProtocolVersion,continuityBudgetVersion);
  assert.equal((await e.execute(id)).status,'completed');const p=e.result(id),view=readAppraisalView(e.store,p.dream.id);assert.equal(counter.calls,3);assert.ok(p.receipt.billing.every(r=>r.status==='settled'));
  assert.ok(p.dream.scenes.every(s=>s.normalizationAudit.discardedUnusedQuoteCount===1));assert.equal(view.protocolVersion,continuityBudgetVersion);assert.deepEqual(p.dream.scenes.map(s=>s.affectDeclaration.kind),['unchanged','estimated']);assert.equal(view.scenes[1].affectDeclaration.verification,'shape_only');assert.equal(view.scenes[0].control.value,null);assert.equal(view.isRealityFact,false);assert.deepEqual(l.account(old.id),oldAccount);
  await e.execute(id);assert.equal(counter.calls,3);assert.equal(singleSceneProposal().protocolVersion,'compact-appraisal-quotes-v1');
});
test('invalid continuity quotes and later affect rules retain typed body-free rejection and full unknown reservation',async t=>{
  for(const [mutate,check]of [[x=>x.evidence.push('not in event'),'invalid_compact_evidence'],[x=>x.affect={kind:'estimated',delta:{valence:0,arousal:0.1},evidence:null},'coupled_affect_shape_invalid']]){
    const counter={calls:0},{d,e,a}=setup(t,{fetchImpl:simulator(counter,mutate)}),id=e.start('invalid','invalid',seed());await e.execute(id);const row=e.status(id).billing[0];
    assert.equal(e.result(id).dream,null);assert.equal(row.status,'unknown');assert.equal(row.chargedMicroCny,row.reservedMicroCny);assert.equal(row.validationDiagnostic.protocolVersion,continuityBudgetVersion);assert.equal(row.validationDiagnostic.check,check);
    assert.ok(!fs.readFileSync(path.join(d,'state.json'),'utf8').includes(probes.scenes[0].event));e.close();
    const next=new BudgetedNightvoyage(d,{allowance:a,mode:'stub',enabled:true,protocol:'scene-continuity-v1',credential:'dummy',fetchImpl:simulator(counter)});await next.resume(id,{retryUnknown:true});assert.equal(counter.calls,1);assert.equal(next.result(id).dream,null);next.close();
  }
});
test('continuity budget diagnostic metadata strips arbitrary text and is accepted only by its bound account',t=>{
  const {e,a}=setup(t),l=e.client.ledger,d=continuityDiagnostic('invalid_compact_reference');assert.deepEqual(reviewedContinuityDiagnostic({...d,text:'DUMMY-NOT-PERSISTED'}),d);
  assert.equal(reviewedContinuityDiagnostic({...d,check:'DUMMY-NOT-PERSISTED'}),null);const requestId='metadata';l.reserve(a.id,{requestId,runId:'meta',fingerprint:'b'.repeat(64),sourceRefs:[{id:'q-sparse-memory',version:'1'}],maxOutputTokens:400});l.unknown(a.id,requestId,{...d,text:'DUMMY-NOT-PERSISTED'});
  assert.deepEqual(l.attempt(a.id,requestId).validationDiagnostic,d);assert.ok(!JSON.stringify(l.status(a.id)).includes('DUMMY-NOT-PERSISTED'));
  const old={...a,id:'old'};delete old.protocolVersion;l.approve(old);l.reserve(old.id,{requestId,runId:'meta',fingerprint:'c'.repeat(64),sourceRefs:[{id:'q-sparse-memory',version:'1'}],maxOutputTokens:400});l.unknown(old.id,requestId,d);assert.equal(l.attempt(old.id,requestId).validationDiagnostic,undefined);
});
test('continuity budget wake rejection cannot publish a dream or trigger a fourth repair call',async t=>{
  const counter={calls:0},{e}=setup(t,{fetchImpl:simulator(counter,(data,m)=>{if(m.stage==='wake')data.fragment='从未发生的新后续。';})}),id=e.start('wake','wake',seed());await e.execute(id);
  assert.equal(e.status(id).error,'wake_fragment_not_grounded');assert.equal(e.result(id).dream,null);assert.equal(e.status(id).billing[2].status,'unknown');await e.resume(id,{retryUnknown:true});assert.equal(counter.calls,3);
});
test('continuity budget cancellation and withdrawal suppress late output and purge counts/view/recall',async t=>{
  let begin,deliver;const started=new Promise(resolve=>begin=resolve),cancelled=setup(t,{fetchImpl:()=>{begin();return new Promise(resolve=>deliver=resolve);}}),id=cancelled.e.start('cancel','cancel',seed()),work=cancelled.e.execute(id);await started;cancelled.e.cancel(id);assert.equal((await work).status,'cancelled');deliver(http(wire(0)));await new Promise(resolve=>setImmediate(resolve));assert.equal(cancelled.e.result(id).dream,null);
  const {d,e,counter}=setup(t),good=e.start('good','good',seed());await e.execute(good);const entry=e.result(good).dream.id;e.recall('小船','cue');e.withdraw('q-sparse-memory');assert.equal(readAppraisalView(e.store,entry),null);assert.deepEqual(e.recall('小船','cue'),[]);assert.ok(!fs.readFileSync(path.join(d,'state.json'),'utf8').includes('normalizationAudit'));assert.ok(!fs.readFileSync(path.join(d,'state.json'),'utf8').includes('affectDeclaration'));assert.equal(counter.calls,3);
});
test('continuity budget run identity cannot switch allowance or protocol through execute/resume',async t=>{
  const {d,e,a}=setup(t),id=e.start('identity','identity',seed());assert.throws(()=>{e.client.protocol='compact-appraisal-v1';},TypeError);e.close();
  for(const options of [{protocol:'compact-appraisal-v1'},{protocol:'scene-continuity-v1',allowance:{...a,id:'other'}}]){
    const next=new BudgetedNightvoyage(d,{allowance:a,mode:'stub',enabled:true,credential:'dummy',fetchImpl:async()=>{throw Error('forbidden dispatch');},...options});assert.throws(()=>next.execute(id),/billing_run_identity_mismatch/);assert.throws(()=>next.resume(id,{retryUnknown:true}),/billing_run_identity_mismatch/);next.close();}
});
test('continuity budget atomic settlement failure reopens with neither audit nor scene and retains unknown hold',async t=>{
  const {d,e,a,counter}=setup(t),send=e.client.fetchImpl;e.client.fetchImpl=async(...args)=>{const r=await send(...args);fs.mkdirSync(path.join(d,'snapshot.tmp'));return r;};const id=e.start('io','io',seed());await assert.rejects(e.execute(id));e.close();fs.rmdirSync(path.join(d,'snapshot.tmp'));
  const next=new BudgetedNightvoyage(d,{allowance:a,mode:'stub',enabled:true,protocol:'scene-continuity-v1',credential:'dummy',fetchImpl:simulator(counter)}),row=next.status(id).billing[0];assert.equal(next.status(id).stagesSaved,0);assert.equal(next.result(id).dream,null);assert.equal(row.status,'unknown');assert.equal(row.chargedMicroCny,row.reservedMicroCny);assert.ok(!fs.readFileSync(path.join(d,'state.json'),'utf8').includes('normalizationAudit'));assert.ok(!fs.readFileSync(path.join(d,'state.json'),'utf8').includes('affectDeclaration'));next.close();
});
test('actual exit after coupled atomic scene commit resumes only the remaining two paid-path simulator stages',async t=>{
  const d=directory(t),a=allowance(),script=`import fs from 'node:fs';import {BudgetedNightvoyage} from './src/budgeted-runtime.js';const input=JSON.parse(fs.readFileSync('fixtures/quality/sparse-context.json'));input.sources[0].grant.modelEgress=true;const e=new BudgetedNightvoyage(process.argv[1],{allowance:JSON.parse(process.argv[2]),mode:'stub',enabled:true,protocol:'scene-continuity-v1',credential:'dummy',fetchImpl:async()=>new Response(${JSON.stringify(JSON.stringify({model:'deepseek-flash',choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(wire(0))}}],usage:{prompt_tokens:100,completion_tokens:80,total_tokens:180}}))}),fault:p=>{if(p==='scene_saved')process.exit(7);}});await e.execute(e.start('exit','exit',input));`;
  const child=spawnSync(process.execPath,['--input-type=module','-e',script,d,JSON.stringify(a)],{cwd:new URL('..',import.meta.url),encoding:'utf8'});assert.equal(child.status,7,child.stderr);
  const counter={calls:0},e=new BudgetedNightvoyage(d,{allowance:a,mode:'stub',enabled:true,protocol:'scene-continuity-v1',credential:'dummy',fetchImpl:simulator(counter)}),id=e.store.state.requests.exit.runId;
  assert.equal(e.run(id).scenes[0].normalizationAudit.discardedUnusedQuoteCount,1);assert.equal(e.status(id).billing[0].status,'settled');assert.equal((await e.resume(id,{retryUnknown:true})).status,'completed');assert.equal(counter.calls,2);assert.equal(e.status(id).billing.length,3);e.close();
});
test('actual exit after dispatch keeps unknown coupled hold and explicit resume cannot send again',async t=>{
  const d=directory(t),a=allowance(),script=`import fs from 'node:fs';import {BudgetedNightvoyage} from './src/budgeted-runtime.js';const input=JSON.parse(fs.readFileSync('fixtures/quality/sparse-context.json'));input.sources[0].grant.modelEgress=true;const e=new BudgetedNightvoyage(process.argv[1],{allowance:JSON.parse(process.argv[2]),mode:'stub',enabled:true,protocol:'scene-continuity-v1',credential:'dummy',fetchImpl:async()=>{throw Error('must not reach simulator');},fault:p=>{if(p==='dispatched')process.exit(8);}});await e.execute(e.start('dispatch','dispatch',input));`;
  const child=spawnSync(process.execPath,['--input-type=module','-e',script,d,JSON.stringify(a)],{cwd:new URL('..',import.meta.url),encoding:'utf8'});assert.equal(child.status,8,child.stderr);const counter={calls:0},e=new BudgetedNightvoyage(d,{allowance:a,mode:'stub',enabled:true,protocol:'scene-continuity-v1',credential:'dummy',fetchImpl:simulator(counter)}),id=e.store.state.requests.dispatch.runId;
  assert.equal(e.status(id).billing[0].status,'unknown');await e.resume(id,{retryUnknown:true});assert.equal(counter.calls,0);assert.equal(e.result(id).dream,null);e.close();
});
test('continuity budget allowance call cap and missing egress block before any over-limit dispatch',async t=>{
  const a=allowance();a.limits.maxCalls=1;const {e,counter}=setup(t,{allowance:a}),id=e.start('cap','cap',seed());await e.execute(id);assert.equal(counter.calls,1);assert.equal(e.status(id).stagesSaved,1);assert.equal(e.result(id).dream,null);
  const denied=setup(t),nid=denied.e.start('denied','denied',fixture);await denied.e.execute(nid);assert.equal(denied.counter.calls,0);assert.equal(denied.e.status(nid).billing.length,0);
});
test('continuity exact input/output byte ceilings reject before reserve or before publication without repair',async t=>{
  const large=seed();large.sources=Array.from({length:5},(_,i)=>({id:`large-${i}`,version:'1',text:'x'.repeat(20000),grant:{dream:true,modelEgress:true}}));large.channels.memory.sourceIds=large.sources.map(s=>s.id);
  const {e,a,counter}=setup(t),id=e.start('large','large',large);await e.execute(id);assert.equal(e.status(id).error,'provider_or_validation_failure');assert.equal(counter.calls,0);assert.equal(e.client.ledger.status(a.id).calls,0);
  for(const length of [1200,1201]){
    const raw=wire(0);raw.evidence=[];const fixed=Buffer.byteLength(JSON.stringify({...raw,event:''}));raw.event='x'.repeat(length-fixed);assert.equal(Buffer.byteLength(JSON.stringify(raw)),length);
    const c={calls:0},p=setup(t,{fetchImpl:async()=>{c.calls++;return http(raw);}}),run=p.e.start('bytes','bytes',seed());await p.e.execute(run);
    if(length===1200){assert.equal(p.e.status(run).stagesSaved,2);assert.equal(p.e.status(run).billing[0].status,'settled');}
    else{assert.equal(c.calls,1);assert.equal(p.e.status(run).stagesSaved,0);assert.equal(p.e.status(run).billing[0].status,'unknown');assert.equal(p.e.result(run).dream,null);}
  }
});
test('continuity direct-store in-flight withdrawal suppresses late response and reopen cannot reveal body',async t=>{
  let begun,deliver;const started=new Promise(r=>begun=r),{e,d,a}=setup(t,{fetchImpl:()=>{begun();return new Promise(r=>deliver=r);}}),id=e.start('late-withdraw','late-withdraw',seed()),work=e.execute(id);await started;
  e.store.withdraw('q-sparse-memory');deliver(http(wire(1)));await work;assert.equal(e.result(id).dream,null);assert.equal(e.status(id).billing[0].status,'unknown');e.close();
  const next=new BudgetedNightvoyage(d,{allowance:a,mode:'stub',enabled:true,protocol:'scene-continuity-v1',credential:'dummy',fetchImpl:async()=>assert.fail('withdrawn run dispatched')});
  assert.equal(next.result(id).dream,null);assert.deepEqual(next.recall('小船','after-withdraw'),[]);const disk=fs.readFileSync(path.join(d,'state.json'),'utf8');for(const s of [wire(1).event,'affectDeclaration','normalizationAudit'])assert.ok(!disk.includes(s));next.close();
});
test('continuity timeout and invalid usage each keep one unknown hold and no scene declaration',async t=>{
  for(const type of ['timeout','usage']){
    let calls=0;const {e,d,a}=setup(t,{timeoutMs:20,fetchImpl:async()=>{calls++;if(type==='timeout')return new Promise(()=>{});const body=await http(wire(0)).json();body.usage.completion_tokens=401;body.usage.total_tokens=501;return new Response(JSON.stringify(body));}}),id=e.start(type,type,seed());
    await e.execute(id);assert.equal(calls,1);const row=e.status(id).billing[0];assert.equal(row.status,'unknown');assert.equal(row.chargedMicroCny,row.reservedMicroCny);assert.equal(e.status(id).stagesSaved,0);assert.ok(!fs.readFileSync(path.join(d,'state.json'),'utf8').includes('affectDeclaration'));assert.equal(e.result(id).dream,null);e.close();
    const next=new BudgetedNightvoyage(d,{allowance:a,mode:'stub',enabled:true,protocol:'scene-continuity-v1',credential:'dummy',fetchImpl:async()=>assert.fail('unknown dispatch')});await next.resume(id,{retryUnknown:true});assert.equal(next.status(id).billing.length,1);next.close();
  }
});
test('continuity declarations, audits and policy identity cannot be forged before dispatch or via read view',async t=>{
  const {e,counter}=setup(t),id=e.start('forged','forged',seed());assert.equal(e.run(id).affectEncodingVersion,'explicit-affect-union-v1');
  e.run(id).affectEncodingVersion='unknown';assert.throws(()=>e.execute(id),/billing_run_identity_mismatch/);assert.equal(counter.calls,0);e.run(id).affectEncodingVersion='explicit-affect-union-v1';await e.execute(id);
  const packet=e.result(id),original=structuredClone(e.run(id).scenes[0]);e.run(id).scenes[0].affectDeclaration.kind='estimated';assert.throws(()=>e.execute(id),/invalid_coupled_checkpoint|invalid_continuity_checkpoint/);e.run(id).scenes[0]=original;
  e.store.state.entries[packet.dream.id].scenes[0].affectDeclaration.extra='not trusted';assert.throws(()=>readAppraisalView(e.store,packet.dream.id),/invalid_appraisal_view_record/);assert.equal(counter.calls,3);
});
test('continuity diagnostic checks are bounded, version-bound and cannot alter settled billing',t=>{
  for(const check of ['invalid_coupled_scene_shape','coupled_affect_shape_invalid','invalid_compact_evidence','affect_change_requires_evidence']){const d=continuityDiagnostic(check);assert.equal(d.check,check);assert.deepEqual(reviewedContinuityDiagnostic({...d,body:'DUMMY-UNTRUSTED'}),d);}
  assert.equal(continuityDiagnostic('DUMMY-EXCEPTION-TEXT').check,'unclassified_validation_failure');assert.equal(reviewedContinuityDiagnostic({...continuityDiagnostic('invalid_compact_evidence'),protocolVersion:'offline-coupled-affect-quotes-v1'}),null);
  const {e,a}=setup(t),l=e.client.ledger,r='settled-meta';l.reserve(a.id,{requestId:r,runId:r,fingerprint:'d'.repeat(64),sourceRefs:[{id:'q-sparse-memory',version:'1'}],maxOutputTokens:400});l.dispatch(a.id,r);l.settle(a.id,r,{model:'deepseek-flash',usage:{inputTokens:100,outputTokens:80,totalTokens:180}});const row=structuredClone(l.attempt(a.id,r));l.unknown(a.id,r,continuityDiagnostic('coupled_affect_shape_invalid'));assert.deepEqual(l.attempt(a.id,r),row);
});
test('continuity duplicate starts and overlapping execute dispatch once and queued cancel consumes no allowance',async t=>{
  let begin,deliver;const started=new Promise(r=>begin=r),counter={calls:0},{e}=setup(t,{fetchImpl:async(_u,r)=>{counter.calls++;if(counter.calls===1){begin();await new Promise(resolve=>deliver=resolve);}const m=JSON.parse(JSON.parse(r.body).messages[1].content);return http(m.stage==='scene'?wire(m.sceneIndex):{fragment:m.previousScenes.at(-1).event,residue:.1,associations:[]});}}),id=e.start('duplicate','duplicate',seed());assert.equal(e.start('duplicate','duplicate',seed()),id);const work=e.execute(id);await started;await assert.rejects(e.execute(id),/run_busy/);deliver();await work;assert.equal(counter.calls,3);await e.execute(id);assert.equal(counter.calls,3);
  const p=setup(t),cancel=p.e.start('queued','queued',seed());p.e.cancel(cancel);await p.e.execute(cancel);assert.equal(p.counter.calls,0);assert.equal(p.e.client.ledger.status(p.a.id).calls,0);
});
test('new coupled stub account preserves all three independent synthetic historical full holds byte-for-byte',async t=>{
  const {e,a}=setup(t),l=e.client.ledger,versions=['compact-appraisal-quotes-v1','compact-appraisal-quotes-v1','compact-appraisal-quotes-v2-pruned-unused'];
  for(let i=0;i<3;i++){
    const old={...a,id:`synthetic-history-${i}`,protocolVersion:versions[i],limits:{maxRuns:1,maxCalls:3,maxMicroCny:3000000},pricing:{...a.pricing,contextTokenLimit:1100000,inputMicroCnyPerMillion:2000000,outputMicroCnyPerMillion:8000000}};
    l.approve(old);l.reserve(old.id,{requestId:'unknown',runId:'unknown',fingerprint:String(i).repeat(64),sourceRefs:[{id:'q-sparse-memory',version:'1'}],maxOutputTokens:400});l.unknown(old.id,'unknown');assert.equal(l.status(old.id).heldOrSpentMicroCny,'2203200');
  }
  const before=Object.fromEntries(versions.map((_,i)=>{const id=`synthetic-history-${i}`;return [id,structuredClone(l.account(id))];}));await e.execute(e.start('with-three-holds','with-three-holds',seed()));
  for(const [id,account]of Object.entries(before))assert.deepEqual(l.account(id),account);assert.equal(l.status(a.id).calls,3);
});

test('actual candidate body is fingerprinted before reservation and identity is durable before HTTP',async t=>{
  const {hash}=await import('../src/contract.js'),{continuityIdentity}=await import('../src/scene-continuity-protocol.js'),{sceneContinuityPrompt}=await import('../src/scene-continuity-prompt-text.js');
  const bodies=[],{e,d}=setup(t,{fetchImpl:async(_url,r)=>{
    const body=JSON.parse(r.body),disk=JSON.parse(fs.readFileSync(path.join(d,'state.json'),'utf8')),run=Object.values(disk.runs)[0],account=disk.billing.accounts[e.allowanceId],row=Object.values(account.attempts).at(-1);
    for(const [k,v] of Object.entries(continuityIdentity()))assert.equal(run[k],v);
    assert.equal(run.billingProtocolVersion,continuityBudgetVersion);assert.equal(row.status,'dispatched');
    assert.equal(row.fingerprint,hash({runId:run.id,request:body,snapshot:run.snapshot}));
    bodies.push(body);const m=JSON.parse(body.messages[1].content);return http(m.stage==='scene'?wire(m.sceneIndex):{fragment:m.previousScenes[0].event,residue:.1,associations:[]});
  }});
  const id=e.start('fingerprinted','fingerprinted',seed());await e.execute(id);assert.equal(bodies.length,3);
  assert.equal(bodies[0].messages[0].content.includes(sceneContinuityPrompt),false);assert.equal(bodies[1].messages[0].content.endsWith(sceneContinuityPrompt),true);assert.equal(bodies[2].messages[0].content.includes(sceneContinuityPrompt),false);
  const original=e.run(id).promptCandidateHash;e.run(id).promptCandidateHash='f'.repeat(64);assert.throws(()=>e.execute(id),/billing_run_identity_mismatch/);assert.throws(()=>readAppraisalView(e.store,e.result(id).dream.id),/invalid_appraisal_view_record/);e.run(id).promptCandidateHash=original;
});
test('candidate content reader and independent reviews retain identity and disappear after deletion/reopen',async t=>{
  const {readContentReview}=await import('../src/content-review.js'),{AppraisalReviewStore}=await import('../src/appraisal-review-store.js'),{reviewRequest}=await import('../test-support/appraisal-review-fixtures.js');
  const {e,d,a}=setup(t),id=e.start('reader','reader',seed());await e.execute(id);const dream=e.result(id).dream,original=structuredClone(dream),reviews=new AppraisalReviewStore(e.store,{actorId:'candidate-reviewer',kind:'person'});
  const review=reviews.create(dream.id,reviewRequest());assert.equal(review.parent.protocolVersion,continuityBudgetVersion);
  const view=readContentReview(e.store,dream.id);assert.equal(view.appraisalView.protocolVersion,continuityBudgetVersion);assert.equal(view.reviews.length,1);assert.deepEqual(e.result(id).dream,original);
  e.deleteEntry(dream.id);assert.equal(readContentReview(e.store,dream.id),null);assert.equal(reviews.read(review.id),null);e.close();
  const next=new BudgetedNightvoyage(d,{allowance:a,mode:'stub',enabled:true,protocol:'scene-continuity-v1',credential:'dummy',fetchImpl:async()=>assert.fail('deleted run dispatched')});assert.equal(next.result(id).dream,null);assert.equal(readContentReview(next.store,dream.id),null);next.close();
});
test('candidate defaults, money cap, run cap and expiry stop before dispatch without resetting allowance',async t=>{
  const {e,a,counter}=setup(t,{enabled:false}),id=e.start('disabled','disabled',seed());await e.execute(id);assert.equal(counter.calls,0);assert.equal(e.client.ledger.status(a.id).calls,0);
  for(const kind of ['money','expiry','runs']){
    const a=allowance();if(kind==='runs')a.limits.maxCalls=6;if(kind==='money')a.limits.maxMicroCny=1;if(kind==='expiry')a.expiresAt=2;
    const x=setup(t,{allowance:a});if(kind==='runs'){await x.e.execute(x.e.start('first','first',seed()));}
    const run=x.e.start(kind,kind,seed());await x.e.execute(run);assert.equal(x.counter.calls,kind==='runs'?3:0);assert.equal(x.e.result(run).dream,null);
    assert.throws(()=>x.e.client.ledger.approve({...a,limits:{...a.limits,maxMicroCny:9999999}}),/allowance_conflict/);
  }
});
for(const dispatched of [2,3])test(`actual exit on candidate dispatch ${dispatched} retains prior scenes and never repeats the unknown call`,async t=>{
  const d=directory(t),a=allowance(),script=`import fs from 'node:fs';import {BudgetedNightvoyage} from './src/budgeted-runtime.js';const seed=JSON.parse(fs.readFileSync('fixtures/quality/sparse-context.json'));seed.sources[0].grant.modelEgress=true;const pairs=JSON.parse(fs.readFileSync('fixtures/coupled-affect-review.json')).cases;let dispatches=0;const e=new BudgetedNightvoyage(process.argv[1],{allowance:JSON.parse(process.argv[2]),mode:'stub',enabled:true,protocol:'scene-continuity-v1',credential:'dummy',fault:p=>{if(p==='dispatched'&&++dispatches===${dispatched})process.exit(8);},fetchImpl:async(_url,r)=>{const m=JSON.parse(JSON.parse(r.body).messages[1].content);return new Response(JSON.stringify({model:'deepseek-flash',choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(pairs[m.sceneIndex].coupled)}}],usage:{prompt_tokens:100,completion_tokens:80,total_tokens:180}}));}});await e.execute(e.start('prefix-unknown','prefix-unknown',seed));`;
  const child=spawnSync(process.execPath,['--input-type=module','-e',script,d,JSON.stringify(a)],{cwd:new URL('..',import.meta.url),encoding:'utf8'});assert.equal(child.status,8,child.stderr);
  const counter={calls:0},e=new BudgetedNightvoyage(d,{allowance:a,mode:'stub',enabled:true,protocol:'scene-continuity-v1',credential:'dummy',fetchImpl:simulator(counter)});try{
    const id=e.store.state.requests['prefix-unknown'].runId;assert.equal(e.status(id).stagesSaved,dispatched-1);assert.equal(e.status(id).billing.at(-1).status,'unknown');await e.resume(id,{retryUnknown:true});assert.equal(counter.calls,0);assert.equal(e.result(id).dream,null);assert.equal(e.status(id).billing.length,dispatched);
  }finally{e.close();}
});
test('fixed candidate budget command uses guarded stub transport and reports no provider billing or quality acceptance',()=>{
  const r=spawnSync(process.execPath,['scripts/check-continuity-budget.mjs'],{cwd:new URL('..',import.meta.url),encoding:'utf8'});assert.equal(r.status,0,r.stderr);const v=JSON.parse(r.stdout);assert.equal(v.stubCalls,3);assert.equal(v.stubSettledCalls,3);assert.equal(v.verifiedTransportFingerprints,3);assert.equal(v.realModelRequests,0);assert.equal(v.credentialReads,0);assert.equal(v.actualProviderBillingValidated,false);assert.equal(v.liveEntryAvailable,true);assert.equal(v.liveEntryRequiresSeparateApproval,true);assert.equal(v.historicalCoupledDispatchPinsMatch,false);assert.equal(v.withdrawalSurvivesReopen,true);assert.equal(v.qualityAssessed,false);
});
