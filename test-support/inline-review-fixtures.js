// Project-owned fictional data, synthetic usage and an explicit local transport only.
import {BudgetedNightvoyage} from '../src/budgeted-runtime.js';
import {inlineProtocolVersion} from '../src/inline-evidence-protocol.js';
import {inlineSeed,inlineResponse,inlineStubAllowance} from './inline-budget-fixtures.js';
export async function prepareInlineReviewDream(directory){
  const counter={calls:0},input=inlineSeed();input.sources.forEach(s=>s.grant.modelEgress=true);
  const engine=new BudgetedNightvoyage(directory,{allowance:{...inlineStubAllowance(),protocolVersion:inlineProtocolVersion},mode:'stub',protocol:'inline-evidence-v1',enabled:true,credential:'DUMMY-INLINE-STUB',fetchImpl:async(_url,r)=>{counter.calls++;return new Response(JSON.stringify(inlineResponse({body:JSON.parse(r.body)}).body));}});
  const runId=engine.start('inline-review-fixture','inline-review-fixture',input);await engine.execute(runId);
  if(engine.status(runId).status!=='completed'){engine.close();throw Error('inline_review_fixture_failed');}
  return {engine,runId,dreamId:engine.result(runId).dream.id,sourceId:input.sources[0].id,counter};
}
