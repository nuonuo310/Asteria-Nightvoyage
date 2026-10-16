// External temporary fictional Store only; output contains mechanism metadata, no bodies.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {Store} from '../src/store.js';
import {LocalFileAppraisalReviewAdapter} from '../src/appraisal-review-adapter.js';
import {readContentReview,renderContentReview} from '../src/content-review.js';
import {inlineProtocolVersion} from '../src/inline-evidence-protocol.js';
import {GatedDeepSeekClient} from '../src/gated-deepseek-client.js';
import {prepareInlineReviewDream} from '../test-support/inline-review-fixtures.js';
import {reviewActor,reviewRequest} from '../test-support/appraisal-review-fixtures.js';
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-inline-review-check-')),env=process.env,nativeFetch=globalThis.fetch;
let nativeRequests=0,credentialReads=0,engine,store;
process.env=new Proxy(env,{get(t,k){if(k==='NIGHTVOYAGE_DEEPSEEK_KEY'){credentialReads++;throw Error('credential_forbidden');}return Reflect.get(t,k);}});
globalThis.fetch=()=>{nativeRequests++;throw Error('native_network_forbidden');};
try{
  const ready=await prepareInlineReviewDream(directory);engine=ready.engine;
  const {dreamId,sourceId,counter}=ready,adapter=new LocalFileAppraisalReviewAdapter(engine.store,reviewActor),original=engine.read(dreamId),billing=structuredClone(engine.store.state.billing),request=reviewRequest(),one=adapter.createReview({dreamId,request}).review;
  assert.deepEqual(adapter.createReview({dreamId,request}).review,one);const revision=reviewRequest('revision');revision.supersedesReviewId=one.id;adapter.createReview({dreamId,request:revision});
  const view=readContentReview(engine.store,dreamId);assert.equal(view.appraisalView.protocolVersion,inlineProtocolVersion);assert.equal(view.reviews.length,2);assert.equal(view.narrative.wake.origin,'wake_note');assert.equal(view.narrative.dream.wake,undefined);assert.equal(view.narrative.dream.residue,undefined);assert.equal(view.appraisalView.scenes[1].inlineEvidenceAudit.internedUniqueQuotes,1);assert.ok(renderContentReview(view).includes('【先读梦】'));assert.deepEqual(engine.read(dreamId),original);assert.deepEqual(engine.store.state.billing,billing);engine.close();
  // Exercise the existing reader CLI with an explicit parent id, never its user-data default.
  const code=`let requests=0,keys=0;const env=process.env;process.env=new Proxy(env,{get(t,k){if(k==='NIGHTVOYAGE_DEEPSEEK_KEY'){keys++;throw Error('credential_forbidden');}return Reflect.get(t,k);}});globalThis.fetch=()=>{requests++;throw Error('native_network_forbidden');};const output=[];console.log=v=>output.push(String(v));process.argv=['node','content-review-cli','read','--data-dir',${JSON.stringify(directory)},'--dream-id',${JSON.stringify(dreamId)}];await import(${JSON.stringify(new URL('../src/content-review-cli.js',import.meta.url).href)});process.stdout.write(JSON.stringify({requests,keys,shown:output.some(s=>s.includes('【先读梦】')&&s.includes('【醒来残片】'))}));`;
  const before=fs.readFileSync(path.join(directory,'state.json'),'utf8'),child=spawnSync(process.execPath,['--input-type=module','-e',code],{encoding:'utf8',timeout:15000});assert.equal(child.status,0,child.stderr);const cli=JSON.parse(child.stdout);assert.deepEqual(cli,{requests:0,keys:0,shown:true});assert.equal(fs.readFileSync(path.join(directory,'state.json'),'utf8'),before);
  store=new Store(directory);let back=new LocalFileAppraisalReviewAdapter(store,reviewActor);assert.deepEqual(back.createReview({dreamId,request}).review,one);assert.deepEqual(store.state.billing,billing);store.withdraw(sourceId);store.close();store=new Store(directory);back=new LocalFileAppraisalReviewAdapter(store,reviewActor);assert.equal(back.readDreamReviewBundle({dreamId}),null);assert.equal(back.readReview({reviewId:one.id}).review,null);assert.equal(readContentReview(store,dreamId),null);assert.deepEqual(store.state.billing,billing);
  for(const file of fs.readdirSync(directory)){const p=path.join(directory,file);if(fs.statSync(p).isFile())for(const body of [request.assessment.note,...original.scenes.map(s=>s.event)])assert.ok(!fs.readFileSync(p,'utf8').includes(body));}
  assert.throws(()=>new GatedDeepSeekClient(null,{protocol:'inline-evidence-v1',mode:'live'}),/inline_live_entry_pending/);assert.equal(nativeRequests,0);assert.equal(credentialReads,0);assert.equal(counter.calls,3);
  console.log(JSON.stringify({command:'node scripts/check-inline-review.mjs',node:process.version,platform:process.platform,protocolVersion:inlineProtocolVersion,adapter:'local_file',asteriaAdapter:'pending',stubGenerationCalls:counter.calls,reviewAdditionalCalls:0,nativeRequests,credentialReads,typedOutputsSeparate:true,originalUnchanged:true,billingUnchanged:true,programAuditCopied:true,reopened:true,duplicateReviewWrites:0,cliNarrativeAndWakeShown:true,stableStoreBytesUnchangedByCLI:true,filesystemZeroWritesClaimed:false,withdrawalSurvivesReopen:true,managedBodiesPurged:true,liveEntryAvailable:false,semanticSupport:'not_assessed',qualityAssessed:false},null,2));
}finally{engine?.close();store?.close();process.env=env;globalThis.fetch=nativeFetch;fs.rmSync(directory,{recursive:true,force:true});}
