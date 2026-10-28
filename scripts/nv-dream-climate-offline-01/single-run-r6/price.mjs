import {hash} from '../../../src/contract.js';
import {
  r6AllowanceCapMicroCny,r6CallsPerRun,r6MaxCalls,r6MaxOutputTokens,
  r6ModelAlias,r6ObservedModelAlias,r6PeakInputMicroCnyPerMillion,
  r6PeakOutputMicroCnyPerMillion,r6PricePageSha256,r6PricePageUrl,
  r6PriceReviewedAt,r6RequestByteLimit,r6RunCount,r6ScenesPerRun,
  r6WorstInputTokens,r6WorstMicroCny,r6WorstOutputTokens
} from './config.mjs';

export const r6PriceSnapshot=Object.freeze({
  source:r6PricePageUrl,
  reviewedAt:r6PriceReviewedAt,
  pageSha256:r6PricePageSha256,
  currency:'CNY',peak:true,
  modelAlias:r6ModelAlias,observedModelAlias:r6ObservedModelAlias,
  inputMicroCnyPerMillion:r6PeakInputMicroCnyPerMillion,
  outputMicroCnyPerMillion:r6PeakOutputMicroCnyPerMillion,
  contextTokenLimit:r6RequestByteLimit,maxOutputTokens:r6MaxOutputTokens,
  scenesPerRun:r6ScenesPerRun,callsPerRun:r6CallsPerRun,maxRuns:r6RunCount,
  maxCalls:r6MaxCalls,requestByteLimit:r6RequestByteLimit,
  conservativeTokensPerRequestByte:1,
  worstInputTokens:r6WorstInputTokens,worstOutputTokens:r6WorstOutputTokens,
  worstMicroCny:r6WorstMicroCny,allowanceCapMicroCny:r6AllowanceCapMicroCny
});

export const r6PriceSnapshotHash=hash(r6PriceSnapshot);
