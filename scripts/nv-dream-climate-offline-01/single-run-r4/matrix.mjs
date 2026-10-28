import {hash} from '../../../src/contract.js';
import {fail} from '../../../src/store.js';
import {assertRunPlan,buildBatchPlan} from '../protocol.mjs';
import {r4RunId} from './config.mjs';

const plans=buildBatchPlan([Object.freeze({
  climate:'ordinary',mechanism:'transformation',foregroundAnchor:'cup_tap'
})]);

export const r4Matrix=Object.freeze([Object.freeze({id:r4RunId,plan:plans[0]})]);
export const r4MatrixHash=hash(r4Matrix);

export function assertR4Matrix(value=r4Matrix){
  if(!Array.isArray(value)||value.length!==1||value[0]?.id!==r4RunId)
    fail('dream_climate_r4_matrix_mismatch');
  const plan=value[0]?.plan;
  if(plan?.climate!=='ordinary'||plan?.mechanism!=='transformation'||
     plan?.foregroundAnchor!=='cup_tap'||plan?.usedForegroundAnchors?.length!==0||
     plan?.usedMechanisms?.length!==0)fail('dream_climate_r4_matrix_mismatch');
  assertRunPlan(plan);
  if(hash(value)!==r4MatrixHash)fail('dream_climate_r4_matrix_mismatch');
  return true;
}

assertR4Matrix();
