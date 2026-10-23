// Fixed fictional fixture for the local view. Synthetic stages only; no provider or credential.
import fs from 'node:fs';
import {BudgetedNightvoyage} from '../src/budgeted-runtime.js';
import {LocalFileAppraisalReviewAdapter} from '../src/appraisal-review-adapter.js';
import {inlineProtocolVersion} from '../src/inline-evidence-protocol.js';
function fixture(name){
  return JSON.parse(fs.readFileSync(new URL(`../fixtures/${name}`,import.meta.url),'utf8'));
}
export async function prepareDreambookViewDemo(directory){
  const source=fixture('quality/sparse-context.json');
  const contrasts=fixture('affect-support-contrasts.json');
  const input=structuredClone(source);
  for(const item of input.sources)item.grant.modelEgress=true;
  let calls=0;
  const allowance={id:'dreambook-local-view-demo',mode:'stub',approved:true,expiresAt:Date.now()+60000,
    protocolVersion:inlineProtocolVersion,limits:{maxRuns:1,maxCalls:3,maxMicroCny:3000000},
    pricing:{model:'deepseek-flash',contextTokenLimit:1100000,inputMicroCnyPerMillion:2000000,outputMicroCnyPerMillion:8000000,checkedAt:1,reference:'https://api-docs.deepseek.com/synthetic-dreambook-view-fixture-not-price-review'}};
  const fetchImpl=async(_url,request)=>{
    calls++;
    const material=JSON.parse(JSON.parse(request.body).messages[1].content);
    let data;
    if(material.stage==='wake')data={fragment:material.previousScenes[0].event,residue:.1,associations:[]};
    else{
      const raw=structuredClone(contrasts.scenes.find(scene=>scene.id===(material.sceneIndex===0?'explicit-unchanged':'explicit-relief')).raw);
      data={event:raw.event,appraisal:raw.appraisal,basis:{goal:null,control:null,uncertainty:null},
        affect:raw.affect.kind==='unchanged'?{kind:'unchanged'}:{kind:'estimated',delta:raw.affect.delta,excerpt:raw.evidence[raw.affect.evidence]}};
    }
    return new Response(JSON.stringify({model:'deepseek-flash',choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(data)}}],usage:{prompt_tokens:100,completion_tokens:80,total_tokens:180}}));
  };
  let engine;
  try{
    engine=new BudgetedNightvoyage(directory,{allowance,mode:'stub',enabled:true,protocol:'inline-evidence-v1',credential:'synthetic-dreambook-view-demo',fetchImpl});
    const runId=engine.start('dreambook-view-demo','dreambook-view-demo',input);
    await engine.execute(runId);
    if(engine.status(runId).status!=='completed'||calls!==3)throw Error('dreambook_view_demo_failed');
    const dreamId=engine.result(runId).dream.id;
    const laterRecordIds=[
      engine.append(dreamId,'recollection','这是独立保存的虚构后来回想：醒来后记起梦里的一盏纸灯，但它不是原梦正文，也不是现实记忆。'),
      engine.append(dreamId,'imagined_continuation','这是独立保存的虚构想象续写：纸灯继续沿河漂远；这段续写不替代原梦，也不表示梦被补完。')
    ];
    const adapter=new LocalFileAppraisalReviewAdapter(engine.store,{actorId:'fictional-view-reviewer',kind:'assistant'});
    const review=adapter.createReview({dreamId,request:{id:'review-dreambook-view-demo',requestId:'review-dreambook-view-demo',sceneIndex:1,
      assessment:{eventRelevance:'related',direction:{valence:'underdetermined',arousal:'compatible'},magnitude:{valence:'not_established',arousal:'not_established'},
        note:'这是独立的虚构评审意见，用于展示阅读布局；不代表人工验收、语义确认或梦境质量通过。'},supersedesReviewId:null}}).review;
    return Object.freeze({dreamId,sourceId:input.sources[0].id,reviewId:review.id,laterRecordIds:Object.freeze(laterRecordIds),syntheticStageCalls:calls});
  }finally{
    engine?.close();
  }
}
