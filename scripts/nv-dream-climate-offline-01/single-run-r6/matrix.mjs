import {hash} from '../../../src/contract.js';
import {fail} from '../../../src/store.js';
import {assertRunPlan,buildBatchPlan} from '../protocol.mjs';
import {r6RunId} from './config.mjs';

const plans=buildBatchPlan([Object.freeze({
  climate:'ordinary',mechanism:'transformation',foregroundAnchor:'cup_tap'
})]);

export const r6Matrix=Object.freeze([Object.freeze({id:r6RunId,plan:plans[0]})]);
export const r6MatrixHash=hash(r6Matrix);

export function assertR6Matrix(value=r6Matrix){
  if(!Array.isArray(value)||value.length!==1||value[0]?.id!==r6RunId)
    fail('dream_climate_r6_matrix_mismatch');
  const plan=value[0]?.plan;
  if(plan?.climate!=='ordinary'||plan?.mechanism!=='transformation'||
     plan?.foregroundAnchor!=='cup_tap'||plan?.usedForegroundAnchors?.length!==0||
     plan?.usedMechanisms?.length!==0)fail('dream_climate_r6_matrix_mismatch');
  assertRunPlan(plan);
  if(hash(value)!==r6MatrixHash)fail('dream_climate_r6_matrix_mismatch');
  return true;
}

assertR6Matrix();
