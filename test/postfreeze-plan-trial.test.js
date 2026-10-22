import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Store} from '../src/store.js';
import {calculatePostfreezePlanTrialProposal,postfreezePlanTrialProposal,initPostfreezePlanTrial,preflightPostfreezePlanTrial,executePostfreezePlanTrial,postfreezeReadinessDecision} from '../scripts/postfreeze-plan-trial.mjs';
import {PostfreezePlanAdapter} from '../scripts/postfreeze-plan-adapter.mjs';
import {readModelPortContent} from '../scripts/aggregate-plan-content-view.mjs';
import {runDreambook} from '../scripts/dreambook.mjs';
import {ChatgptPlanStream} from '../scripts/chatgpt-plan-protocol.mjs';
import {ValidatedEnvelopeStream} from '../scripts/validated-envelope-stream.mjs';
import {envelopeEvents,envelopeBytes,shapeModel} from '../test-support/offline-plan-envelope-fixtures.js';
import {envelopeTranscript} from '../test-support/offline-envelope-runtime-fixtures.js';
import {syntheticPlanHttp,trialApproval} from '../test-support/plan-trial-fixtures.js';

const fixtureUrl=new URL('../examples/gpt-plan-trial.snapshot.json',import.meta.url);
const setup=t=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-postfreeze-trial-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return {root,directory:path.join(root,'book'),connectionDirectory:path.join(root,'connection')};};
const allText=dir=>fs.readdirSync(dir,{withFileTypes:true}).map(entry=>entry.isDirectory()?allText(path.join(dir,entry.name)):fs.readFileSync(path.join(dir,entry.name),'utf8')).join('\n');
const install=(t,options={})=>{const http=syntheticPlanHttp({onGenerate:options.onGenerate??(body=>new Response(Buffer.concat(envelopeTranscript({body})),{headers:{'Content-Type':'text/event-stream; charset=utf-8'}}))});http.install();t.after(http.restore);return http;};

test('proposal binds fictional fixture, one model, one run and the full imported source closure',()=>{
 const proposal=postfreezePlanTrialProposal();
 assert.deepEqual(proposal,calculatePostfreezePlanTrialProposal());
 assert.equal(proposal.contractVersion,'nv-postfreeze-dream-01-v1');
 assert.equal(proposal.authorityCommit,'476b4378e78a0eab5371e2d6801bbd0f99c537dc');
 assert.equal(proposal.adapter_kind,'ChatGPTPlanAdapter');
 assert.equal(proposal.provider_kind,'openai');
 assert.equal(proposal.model_id,'gpt-5.6-sol');
 assert.equal(proposal.auth_mode,'chatgpt_plan');
 assert.equal(proposal.protocol_version,'chatgpt-plan-inline-missing-type-v1');
 assert.equal(proposal.decoder_version,'validated-reasoning-envelope-v1');
 assert.equal(proposal.fixtureHash,'b2481512fe1f4f3d597863eeaf8754cef61ef37ebad2d60ddf76f75e7772378a');
 assert.equal(proposal.maxRuns,1);assert.equal(proposal.maxCalls,3);
 assert.equal(proposal.apiFallback,false);assert.equal(proposal.automaticRetry,false);assert.equal(proposal.automaticModelSwitch,false);
 assert.equal(proposal.extraCreditsApproved,false);assert.equal(proposal.priorGrantReused,false);assert.equal(proposal.freshApprovalRequired,true);
 assert.equal(proposal.localLimits.serverOutputTokenCap,null);
 assert.ok(Object.keys(proposal.sourcePins).length>20);
 for(const [file,digest]of Object.entries(proposal.sourcePins)){assert.ok(!path.isAbsolute(file)&&!file.startsWith('../'));assert.match(digest,/^[a-f0-9]{64}$/);}
 const fixture=JSON.parse(fs.readFileSync(fixtureUrl,'utf8'));
 assert.equal(fixture.materialKind,'fictional');
 assert.ok(fixture.sources.every(source=>source.grant.modelEgress===false));
});

test('preflight without approval creates no directory, reads no credential and performs no fetch',t=>{
 const {directory}=setup(t);let calls=0;const saved=globalThis.fetch;globalThis.fetch=()=>{calls++;throw Error('UNEXPECTED');};t.after(()=>globalThis.fetch=saved);
 const result=preflightPostfreezePlanTrial(directory);
 assert.equal(result.ready,false);assert.equal(result.reason,'trial_approval_required');assert.equal(result.credentialRead,false);
 assert.equal(result.terminal_state,postfreezeReadinessDecision);assert.equal(fs.existsSync(directory),false);assert.equal(calls,0);
});

test('init binds exact approval once and a changed stored proposal fails closed',t=>{
 const {directory}=setup(t);initPostfreezePlanTrial(directory,trialApproval());
 let store=new Store(directory),original=structuredClone(store.state.postfreezeDreamTrial);store.close();
 initPostfreezePlanTrial(directory,trialApproval());
 store=new Store(directory);assert.deepEqual(store.state.postfreezeDreamTrial,original);store.state.postfreezeDreamTrial.proposal.model_id='fiction-changed';store.save();store.close();
 assert.throws(()=>preflightPostfreezePlanTrial(directory),/trial_source_pins_changed/);
});

test('official reasoning items are rejected by the old decoder and accepted only through the reviewed envelope',()=>{
 const bytes=envelopeBytes(envelopeEvents());
 assert.throws(()=>{const old=new ChatgptPlanStream(shapeModel);old.push(bytes);old.finish();},/plan_/);
 const current=new ValidatedEnvelopeStream(shapeModel);current.push(bytes);const result=current.finish();
 assert.ok(result.data);assert.equal(result.envelopeAudit.reasoningReturned,false);
 assert.ok(!JSON.stringify(result).includes('SYNTHETIC-REASONING-PRIVATE'));
 assert.ok(!JSON.stringify(result).includes('SYNTHETIC-ENCRYPTED-PRIVATE'));
});

test('forged transport or unreviewed model cannot enter the post-freeze adapter',()=>{
 assert.throws(()=>new PostfreezePlanAdapter({model_id:'gpt-5.6-sol',httpTransport:{ready:()=>true}}),/unreviewed_model_adapter/);
 assert.throws(()=>new PostfreezePlanAdapter({model_id:'fiction-other-model',httpTransport:{ready:()=>true}}),/unreviewed_model_adapter/);
});

test('synthetic two-scene and wake trial completes, stores typed residue, reads back and never repeats OAuth',async t=>{
 const dirs=setup(t);initPostfreezePlanTrial(dirs.directory,trialApproval());const http=install(t);
 const first=await executePostfreezePlanTrial({...dirs,onReady:http.onReady});
 assert.equal(first.receipt.status,'completed');assert.equal(http.bodies.length,3);assert.equal(first.receipt.external_calls_started,3);
 assert.match(first.receipt.proposalHash,/^[a-f0-9]{64}$/);assert.equal(first.receipt.fixtureHash,'b2481512fe1f4f3d597863eeaf8754cef61ef37ebad2d60ddf76f75e7772378a');
 assert.equal(first.receipt.checkpoint.saved_scenes,2);assert.equal(first.receipt.checkpoint.wake_saved,true);
 assert.equal(first.receipt.adapter_kind,'ChatGPTPlanAdapter');assert.equal(first.receipt.protocol_version,'chatgpt-plan-inline-missing-type-v1');assert.equal(first.receipt.decoder_version,'validated-reasoning-envelope-v1');
 assert.equal(first.receipt.apiFallback,false);assert.equal(first.receipt.automaticRetry,false);assert.equal(first.receipt.automaticModelSwitch,false);assert.equal(first.receipt.money,'unknown');
 assert.equal(first.receipt.usage.length,3);assert.deepEqual(first.receipt.usage[0].usage,{input_tokens:10,output_tokens:10,total_tokens:20});
 assert.equal(first.dream.isRealityFact,false);assert.equal(first.wake.origin,'wake_note');assert.equal(first.residue.origin,'simulated_affect');assert.equal(first.residue.isRealityFact,false);
 assert.ok(first.residue.sourceRefs.length>0);assert.ok(first.associations.every(item=>item.materialKind==='fictional'&&item.isRealityFact===false));
 assert.equal(allText(dirs.root).includes('SYNTHETIC-REASONING-PRIVATE'),false);assert.equal(allText(dirs.root).includes('SYNTHETIC-ENCRYPTED-PRIVATE'),false);assert.equal(allText(dirs.root).includes('not released early'),false);
 const calls=http.calls.length,replay=await executePostfreezePlanTrial({...dirs,onReady:()=>assert.fail('replay login')});
 assert.equal(http.calls.length,calls);assert.equal(http.bodies.length,3);assert.deepEqual(replay.dream,first.dream);assert.deepEqual(replay.wake,first.wake);assert.equal(replay.receipt.external_calls_started,3);
 const store=new Store(dirs.directory);try{const view=readModelPortContent(store,first.dream.id);assert.equal(view.narrative.dream.origin,'dream');assert.deepEqual(view.narrative.wake,first.wake);assert.ok(view.sourceRefs.length>0);}finally{store.close();}
 assert.ok(runDreambook(['read','--latest','--data-dir',dirs.directory]).includes(first.dream.scenes[0].event));
 assert.equal(preflightPostfreezePlanTrial(dirs.directory).reason,'trial_consumed');
});

test('missing Content-Type requires a complete validated envelope and remains readable in Dreambook',async t=>{
 const dirs=setup(t);initPostfreezePlanTrial(dirs.directory,trialApproval());
 const http=install(t,{onGenerate:body=>new Response(Buffer.concat(envelopeTranscript({body})))});
 const output=await executePostfreezePlanTrial({...dirs,onReady:http.onReady});
 assert.equal(output.receipt.status,'completed');assert.equal(http.bodies.length,3);
 assert.equal(output.receipt.protocol_version,'chatgpt-plan-inline-missing-type-v1');
 assert.ok(output.dream?.scenes?.length===2);assert.equal(output.wake?.isRealityFact,false);
 assert.ok(runDreambook(['read','--latest','--data-dir',dirs.directory]).includes(output.dream.scenes[0].event));
});

test('missing Content-Type with an incomplete stream still consumes only one call and saves no dream',async t=>{
 const dirs=setup(t);initPostfreezePlanTrial(dirs.directory,trialApproval());
 const http=install(t,{onGenerate:()=>new Response('event: response.created\ndata: {}\n\n')});
 const output=await executePostfreezePlanTrial({...dirs,onReady:http.onReady});
 assert.equal(output.receipt.status,'failed');assert.equal(output.receipt.external_calls_started,1);
 assert.equal(http.bodies.length,1);assert.equal(output.receipt.checkpoint.saved_scenes,0);
 assert.equal(output.dream,null);assert.equal(output.wake,null);
});

test('a first-stage protocol rejection stops before a scene checkpoint or wake dispatch',async t=>{
 const dirs=setup(t);initPostfreezePlanTrial(dirs.directory,trialApproval());
 const http=install(t,{onGenerate:body=>new Response(Buffer.concat(envelopeTranscript({body},undefined,events=>{events[0].item.summary=null;})),{headers:{'Content-Type':'text/event-stream; charset=utf-8'}})});
 const output=await executePostfreezePlanTrial({...dirs,onReady:http.onReady});
 assert.equal(output.receipt.status,'failed');assert.equal(http.bodies.length,1);assert.equal(output.receipt.external_calls_started,1);
 assert.equal(output.receipt.checkpoint.saved_scenes,0);assert.equal(output.receipt.checkpoint.wake_saved,false);assert.equal(output.dream,null);assert.equal(output.wake,null);
 assert.equal(output.receipt.error_category,'invalid_model_response');assert.deepEqual(output.receipt.validation_diagnostic,{schemaVersion:1,layer:'responses_protocol',check:'plan_output_shape'});
 assert.equal(output.receipt.usage[0].usage,'unknown');assert.equal(output.receipt.remoteCancellationConfirmed,'unknown');
 const calls=http.calls.length,replay=await executePostfreezePlanTrial({...dirs,onReady:()=>assert.fail('failed trial replay login')});
 assert.equal(http.calls.length,calls);assert.equal(http.bodies.length,1);assert.equal(replay.receipt.status,'failed');
});

test('a second-stage protocol rejection stops at the saved first-scene checkpoint without retry',async t=>{
 const dirs=setup(t);initPostfreezePlanTrial(dirs.directory,trialApproval());
 const http=install(t,{onGenerate:(body,options,n)=>new Response(Buffer.concat(envelopeTranscript({body},undefined,events=>{if(n===2)events[0].item.summary=null;})),{headers:{'Content-Type':'text/event-stream; charset=utf-8'}})});
 const output=await executePostfreezePlanTrial({...dirs,onReady:http.onReady});
 assert.equal(output.receipt.status,'failed');assert.equal(http.bodies.length,2);assert.equal(output.receipt.external_calls_started,2);
 assert.equal(output.receipt.checkpoint.saved_scenes,1);assert.equal(output.receipt.checkpoint.wake_saved,false);assert.equal(output.dream,null);assert.equal(output.wake,null);
 assert.equal(output.receipt.error_category,'invalid_model_response');assert.deepEqual(output.receipt.validation_diagnostic,{schemaVersion:1,layer:'responses_protocol',check:'plan_output_shape'});
 assert.equal(output.receipt.usage[1].usage,'unknown');assert.equal(output.receipt.remoteCancellationConfirmed,'unknown');
 const calls=http.calls.length,replay=await executePostfreezePlanTrial({...dirs,onReady:()=>assert.fail('failed trial replay login')});
 assert.equal(http.calls.length,calls);assert.equal(http.bodies.length,2);assert.equal(replay.receipt.status,'failed');assert.equal(preflightPostfreezePlanTrial(dirs.directory).reason,'trial_consumed');
});

test('non-SSE HTTP 200 fails closed at the exact transport boundary and does not publish',async t=>{
 const dirs=setup(t);initPostfreezePlanTrial(dirs.directory,trialApproval());
 const http=install(t,{onGenerate:()=>new Response('synthetic html',{headers:{'Content-Type':'text/html'}})});
 const output=await executePostfreezePlanTrial({...dirs,onReady:http.onReady});
 assert.equal(output.receipt.status,'failed');assert.equal(http.bodies.length,1);assert.equal(output.receipt.external_calls_started,1);assert.equal(output.dream,null);assert.equal(output.wake,null);
 assert.deepEqual(output.receipt.validation_diagnostic,{schemaVersion:1,layer:'http',check:'http_content_type'});
});

test('source withdrawal and expired approval both stop before OAuth or dispatch',async t=>{
 const withdrawn=setup(t);initPostfreezePlanTrial(withdrawn.directory,trialApproval());
 const source=JSON.parse(fs.readFileSync(fixtureUrl,'utf8')).sources[0].id;
 let store=new Store(withdrawn.directory);store.withdraw(source);store.close();
 await assert.rejects(executePostfreezePlanTrial({...withdrawn,onReady:()=>assert.fail('withdrawn login')}),/source_withdrawn/);

 const expired=setup(t);initPostfreezePlanTrial(expired.directory,trialApproval());
 store=new Store(expired.directory);const state=store.state.postfreezeDreamTrial,approvedAt=Date.now()-25*60*60*1000;
 state.approvedAt=approvedAt;state.expiresAt=approvedAt+state.proposal.approvalExpiryMs;store.save();store.close();
 assert.equal(preflightPostfreezePlanTrial(expired.directory).reason,'trial_expired');
 await assert.rejects(executePostfreezePlanTrial({...expired,onReady:()=>assert.fail('expired login')}),/trial_expired/);
});
