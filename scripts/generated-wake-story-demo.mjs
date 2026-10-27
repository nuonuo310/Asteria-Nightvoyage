// Fixed fictional export. No arguments, no Store path, no credential or network access.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {generatedWakeFixture as fixture} from '../fixtures/generated-wake-offline.js';
import {GeneratedWakeRehearsal} from '../src/generated-wake-runtime.js';
import {readGeneratedWakeView} from '../src/generated-wake-records.js';
import {renderGeneratedWakeStoryHtml} from './generated-wake-story-html.mjs';

const at=1760000000000;
const laterTexts=['后来想起，水槽边其实没有风。','再后来只记得，灯影在水面上拉得很直。'];
const output=fileURLToPath(new URL('../docs/examples/generated-wake-story-example.html',import.meta.url));
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-generated-wake-story-'));
const nativeFetch=globalThis.fetch;
const calls=[];
let networkAttempts=0,engine;

globalThis.fetch=()=>{networkAttempts++;throw Error('network_forbidden');};
try{
  const simulator=request=>{
    const material=JSON.parse(request.body.messages[1].content);
    calls.push(material.stage);
    const data=material.stage==='wake'
      ? {fragment:material.previousScenes[fixture.wake.fragmentSceneIndex].event,residue:fixture.wake.residue,
          associations:[...fixture.wake.associations],firstFeeling:structuredClone(fixture.wake.firstFeeling)}
      : structuredClone(fixture.scenes[material.sceneIndex]);
    return {status:200,body:{model:'deepseek-flash',choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(data)}}],
      usage:{prompt_tokens:100,completion_tokens:80,total_tokens:180}}};
  };
  engine=new GeneratedWakeRehearsal(directory,{allowance:structuredClone(fixture.allowance),simulator,enabled:true,now:()=>at});
  const runId=engine.start('generated-wake-story-demo','generated-wake-story-demo',fixture.snapshot);
  const status=await engine.execute(runId),packet=engine.result(runId);
  if(status.status!=='completed'||!packet.dream||calls.length!==3)throw Error('synthetic_loop_incomplete');
  for(const value of laterTexts)engine.append(packet.dream.id,'recollection',value);
  const view=readGeneratedWakeView(engine.store,packet.dream.id,{now:at});
  if(!view||view.later.length!==laterTexts.length)throw Error('read_projection_incomplete');
  const stateFile=path.join(directory,'state.json'),stateBytesBefore=fs.readFileSync(stateFile);
  const html=renderGeneratedWakeStoryHtml(view,{demo:true});
  const stateBytesAfter=fs.readFileSync(stateFile);
  if(!stateBytesBefore.equals(stateBytesAfter)||calls.length!==3||networkAttempts!==0)throw Error('export_changed_state_or_called_network');
  const unsafe=html.match(/<script\b|<iframe\b|<img\b|<link\b|<object\b|<embed\b|https?:\/\/|localStorage|sessionStorage|<[^>]+\son[a-z]+\s*=/i);
  if(unsafe)throw Error(`unsafe_static_output:${unsafe[0]}`);
  engine.close();
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,html,'utf8');
  const sample=fs.readFileSync(output);
  if(!sample.equals(Buffer.from(html,'utf8')))throw Error('sample_write_mismatch');
  console.log(JSON.stringify({command:'node scripts/generated-wake-story-demo.mjs',node:process.version,platform:process.platform,
    status:'COMPLETE_SYNTHETIC_EXPORT',output:'docs/examples/generated-wake-story-example.html',
    fixture:'fixtures/generated-wake-offline.js',dreamStages:view.dream.scenes.length,generatedCalls:calls.length,
    recollections:view.later.length,stateBytesUnchanged:true,stateSha256:createHash('sha256').update(stateBytesBefore).digest('hex'),
    sampleBytes:sample.length,sampleSha256:createHash('sha256').update(sample).digest('hex'),storeClosedOnStop:true,
    userStoreAccessed:false,keyReads:0,networkAttempts,realModelRequests:0,autoWithdrawal:false,ready:false,merged:false,deployed:false},null,2));
}catch(error){
  process.stderr.write(`BLOCKED_SYNTHETIC_STORY_EXPORT: ${error.message}\n`);
  process.exitCode=1;
}finally{
  engine?.close();
  globalThis.fetch=nativeFetch;
  fs.rmSync(directory,{recursive:true,force:true});
}
