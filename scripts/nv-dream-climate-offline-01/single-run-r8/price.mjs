import {hash} from '../../../src/contract.js';
import {
  r8AllowanceCapMicroCny,r8CallsPerRun,r8MaxCalls,r8MaxOutputTokens,
  r8ModelAlias,r8ObservedModelAlias,r8PeakInputMicroCnyPerMillion,
  r8PeakOutputMicroCnyPerMillion,r8PricePageSha256,r8PricePageUrl,
  r8PriceReviewedAt,r8RequestByteLimit,r8RunCount,r8ScenesPerRun,
  r8WorstInputTokens,r8WorstMicroCny,r8WorstOutputTokens
} from './config.mjs';

export const r8PriceSnapshot=Object.freeze({
  source:r8PricePageUrl,
  reviewedAt:r8PriceReviewedAt,
  pageSha256:r8PricePageSha256,
  currency:'CNY',peak:true,
  modelAlias:r8ModelAlias,observedModelAlias:r8ObservedModelAlias,
  inputMicroCnyPerMillion:r8PeakInputMicroCnyPerMillion,
  outputMicroCnyPerMillion:r8PeakOutputMicroCnyPerMillion,
  contextTokenLimit:r8RequestByteLimit,maxOutputTokens:r8MaxOutputTokens,
  scenesPerRun:r8ScenesPerRun,callsPerRun:r8CallsPerRun,maxRuns:r8RunCount,
  maxCalls:r8MaxCalls,requestByteLimit:r8RequestByteLimit,
  conservativeTokensPerRequestByte:1,
  worstInputTokens:r8WorstInputTokens,worstOutputTokens:r8WorstOutputTokens,
  worstMicroCny:r8WorstMicroCny,allowanceCapMicroCny:r8AllowanceCapMicroCny
});

export const r8PriceSnapshotHash=hash(r8PriceSnapshot);
