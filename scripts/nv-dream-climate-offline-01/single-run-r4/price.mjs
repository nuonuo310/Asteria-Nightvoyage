import {hash} from '../../../src/contract.js';
import {
  r4AllowanceCapMicroCny,r4CallsPerRun,r4MaxCalls,r4MaxOutputTokens,
  r4ModelAlias,r4ObservedModelAlias,r4PeakInputMicroCnyPerMillion,
  r4PeakOutputMicroCnyPerMillion,r4PricePageSha256,r4PricePageUrl,
  r4PriceReviewedAt,r4RequestByteLimit,r4RunCount,r4ScenesPerRun,
  r4WorstInputTokens,r4WorstMicroCny,r4WorstOutputTokens
} from './config.mjs';

export const r4PriceSnapshot=Object.freeze({
  source:r4PricePageUrl,
  reviewedAt:r4PriceReviewedAt,
  pageSha256:r4PricePageSha256,
  currency:'CNY',peak:true,
  modelAlias:r4ModelAlias,observedModelAlias:r4ObservedModelAlias,
  inputMicroCnyPerMillion:r4PeakInputMicroCnyPerMillion,
  outputMicroCnyPerMillion:r4PeakOutputMicroCnyPerMillion,
  contextTokenLimit:r4RequestByteLimit,maxOutputTokens:r4MaxOutputTokens,
  scenesPerRun:r4ScenesPerRun,callsPerRun:r4CallsPerRun,maxRuns:r4RunCount,
  maxCalls:r4MaxCalls,requestByteLimit:r4RequestByteLimit,
  conservativeTokensPerRequestByte:1,
  worstInputTokens:r4WorstInputTokens,worstOutputTokens:r4WorstOutputTokens,
  worstMicroCny:r4WorstMicroCny,allowanceCapMicroCny:r4AllowanceCapMicroCny
});

export const r4PriceSnapshotHash=hash(r4PriceSnapshot);
