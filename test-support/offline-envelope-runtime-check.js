import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {OfflineEnvelopePlanAdapter,selectAdapter} from '../scripts/offline-envelope-model-port.mjs';
import {ModelPortNightvoyage} from '../scripts/offline-envelope-model-runtime.mjs';
import {runDreambook} from '../scripts/dreambook.mjs';
import {envelopeSeed,envelopeTranscript} from './offline-envelope-runtime-fixtures.js';
import {missingTypeTrialProposal} from '../scripts/missing-type-plan-trial.mjs';
import {envelopeProbeProposal} from '../scripts/plan-envelope-probe.mjs';
import {prefixProbeProposal} from '../scripts/plan-prefix-probe.mjs';
export async function checkOfflineEnvelopeRuntime(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-envelope-check-')),directory=path.join(root,'book'),input=envelopeSeed();let engine,calls=0;
 const adapter=new OfflineEnvelopePlanAdapter({model_id:'fiction-envelope-model',simulator:d=>{calls++;return envelopeTranscript(d);}}),open=()=>engine=new ModelPortNightvoyage(directory,{selection:selectAdapter({primary:adapter})});
 try{
  open();const id=engine.start('fiction-envelope-check','fiction-envelope-check',input);await engine.execute(id);const r=engine.result(id);assert.equal(r.receipt.status,'completed');assert.equal(calls,3);
  const original=engine.read(r.dream.id),wake=structuredClone(r.wake);for(const kind of ['recollection','imagined_continuation'])engine.append(r.dream.id,kind,'SYNTHETIC-DERIVED-CHECK');assert.deepEqual(engine.read(r.dream.id),original);engine.close();
  const before=fs.readFileSync(path.join(directory,'state.json'),'utf8'),text=runDreambook(['read','--latest','--data-dir',directory]);assert.ok(text.includes(r.dream.scenes[0].event));assert.equal(fs.readFileSync(path.join(directory,'state.json'),'utf8'),before);
  open();assert.equal(engine.start('another-request','fiction-envelope-check',input),id);await engine.execute(id);assert.equal(calls,3);assert.deepEqual(engine.read(r.dream.id),original);assert.deepEqual(engine.result(id).wake,wake);
  const candidates=engine.recall('clock','synthetic-cue',1);assert.equal(candidates.length,1);assert.equal(candidates[0].origin,'dream');assert.equal(candidates[0].isRealityFact,false);
  const reasoningAbsent=!before.includes('SYNTHETIC-REASONING-PRIVATE')&&!before.includes('SYNTHETIC-ENCRYPTED-PRIVATE');assert.ok(reasoningAbsent);
  engine.withdraw(input.sources[0].id);engine.close();open();assert.equal(engine.result(id).dream,null);assert.deepEqual(engine.recall('clock','synthetic-cue',1),[]);assert.deepEqual(engine.list(),[]);await engine.execute(id);assert.equal(calls,3);engine.close();
  assert.ok(runDreambook(['read','--latest','--data-dir',directory]).includes('没有可查看'));const after=fs.readFileSync(path.join(directory,'state.json'),'utf8');for(const s of [input.sources[0].text,r.dream.scenes[0].event,'SYNTHETIC-DERIVED-CHECK'])assert.ok(!after.includes(s));
  missingTypeTrialProposal();envelopeProbeProposal();prefixProbeProposal();
  return {kind:'fictional_offline_envelope_lifecycle',protocolVersion:adapter.identity.protocol_version,status:r.receipt.status,simulatorStageCalls:calls,externalCallsStarted:r.receipt.external_calls_started,savedScenes:r.receipt.checkpoint.saved_scenes,wakeSaved:r.receipt.checkpoint.wake_saved,normalizedUsageRows:r.receipt.usage.length,reopened:true,replayAdditionalCalls:calls-3,originalAndWakeUnchanged:true,appendDoesNotOverwriteOriginal:true,readerStableStateBytesUnchanged:true,reasoningNotPersisted:reasoningAbsent,recallOrigin:candidates[0].origin,recallIsRealityFact:candidates[0].isRealityFact,withdrawalSuppressesReadRecallAndReplay:true,managedBodiesPurged:true,originalSourceGrantsNoEgress:input.sources.every(s=>s.grant.modelEgress===false),existingProposalPinsMatch:true,realModelRequests:0,credentialReads:0,userStoreAccessed:false,liveAdapterAvailable:false,qualityAssessed:false,semanticSupport:'not_assessed',asteriaAdapter:'pending',nativeCodexTransport:'pending'};
 }finally{engine?.close();fs.rmSync(root,{recursive:true,force:true});}
}
