// Fixed fictional-only source probe. This exercises the existing fake transport
// and read projection; it is not a model-quality test or a live execution path.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {generatedWakeFixture as fixture} from '../fixtures/generated-wake-offline.js';
import {generatedWakeTextBasis} from '../src/generated-wake-protocol.js';
import {GeneratedWakeRehearsal} from '../src/generated-wake-runtime.js';
import {readGeneratedWakeView,renderGeneratedWakeView} from '../src/generated-wake-records.js';

export const fictionalSourceProbeSource=Object.freeze({
  id:'fictional-source-probe-memory',version:'1',
  text:'两个虚构人物曾在雨停后走过一条小街。一个人轻敲杯沿两下，说有件事下次再讲；另一个人保留了一张折过的车票，票面日期后来模糊了。除此之外没有关于两人关系、那件事的内容或后来结局的资料。'
});

const probeNow=1760000000000;
const fakeSceneEvents=[
  '小街的雨水正沿路沿退去。一个人又轻敲杯沿两下，另一个人把折过的车票收在掌心，两个人没有说起那件事。',
  '另一个虚构人物没有展开那张折过的车票，只把它放回衣袋。雨后的路面还映着灯光，两个人继续走过那段小街。'
];
const fakeWakeFragment='只把它放回衣袋';
const fakeFirstFeeling='刚醒时，梦里的人先听见窗外的水声，过了一会儿才想起手里像是空的。';
const fakeRecollection='后来只记得下过雨，没记得那件事有没有再被说起。';

export const fictionalSourceProbeFakeValues=Object.freeze({
  source:'prewritten_fake_simulator',
  sceneEvents:[...fakeSceneEvents],wakeFragment:fakeWakeFragment,associations:[],residue:.08,
  firstFeeling:{status:'present',text:fakeFirstFeeling},recollection:fakeRecollection
});

const sha256=value=>createHash('sha256').update(value).digest('hex');
const sourceSnapshot=()=>({
  id:'fictional-source-probe-snapshot',version:'1',materialKind:'fictional',
  sources:[{...fictionalSourceProbeSource,grant:{dream:true,modelEgress:false}}],
  channels:{
    memory:{availability:'present',sourceIds:[fictionalSourceProbeSource.id]},
    background:{availability:'unavailable',sourceIds:[]},
    affect:{availability:'absent',sourceIds:[]},
    mind:{availability:'denied',sourceIds:[]},
    intents:{availability:'stale',sourceIds:[]}
  }
});
const fakeScene=index=>({event:fakeSceneEvents[index],
  appraisal:{goalEffect:0,control:.5,uncertainty:.5},basis:{goal:null,control:null,uncertainty:null},affect:{kind:'unchanged'}});
const fakeWake=()=>({fragment:fakeWakeFragment,associations:[],residue:.08,firstFeeling:{status:'present',text:fakeFirstFeeling}});
const http=data=>({status:200,body:{model:'deepseek-flash',
  choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(data)}}],
  usage:{prompt_tokens:100,completion_tokens:80,total_tokens:180}}});
const sourceMatches=(material,source)=>material?.materialKind==='fictional'&&material?.generatedEventOrigin==='dream'&&
  material?.isRealityFact===false&&Array.isArray(material.sources)&&material.sources.length===1&&
  material.sources[0].id===source.id&&material.sources[0].version===source.version&&material.sources[0].text===source.text&&
  material.channels?.memory?.availability==='present'&&
  material.channels.memory.sourceIds.length===1&&material.channels.memory.sourceIds[0]===source.id;
const refsMatch=(refs,source)=>Array.isArray(refs)&&refs.length===1&&refs[0]?.id===source.id&&refs[0]?.version===source.version;

export async function runFictionalSourceProbe(){
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'nightvoyage-fictional-source-probe-'));
  const nativeFetch=globalThis.fetch,environment=process.env;
  const calls=[];
  let credentialReads=0,networkAttempts=0,engine,receipt;
  globalThis.fetch=()=>{networkAttempts++;throw Error('network_forbidden');};
  process.env=new Proxy(environment,{get(target,key){
    if(key==='NIGHTVOYAGE_DEEPSEEK_KEY'){credentialReads++;throw Error('credential_forbidden');}
    return Reflect.get(target,key);
  }});
  try{
    const simulator=request=>{
      const material=JSON.parse(request.body.messages[1].content);
      calls.push({request,material});
      return http(material.stage==='wake'?fakeWake():fakeScene(material.sceneIndex));
    };
    engine=new GeneratedWakeRehearsal(directory,{allowance:structuredClone(fixture.allowance),simulator,enabled:true,now:()=>probeNow});
    const runId=engine.start('fictional-source-probe','fictional-source-probe',sourceSnapshot());
    const status=await engine.execute(runId),packet=engine.result(runId);
    if(status.status!=='completed'||!packet.dream)throw Error('probe_loop_incomplete');
    const dreamId=packet.dream.id;
    engine.append(dreamId,'recollection',fakeRecollection);
    const stateFile=path.join(engine.store.directory,'state.json');
    const before=fs.readFileSync(stateFile);
    const view=readGeneratedWakeView(engine.store,dreamId,{now:probeNow});
    const rendered=renderGeneratedWakeView(view);
    const after=fs.readFileSync(stateFile);
    const rows=engine.rows(runId);
    const requests=calls.map(({request,material},position)=>({
      call:position+1,stage:material.stage,sceneIndex:material.sceneIndex,maxOutputTokens:request.body.max_tokens,
      sourceTextSha256:material.sources[0]?.text===fictionalSourceProbeSource.text?sha256(material.sources[0].text):null,
      previousScenes:material.previousScenes.map(scene=>scene.event)
    }));
    const stages=requests.map(request=>request.stage),indexes=requests.map(request=>request.sceneIndex);
    const sourceInEveryRequest=calls.every(({material})=>sourceMatches(material,fictionalSourceProbeSource));
    const firstHasSource=calls[0]&&sourceMatches(calls[0].material,fictionalSourceProbeSource)&&calls[0].material.previousScenes.length===0;
    const secondHasSourceAndFirstScene=calls[1]&&sourceMatches(calls[1].material,fictionalSourceProbeSource)&&
      calls[1].material.previousScenes.length===1&&calls[1].material.previousScenes[0].event===fakeSceneEvents[0];
    const wakeHasTwoScenes=calls[2]&&sourceMatches(calls[2].material,fictionalSourceProbeSource)&&
      calls[2].material.previousScenes.length===2&&calls[2].material.previousScenes[0].event===fakeSceneEvents[0]&&
      calls[2].material.previousScenes[1].event===fakeSceneEvents[1];
    const sourceRefsByCall=rows.map(row=>row.sourceRefs);
    const allSourceRefsMatch=rows.length===3&&sourceRefsByCall.every(refs=>refsMatch(refs,fictionalSourceProbeSource));
    const requestBoundaryHolds=calls.length===3&&JSON.stringify(stages)===JSON.stringify(['scene','scene','wake'])&&
      JSON.stringify(indexes)===JSON.stringify([0,1,2])&&sourceInEveryRequest&&firstHasSource&&
      secondHasSourceAndFirstScene&&wakeHasTwoScenes&&allSourceRefsMatch;
    const dreamScenesExact=JSON.stringify(view.dream.scenes.map(scene=>scene.event))===JSON.stringify(fakeSceneEvents);
    const fragmentExact=view.wake.fragment===fakeWakeFragment&&fakeSceneEvents[1].includes(fakeWakeFragment)&&view.wake.fragmentSceneIndex===1;
    const feelingExact=view.firstFeeling?.status==='present'&&view.firstFeeling.text===fakeFirstFeeling&&
      view.firstFeeling.textBasis===generatedWakeTextBasis;
    const recollectionExact=view.later.length===1&&view.later[0].origin==='recollection'&&view.later[0].text===fakeRecollection;
    const layersDistinct=new Set([view.dream.id,view.firstFeeling.id,view.later[0].id]).size===3&&
      view.firstFeeling.text!==view.wake.fragment&&view.later[0].text!==view.wake.fragment&&
      view.later[0].text!==view.firstFeeling.text;
    const labels=['【原梦】','【醒来残片】','【刚醒心情】','【后来回想】'],positions=labels.map(label=>rendered.indexOf(label));
    const layersOrdered=positions.every(position=>position>=0)&&positions.every((position,index)=>index===0||positions[index-1]<position);
    const viewBoundaryHolds=dreamScenesExact&&fragmentExact&&feelingExact&&recollectionExact&&layersDistinct&&
      layersOrdered&&refsMatch(view.sourceRefs,fictionalSourceProbeSource)&&view.materialKind==='fictional'&&view.isRealityFact===false;
    const stateBytesUnchanged=before.equals(after);
    const ok=requestBoundaryHolds&&viewBoundaryHolds&&stateBytesUnchanged&&networkAttempts===0&&credentialReads===0;
    receipt={
      command:'node scripts/fictional-source-probe.mjs',probeVersion:'fictional-source-probe-v1',
      status:ok?'BOUNDARY_HOLDS_SYNTHETIC_ONLY':'BOUNDARY_FAILED',ok,
      source:{id:fictionalSourceProbeSource.id,version:fictionalSourceProbeSource.version,materialKind:'fictional',
        isRealityFact:false,textSha256:sha256(fictionalSourceProbeSource.text)},
      requestCapture:{count:calls.length,stages,indexes,sourceInEveryRequest,firstHasSource,
        secondHasSourceAndFirstScene,wakeHasTwoScenes,sourceRefsByCall,allSourceRefsMatch,requests},
      view:{dreamScenesExact,fragmentExact,feelingExact,recollectionExact,layersDistinct,layersOrdered,
        fragmentSceneIndex:view.wake.fragmentSceneIndex,firstFeelingStatus:view.firstFeeling?.status??null,
        laterRecollections:view.later.length},
      store:{stateBytesUnchanged,stateBytes:before.length,stateSha256Before:sha256(before),stateSha256After:sha256(after)},
      boundaries:{userStoreAccessed:false,realStorePathInput:false,keyReads:credentialReads,networkAttempts,
        realModelRequests:0,realFeesMicroCny:0,paidCalls:0},
      prewrittenFakeValues:fictionalSourceProbeFakeValues,
      judgement:{inputBoundaryHolds:requestBoundaryHolds,readLayersHold:viewBoundaryHolds,
        scope:'fixed_fake_transport_and_existing_read_projection_only',qualityAssessed:false,
        sampleResponseRole:'prewritten_fake_values_not_model_works',
        unknownQuality:['real-model preservation of relational and unfinished-action material',
          'literary quality and causal coherence','semantic support for any appraisal or affect',
          'whether a real wake response would avoid paraphrase or invented explanation',
          'whether later recollections would arise without explicit input']}
    };
  }finally{
    if(engine){engine.close();if(receipt)receipt.store.storeClosedOnStop=engine.store.closed===true;}
    fs.rmSync(directory,{recursive:true,force:true});
    if(receipt)receipt.store.temporaryStoreRemoved=!fs.existsSync(directory);
    globalThis.fetch=nativeFetch;
    process.env=environment;
  }
  return receipt;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const receipt=await runFictionalSourceProbe();
    process.stdout.write(JSON.stringify(receipt,null,2)+'\n');
    if(!receipt.ok)process.exitCode=1;
  }catch(error){
    process.stderr.write(`BLOCKED_FICTIONAL_SOURCE_PROBE: ${error.message}\n`);
    process.exitCode=1;
  }
}
