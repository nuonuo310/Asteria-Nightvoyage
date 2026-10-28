import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {hash,neutral} from '../src/contract.js';
import {
  buildDreamStageRequest,dreamClimatePromptHash,dreamClimatePromptSource,
  dreamClimateSourceHash,normalizeDreamClimateScene,normalizeDreamClimateWake
} from '../scripts/nv-dream-climate-offline-01/protocol.mjs';
import {dreamClimateIdentity} from '../scripts/nv-dream-climate-offline-01/identity.mjs';
import {dreamClimateFixtureCases} from '../scripts/nv-dream-climate-offline-01/fixtures.mjs';
import {r4Matrix} from '../scripts/nv-dream-climate-offline-01/single-run-r4/matrix.mjs';
import {
  r4ExpectedReleaseHash,r4ReleaseObject,validateR4Release
} from '../scripts/nv-dream-climate-offline-01/single-run-r4/release.mjs';
import {
  liveReleaseObject,validateLiveRelease
} from '../scripts/nv-dream-climate-offline-01/phase-b/release.mjs';
import {liveExpectedReleaseHash} from '../scripts/nv-dream-climate-offline-01/phase-b/config.mjs';
import {runR4Worker} from '../scripts/nv-dream-climate-offline-01/single-run-r4/worker.mjs';

const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const r4Directory=path.join(root,'scripts','nv-dream-climate-offline-01','single-run-r4');
const evidenceFile=path.join(root,'docs','validation','dream-climate-live-r5-evidence.json');
const quote=String.fromCharCode(34);
const digest=text=>crypto.createHash('sha256').update(text,'utf8').digest('hex');

function fixtureScenes(fixture=dreamClimateFixtureCases[0]){
  let before=neutral();
  const scenes=[];
  for(const raw of fixture.scenes) {
    const value=normalizeDreamClimateScene(raw,before);
    scenes.push(value);before=value.after;
  }
  return scenes;
}

test('wake associations accept only zero or one non-empty string',()=>{
  const scenes=fixtureScenes();
  const base={fragment:'桌上却留下一小片白屑',residue:.1};
  const empty=normalizeDreamClimateWake({...base,associations:[]},{previousScenes:scenes});
  assert.deepEqual(empty.wake.associations,[]);
  const one=normalizeDreamClimateWake({...base,
    associations:['那点白屑原本就在杯沿里吗？']},{previousScenes:scenes});
  assert.deepEqual(one.wake.associations,['那点白屑原本就在杯沿里吗？']);
  const rejected=[[{question:'合成问题？'}],null,'裸字符串',['a','b'],[''],[42],[true]];
  for(const associations of rejected){
    assert.throws(()=>normalizeDreamClimateWake({...base,associations},{previousScenes:scenes}),
      /invalid_generated_wake_associations/,JSON.stringify(associations));
  }
});

test('wake system names the exact element type and frozen scene/source stay unchanged',()=>{
  const wake=dreamClimatePromptSource.wakeSystem;
  assert.ok(wake.includes('associations must be a JSON array of length 0 or 1'));
  assert.ok(wake.includes('Each element must be a non-empty string'));
  assert.ok(wake.includes('a question object, null, a bare string instead of an array, and a second element are all invalid'));
  assert.ok(wake.includes('[] and ['+quote+'<one unverified question>'+quote+']'));
  assert.ok(wake.includes('Neither is preferred and no fixed question text is supplied'));
  assert.ok(wake.includes('four equally valid forms'));
  assert.equal(wake.includes(quote+'firstFeeling'+quote+':{'+quote+'status'+quote+':'+quote+'uncertain'+quote+'}'),false);
  assert.equal(digest(dreamClimatePromptSource.sceneSystem),
    'ef51d2f7b7f5e5620de1984e4111618a5ab1cf97a2e3011c2d642ad1a34db746');
  assert.equal(dreamClimateSourceHash,
    '605d69511cc72c0b0ca60a77be34dafb061e63b57e98db94b778cf7bfce8cbb6');
  assert.equal(dreamClimatePromptHash,
    '9fe4d0863983eae2eb8a969d89fd6ffc5eeab3ebec507bf263d0f27664fbdb66');
  const identity=dreamClimateIdentity();
  assert.equal(identity.identityHash,
    '47767f6f733dc657dfef815839b7e9cf3218cff3d4844711a7a3d32c4488dedd');
  assert.equal(identity.promptHash,dreamClimatePromptHash);
  assert.equal(identity.sourceHash,dreamClimateSourceHash);
  assert.equal(identity.executionFiles['protocol.mjs'],
    '2a9f4f8fdc643b27010e96ae6fb7d6070b4c635ec228ef691257574e91940fdf');
  const scenes=fixtureScenes();
  const sceneRequest=buildDreamStageRequest({run:r4Matrix[0].plan,previousScenes:[],stage:'scene'});
  const wakeRequest=buildDreamStageRequest({run:r4Matrix[0].plan,previousScenes:scenes,stage:'wake'});
  assert.equal(sceneRequest.body.messages[0].content,dreamClimatePromptSource.sceneSystem);
  assert.equal(wakeRequest.body.messages[0].content,dreamClimatePromptSource.wakeSystem);
  assert.equal(sceneRequest.body.messages[0].content.includes('associations must be a JSON array'),false);
  assert.equal(wakeRequest.body.messages[0].content.includes('associations must be a JSON array'),true);
});

test('old live and R4 releases no longer validate against the new candidate',()=>{
  assert.equal(liveExpectedReleaseHash,
    '73002cb681e4950609dea0c35f081bff55acfc95fd27c500bdaff2c9816185b4');
  assert.equal(hash(liveReleaseObject()),liveExpectedReleaseHash);
  const oldLive={...liveReleaseObject(),
    offlineIdentityHash:'f88fccb0349b0004db6c81deb0261f3d620f06480ab24b4a9c3aee2f94cfae28'};
  assert.throws(()=>validateLiveRelease(oldLive),/dream_climate_live_release_mismatch/);
  assert.equal(r4ExpectedReleaseHash,
    '3ebdae45838bbbbfe51d3b3b9af7f547389a1badc3747bb5bf7976c0eeb0373b');
  assert.deepEqual(validateR4Release(r4ReleaseObject()),r4ReleaseObject());
  const oldR4={...r4ReleaseObject(),
    offlinePromptHash:'9c855d8b3e3b2a55c3f58e36de4a9aee5dec07b706cbf675912632d6ff8dd119'};
  assert.throws(()=>validateR4Release(oldR4),/dream_climate_r4_release_mismatch/);
});

test('actual Windows PowerShell and the Node stub round-trip UTF-8 exactly',t=>{
  const parent=fs.mkdtempSync(path.join(os.tmpdir(),'nv-dream-climate-r5-utf8-'));
  t.after(()=>fs.rmSync(parent,{recursive:true,force:true}));
  const outFile=path.join(parent,'roundtrip.json');
  const run=spawnSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',
    path.join(r4Directory,'utf8-roundtrip.ps1'),'-NodeStub',
    path.join(r4Directory,'utf8-stub.mjs'),'-OutFile',outFile],
  {encoding:'buffer',timeout:60000});
  assert.equal(run.status,0,run.stderr?.toString('utf8'));
  const bytes=fs.readFileSync(outFile);
  assert.equal(bytes[0]===0xEF&&bytes[1]===0xBB&&bytes[2]===0xBF,false);
  const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  const payload='中文'+quote+'引号'+quote+'与反斜杠\\和换行\n第二行\r\n第三行😀🌙𠀋';
  assert.equal(value.nodeExitCode,0);
  assert.equal(value.parseError,null);
  assert.deepEqual(value.parsed,{schemaVersion:1,payload});
  assert.deepEqual(JSON.parse(value.stdoutExact),{schemaVersion:1,payload});
  assert.equal(value.stdoutExact,JSON.stringify({schemaVersion:1,payload})+'\n');
  assert.equal(value.stderrExact,'stderr:'+payload+'\n');
  assert.equal([...value.parsed.payload].length,26);
  assert.ok(value.parsed.payload.includes('😀'));
  assert.ok(value.parsed.payload.includes('🌙'));
  assert.ok(value.parsed.payload.includes('𠀋'));
});

test('the closed R4 entry refuses before credentials and the read-only evidence is unchanged',async()=>{
  const ps=spawnSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',
    path.join(r4Directory,'secure-input.ps1')],{encoding:'utf8',timeout:30000});
  assert.equal(ps.status,2);
  assert.ok(ps.stderr.includes('OFFLINE_REVIEW_REQUIRED_R5'));
  const closed=await runR4Worker('run',{priceFile:path.join(os.tmpdir(),'missing-pricing.html')});
  assert.equal(closed.status,'blocked');
  assert.equal(closed.ready,false);
  assert.equal(closed.reason,'OFFLINE_REVIEW_REQUIRED_R5');
  assert.equal(closed.credentialRequested,false);
  assert.equal(closed.credentialPersisted,false);
  assert.equal(closed.networkAttempts,0);
  assert.equal(closed.realModelRequests,0);
  assert.equal(closed.requestOutcomeKnown,true);
  assert.equal(closed.storeCreated,false);
  assert.equal(closed.executed,false);
  assert.equal(closed.automaticRetry,false);
  const evidence=JSON.parse(new TextDecoder('utf-8',{fatal:true})
    .decode(fs.readFileSync(evidenceFile)));
  assert.equal(evidence.unchanged,true);
  assert.deepEqual(evidence.storeBefore,evidence.storeAfter);
  assert.equal(evidence.storeBefore.bytes,9869);
  assert.equal(evidence.storeBefore.sha256,
    'b9c594fda3b4578639d0f10c26616371676eaf70c20ef5259127afcb4b254deb');
  for(const name of ['owner.lock','recovery.lock','snapshot.tmp'])
    assert.equal(evidence.storeBefore.locks[name],false);
  assert.equal(evidence.classification.realModelGenerated,true);
  assert.equal(evidence.classification.published,false);
  assert.equal(evidence.classification.isRealityFact,false);
  assert.equal(evidence.classification.rejectedResponseConvertedToSuccess,false);
  assert.equal(evidence.run.status,'failed');
  assert.equal(evidence.run.error,'invalid_wake');
  assert.deepEqual(evidence.run.validation,
    {subreason:'associations',originalError:'invalid_generated_wake_associations'});
  assert.equal(evidence.run.draftSceneCount,3);
  assert.deepEqual(evidence.wakeRejection.parsedJson.associations,
    [{question:'那点糖是原本就在杯沿里，还是被刮下来的瓷变过去的？'}]);
  assert.equal(evidence.wakeRejection.responseAvailable,true);
  assert.equal(evidence.wakeRejection.usageValidation,'verified');
  assert.equal(evidence.wakeRejection.settlement,'settled');
  assert.equal(evidence.wakeRejection.published,false);
  assert.equal(evidence.accounting.calls,4);
  assert.deepEqual(evidence.accounting.rows.map(row=>row.status),
    ['settled','settled','settled','settled']);
  assert.equal(evidence.accounting.settledChargeMicroCny,'15690');
  assert.equal(evidence.accounting.unknownReservedMicroCny,'0');
  assert.equal(evidence.accounting.combinedAccountingMicroCny,'15690');
  assert.equal(evidence.accounting.combinedIsProviderCharged,false);
});
