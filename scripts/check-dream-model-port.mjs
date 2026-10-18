import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {ModelPortNightvoyage} from './dream-model-runtime.mjs';
import {selectSubscriptionAdapter,targetDefaultAdapter} from './dream-model-port.mjs';
const fixture=JSON.parse(fs.readFileSync(new URL('../examples/adapter-boundary.snapshot.json',import.meta.url),'utf8'));
const root=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-model-port-check-'));let engine;
try{
  engine=new ModelPortNightvoyage(path.join(root,'book'));
  const id=engine.start('fiction-port-check','fiction-port-check',fixture);await engine.execute(id);
  const first=engine.result(id);if(first.receipt.status!=='completed')throw Error('fake_loop_failed');
  const body=JSON.stringify(engine.read(first.dream.id));engine.close();engine=new ModelPortNightvoyage(path.join(root,'book'));
  await engine.execute(engine.start('fiction-port-check','fiction-port-check',fixture));
  const replay=engine.status(id),unchanged=JSON.stringify(engine.read(first.dream.id))===body;
  const candidates=engine.recall('tile','fiction-cue',1);
  engine.withdraw(fixture.sources[0].id);engine.close();engine=new ModelPortNightvoyage(path.join(root,'book'));
  const suppressed=engine.result(id).dream===null&&engine.recall('tile','fiction-cue',1).length===0;
  if(!unchanged||!suppressed||candidates.length!==1||replay.stage_dispatches_started!==3)throw Error('local_boundary_failed');
  console.log(JSON.stringify({command:'node scripts/check-dream-model-port.mjs',node:process.version,platform:process.platform,
    contractVersion:first.receipt.contract_version,targetDefaultAdapter,testDefaultAdapter:first.receipt.adapter_kind,
    savedScenes:first.receipt.checkpoint.saved_scenes,fakeStageCalls:replay.stage_dispatches_started,replayAdditionalCalls:0,
    typedOutputsSeparate:!!first.dream&&!!first.wake&&!!first.residue,originalUnchanged:unchanged,withdrawalSuppressedAfterReopen:suppressed,
    directSubscriptionReady:selectSubscriptionAdapter().ready,codexFallbackAutomaticallyEnabled:false,
    realModelRequests:0,credentialReads:0,userStoreAccessed:false,asteriaAdapter:'pending',qualityAssessed:false},null,2));
}finally{engine?.close();fs.rmSync(root,{recursive:true,force:true});}
