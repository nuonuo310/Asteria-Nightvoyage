// Executable fictional design walkthrough, not an Asteria adapter or paid entry.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import http from 'node:http';
import https from 'node:https';
import {FileSnapshotAdapter} from '../src/adapters.js';
import {snapshot} from '../src/contract.js';
import {Nightvoyage} from '../src/engine.js';
if(process.argv.length!==2)throw Error('no_arguments_supported');
let credentialReads=0,transportAttempts=0;
const env=process.env,fetchBefore=globalThis.fetch,httpBefore=http.request,httpsBefore=https.request;
const forbid=()=>{transportAttempts++;throw Error('network_forbidden');};
process.env=new Proxy(env,{get(target,key){if(key==='NIGHTVOYAGE_DEEPSEEK_KEY'){credentialReads++;throw Error('credential_forbidden');}return Reflect.get(target,key);}});
globalThis.fetch=http.request=https.request=forbid;
let engine;const directory=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-adapter-design-'));
try{
  const file=new URL('../examples/adapter-boundary.snapshot.json',import.meta.url),input=new FileSnapshotAdapter().read(file);
  assert.deepEqual(input,snapshot(JSON.parse(fs.readFileSync(file,'utf8'))));
  assert.equal(input.sources.every(s=>s.grant.modelEgress===false),true);
  assert.equal(Object.values(input.channels).every(c=>c.availability==='present'),true);
  engine=new Nightvoyage(directory);
  const degraded=structuredClone(input);
  for(const [key,availability]of Object.entries({background:'unavailable',affect:'absent',mind:'denied',intents:'stale'}))degraded.channels[key]={availability,sourceIds:[]};
  const normalized=snapshot(degraded);assert.equal(normalized.sources.length,1);
  const skipped=structuredClone(degraded);skipped.channels.memory={availability:'absent',sourceIds:[]};
  const skipId=engine.start('fictional-skip','fictional-skip',skipped);assert.equal(engine.status(skipId).status,'skipped');assert.equal(engine.status(skipId).budget.calls,0);
  const id=engine.start('fictional-adapter-request','fictional-adapter-session',input);
  await engine.execute(id);assert.equal(engine.status(id).status,'completed');
  const result=engine.result(id),dream=result.dream;
  assert.deepEqual(Object.keys(result).sort(),['dream','wake','residue','associations','receipt'].sort());
  assert.equal(dream.scenes.length,2);assert.equal(result.receipt.budget.calls,3);
  for(const record of [dream,result.wake,result.residue]){
    assert.equal(record.materialKind,'fictional');assert.equal(record.isRealityFact,false);assert.deepEqual(record.sourceRefs,dream.sourceRefs);
  }
  assert.equal(dream.origin,'dream');assert.equal(result.wake.origin,'wake_note');assert.equal(result.residue.origin,'simulated_affect');
  const before=engine.read(dream.id),calls=engine.status(id).budget.calls;
  assert.equal(engine.start('fictional-adapter-request','fictional-adapter-session',input),id);
  await engine.execute(id);assert.equal(engine.status(id).budget.calls,calls);
  const cue=dream.scenes[0].event.slice(0,12),now=1000;
  const candidates=engine.recall(cue,'fictional-adapter-cue',now);assert.equal(candidates.length,1);assert.equal(candidates[0].origin,'dream');assert.equal(candidates[0].isRealityFact,false);assert.deepEqual(candidates[0].sourceRefs,dream.sourceRefs);
  engine.close();engine=new Nightvoyage(directory);assert.deepEqual(engine.read(dream.id),before);assert.equal(engine.status(id).budget.calls,calls);
  engine.withdraw(input.sources[0].id);engine.close();engine=new Nightvoyage(directory);
  assert.equal(engine.read(dream.id),null);assert.deepEqual(engine.recall(cue,'fictional-adapter-cue',now),[]);assert.equal(engine.result(id).dream,null);
  assert.equal(credentialReads,0);assert.equal(transportAttempts,0);
  console.log(JSON.stringify({command:'node scripts/check-adapter-boundary.mjs',node:process.version,platform:process.platform,kind:'existing_local_api_fictional_walkthrough',fileMatchesDirectSnapshot:true,allFiveChannelsProvided:true,unavailableChannelsOmittedFromNormalizedSources:true,missingMemorySkipped:true,fakeStageCalls:calls,separateOutputFields:true,typedRecallCandidate:true,completedReplayAdditionalCalls:0,reopenedOriginalUnchanged:true,withdrawnReadAndRecallEmptyAfterReopen:true,originalFixtureNoEgress:true,credentialReads,transportAttempts,realModelRequests:0,userStoreAccessed:false,asteriaAdapter:'pending',newAdapterImplemented:false,receiverDeliveryAcknowledgementImplemented:false,qualityAssessed:false},null,2));
}finally{
  engine?.close();process.env=env;globalThis.fetch=fetchBefore;http.request=httpBefore;https.request=httpsBefore;
  fs.rmSync(directory,{recursive:true,force:true});
}
