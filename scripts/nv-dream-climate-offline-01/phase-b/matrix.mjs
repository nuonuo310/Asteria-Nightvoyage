import {hash} from '../../../src/contract.js';
import {fail} from '../../../src/store.js';
import {assertBatchPlan,buildBatchPlan} from '../protocol.mjs';

export const liveAssignments=Object.freeze([
  Object.freeze({climate:'ordinary',mechanism:'transformation',foregroundAnchor:'cup_tap'}),
  Object.freeze({climate:'uneasy',mechanism:'spatial_dislocation',foregroundAnchor:'rain_street'}),
  Object.freeze({climate:'nightmare',mechanism:'temporal_recurrence',foregroundAnchor:'ticket_date'})
]);
export const liveRunIds=Object.freeze([
  'nv-dream-climate-live-a','nv-dream-climate-live-b','nv-dream-climate-live-c'
]);
export const liveRunRequestIds=Object.freeze(liveRunIds.map(id=>`${id}-request`));
export const liveRunSessionIds=Object.freeze(liveRunIds.map(id=>`${id}-session`));
const plans=buildBatchPlan(liveAssignments);
export const liveMatrix=Object.freeze(plans.map((plan,index)=>Object.freeze({
  id:liveRunIds[index],plan
})));
export const liveMatrixHash=hash(liveMatrix);

export function assertLiveMatrix(value=liveMatrix){
  if(!Array.isArray(value)||value.length!==3||
     value.some((entry,index)=>entry?.id!==liveRunIds[index]))fail('dream_climate_live_matrix_mismatch');
  const expected=[['ordinary','transformation','cup_tap'],['uneasy','spatial_dislocation','rain_street'],
    ['nightmare','temporal_recurrence','ticket_date']];
  for(const [index,entry] of value.entries()){
    const [climate,mechanism,foregroundAnchor]=expected[index];
    if(entry.plan?.climate!==climate||entry.plan?.mechanism!==mechanism||
       entry.plan?.foregroundAnchor!==foregroundAnchor)fail('dream_climate_live_matrix_mismatch');
  }
  assertBatchPlan(value.map(entry=>entry.plan));
  if(hash(value)!==liveMatrixHash)fail('dream_climate_live_matrix_mismatch');
  return true;
}

assertLiveMatrix();
