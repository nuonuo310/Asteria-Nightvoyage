import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {openFictionalHttpDream,fictionalHttpDreamVersion} from './fictional-http-dream.mjs';
import {readModelPortContent} from './model-port-content-view.mjs';
if(process.argv.length!==2)throw Error('no_arguments_supported');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-http-dream-check-'));
const directory=path.join(root,'book'),fixture=JSON.parse(fs.readFileSync(new URL('../examples/adapter-boundary.snapshot.json',import.meta.url)));
let engine;
try{
 engine=await openFictionalHttpDream(directory);const id=engine.start('fictional-http-check','fictional-http-check',fixture);
 await engine.execute(id);const first=engine.result(id),receipt=first.receipt;
 const actualPosts=engine.fixtureObservations().length,body=JSON.stringify(engine.read(first.dream?.id));
 const book=readModelPortContent(engine.store,first.dream?.id);
 const checkpointRowsMatch=receipt.local_http_accounting.stages.every(a=>a.checkpoint_committed&&a.requests.length===2&&a.requests.every(row=>row.state==='http_completed'));
 engine.close();engine=await openFictionalHttpDream(directory);await engine.execute(engine.start('fictional-http-check','fictional-http-check',fixture));
 const replayPosts=engine.fixtureObservations().length,originalUnchanged=JSON.stringify(engine.read(first.dream.id))===body;
 const recalled=engine.recall('boat','fictional-http-cue',1);
 engine.withdraw(fixture.sources[0].id);engine.close();engine=await openFictionalHttpDream(directory);
 const suppressed=engine.result(id).dream===null&&engine.recall('boat','fictional-http-cue',1).length===0&&readModelPortContent(engine.store,first.dream.id)===null;
 if(receipt.status!=='completed'||actualPosts!==6||!checkpointRowsMatch||replayPosts!==0||!originalUnchanged||!book||recalled.length!==1||!suppressed)throw Error('fictional_http_check_failed');
 console.log(JSON.stringify({command:'node scripts/check-fictional-http-dream.mjs',node:process.version,platform:process.platform,
  contractVersion:fictionalHttpDreamVersion,status:'completed',adapter_kind:receipt.adapter_kind,provider_kind:receipt.provider_kind,
  kind:'independent_loopback_fixture',savedScenes:receipt.checkpoint.saved_scenes,wakeSaved:receipt.checkpoint.wake_saved,
  fakeStageCalls:receipt.stage_dispatches_started,loopbackHttpPosts:actualPosts,persistedLocalHttpIntents:receipt.local_http_accounting.calls,
  checkpointAndCompletedRowsInSameStore:true,checkpointRowsMatch,replayAdditionalPosts:replayPosts,originalUnchanged,
  dreambookReadable:true,withdrawalSuppressesReopenedReadRecallAndBook:suppressed,bodyFreeAccountingRetained:engine.status(id).local_http_accounting.calls===6,
  realModelRequests:0,credentialReads:0,nativeChildrenStarted:0,userStoreAccessed:false,realUserApprovalRecorded:false,
  nativeAppServerIntegrated:false,realProviderAccountingIntegrated:false,powerLossDurabilityVerified:false,
  remoteCancellationConfirmed:'unknown',productionAdmission:false,qualityAssessed:false},null,2));
}finally{engine?.close();fs.rmSync(root,{recursive:true,force:true});}
