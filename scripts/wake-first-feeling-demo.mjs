// Synthetic-only terminal view. It never accepts a Store path or provider credentials.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Nightvoyage} from '../src/engine.js';
import {FakeProvider} from '../src/fake-provider.js';
import {readWakeFirstFeelingView,recordWakeFirstFeeling,renderWakeFirstFeelingView} from '../src/wake-first-feeling.js';

class SyntheticWakeFirstFeelingProvider extends FakeProvider {
  identity='fake-wake-first-feeling-v1';
  async generate({stage,scenes}){
    if(stage==='wake')return {fragment:scenes.at(-1).event,residue:0.18,associations:[]};
    if(scenes.length===0)return {event:'一个虚构的守灯人把最后一盏纸灯挂到木桥边，河面没有风。',appraisal:{goalEffect:0,control:0.5,uncertainty:0.6},delta:{valence:-0.05,arousal:0.05}};
    return {event:'守灯人松开灯线，纸灯沿水面慢慢漂远，桥下的灯影分成两半。',appraisal:{goalEffect:-1,control:0.3,uncertainty:0.7},delta:{valence:-0.15,arousal:0.1}};
  }
}

if(process.argv.length!==2){
  console.error('wake_first_feeling_demo_refused');
  process.exitCode=1;
}else{
  const fixture=JSON.parse(fs.readFileSync(new URL('../fixtures/wake-first-feeling.json',import.meta.url),'utf8'));
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-wake-first-feeling-'));
  let engine,failure;
  try{
    engine=new Nightvoyage(directory,{provider:new SyntheticWakeFirstFeelingProvider()});
    const id=engine.start('wake-first-feeling-demo','wake-first-feeling-demo',fixture),status=await engine.execute(id),dream=engine.result(id).dream;
    if(status.status!=='completed'||!dream)throw Error('synthetic_dream_failed');
    recordWakeFirstFeeling(engine.store,{dreamId:dream.id,requestId:'record-first-feeling',status:'present',text:'醒来时胸口有点空，像还站在桥上；这是虚构角色的醒后心情，不是现实记忆。',now:1761369000000});
    engine.append(dream.id,'recollection','后来再想起时，只记得纸灯在水上没有发出声音。');
    const view=readWakeFirstFeelingView(engine.store,dream.id,{now:1761369060000});
    process.stdout.write(renderWakeFirstFeelingView(view)+'\n');
  }catch(error){
    failure=error;
    console.error('wake_first_feeling_demo_failed');
    process.exitCode=1;
  }finally{
    try{if(engine)engine.close();}catch(error){failure??=error;console.error('wake_first_feeling_demo_close_failed');process.exitCode=1;}
    if(failure||process.exitCode===1)console.error(`temporary_store_preserved=${directory}`);
    else fs.rmSync(directory,{recursive:true,force:true});
  }
}
