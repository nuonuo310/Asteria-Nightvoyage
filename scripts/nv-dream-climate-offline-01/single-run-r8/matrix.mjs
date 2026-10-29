import {hash} from '../../../src/contract.js';
import {fail} from '../../../src/store.js';
import {assertRunPlan,buildBatchPlan} from '../protocol.mjs';
import {r8RunId} from './config.mjs';

const plans=buildBatchPlan([Object.freeze({
  climate:'ordinary',mechanism:'transformation',foregroundAnchor:'cup_tap'
})]);

export const r8Matrix=Object.freeze([Object.freeze({id:r8RunId,plan:plans[0]})]);
export const r8MatrixHash=hash(r8Matrix);

export function assertR8Matrix(value=r8Matrix){
  if(!Array.isArray(value)||value.length!==1||value[0]?.id!==r8RunId)
    fail('dream_climate_r8_matrix_mismatch');
  const plan=value[0]?.plan;
  if(plan?.climate!=='ordinary'||plan?.mechanism!=='transformation'||
     plan?.foregroundAnchor!=='cup_tap'||plan?.usedForegroundAnchors?.length!==0||
     plan?.usedMechanisms?.length!==0)fail('dream_climate_r8_matrix_mismatch');
  assertRunPlan(plan);
  if(hash(value)!==r8MatrixHash)fail('dream_climate_r8_matrix_mismatch');
  return true;
}

assertR8Matrix();
