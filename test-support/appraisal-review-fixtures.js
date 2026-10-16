// Project-owned fictional fixture and local HTTP simulator only; no native transport.
import fs from 'node:fs';
import {BudgetedNightvoyage} from '../src/budgeted-runtime.js';
import {coupledBudgetVersion} from '../src/coupled-affect-protocol.js';
const contrasts=JSON.parse(fs.readFileSync(new URL('../fixtures/affect-support-contrasts.json',import.meta.url),'utf8'));
const seed=JSON.parse(fs.readFileSync(new URL('../fixtures/quality/sparse-context.json',import.meta.url),'utf8'));
export const reviewActor={actorId:'fictional-reviewer',kind:'assistant'};
export const reviewRequest=(suffix='1',sceneIndex=1)=>({id:`review-fiction-${suffix}`,requestId:`review-request-${suffix}`,sceneIndex,assessment:sceneIndex===0?{eventRelevance:'not_applicable',direction:{valence:'not_applicable',arousal:'not_applicable'},magnitude:{valence:'not_applicable',arousal:'not_applicable'},note:'虚构复核备注，不属于现实。'}:{eventRelevance:'related',direction:{valence:'underdetermined',arousal:'compatible'},magnitude:{valence:'not_established',arousal:'not_established'},note:'虚构复核备注，不属于现实。'},supersedesReviewId:null});
export async function prepareReviewDream(directory) {
  const counter={calls:0};
  const allowance={id:'review-storage-STUB',mode:'stub',approved:true,expiresAt:Date.now()+60000,protocolVersion:coupledBudgetVersion,limits:{maxRuns:1,maxCalls:3,maxMicroCny:1000000},pricing:{model:'deepseek-flash',contextTokenLimit:1000,inputMicroCnyPerMillion:1000000,outputMicroCnyPerMillion:2000000,reference:'https://api-docs.deepseek.com/TEST-ONLY',checkedAt:1}};
  const fetchImpl=async(_url,request)=>{
    counter.calls++;const material=JSON.parse(JSON.parse(request.body).messages[1].content);
    const data=material.stage==='wake'?{fragment:material.previousScenes.at(-1).event,residue:0.1,associations:[]}:contrasts.scenes.find(s=>s.id===(material.sceneIndex===0?'explicit-unchanged':'explicit-relief')).raw;
    return new Response(JSON.stringify({model:'deepseek-flash',choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(data)}}],usage:{prompt_tokens:100,completion_tokens:80,total_tokens:180}}));
  };
  const engine=new BudgetedNightvoyage(directory,{allowance,mode:'stub',enabled:true,protocol:'coupled-affect-v1',credential:'DUMMY-STUB-ONLY',fetchImpl});
  const input=structuredClone(seed);for(const s of input.sources)s.grant.modelEgress=true; // Stub copy only; shipped fixture stays no-egress.
  const id=engine.start('review-fixture','review-fixture',input);await engine.execute(id);
  if(engine.status(id).status!=='completed'){engine.close();throw Error('review_fixture_failed');}
  return {engine,dreamId:engine.result(id).dream.id,sourceId:input.sources[0].id,counter};
}
