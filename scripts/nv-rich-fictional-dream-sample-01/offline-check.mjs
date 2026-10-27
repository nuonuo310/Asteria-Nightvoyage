// Offline admission rehearsal. It uses a temporary Store and a local fake
// simulator; it never loads a credential or performs a network request.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {richSampleIdentity} from './identity.mjs';
import {offlineSampleSimulator} from './offline-sample.mjs';
import {
  richSampleCanonicalSnapshot,richSampleCallsPerRun,
  richSampleMaxCalls,richSampleMaxOutputTokens,richSamplePerCallMaximumMicroCny,
  richSamplePriceSnapshot,richSamplePriceSnapshotHash,richSamplePromptHash,
  richSampleProtocolVersion,richSampleRequestByteLimit,richSampleRunCount,
  richSampleRuntimeVersion,richSampleScenesPerRun,richSampleSource,richSampleSourceHash
} from './protocol.mjs';
import {extractRichSampleReceipt} from './records.mjs';
import {RichDreamSampleRuntime} from './runtime.mjs';

export const offlineCheckVersion='nv-rich-fictional-dream-sample-offline-check-v1';
export const offlineCheckNow=Date.parse('2026-10-27T12:00:00Z');
const sha256=value=>createHash('sha256').update(value).digest('hex');

export async function runOfflineSampleCheck(){
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-rich-dream-sample-check-'));
  const capture=[],nativeFetch=globalThis.fetch,environment=process.env;
  let networkAttempts=0,credentialReads=0,engine;
  globalThis.fetch=()=>{networkAttempts++;throw Error('network_forbidden');};
  process.env=new Proxy(environment,{get(target,key){
    if(key==='NIGHTVOYAGE_DEEPSEEK_KEY')credentialReads++;
    return Reflect.get(target,key);
  }});
  try{
    engine=new RichDreamSampleRuntime(directory,{simulator:offlineSampleSimulator(capture),
      enabled:true,now:()=>offlineCheckNow});
    const batch=engine.startBatch();
    const status=await engine.executeBatch();
    const receipt=extractRichSampleReceipt(engine.store,{now:offlineCheckNow});
    assert.equal(capture.length,richSampleMaxCalls);
    assert.equal(status.runs.length,richSampleRunCount);
    assert.ok(status.runs.every(run=>run.status==='completed'));
    assert.equal(receipt.status,'READY_FOR_MANUAL_REVIEW');
    assert.equal(receipt.runs.length,richSampleRunCount);
    assert.ok(receipt.runs.every(run=>run.scenes.length===richSampleScenesPerRun));
    assert.ok(receipt.runs.every(run=>run.billing.calls===richSampleCallsPerRun));
    assert.ok(receipt.runs.every(run=>run.billing.rows.every(row=>row.status==='settled')));
    assert.equal(JSON.stringify(receipt).includes('deepseek'),false);
    assert.equal(richSamplePerCallMaximumMicroCny*richSampleMaxCalls,richSamplePriceSnapshot.worstMicroCny);
    assert.equal(networkAttempts,0);
    assert.equal(credentialReads,0);
    const materials=capture.map(request=>JSON.parse(request.body.messages[1].content));
    assert.deepEqual(materials.map(material=>material.stage),
      ['scene','scene','scene','wake','scene','scene','scene','wake','scene','scene','scene','wake']);
    assert.deepEqual(materials.map(material=>material.sceneIndex),
      [0,1,2,3,0,1,2,3,0,1,2,3]);
    assert.ok(materials.every(material=>material.sources.length===1&&
      material.sources[0].text===richSampleSource.text&&
      material.sources[0].id===richSampleSource.id&&
      material.sources[0].version===richSampleSource.version));
    assert.ok(materials.every(material=>material.sources[0].text===richSampleSource.text));
    assert.equal(materials.filter(material=>material.stage==='wake').every(material=>material.previousScenes.length===3),true);
    assert.ok(capture.every(request=>Buffer.byteLength(JSON.stringify(request.body))<=richSampleRequestByteLimit));
    const identity=richSampleIdentity();
    return {
      schemaVersion:1,command:'node scripts/nv-rich-fictional-dream-sample-01/offline-check.mjs',
      node:process.version,platform:process.platform,status:'COMPLETE_SYNTHETIC_ONLY',
      offlineCheckVersion,protocolVersion:richSampleProtocolVersion,runtimeVersion:richSampleRuntimeVersion,
      identityHash:identity.identityHash,promptHash:richSamplePromptHash,sourceHash:richSampleSourceHash,
      sourceTextSha256:sha256(richSampleSource.text),canonicalSnapshotHash:sha256(JSON.stringify(richSampleCanonicalSnapshot)),
      priceSnapshotHash:richSamplePriceSnapshotHash,
      priceSnapshot:structuredClone(richSamplePriceSnapshot),perCallMaximumMicroCny:richSamplePerCallMaximumMicroCny,
      worstMicroCny:richSamplePerCallMaximumMicroCny*richSampleMaxCalls,
      batch:{runCount:batch.runIds.length,runRequestIds:batch.requestIds.length,
        distinctSessionIds:new Set(batch.sessionIds).size,status:status.runs.map(run=>run.status)},
      requestCapture:{count:capture.length,stages:materials.map(material=>material.stage),
        sceneIndexes:materials.map(material=>material.sceneIndex),
        bytes:capture.map(request=>Buffer.byteLength(JSON.stringify(request.body))),
        sourceExactEveryRequest:true,stagesPerRun:richSampleScenesPerRun+1,maxOutputTokens:richSampleMaxOutputTokens,
        systemHashes:capture.map(request=>sha256(request.body.messages[0].content))},
      runs:receipt.runs.map(run=>({ordinal:run.ordinal,status:run.status,scenes:run.scenes.length,
        firstFeeling:run.firstFeeling.status,billingCalls:run.billing.calls,
        settledRows:run.billing.rows.filter(row=>row.status==='settled').length})),
      boundaries:{fictionalOnly:true,realUserStoreAccessed:false,credentialReads,networkAttempts,
        realModelRequests:0,automaticRetries:0,phaseBExecuted:false,qualityAssessed:false,
        semanticSupport:'not_assessed',laterRecollectionsEmpty:true}
    };
  }finally{
    engine?.close();
    process.env=environment;globalThis.fetch=nativeFetch;
    fs.rmSync(directory,{recursive:true,force:true});
  }
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  runOfflineSampleCheck().then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{
    console.error(error?.stack??String(error));process.exitCode=1;
  });
}
