// Synthetic offline demo. It prints only the latest local read view.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {generatedWakeFixture as fixture} from '../fixtures/generated-wake-offline.js';
import {GeneratedWakeRehearsal} from '../src/generated-wake-runtime.js';
import {readGeneratedWakeView,renderGeneratedWakeView} from '../src/generated-wake-records.js';

const directory=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-generated-wake-demo-'));
const nativeFetch=globalThis.fetch;
let networkAttempts=0,engine;
globalThis.fetch=()=>{networkAttempts++;throw Error('network_forbidden');};
try{
  const simulator=request=>{
    const material=JSON.parse(request.body.messages[1].content);
    const data=material.stage==='wake'
      ? {fragment:material.previousScenes[fixture.wake.fragmentSceneIndex].event,
          residue:fixture.wake.residue,associations:[...fixture.wake.associations],
          firstFeeling:structuredClone(fixture.wake.firstFeeling)}
      : structuredClone(fixture.scenes[material.sceneIndex]);
    return {status:200,body:{model:'deepseek-flash',
      choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(data)}}],
      usage:{prompt_tokens:100,completion_tokens:80,total_tokens:180}}};
  };
  engine=new GeneratedWakeRehearsal(directory,{allowance:structuredClone(fixture.allowance),simulator,enabled:true});
  const runId=engine.start('generated-wake-demo','generated-wake-demo',fixture.snapshot);
  const status=await engine.execute(runId),packet=engine.result(runId);
  if(status.status!=='completed'||!packet.dream||engine.rows(runId).length!==3)throw Error('synthetic_loop_incomplete');
  const view=readGeneratedWakeView(engine.store,packet.dream.id);
  process.stdout.write(renderGeneratedWakeView(view)+'\n');
  if(networkAttempts)throw Error('network_attempted');
}catch(error){
  process.stderr.write(`BLOCKED_SYNTHETIC_DEMO: ${error.message}\n`);
  process.exitCode=1;
}finally{
  engine?.close();globalThis.fetch=nativeFetch;fs.rmSync(directory,{recursive:true,force:true});
}
