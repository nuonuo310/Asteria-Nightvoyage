// Fixed fictional reader rehearsal. Captures content locally; prints only body-free checks.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readContentReview,renderContentReview} from '../src/content-review.js';
import {prepareReviewDream} from '../test-support/appraisal-review-fixtures.js';
import {coupledTrialPinsMatch} from '../src/coupled-trial-config.js';
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-content-rehearsal-'));
const env=process.env,fetch=globalThis.fetch;let nativeRequests=0,keyReads=0,engine;
process.env=new Proxy(env,{get(t,k){if(k==='NIGHTVOYAGE_DEEPSEEK_KEY'){keyReads++;throw Error('credential_forbidden');}return Reflect.get(t,k);}});
globalThis.fetch=()=>{nativeRequests++;throw Error('network_forbidden');};
try{
  const ready=await prepareReviewDream(directory);engine=ready.engine;
  const {dreamId,sourceId,counter}=ready,before=structuredClone(engine.store.state),view=readContentReview(engine.store,dreamId),text=renderContentReview(view);
  assert.ok(text.indexOf('【先读梦】')<text.indexOf('【再看梦中评价与依据】'));assert.deepEqual(engine.store.state,before);engine.close();const diskBefore=fs.readFileSync(path.join(directory,'state.json'),'utf8');
  const code=`let requests=0,keyReads=0;const env=process.env;process.env=new Proxy(env,{get(t,k){if(k==='NIGHTVOYAGE_DEEPSEEK_KEY'){keyReads++;throw Error('credential_forbidden');}return Reflect.get(t,k);}});globalThis.fetch=()=>{requests++;throw Error('network_forbidden');};const output=[];const original=console.log;console.log=v=>output.push(String(v));process.argv=['node','content-review-cli','read','--data-dir',${JSON.stringify(directory)},'--dream-id',${JSON.stringify(dreamId)}];await import(${JSON.stringify(new URL('../src/content-review-cli.js',import.meta.url).href)});console.log=original;console.log(JSON.stringify({nativeRequests:requests,credentialReads:keyReads,narrativeShown:output.some(s=>s.includes('【先读梦】')),wakeShown:output.some(s=>s.includes('【醒来残片】'))}));`;
  const child=spawnSync(process.execPath,['--input-type=module','-e',code],{encoding:'utf8',timeout:15000});assert.equal(child.status,0,child.stderr);const cli=JSON.parse(child.stdout);assert.equal(cli.nativeRequests,0);assert.equal(cli.credentialReads,0);assert.ok(cli.narrativeShown&&cli.wakeShown);assert.equal(fs.readFileSync(path.join(directory,'state.json'),'utf8'),diskBefore);
  const {Store}=await import('../src/store.js');const store=new Store(directory);try{store.withdraw(sourceId);assert.equal(readContentReview(store,dreamId),null);}finally{store.close();}
  assert.equal(nativeRequests,0);assert.equal(keyReads,0);assert.equal(coupledTrialPinsMatch(),false);
  console.log(JSON.stringify({command:'node scripts/check-content-review.mjs',node:process.version,platform:process.platform,viewVersion:view.viewVersion,fakeGenerationCalls:counter.calls,realModelRequests:nativeRequests+cli.nativeRequests,credentialReads:keyReads+cli.credentialReads,narrativeBeforeNumbers:true,provenanceRetainedInText:true,viewDoesNotMutateState:true,stableStoreBytesUnchangedByCLI:true,filesystemZeroWritesClaimed:false,cliNarrativeAndWakeShown:true,withdrawalViewNull:true,liveSourcePinsUnchanged:coupledTrialPinsMatch(),qualityAssessed:false,semanticSupport:'not_assessed'},null,2));
}finally{engine?.close();process.env=env;globalThis.fetch=fetch;fs.rmSync(directory,{recursive:true,force:true});}
