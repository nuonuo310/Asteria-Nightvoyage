// Independently fabricated history, never imported from a user's Store or response.
import fs from 'node:fs';
import path from 'node:path';
import { preparePrunedHistory } from './pruned-history-fixtures.js';
import { prunedV2ReviewedConfig } from '../src/pruned-v2-reviewed-profile.js';
import { prunedV2TrialId } from '../src/pruned-v2-trial-config.js';
import { Store } from '../src/store.js';
import { BudgetLedger } from '../src/budget-ledger.js';
import { hash } from '../src/contract.js';
export function prepareCoupledHistory(t){
  const d=preparePrunedHistory(t),c=prunedV2ReviewedConfig(),s=new Store(d),l=new BudgetLedger(s),runId='synthetic-pruned-failure',requestId=`stage-${runId}-scene-0`;
  s.atomic(`${prunedV2TrialId}.json`,c);l.approve(c.allowance);
  s.state.requests[prunedV2TrialId]={runId};s.state.runs[runId]={id:runId,status:'failed',error:'compact_appraisal_invalid',scenes:[],sourceIds:['q-sparse-memory'],billingAllowanceId:prunedV2TrialId,billingProtocolVersion:c.protocolVersion,appraisalProtocolVersion:c.protocolVersion};s.save();
  l.reserve(prunedV2TrialId,{requestId,runId,fingerprint:hash(requestId),sourceRefs:c.sourceRefs,maxOutputTokens:400},c.allowance.pricing.checkedAt+1000);l.dispatch(prunedV2TrialId,requestId);
  l.unknown(prunedV2TrialId,requestId,{schemaVersion:1,protocolVersion:c.protocolVersion,stage:'scene',check:'affect_change_requires_evidence'});s.close();
  return d;
}
