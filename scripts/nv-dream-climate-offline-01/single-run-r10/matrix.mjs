import {hash} from '../../../src/contract.js';
import {fail} from '../../../src/store.js';
import {assertRunPlan,buildBatchPlan} from '../protocol.mjs';
import {r10RunId} from './config.mjs';

const plans=buildBatchPlan([Object.freeze({
  climate:'ordinary',mechanism:'transformation',foregroundAnchor:'cup_tap'
})]);

export const r10Matrix=Object.freeze([Object.freeze({id:r10RunId,plan:plans[0]})]);
export const r10MatrixHash=hash(r10Matrix);

export function assertR10Matrix(value=r10Matrix){
  if(!Array.isArray(value)||value.length!==1||value[0]?.id!==r10RunId)
    fail('dream_climate_r10_matrix_mismatch');
  const plan=value[0]?.plan;
  if(plan?.climate!=='ordinary'||plan?.mechanism!=='transformation'||
     plan?.foregroundAnchor!=='cup_tap'||plan?.usedForegroundAnchors?.length!==0||
     plan?.usedMechanisms?.length!==0)fail('dream_climate_r10_matrix_mismatch');
  assertRunPlan(plan);
  if(hash(value)!==r10MatrixHash)fail('dream_climate_r10_matrix_mismatch');
  return true;
}

assertR10Matrix();
