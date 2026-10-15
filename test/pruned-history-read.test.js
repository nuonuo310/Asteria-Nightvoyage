import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { prunedV2ReviewedConfig, prunedV2ReviewedProposal } from '../src/pruned-v2-reviewed-profile.js';
import { readPrunedV2Trial, prunedV2TrialId } from '../src/pruned-v2-trial-config.js';
import { pricingProfile, profileExpiresAt } from '../src/trial-config.js';
const now=pricingProfile.checkedAt+1000;
function project(t,kind='queued') {
  const base=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-history-copy-'));t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
  const repo=path.join(base,'project'),data=path.join(base,'data');fs.mkdirSync(repo);
  for(const name of ['src','fixtures','test-support'])fs.cpSync(new URL(`../${name}`,import.meta.url),path.join(repo,name),{recursive:true});
  fs.copyFileSync(new URL('../package.json',import.meta.url),path.join(repo,'package.json'));
  const program=`import fs from 'node:fs';import {preparePrunedHistory} from './test-support/pruned-history-fixtures.js';import {initPrunedV2Trial,prunedV2TrialId,prunedV2TrialInput} from './src/pruned-v2-trial-config.js';import {BudgetedNightvoyage} from './src/budgeted-runtime.js';import {pricingProfile} from './src/trial-config.js';Date.now=()=>${now};const original=preparePrunedHistory({after:()=>{}});fs.renameSync(original,process.argv[1]);const d=process.argv[1],c=initPrunedV2Trial(d,{budgetCny:3,approvedCase:'sparse-context',approveFictionalEgress:true,acknowledgePreservedHolds:true});let calls=0;globalThis.fetch=async(_u,r)=>{calls++;const m=JSON.parse(JSON.parse(r.body).messages[1].content),pairs=JSON.parse(fs.readFileSync('fixtures/coupled-affect-review.json')).cases,data=m.stage==='wake'?{fragment:m.previousScenes.at(-1).event.split('。')[0]+'。',residue:.1,associations:[]}:pairs[m.sceneIndex].flat;if(${JSON.stringify(kind)}==='failed')data.delta.arousal=.1;return new Response(JSON.stringify({model:'deepseek-flash',choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(data)}}],usage:{prompt_tokens:100,completion_tokens:80,total_tokens:180}}));};if(${JSON.stringify(kind)}!=='queued'){const e=new BudgetedNightvoyage(d,{allowance:c.allowance,mode:'live',enabled:true,protocol:'compact-appraisal-v2',credential:'DUMMY-HISTORY-ONLY'});await e.execute(e.start(prunedV2TrialId,prunedV2TrialId,prunedV2TrialInput(c)));e.close();}console.log(JSON.stringify({calls}));`;
  const r=spawnSync(process.execPath,['--input-type=module','-e',program,data],{cwd:repo,encoding:'utf8'});assert.equal(r.status,0,r.stderr);return {base,repo,data,setupCalls:JSON.parse(r.stdout).calls};
}
function cli(p,args,{clock=now}={}) {
  const keyMarker=path.join(p.base,'key-read'),networkMarker=path.join(p.base,'network-call');
  const preload=`import fs from 'node:fs';Date.now=()=>${clock};process.env=new Proxy(process.env,{get(t,k){if(k==='NIGHTVOYAGE_DEEPSEEK_KEY'){fs.writeFileSync(${JSON.stringify(keyMarker)},'1');return 'DUMMY-NOT-A-KEY';}return Reflect.get(t,k);}});globalThis.fetch=async()=>{fs.writeFileSync(${JSON.stringify(networkMarker)},'1');throw Error('forbidden');};`;
  const r=spawnSync(process.execPath,['--import',`data:text/javascript,${encodeURIComponent(preload)}`,'src/pruned-v2-trial-cli.js',...args,'--data-dir',p.data],{cwd:p.repo,encoding:'utf8'});
  assert.equal(fs.existsSync(keyMarker),false);assert.equal(fs.existsSync(networkMarker),false);assert.ok(!`${r.stdout}${r.stderr}`.includes('DUMMY-NOT-A-KEY'));return r;
}
const disk=p=>JSON.parse(fs.readFileSync(path.join(p.data,'state.json')));
const drift=p=>{for(const file of ['gated-deepseek-client.js','budget-ledger.js','budgeted-runtime.js'])fs.appendFileSync(path.join(p.repo,'src',file),'\n// isolated no-behavior source drift\n');};
test('historical profile is detached immutable data and missing/config-tampered reads never create an account',t=>{
  const base=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-history-profile-'));t.after(()=>fs.rmSync(base,{recursive:true,force:true}));const c=prunedV2ReviewedConfig(),file=path.join(base,`${prunedV2TrialId}.json`);
  assert.throws(()=>readPrunedV2Trial(base),/missing_or_unsafe/);fs.writeFileSync(file,JSON.stringify(c));assert.deepEqual(readPrunedV2Trial(base),c);assert.equal(fs.existsSync(path.join(base,'state.json')),false);
  const proposal=prunedV2ReviewedProposal();assert.equal(proposal.fixtureEgressApproved,false);assert.equal(proposal.paidEvaluationApproved,false);proposal.protocolSourcePins['budget-ledger.js']='changed';assert.notEqual(prunedV2ReviewedProposal().protocolSourcePins['budget-ledger.js'],'changed');
  for(const change of [x=>x.allowance.limits.maxCalls=30,x=>x.expiresAt++,x=>x.protocolSourcePins['budget-ledger.js']='changed',x=>x.allowance.pricing.outputMicroCnyPerMillion=1,x=>x.fixtureEgressApproved=false,x=>x.extra=true]){const bad=structuredClone(c);change(bad);fs.writeFileSync(file,JSON.stringify(bad));assert.throws(()=>readPrunedV2Trial(base),/not_reviewed/);}
});
test('source drift keeps old unknown accounting readable but blocks new init/run before key/reservation',t=>{
  const p=project(t),before=disk(p).billing.accounts,config=fs.readFileSync(path.join(p.data,`${prunedV2TrialId}.json`),'utf8');drift(p);
  const pre=cli(p,['preflight']);assert.equal(pre.status,0,pre.stderr);const state=JSON.parse(pre.stdout);assert.equal(state.ready,false);assert.equal(state.reason,'pruned_v2_protocol_source_changed');assert.equal(state.sourcePinsMatch,false);assert.equal(state.preservedUnknowns.heldOrSpentMicroCny,'4406400');
  assert.equal(cli(p,['run','--live']).status,1);assert.equal(cli(p,['init','--approve-budget-cny','3','--approve-case','sparse-context','--allow-fictional-egress','--acknowledge-preserved-holds']).status,1);
  assert.deepEqual(disk(p).billing.accounts,before);assert.equal(fs.readFileSync(path.join(p.data,`${prunedV2TrialId}.json`),'utf8'),config);const read=cli(p,['read']);assert.equal(read.status,0,read.stderr);assert.equal(JSON.parse(read.stdout).status,'not_started');
});
test('failed third unknown stays body-free and unchanged through source drift and expiry reads',t=>{
  const p=project(t,'failed');assert.equal(p.setupCalls,1);const before=disk(p).billing.accounts;drift(p);
  for(const clock of [now,profileExpiresAt+1]) {const r=cli(p,['read'],{clock});assert.equal(r.status,0,r.stderr);const v=JSON.parse(r.stdout);assert.equal(v.dream,null);assert.equal(v.receipt.budget.calls,1);assert.equal(v.receipt.budget.heldOrSpentMicroCny,'2203200');assert.equal(v.receipt.billing[0].validationDiagnostic.check,'affect_change_requires_evidence');}
  assert.equal(cli(p,['run','--live','--resume']).status,1);assert.deepEqual(disk(p).billing.accounts,before);
});
test('completed historical dream/view replay survives source drift and expiry with zero key or fetch access',t=>{
  const p=project(t,'completed');assert.equal(p.setupCalls,3);const before=disk(p).billing.accounts;drift(p);
  let id;for(const args of [['read'],['run','--live']]){const r=cli(p,args,{clock:profileExpiresAt+1});assert.equal(r.status,0,r.stderr);const v=JSON.parse(r.stdout);assert.equal(v.receipt.status,'completed');assert.equal(v.appraisalView.status,'available');assert.equal(v.dream.isRealityFact,false);if(id)assert.equal(v.receipt.id,id);id=v.receipt.id;}
  assert.deepEqual(disk(p).billing.accounts,before);
});
test('withdrawal still removes historical bodies and stale replay even after source drift',t=>{
  const p=project(t,'completed'),before=disk(p).billing.accounts;drift(p);const r=spawnSync(process.execPath,['--input-type=module','-e',`import {Nightvoyage} from './src/engine.js';const e=new Nightvoyage(process.argv[1]);e.withdraw('q-sparse-memory');e.close();`,p.data],{cwd:p.repo,encoding:'utf8'});assert.equal(r.status,0,r.stderr);
  const read=cli(p,['read']);assert.equal(read.status,0,read.stderr);assert.equal(JSON.parse(read.stdout).dream,null);assert.equal(JSON.parse(read.stdout).appraisalView,null);assert.equal(cli(p,['run','--live']).status,1);assert.deepEqual(disk(p).billing.accounts,before);
});
test('unchanged sources but expired approval allow metadata reads while init and new run remain blocked',t=>{
  const p=project(t),before=disk(p).billing.accounts,pre=cli(p,['preflight'],{clock:profileExpiresAt+1});assert.equal(pre.status,0,pre.stderr);const v=JSON.parse(pre.stdout);assert.equal(v.sourcePinsMatch,true);assert.equal(v.reason,'pricing_or_allowance_expired');
  const read=cli(p,['read'],{clock:profileExpiresAt+1});assert.equal(read.status,0,read.stderr);assert.equal(cli(p,['run','--live'],{clock:profileExpiresAt+1}).status,1);assert.equal(cli(p,['init','--approve-budget-cny','3','--approve-case','sparse-context','--allow-fictional-egress','--acknowledge-preserved-holds'],{clock:profileExpiresAt+1}).status,1);assert.deepEqual(disk(p).billing.accounts,before);
});
test('historical CLI rejects mutated stored allowance despite source drift without revealing a body or reading key',t=>{
  const p=project(t,'completed'),state=disk(p);state.billing.accounts[prunedV2TrialId].allowance.limits.maxCalls=30;fs.writeFileSync(path.join(p.data,'state.json'),JSON.stringify(state));drift(p);assert.equal(cli(p,['read']).status,1);assert.equal(cli(p,['run','--live']).status,1);
});
