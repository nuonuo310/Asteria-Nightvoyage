import {
  r4Allowance,r4AllowanceCapMicroCny,r4AllowanceId,r4CallsPerRun,
  r4DiagnosticVersion,r4Endpoint,r4ExtractionVersion,r4MaxCalls,
  r4MaxOutputTokens,r4ModelAlias,r4NormalizationVersion,r4ObservedModelAlias,
  r4PerCallMaximumMicroCny,r4PricePageSha256,r4PricePageUrl,r4ProtocolVersion,
  r4RequestByteLimit,r4RunCount,r4RunId,r4RunRequestId,r4RunSessionId,
  r4RuntimeVersion,r4ScenesPerRun,r4StoreBasename,r4WorstMicroCny
} from './config.mjs';
import {assertR4Matrix,r4Matrix,r4MatrixHash} from './matrix.mjs';
import {verifyR4Identity} from './identity.mjs';
import {r4PriceSnapshotHash} from './price.mjs';
import {r4ExpectedReleaseHash} from './release.mjs';

export const r4Profile=Object.freeze({
  id:'r4',runtimeVersion:r4RuntimeVersion,protocolVersion:r4ProtocolVersion,
  normalizationVersion:r4NormalizationVersion,extractionVersion:r4ExtractionVersion,
  diagnosticVersion:r4DiagnosticVersion,
  runIds:Object.freeze([r4RunId]),requestIds:Object.freeze([r4RunRequestId]),
  sessionIds:Object.freeze([r4RunSessionId]),
  runCount:r4RunCount,scenesPerRun:r4ScenesPerRun,callsPerRun:r4CallsPerRun,
  maxCalls:r4MaxCalls,
  matrix:r4Matrix,matrixHash:r4MatrixHash,assertMatrix:assertR4Matrix,
  allowanceId:r4AllowanceId,allowanceCapMicroCny:r4AllowanceCapMicroCny,
  allowance:r4Allowance,
  storeBasename:r4StoreBasename,
  verifyIdentity:verifyR4Identity,identityHash:identity=>identity.identityHash,
  releaseHash:()=>r4ExpectedReleaseHash,
  batchKey:'dreamClimateR4Batch',journalKey:'dreamClimateR4Journal',
  billingKey:'dreamClimateR4Billing',runtimeStateKey:'dreamClimateR4Version',
  wakeOrigin:'dream_climate_r4_wake',firstFeelingOrigin:'dream_climate_r4_first_feeling',
  idPrefix:'r4',
  modelAlias:r4ModelAlias,observedModelAlias:r4ObservedModelAlias,endpoint:r4Endpoint,
  maxOutputTokens:r4MaxOutputTokens,requestByteLimit:r4RequestByteLimit,
  perCallMaximumMicroCny:r4PerCallMaximumMicroCny,worstMicroCny:r4WorstMicroCny,
  pricePageUrl:r4PricePageUrl,pricePageSha256:r4PricePageSha256,
  priceSnapshotHash:r4PriceSnapshotHash,
  completeStatus:'SINGLE_RUN_READY_FOR_MANUAL_CONTENT_REVIEW',
  partialStatus:'PARTIAL_OR_FAILED'
});
