import {
  r6Allowance,r6AllowanceCapMicroCny,r6AllowanceId,r6CallsPerRun,
  r6DiagnosticVersion,r6Endpoint,r6ExtractionVersion,r6MaxCalls,
  r6MaxOutputTokens,r6ModelAlias,r6NormalizationVersion,r6ObservedModelAlias,
  r6PerCallMaximumMicroCny,r6PricePageSha256,r6PricePageUrl,r6ProfileVersion,
  r6ProtocolVersion,r6RequestByteLimit,r6RunCount,r6RunId,r6RunRequestId,
  r6RunSessionId,r6RuntimeVersion,r6ScenesPerRun,r6StoreBasename,r6WorstMicroCny
} from './config.mjs';
import {assertR6Matrix,r6Matrix,r6MatrixHash} from './matrix.mjs';
import {verifyR6Identity} from './identity.mjs';
import {r6PriceSnapshotHash} from './price.mjs';
import {r6ExpectedReleaseHash} from './release.mjs';

export const r6Profile=Object.freeze({
  id:'r6',profileVersion:r6ProfileVersion,
  runtimeVersion:r6RuntimeVersion,protocolVersion:r6ProtocolVersion,
  normalizationVersion:r6NormalizationVersion,extractionVersion:r6ExtractionVersion,
  diagnosticVersion:r6DiagnosticVersion,
  runIds:Object.freeze([r6RunId]),requestIds:Object.freeze([r6RunRequestId]),
  sessionIds:Object.freeze([r6RunSessionId]),
  runCount:r6RunCount,scenesPerRun:r6ScenesPerRun,callsPerRun:r6CallsPerRun,
  maxCalls:r6MaxCalls,
  matrix:r6Matrix,matrixHash:r6MatrixHash,assertMatrix:assertR6Matrix,
  allowanceId:r6AllowanceId,allowanceCapMicroCny:r6AllowanceCapMicroCny,
  allowance:r6Allowance,
  storeBasename:r6StoreBasename,
  verifyIdentity:verifyR6Identity,identityHash:identity=>identity.identityHash,
  releaseHash:()=>r6ExpectedReleaseHash,
  batchKey:'dreamClimateR6Batch',journalKey:'dreamClimateR6Journal',
  billingKey:'dreamClimateR6Billing',runtimeStateKey:'dreamClimateR6Version',
  wakeOrigin:'dream_climate_r6_wake',firstFeelingOrigin:'dream_climate_r6_first_feeling',
  idPrefix:'r6',
  modelAlias:r6ModelAlias,observedModelAlias:r6ObservedModelAlias,endpoint:r6Endpoint,
  maxOutputTokens:r6MaxOutputTokens,requestByteLimit:r6RequestByteLimit,
  perCallMaximumMicroCny:r6PerCallMaximumMicroCny,worstMicroCny:r6WorstMicroCny,
  pricePageUrl:r6PricePageUrl,pricePageSha256:r6PricePageSha256,
  priceSnapshotHash:r6PriceSnapshotHash,
  completeStatus:'SINGLE_RUN_READY_FOR_MANUAL_CONTENT_REVIEW',
  partialStatus:'PARTIAL_OR_FAILED'
});
