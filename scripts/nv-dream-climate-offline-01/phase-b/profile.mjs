// Internal execution profiles. Only the fixed R3 synthetic batch and the fixed
// R4 single-run preparation are representable; neither is a CLI or env input.
import {dreamClimateNormalizationVersion,dreamClimateProtocolVersion,
  dreamClimateScenesPerRun} from '../protocol.mjs';
import {
  liveAllowance,liveAllowanceCapMicroCny,liveAllowanceId,liveBatchKey,
  liveBillingKey,liveCallsPerRun,liveEndpoint,liveExtractionVersion,
  liveFirstFeelingOrigin,liveJournalKey,liveMaxCalls,liveMaxOutputTokens,
  liveModelAlias,liveObservedModelAlias,livePerCallMaximumMicroCny,
  livePricePageSha256,livePricePageUrl,liveRunCount,liveRuntimeStateKey,
  liveRuntimeVersion,liveScenesPerRun,liveStoreBasename,liveWakeOrigin,
  liveWorstMicroCny,offlineIdentityHash
} from './config.mjs';
import {assertLiveMatrix,liveMatrix,liveMatrixHash,liveRunIds,
  liveRunRequestIds,liveRunSessionIds} from './matrix.mjs';
import {verifyLiveIdentity} from './identity.mjs';
import {livePriceSnapshotHash} from './price.mjs';

export const r3Profile=Object.freeze({
  id:'r3',runtimeVersion:liveRuntimeVersion,protocolVersion:dreamClimateProtocolVersion,
  normalizationVersion:dreamClimateNormalizationVersion,
  extractionVersion:liveExtractionVersion,
  diagnosticVersion:'nv-dream-climate-live-r3-diagnostic-v1',
  runIds:liveRunIds,requestIds:liveRunRequestIds,sessionIds:liveRunSessionIds,
  runCount:liveRunCount,scenesPerRun:liveScenesPerRun,callsPerRun:liveCallsPerRun,
  maxCalls:liveMaxCalls,
  matrix:liveMatrix,matrixHash:liveMatrixHash,assertMatrix:assertLiveMatrix,
  allowanceId:liveAllowanceId,allowanceCapMicroCny:liveAllowanceCapMicroCny,
  allowance:liveAllowance,
  storeBasename:liveStoreBasename,
  verifyIdentity:verifyLiveIdentity,identityHash:identity=>identity.liveIdentityHash,
  releaseHash:identity=>identity.releaseHash,
  batchKey:liveBatchKey,journalKey:liveJournalKey,billingKey:liveBillingKey,
  runtimeStateKey:liveRuntimeStateKey,wakeOrigin:liveWakeOrigin,
  firstFeelingOrigin:liveFirstFeelingOrigin,idPrefix:'live',
  modelAlias:liveModelAlias,observedModelAlias:liveObservedModelAlias,
  endpoint:liveEndpoint,maxOutputTokens:liveMaxOutputTokens,
  requestByteLimit:16384,
  perCallMaximumMicroCny:livePerCallMaximumMicroCny,worstMicroCny:liveWorstMicroCny,
  pricePageUrl:livePricePageUrl,pricePageSha256:livePricePageSha256,
  priceSnapshotHash:livePriceSnapshotHash,offlineIdentityHash,
  completeStatus:'READY_FOR_MANUAL_CONTENT_REVIEW',partialStatus:'PARTIAL_OR_FAILED'
});
