import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { Store } from '../src/store.js';
import { BudgetLedger } from '../src/budget-ledger.js';
import { Nightvoyage } from '../src/engine.js';
import { hash } from '../src/contract.js';
import { initQualityBatch } from '../src/quality-config.js';
import { pricingProfile, profileExpiresAt } from '../src/trial-config.js';
import { prunedV2TrialId, prunedV2TrialProposal, initPrunedV2Trial, readPrunedV2Trial, prunedV2TrialInput, prunedV2TrialPreflight } from '../src/pruned-v2-trial-config.js';

import { compactTrialId, initCompactTrial } from '../src/compact-trial-config.js';
import { diagnosticId, initSingleSceneDiagnostic } from '../src/single-scene-diagnostic.js';
const now=pricingProfile.checkedAt+1000;
function setup(t,complete=true){const d=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-compact-entry-'));t.after(()=>fs.rmSync(d,{recursive:true,force:true}));
  const prior=initQualityBatch(d,{budgetCny:3,approvedCases:['courtyard-cloth','drawer-and-orbit','sparse-context'],approveFictionalEgress:true,acknowledgePreservedHolds:true,now});
  const s=new Store(d),l=new BudgetLedger(s);if(complete)for(let i=0;i<9;i++){
    const requestId=`prior-${i}`;l.reserve(prior.allowance.id,{requestId,runId:`prior-run-${Math.floor(i/3)}`,fingerprint:hash(requestId),sourceRefs:[{id:'q-sparse-memory',version:'1'}],maxOutputTokens:400},now);l.dispatch(prior.allowance.id,requestId);l.settle(prior.allowance.id,requestId,{model:'deepseek-flash',usage:{inputTokens:100,outputTokens:50,totalTokens:150}});
  }s.close();
  if(complete){
    const c=initCompactTrial(d,{budgetCny:3,approvedCase:'sparse-context',approveFictionalEgress:true,acknowledgePreservedHolds:true,now});
    let st=new Store(d),le=new BudgetLedger(st);const id='old-failed';
    st.state.requests[compactTrialId]={runId:id};st.state.runs[id]={id,status:'failed',error:'compact_appraisal_invalid',scenes:[],sourceIds:['q-sparse-memory'],billingAllowanceId:compactTrialId,billingProtocolVersion:c.protocolVersion,appraisalProtocolVersion:c.protocolVersion};st.save();
    le.reserve(compactTrialId,{requestId:`stage-${id}-scene-0`,runId:id,fingerprint:hash(id),sourceRefs:c.sourceRefs,maxOutputTokens:400},now);le.dispatch(compactTrialId,`stage-${id}-scene-0`);le.unknown(compactTrialId,`stage-${id}-scene-0`);st.close();
    initSingleSceneDiagnostic(d,{budgetCny:3,approvedCase:'sparse-context',approveFictionalEgress:true,approvePreservedHold:true,now});
    st=new Store(d);le=new BudgetLedger(st);const req=`${diagnosticId}-scene-0`;
    st.state.protocolDiagnostics={[diagnosticId]:{schemaVersion:1,protocolVersion:c.protocolVersion,allowanceId:diagnosticId,status:'failed'}};st.save();
    le.reserve(diagnosticId,{requestId:req,runId:diagnosticId,fingerprint:hash(req),sourceRefs:c.sourceRefs,maxOutputTokens:400},now);le.dispatch(diagnosticId,req);le.unknown(diagnosticId,req,{schemaVersion:1,protocolVersion:c.protocolVersion,stage:'scene',check:'unused_compact_evidence'});st.close();
  }
  return d;
}
const approve=d=>initPrunedV2Trial(d,{budgetCny:3,approvedCase:'sparse-context',approveFictionalEgress:true,acknowledgePreservedHolds:true,now});
function cli(d,args,{behavior='ok',key=true}={}){
  const moduleUrl=new URL('../src/compact-appraisal-protocol.js',import.meta.url).href,appraisalUrl=new URL('../src/appraisal-rehearsal.js',import.meta.url).href,runtimeUrl=new URL('../src/budgeted-runtime.js',import.meta.url).href;
  const count=path.join(d,'test-call-count.json'),probesUrl=new URL('../fixtures/appraisal-probes.json',import.meta.url).href;
  const storeUrl=new URL('../src/store.js',import.meta.url).href;
  const preload=`import fs from 'node:fs';import {Store} from ${JSON.stringify(storeUrl)};import {compactSceneData} from ${JSON.stringify(moduleUrl)};import {normalizeAppraisalScene} from ${JSON.stringify(appraisalUrl)};import {BudgetedNightvoyage} from ${JSON.stringify(runtimeUrl)};Date.now=()=>${now};let calls=0;const probes=JSON.parse(fs.readFileSync(new URL(${JSON.stringify(probesUrl)})));if(${JSON.stringify(behavior)}==='exit-after-scene'){const stage=BudgetedNightvoyage.prototype.stage;BudgetedNightvoyage.prototype.stage=async function(...args){await stage.apply(this,args);process.exit(7);};}if(${JSON.stringify(behavior)}==='exit-on-start'){const save=Store.prototype.save;Store.prototype.save=function(...args){save.apply(this,args);const id=this.state.requests[${JSON.stringify(prunedV2TrialId)}]?.runId;if(id&&this.state.runs[id].status==='queued')process.exit(7);};}
  globalThis.fetch=async(_url,r)=>{calls++;fs.writeFileSync(${JSON.stringify(count)},JSON.stringify({calls}));if(${JSON.stringify(behavior)}==='exit-in-flight')process.exit(7);if(${JSON.stringify(behavior)}==='forbid')throw Error('Unexpected test dispatch');if(${JSON.stringify(behavior)}==='cancel')process.emit('SIGINT');const m=JSON.parse(JSON.parse(r.body).messages[1].content),data=m.stage==='wake'?{fragment:m.previousScenes.at(-1).event,residue:0.1,associations:[]}:compactSceneData(normalizeAppraisalScene(probes.scenes[m.sceneIndex],{valence:0,arousal:0.2}));if(m.stage==='scene')data.evidence.push('梦');if(${JSON.stringify(behavior)}==='invalid'&&m.stage==='scene')data.links.control=99;return new Response(JSON.stringify({model:'deepseek-flash',choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(data)}}],usage:{prompt_tokens:100,completion_tokens:80,total_tokens:180}}));};`;
  const env={...process.env};if(key)env.NIGHTVOYAGE_DEEPSEEK_KEY='DUMMY-COMPACT-SENTINEL';else delete env.NIGHTVOYAGE_DEEPSEEK_KEY;
  const result=spawnSync(process.execPath,['--import',`data:text/javascript,${encodeURIComponent(preload)}`,'src/pruned-v2-trial-cli.js',...args,'--data-dir',d],{cwd:new URL('..',import.meta.url),encoding:'utf8',env});assert.ok(!`${result.stdout}${result.stderr}`.includes('DUMMY-COMPACT-SENTINEL'));return result;
}
test('pruned v2 proposal is unapproved and missing approval preflight creates no runtime directory',t=>{
  const parent=setup(t),d=path.join(parent,'absent');const p=prunedV2TrialProposal();assert.equal(p.caseId,'sparse-context');assert.equal(p.maxAdditionalCalls,3);assert.equal(p.paidEvaluationApproved,false);assert.equal(p.fixtureEgressApproved,false);
  assert.equal(prunedV2TrialPreflight(d,now).reason,'pruned_v2_approval_required');assert.equal(fs.existsSync(d),false);
  p.protocolSourcePins['compact-appraisal-protocol.js']='changed';assert.notEqual(prunedV2TrialProposal().protocolSourcePins['compact-appraisal-protocol.js'],'changed');
});
test('pruned v2 init needs exact case, egress, fee and completed prior quality screen',t=>{
  const d=setup(t,false);assert.throws(()=>approve(d),/compact_approval_missing_or_unsafe/);
  for(const options of [{},{budgetCny:3,approvedCase:'sparse-context'},{budgetCny:1,approvedCase:'sparse-context',approveFictionalEgress:true},{budgetCny:3,approvedCase:'courtyard-cloth',approveFictionalEgress:true}])assert.throws(()=>initPrunedV2Trial(d,{...options,now}),/explicit_pruned_v2_approval/);
  assert.equal(fs.existsSync(path.join(d,`${prunedV2TrialId}.json`)),false);
});
test('pruned v2 approval preserves prior ledger and cannot reset or edit its new immutable allowance',t=>{
  const d=setup(t);let s=new Store(d);const old=structuredClone(s.state.billing.accounts);s.close();const c=approve(d);approve(d);s=new Store(d);
  for(const [id,a] of Object.entries(old))assert.deepEqual(s.state.billing.accounts[id],a);s.close();assert.equal(prunedV2TrialPreflight(d,now).allAllowances.calls,11);assert.ok(prunedV2TrialInput(c).sources.every(s=>s.grant.modelEgress));
  const file=path.join(d,`${prunedV2TrialId}.json`),changed=JSON.parse(fs.readFileSync(file));changed.allowance.limits.maxCalls=30;fs.writeFileSync(file,JSON.stringify(changed));assert.throws(()=>readPrunedV2Trial(d),/not_reviewed/);
});
test('pruned v2 CLI remains disabled without live flag, approval or key and rejects unknown flags',t=>{
  const d=setup(t);for(const args of [['run'],['run','--live'],['run','--live','--live'],['init'],['run','--live','--model','other']])assert.equal(cli(d,args,{behavior:'forbid'}).status,1);
  approve(d);const r=cli(d,['run','--live'],{behavior:'forbid',key:false});assert.equal(r.status,1);assert.match(r.stderr,/credential_required/);assert.equal(fs.existsSync(path.join(d,'test-call-count.json')),false);
});
test('pruned v2 CLI simulator loop returns typed view, blocks cap and replays without credentials',t=>{
  const d=setup(t);approve(d);const r=cli(d,['run','--live']);assert.equal(r.status,0,r.stderr);const value=JSON.parse(r.stdout);assert.equal(value.receipt.status,'completed');assert.equal(value.appraisalView.protocolVersion,'compact-appraisal-quotes-v2-pruned-unused');assert.ok(value.dream.scenes.every(s=>s.normalizationAudit.discardedUnusedQuoteCount===1));assert.equal(value.appraisalView.scenes[0].control.value,null);assert.equal(value.appraisalView.scenes[1].control.status,'model_estimate');
  const before=prunedV2TrialPreflight(d,now);assert.equal(before.reason,'call_limit_reached');assert.equal(before.prunedV2Trial.calls,3);assert.equal(before.allAllowances.calls,14);
  for(const args of [['read'],['run','--live']]){const replay=cli(d,args,{key:false,behavior:'forbid'});assert.equal(replay.status,0,replay.stderr);assert.equal(JSON.parse(replay.stdout).receipt.id,value.receipt.id);}
  approve(d);assert.deepEqual(prunedV2TrialPreflight(d,now).prunedV2Trial,before.prunedV2Trial);assert.equal(JSON.parse(fs.readFileSync(path.join(d,'test-call-count.json'))).calls,3);
});
test('invalid pruned v2 reply and in-flight cancellation retain holds and never retry',t=>{
  for(const behavior of ['invalid','cancel']){const d=setup(t);approve(d);const r=cli(d,['run','--live'],{behavior});assert.equal(r.status,1,r.stderr);const packet=JSON.parse(r.stdout);assert.equal(packet.dream,null);assert.equal(packet.appraisalView,null);assert.equal(packet.receipt.budget.calls,1);assert.equal(packet.receipt.budget.heldOrSpentMicroCny,'2203200');assert.equal(prunedV2TrialPreflight(d,now).reason,'unsettled_attempt_requires_review');
    assert.equal(cli(d,['run','--live','--resume'],{behavior:'forbid'}).status,1);assert.equal(JSON.parse(fs.readFileSync(path.join(d,'test-call-count.json'))).calls,1);}
});
test('pruned v2 entry resumes a committed checkpoint only explicitly without paying for it twice',t=>{
  const d=setup(t);approve(d);assert.equal(cli(d,['run','--live'],{behavior:'exit-after-scene'}).status,7);assert.equal(prunedV2TrialPreflight(d,now).run.stagesSaved,1);
  assert.equal(cli(d,['run','--live'],{behavior:'forbid'}).status,1);const r=cli(d,['run','--live','--resume']);assert.equal(r.status,0,r.stderr);assert.equal(JSON.parse(r.stdout).receipt.budget.calls,3);assert.equal(JSON.parse(fs.readFileSync(path.join(d,'test-call-count.json'))).calls,2);
});
test('first durable pruned v2 start includes protocol/allowance identity before any dispatch',t=>{
  const d=setup(t);approve(d);assert.equal(cli(d,['run','--live'],{behavior:'exit-on-start'}).status,7);
  const check=prunedV2TrialPreflight(d,now);assert.equal(check.ready,true);assert.equal(check.run.status,'queued');assert.equal(check.prunedV2Trial.calls,0);
  const result=cli(d,['run','--live']);assert.equal(result.status,0,result.stderr);assert.equal(JSON.parse(result.stdout).receipt.budget.calls,3);
});
test('pruned v2 withdrawal blocks read/replay/reinit and expiry cannot extend approval',t=>{
  const d=setup(t);approve(d);assert.equal(cli(d,['run','--live']).status,0);const e=new Nightvoyage(d);e.withdraw('q-sparse-memory');e.close();
  const read=cli(d,['read'],{key:false,behavior:'forbid'});assert.equal(read.status,0,read.stderr);assert.equal(JSON.parse(read.stdout).dream,null);assert.equal(JSON.parse(read.stdout).appraisalView,null);
  assert.equal(cli(d,['run','--live'],{key:false,behavior:'forbid'}).status,1);assert.throws(()=>approve(d),/source_withdrawn/);
  const other=setup(t);approve(other);assert.equal(prunedV2TrialPreflight(other,profileExpiresAt).reason,'pricing_or_allowance_expired');assert.throws(()=>initPrunedV2Trial(other,{budgetCny:3,approvedCase:'sparse-context',approveFictionalEgress:true,acknowledgePreservedHolds:true,now:profileExpiresAt}),/expired/);
});

test('pruned v2 requires both exact preserved holds and rejects unrelated unresolved attempts',t=>{
  const d=setup(t),s=new Store(d),l=new BudgetLedger(s),old=structuredClone(l.account(compactTrialId));
  l.approve({...old.allowance,id:'unreviewed-hold'});l.reserve('unreviewed-hold',{requestId:'extra',runId:'extra',fingerprint:hash('extra'),sourceRefs:old.attempts[Object.keys(old.attempts)[0]].sourceRefs,maxOutputTokens:400},now);s.close();
  assert.throws(()=>approve(d),/other_unsettled/);
  const other=setup(t),st=new Store(other);st.state.protocolDiagnostics[diagnosticId].status='accepted';st.save();st.close();assert.throws(()=>approve(other),/expected_two_preserved_holds/);
});
test('pruned v2 approval requires explicit hold acknowledgement and binds protocol immutably',t=>{
  const d=setup(t);assert.throws(()=>initPrunedV2Trial(d,{budgetCny:3,approvedCase:'sparse-context',approveFictionalEgress:true,now}),/explicit_pruned_v2_approval/);
  const c=approve(d);assert.equal(c.allowance.protocolVersion,'compact-appraisal-quotes-v2-pruned-unused');assert.equal(prunedV2TrialPreflight(d,now).preservedUnknowns.heldOrSpentMicroCny,'4406400');
});

test('pruned v2 entry cannot replay an in-flight process death or open a second Store owner',t=>{
  const d=setup(t);approve(d);assert.equal(cli(d,['run','--live'],{behavior:'exit-in-flight'}).status,7);
  const state=prunedV2TrialPreflight(d,now);assert.equal(state.reason,'unsettled_attempt_requires_review');assert.equal(state.prunedV2Trial.calls,1);assert.equal(state.prunedV2Trial.heldOrSpentMicroCny,'2203200');
  assert.equal(cli(d,['run','--live','--resume'],{behavior:'forbid'}).status,1);assert.equal(JSON.parse(fs.readFileSync(path.join(d,'test-call-count.json'))).calls,1);
  const other=setup(t);approve(other);const s=new Store(other);try{assert.equal(cli(other,['run','--live'],{behavior:'forbid'}).status,1);assert.equal(fs.existsSync(path.join(other,'test-call-count.json')),false);}finally{s.close();}
});
test('pruned v2 missing approval and wrong ack cause no new directory or key read',t=>{
  const parent=setup(t),d=path.join(parent,'missing');assert.throws(()=>initPrunedV2Trial(d,{budgetCny:3,approvedCase:'sparse-context',approveFictionalEgress:true,now}),/explicit_pruned_v2_approval/);assert.equal(fs.existsSync(d),false);
  const r=cli(d,['preflight'],{behavior:'forbid'});assert.equal(r.status,0,r.stderr);assert.equal(JSON.parse(r.stdout).credentialRead,false);assert.equal(fs.existsSync(d),false);
});
