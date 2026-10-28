import {hash} from '../../../src/contract.js';
import {
  liveAllowanceCapMicroCny,liveCallsPerRun,liveMaxCalls,liveMaxOutputTokens,
  liveModelAlias,liveObservedModelAlias,livePeakInputMicroCnyPerMillion,
  livePeakOutputMicroCnyPerMillion,livePricePageUrl,livePricePageSha256,
  livePriceReviewedAt,liveRequestByteLimit,liveRunCount,liveScenesPerRun,
  liveWorstInputTokens,liveWorstMicroCny,liveWorstOutputTokens
} from './config.mjs';

export const livePriceSnapshot=Object.freeze({
  source:livePricePageUrl,
  reviewedAt:livePriceReviewedAt,
  pageSha256:livePricePageSha256,
  currency:'CNY',
  peak:true,
  modelAlias:liveModelAlias,
  observedModelAlias:liveObservedModelAlias,
  inputMicroCnyPerMillion:livePeakInputMicroCnyPerMillion,
  outputMicroCnyPerMillion:livePeakOutputMicroCnyPerMillion,
  contextTokenLimit:liveRequestByteLimit,
  maxOutputTokens:liveMaxOutputTokens,
  scenesPerRun:liveScenesPerRun,
  callsPerRun:liveCallsPerRun,
  maxRuns:liveRunCount,
  maxCalls:liveMaxCalls,
  requestByteLimit:liveRequestByteLimit,
  conservativeTokensPerRequestByte:1,
  worstInputTokens:liveWorstInputTokens,
  worstOutputTokens:liveWorstOutputTokens,
  worstMicroCny:liveWorstMicroCny,
  allowanceCapMicroCny:liveAllowanceCapMicroCny
});
export const livePriceSnapshotHash=hash(livePriceSnapshot);
