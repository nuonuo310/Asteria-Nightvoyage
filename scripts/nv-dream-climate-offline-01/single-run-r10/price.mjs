import {hash} from '../../../src/contract.js';
import {
  r10AllowanceCapMicroCny,r10CallsPerRun,r10MaxCalls,r10MaxOutputTokens,
  r10ModelAlias,r10ObservedModelAlias,r10PeakInputMicroCnyPerMillion,
  r10PeakOutputMicroCnyPerMillion,r10PricePageSha256,r10PricePageUrl,
  r10PriceReviewedAt,r10RequestByteLimit,r10RunCount,r10ScenesPerRun,
  r10WorstInputTokens,r10WorstMicroCny,r10WorstOutputTokens
} from './config.mjs';

export const r10PriceSnapshot=Object.freeze({
  source:r10PricePageUrl,
  reviewedAt:r10PriceReviewedAt,
  pageSha256:r10PricePageSha256,
  currency:'CNY',peak:true,
  modelAlias:r10ModelAlias,observedModelAlias:r10ObservedModelAlias,
  inputMicroCnyPerMillion:r10PeakInputMicroCnyPerMillion,
  outputMicroCnyPerMillion:r10PeakOutputMicroCnyPerMillion,
  contextTokenLimit:r10RequestByteLimit,maxOutputTokens:r10MaxOutputTokens,
  scenesPerRun:r10ScenesPerRun,callsPerRun:r10CallsPerRun,maxRuns:r10RunCount,
  maxCalls:r10MaxCalls,requestByteLimit:r10RequestByteLimit,
  conservativeTokensPerRequestByte:1,
  worstInputTokens:r10WorstInputTokens,worstOutputTokens:r10WorstOutputTokens,
  worstMicroCny:r10WorstMicroCny,allowanceCapMicroCny:r10AllowanceCapMicroCny
});

export const r10PriceSnapshotHash=hash(r10PriceSnapshot);
