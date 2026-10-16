import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { prepareCoupledHistory } from '../test-support/coupled-trial-fixtures.js';
import { Store } from '../src/store.js';
import { BudgetLedger } from '../src/budget-ledger.js';
import { Nightvoyage } from '../src/engine.js';
import { BudgetedNightvoyage } from '../src/budgeted-runtime.js';
import { coupledTrialId, coupledTrialProposal, initCoupledTrial, readCoupledTrial, coupledTrialPreflight, coupledTrialInput, checkCoupledRequestBytes } from '../src/coupled-trial-config.js';
import { prunedV2TrialPreflight } from '../src/pruned-v2-trial-config.js';
const profile=JSON.parse(fs.readFileSync(new URL('../src/coupled-trial-profile.json',import.meta.url))),now=profile.allowance.pricing.checkedAt+1000;
const approve=(d,extra={})=>initCoupledTrial(d,{budgetCny:3,approvedCase:'sparse-context',approveFictionalEgress:true,acknowledgePreservedHolds:true,now,...extra});
const disk=d=>JSON.parse(fs.readFileSync(path.join(d,'state.json')));
const accountCopy=d=>{const a=disk(d).billing.accounts;delete a[coupledTrialId];return a;};
function cli(d,args,{behavior='ok',key=true,clock=now,repo=new URL('..',import.meta.url)}={}){
  const keyMarker=path.join(d,'test-key-read'),count=path.join(d,'test-call-count'),stage=path.join(d,'test-start-identity');
  const root=repo instanceof URL?repo:pathToFileURL(repo+path.sep);
  const preload=`import fs from 'node:fs';import {Store} from ${JSON.stringify(new URL('src/store.js',root).href)};import {BudgetedNightvoyage} from ${JSON.stringify(new URL('src/budgeted-runtime.js',root).href)};Date.now=()=>${clock};
  const env=process.env;process.env=new Proxy(env,{get(t,k){if(k==='NIGHTVOYAGE_DEEPSEEK_KEY'){fs.writeFileSync(${JSON.stringify(keyMarker)},'1');return ${key?"'DUMMY-COUPLED-ENTRY'":"undefined"};}return Reflect.get(t,k);}});
  const save=Store.prototype.save;Store.prototype.save=function(){save.call(this);if(${JSON.stringify(behavior)}==='exit-start'){const id=this.state.requests[${JSON.stringify(coupledTrialId)}]?.runId;if(id&&this.state.runs[id].status==='queued'){fs.writeFileSync(${JSON.stringify(stage)},JSON.stringify(this.state.runs[id]));process.exit(7);}}};
  const step=BudgetedNightvoyage.prototype.stage;BudgetedNightvoyage.prototype.stage=async function(...args){await step.apply(this,args);if(${JSON.stringify(behavior)}==='exit-scene')process.exit(7);};
  let calls=0;globalThis.fetch=async(_u,r)=>{calls++;fs.writeFileSync(${JSON.stringify(count)},String(calls));if(${JSON.stringify(behavior)}==='forbid')throw Error('FORBIDDEN-STUB');if(${JSON.stringify(behavior)}==='exit-dispatch')process.exit(8);if(${JSON.stringify(behavior)}==='cancel')process.emit('SIGINT');const pairs=JSON.parse(fs.readFileSync('fixtures/coupled-affect-review.json')).cases,m=JSON.parse(JSON.parse(r.body).messages[1].content),data=m.stage==='wake'?{fragment:m.previousScenes.at(-1).event.split('。')[0]+'。',residue:.1,associations:[]}:pairs[m.sceneIndex].coupled;
  if(${JSON.stringify(behavior)}==='invalid'&&m.stage==='scene')data.affect={kind:'estimated',delta:{valence:.1,arousal:0},evidence:null};
  if(${JSON.stringify(behavior)}==='bad-wake'&&m.stage==='wake')data.fragment='后来发生的新事件';
  return new Response(JSON.stringify({model:'deepseek-flash',choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(data)}}],usage:{prompt_tokens:100,completion_tokens:80,total_tokens:180}}));};`;
  const r=spawnSync(process.execPath,['--import',`data:text/javascript,${encodeURIComponent(preload)}`,'src/coupled-trial-cli.js',...args,'--data-dir',d],{cwd:repo,encoding:'utf8'});assert.ok(!`${r.stdout}${r.stderr}`.includes('DUMMY-COUPLED-ENTRY'));return {...r,keyRead:fs.existsSync(keyMarker),calls:fs.existsSync(count)?Number(fs.readFileSync(count)):0};
}
test('coupled proposal and missing-config preflight are unapproved and create no directory or credential access',t=>{
  const parent=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-coupled-missing-'));t.after(()=>fs.rmSync(parent,{recursive:true,force:true}));const d=path.join(parent,'absent'),p=coupledTrialProposal();assert.equal(p.fixtureEgressApproved,false);assert.equal(p.paidEvaluationApproved,false);assert.equal(p.maxAdditionalCalls,3);assert.equal(p.protocolVersion,'coupled-affect-quotes-v1');
  assert.equal(coupledTrialPreflight(d,now).reason,'coupled_approval_required');assert.equal(fs.existsSync(d),false);
  const result=cli(d,['preflight'],{key:false});assert.equal(result.status,0,result.stderr);assert.equal(result.keyRead,false);assert.equal(result.calls,0);assert.equal(fs.existsSync(d),false);
  p.protocolSourcePins['budget-ledger.js']='modified';assert.notEqual(coupledTrialProposal().protocolSourcePins['budget-ledger.js'],'modified');
});
test('coupled init requires exact case, budget, fictional egress and old-hold acknowledgement before creating data',t=>{
  const parent=prepareCoupledHistory(t),d=path.join(parent,'missing');
  for(const extra of [{budgetCny:1},{approvedCase:'courtyard-cloth'},{approveFictionalEgress:false},{acknowledgePreservedHolds:false}])assert.throws(()=>approve(d,extra),/explicit_coupled_approval_required/);
  assert.equal(fs.existsSync(d),false);assert.throws(()=>approve(d),/pruned_v2_approval_missing_or_unsafe/);assert.equal(fs.existsSync(d),false);
});
test('coupled allowance is separate and immutable; all three history accounts/configs stay byte-identical across init',t=>{
  const d=prepareCoupledHistory(t),before=accountCopy(d),files=fs.readdirSync(d).filter(x=>x.endsWith('.json')&&x!=='state.json').map(x=>[x,fs.readFileSync(path.join(d,x),'utf8')]);approve(d);approve(d);assert.deepEqual(accountCopy(d),before);
  for(const [f,b]of files)assert.equal(fs.readFileSync(path.join(d,f),'utf8'),b);const p=coupledTrialPreflight(d,now);assert.equal(p.ready,true);assert.equal(p.preservedUnknowns.heldOrSpentMicroCny,'6609600');assert.equal(p.nextReservationCny,2.2032);assert.equal(p.requestFits,true);assert.ok(p.requestBytes<65536);
  const s=new Store(d),l=new BudgetLedger(s);assert.throws(()=>l.approve({...profile.allowance,protocolVersion:'compact-appraisal-quotes-v2-pruned-unused'}),/allowance_conflict/);s.close();
});
test('coupled init rejects altered old holds and unrelated unresolved attempts without a new config/account',t=>{
  for(const mutate of [s=>s.state.billing.accounts['pruned-v2-dream-trial-20261015'].attempts['stage-synthetic-pruned-failure-scene-0'].chargedMicroCny='1',s=>{const l=new BudgetLedger(s),a=structuredClone(s.state.billing.accounts['pruned-v2-dream-trial-20261015'].allowance);a.id='extra';l.approve(a);l.reserve('extra',{requestId:'extra',runId:'extra',fingerprint:'a'.repeat(64),sourceRefs:[{id:'q-sparse-memory',version:'1'}],maxOutputTokens:400},a.pricing.checkedAt+1000);}]){
    const d=prepareCoupledHistory(t),s=new Store(d);mutate(s);s.save();s.close();assert.throws(()=>approve(d),/expected_three|other_unsettled/);assert.equal(fs.existsSync(path.join(d,`${coupledTrialId}.json`)),false);assert.equal(Object.hasOwn(disk(d).billing.accounts,coupledTrialId),false);
  }
});
test('coupled CLI rejects missing live flag, absent key, unknown/duplicate flags and overrides before dispatch',t=>{
  const d=prepareCoupledHistory(t);approve(d);
  for(const args of [['run'],['run','--live','--live'],['run','--live','--model','other'],['read','--live']]){const r=cli(d,args,{behavior:'forbid'});assert.equal(r.status,1);assert.equal(r.keyRead,false);assert.equal(r.calls,0);}
  const r=cli(d,['run','--live'],{key:false,behavior:'forbid'});assert.equal(r.status,1);assert.match(r.stderr,/credential_required/);assert.equal(r.calls,0);assert.equal(coupledTrialPreflight(d,now).coupledTrial.calls,0);
});
test('coupled CLI stub loop persists two declarations, typed view and three settlements; no-key replay cannot pay again',t=>{
  const d=prepareCoupledHistory(t),before=accountCopy(d);approve(d);const r=cli(d,['run','--live']);assert.equal(r.status,0,r.stderr);assert.equal(r.calls,3);const p=JSON.parse(r.stdout);assert.equal(p.receipt.status,'completed');assert.deepEqual(p.dream.scenes.map(s=>s.affectDeclaration.kind),['unchanged','estimated']);assert.equal(p.appraisalView.status,'available');assert.ok(p.receipt.billing.every(t=>t.status==='settled'));assert.equal(p.dream.isRealityFact,false);assert.deepEqual(accountCopy(d),before);
  fs.rmSync(path.join(d,'test-key-read'));for(const args of [['read'],['run','--live']]){const replay=cli(d,args,{key:false,behavior:'forbid'});assert.equal(replay.status,0,replay.stderr);assert.equal(replay.keyRead,false);assert.equal(replay.calls,3);assert.equal(JSON.parse(replay.stdout).receipt.id,p.receipt.id);}
  approve(d);assert.equal(coupledTrialPreflight(d,now).reason,'call_limit_reached');
});
test('coupled invalid scene retains fourth unknown hold, reads old metadata and never repairs or resets',t=>{
  const d=prepareCoupledHistory(t);approve(d);const before=accountCopy(d),r=cli(d,['run','--live'],{behavior:'invalid'});assert.equal(r.status,1,r.stderr);const p=JSON.parse(r.stdout);assert.equal(p.dream,null);assert.equal(p.receipt.billing[0].validationDiagnostic.check,'coupled_affect_shape_invalid');assert.equal(p.receipt.billing[0].status,'unknown');assert.equal(p.receipt.budget.heldOrSpentMicroCny,'2203200');assert.deepEqual(accountCopy(d),before);assert.equal(coupledTrialPreflight(d,now).reason,'unsettled_attempt_requires_review');
  // Historical inspections still work when another protocol has an unknown row.
  assert.equal(prunedV2TrialPreflight(d,now).allAllowances.heldOrSpentMicroCny,coupledTrialPreflight(d,now).allAllowances.heldOrSpentMicroCny);
  fs.rmSync(path.join(d,'test-key-read'));const again=cli(d,['run','--live','--resume'],{behavior:'forbid'});assert.equal(again.status,1);assert.equal(again.keyRead,false);assert.equal(again.calls,1);approve(d);assert.equal(coupledTrialPreflight(d,now).coupledTrial.calls,1);
});
test('coupled wake rejection cannot publish a dream or invoke a fourth repair request',t=>{
  const d=prepareCoupledHistory(t);approve(d);const r=cli(d,['run','--live'],{behavior:'bad-wake'});assert.equal(r.status,1);assert.equal(r.calls,3);const p=JSON.parse(r.stdout);assert.equal(p.receipt.status,'failed');assert.equal(p.receipt.error,'wake_fragment_not_grounded');assert.equal(p.dream,null);assert.equal(p.receipt.billing[2].status,'unknown');assert.equal(cli(d,['run','--live','--resume'],{behavior:'forbid'}).calls,3);
});
test('coupled actual exit after durable scene resumes explicitly and sends only remaining two stages',t=>{
  const d=prepareCoupledHistory(t);approve(d);const first=cli(d,['run','--live'],{behavior:'exit-scene'});assert.equal(first.status,7,first.stderr);const before=coupledTrialPreflight(d,now);assert.equal(before.run.stagesSaved,1);assert.equal(before.coupledTrial.calls,1);
  fs.rmSync(path.join(d,'test-key-read'));const blocked=cli(d,['run','--live'],{behavior:'forbid'});assert.equal(blocked.status,1);assert.equal(blocked.keyRead,false);const resumed=cli(d,['run','--live','--resume']);assert.equal(resumed.status,0,resumed.stderr);assert.equal(resumed.calls,2);assert.equal(JSON.parse(resumed.stdout).receipt.budget.calls,3);
});
test('coupled actual process death after dispatch retains full hold and explicit resume never reads Key',t=>{
  const d=prepareCoupledHistory(t);approve(d);assert.equal(cli(d,['run','--live'],{behavior:'exit-dispatch'}).status,8);assert.equal(coupledTrialPreflight(d,now).reason,'unsettled_attempt_requires_review');fs.rmSync(path.join(d,'test-key-read'));const again=cli(d,['run','--live','--resume'],{behavior:'forbid'});assert.equal(again.status,1);assert.equal(again.keyRead,false);assert.equal(again.calls,1);assert.equal(coupledTrialPreflight(d,now).coupledTrial.heldOrSpentMicroCny,'2203200');
});
test('coupled first durable start binds identity before dispatch; queued recovery sends no duplicate request',t=>{
  const d=prepareCoupledHistory(t);approve(d);const r=cli(d,['run','--live'],{behavior:'exit-start'});assert.equal(r.status,7,r.stderr);const saved=JSON.parse(fs.readFileSync(path.join(d,'test-start-identity')));assert.equal(saved.billingProtocolVersion,profile.protocolVersion);assert.equal(saved.affectEncodingVersion,'explicit-affect-union-v1');assert.equal(coupledTrialPreflight(d,now).coupledTrial.calls,0);assert.equal(cli(d,['run','--live']).calls,3);
});
test('coupled cancellation consumes at most one call and blocks all later execution without Key',t=>{
  const d=prepareCoupledHistory(t);approve(d);const r=cli(d,['run','--live'],{behavior:'cancel'});assert.equal(r.status,1);assert.equal(r.calls,1);assert.equal(JSON.parse(r.stdout).dream,null);fs.rmSync(path.join(d,'test-key-read'));const again=cli(d,['run','--live','--resume'],{behavior:'forbid'});assert.equal(again.status,1);assert.equal(again.keyRead,false);assert.equal(again.calls,1);
});
test('coupled withdrawal clears new bodies, views and recall while preserving historical billing and preventing reinit',t=>{
  const d=prepareCoupledHistory(t);approve(d);assert.equal(cli(d,['run','--live']).status,0);const before=disk(d).billing.accounts,e=new Nightvoyage(d);e.recall('小船','saved-cue');e.withdraw('q-sparse-memory');e.close();const r=cli(d,['read'],{key:false,behavior:'forbid'});assert.equal(r.status,0,r.stderr);const p=JSON.parse(r.stdout);assert.equal(p.dream,null);assert.equal(p.appraisalView,null);assert.deepEqual(disk(d).billing.accounts,before);assert.throws(()=>approve(d),/source_withdrawn/);assert.equal(coupledTrialPreflight(d,now).reason,'source_withdrawn');assert.ok(!fs.readFileSync(path.join(d,'state.json'),'utf8').includes('affectDeclaration'));
});
test('coupled expiration blocks new init/Key access without refreshing approval and completed reads remain available',t=>{
  const d=prepareCoupledHistory(t);approve(d);const c=fs.readFileSync(path.join(d,`${coupledTrialId}.json`),'utf8');assert.equal(coupledTrialPreflight(d,profile.expiresAt).reason,'pricing_or_allowance_expired');const r=cli(d,['run','--live'],{clock:profile.expiresAt,key:false});assert.equal(r.status,1);assert.equal(r.keyRead,false);assert.throws(()=>approve(d,{now:profile.expiresAt}),/pricing_review_expired/);assert.equal(fs.readFileSync(path.join(d,`${coupledTrialId}.json`),'utf8'),c);
  assert.equal(cli(d,['run','--live']).status,0);fs.rmSync(path.join(d,'test-key-read'));const replay=cli(d,['run','--live'],{clock:profile.expiresAt,key:false,behavior:'forbid'});assert.equal(replay.status,0,replay.stderr);assert.equal(replay.keyRead,false);assert.equal(replay.calls,3);
});
test('coupled config and actual ledger allowance tampering reject before Key/network',t=>{
  for(const config of [true,false]){const d=prepareCoupledHistory(t);approve(d);if(config){const c=readCoupledTrial(d);c.allowance.limits.maxCalls=9;fs.writeFileSync(path.join(d,`${coupledTrialId}.json`),JSON.stringify(c));}else{const s=new Store(d);s.state.billing.accounts[coupledTrialId].allowance.limits.maxCalls=9;s.save();s.close();}
    const r=cli(d,['run','--live'],{behavior:'forbid'});assert.equal(r.status,1);assert.equal(r.keyRead,false);assert.equal(r.calls,0);}
});
test('coupled pure request preflight rejects large fictional material without reserve, credentials or HTTP',()=>{
  const input=JSON.parse(fs.readFileSync(new URL('../fixtures/quality/sparse-context.json',import.meta.url)));input.sources=Array.from({length:5},(_,i)=>({id:`large-${i}`,version:'1',text:'x'.repeat(20000),grant:{dream:true,modelEgress:false}}));input.channels.memory.sourceIds=input.sources.map(s=>s.id);const p=checkCoupledRequestBytes(input);assert.equal(p.requestFits,false);assert.ok(p.requestBytes>65536);assert.equal(p.requestByteLimit,65536);
});
test('coupled second Store owner blocks before dispatch',t=>{
  const d=prepareCoupledHistory(t);approve(d);const s=new Store(d);try{const r=cli(d,['run','--live'],{behavior:'forbid'});assert.equal(r.status,1);assert.equal(r.keyRead,false);assert.equal(r.calls,0);}finally{s.close();}
});

test('coupled queued cancellation consumes zero allowance and blocks before Key on replay',t=>{
  const d=prepareCoupledHistory(t),config=approve(d),e=new BudgetedNightvoyage(d,{allowance:config.allowance,mode:'live',protocol:'coupled-affect-v1'}),id=e.start(coupledTrialId,coupledTrialId,coupledTrialInput(config));e.cancel(id);e.close();
  const r=cli(d,['run','--live'],{behavior:'forbid'});assert.equal(r.status,1);assert.equal(r.keyRead,false);assert.equal(r.calls,0);assert.equal(coupledTrialPreflight(d,now).coupledTrial.calls,0);
});
function projectCopy(t){
  const repo=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-coupled-source-'));t.after(()=>fs.rmSync(repo,{recursive:true,force:true}));for(const name of ['src','fixtures'])fs.cpSync(new URL('../'+name,import.meta.url),path.join(repo,name),{recursive:true});fs.copyFileSync(new URL('../package.json',import.meta.url),path.join(repo,'package.json'));return repo;
}
test('coupled current source drift blocks init/run before Key but old failed or completed records stay readable',t=>{
  for(const completed of [true,false]){
    const d=prepareCoupledHistory(t);approve(d);assert.equal(cli(d,['run','--live'],{behavior:completed?'ok':'invalid'}).status,completed?0:1);fs.rmSync(path.join(d,'test-key-read'));const before=disk(d).billing.accounts,repo=projectCopy(t);fs.appendFileSync(path.join(repo,'src/coupled-affect-protocol.js'),'\n// source drift probe\n');
    const pre=cli(d,['preflight'],{repo,behavior:'forbid'});assert.equal(pre.status,0,pre.stderr);assert.equal(JSON.parse(pre.stdout).reason,'coupled_protocol_source_changed');assert.equal(pre.keyRead,false);
    const read=cli(d,['read'],{repo,behavior:'forbid'});assert.equal(read.status,0,read.stderr);assert.equal(read.keyRead,false);assert.equal(JSON.parse(read.stdout).receipt.status,completed?'completed':'failed');
    const run=cli(d,['run','--live'],{repo,behavior:'forbid'});assert.equal(run.status,completed?0:1);assert.equal(run.keyRead,false);assert.deepEqual(disk(d).billing.accounts,before);
  }
});
test('coupled edited fictional fixture fails closed before Key; historical inspection requires intact shipped fixtures',t=>{
  const d=prepareCoupledHistory(t);approve(d);const repo=projectCopy(t);fs.appendFileSync(path.join(repo,'fixtures/quality/sparse-context.json'),' ');
  const pre=cli(d,['preflight'],{repo,behavior:'forbid'});assert.equal(pre.status,1);assert.match(pre.stderr,/coupled_fixture_changed/);assert.equal(pre.keyRead,false);
  const run=cli(d,['run','--live'],{repo,behavior:'forbid'});assert.equal(run.status,1);assert.equal(run.keyRead,false);assert.equal(run.calls,0);assert.equal(cli(d,['read'],{repo,behavior:'forbid'}).status,1);
});
test('coupled CLI checks the next saved checkpoint before accessing Key on explicit resume',t=>{
  const d=prepareCoupledHistory(t);approve(d);assert.equal(cli(d,['run','--live'],{behavior:'exit-scene'}).status,7);fs.rmSync(path.join(d,'test-key-read'));const s=new Store(d),id=s.state.requests[coupledTrialId].runId;s.state.runs[id].scenes[0].affectDeclaration.kind='estimated';s.save();s.close();
  const r=cli(d,['run','--live','--resume'],{behavior:'forbid'});assert.equal(r.status,1);assert.equal(r.keyRead,false);assert.equal(r.calls,1);
});
test('coupled storage admission failure creates no new approval or account and makes no request',t=>{
  const d=prepareCoupledHistory(t);fs.mkdirSync(path.join(d,'snapshot.tmp'));assert.throws(()=>approve(d),/unsafe_storage_file/);assert.equal(fs.existsSync(path.join(d,`${coupledTrialId}.json`)),false);assert.equal(Object.hasOwn(disk(d).billing.accounts,coupledTrialId),false);
});

test('coupled unrelated later unknown blocks new dispatch but leaves own and older historical reads accessible',t=>{
  const d=prepareCoupledHistory(t);approve(d);const s=new Store(d),l=new BudgetLedger(s),a=structuredClone(profile.allowance);a.id='later-unrelated';l.approve(a);l.reserve(a.id,{requestId:'later',runId:'later',fingerprint:'b'.repeat(64),sourceRefs:[{id:'q-sparse-memory',version:'1'}],maxOutputTokens:400},now);s.close();
  assert.equal(coupledTrialPreflight(d,now).reason,'other_unsettled_attempt_requires_review');const read=cli(d,['read'],{behavior:'forbid'});assert.equal(read.status,0,read.stderr);assert.equal(read.keyRead,false);assert.equal(prunedV2TrialPreflight(d,now).ready,false);
  const run=cli(d,['run','--live'],{behavior:'forbid'});assert.equal(run.status,1);assert.equal(run.keyRead,false);assert.equal(run.calls,0);
});
