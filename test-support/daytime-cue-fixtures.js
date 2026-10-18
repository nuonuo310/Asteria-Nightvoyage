import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {Nightvoyage} from '../src/engine.js';
import {prepareInlineReviewDream} from './inline-review-fixtures.js';
import {runDaytimeCueSimulation,daytimeSimulationVersion} from '../scripts/daytime-cue-simulation.mjs';
export const cuePlan=events=>({schemaVersion:1,kind:daytimeSimulationVersion,materialKind:'fictional',clock:'virtual',recallAllowed:true,events});
export async function prepareDaytime(t){
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-daytime-')),ready=await prepareInlineReviewDream(directory);
  t.after(()=>{ready.engine.close();fs.rmSync(directory,{recursive:true,force:true});});
  return {directory,...ready,cue:ready.engine.read(ready.dreamId).scenes[0].event.slice(0,8)};
}
export async function checkDaytimeCues(){
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-daytime-check-'));let engine;
  try{
    const ready=await prepareInlineReviewDream(directory);engine=ready.engine;
    const {dreamId,sourceId,counter}=ready,original=engine.read(dreamId),billing=structuredClone(engine.store.state.billing),cue=original.scenes[0].event.slice(0,8);
    const first=runDaytimeCueSimulation(engine,cuePlan([{id:'first',cue,at:1}])).events[0].candidates[0];
    assert.equal(first.origin,'dream');assert.equal(first.isRealityFact,false);assert.deepEqual(first.sourceRefs,original.sourceRefs);assert.deepEqual(first.derivedFrom,[dreamId]);
    const unmatched='independent-fictional-unmatched-cue';
    assert.equal(runDaytimeCueSimulation(engine,cuePlan([{id:'miss',cue:unmatched,at:2}])).events[0].candidates.length,0);
    engine.close();engine=new Nightvoyage(directory);
    const repeat=runDaytimeCueSimulation(engine,cuePlan([{id:'first',cue,at:3}])).events[0].candidates[0];assert.deepEqual(repeat,first);
    assert.equal(runDaytimeCueSimulation(engine,cuePlan([{id:'first',cue,at:60001}])).events[0].candidates.length,0);
    const fresh=runDaytimeCueSimulation(engine,cuePlan([{id:'later',cue,at:60002}])).events[0].candidates[0];assert.ok(fresh);assert.ok(fresh.expiresAt>first.expiresAt);
    assert.throws(()=>runDaytimeCueSimulation(engine,cuePlan([{id:'rewind',cue,at:10}])),/daytime_clock_rewind/);
    assert.deepEqual(engine.read(dreamId),original);assert.deepEqual(engine.store.state.billing,billing);
    assert.equal(JSON.stringify(engine.store.state.daytimeCueSimulation).includes(unmatched),false);
    engine.withdraw(sourceId);engine.close();engine=new Nightvoyage(directory);
    assert.equal(runDaytimeCueSimulation(engine,cuePlan([{id:'later',cue,at:60003}])).events[0].candidates.length,0);
    assert.deepEqual(engine.store.state.billing,billing);
    for(const name of fs.readdirSync(directory))if(fs.statSync(path.join(directory,name)).isFile()){
      const body=fs.readFileSync(path.join(directory,name),'utf8');for(const scene of original.scenes)assert.equal(body.includes(scene.event),false);
    }
    assert.equal(counter.calls,3);
    return {command:'node scripts/check-daytime-cues.mjs',node:process.version,platform:process.platform,kind:'fictional_virtual_day',fakeGenerationCalls:counter.calls,recallAdditionalModelCalls:0,realModelRequests:0,firstLiteralCandidate:true,unmatchedCueEmpty:true,reopenedReplayPreservesExpiry:true,expiredReplayEmpty:true,newEventCanMatchRetainedDream:true,clockRewindBlocked:true,originalDreamAndWakeUnchanged:true,billingUnchanged:true,withdrawnReplayEmptyAfterReopen:true,managedBodiesPurged:true,persistedCueText:false,automaticDelivery:false,asteriaAdapter:'pending',semanticRetrievalValidated:false,qualityAssessed:false,userStoreAccessed:false};
  }finally{engine?.close();fs.rmSync(directory,{recursive:true,force:true});}
}
