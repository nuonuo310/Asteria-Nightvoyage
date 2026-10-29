import {
  r8Allowance,r8AllowanceCapMicroCny,r8AllowanceId,r8CallsPerRun,
  r8DiagnosticVersion,r8Endpoint,r8ExtractionVersion,r8MaxCalls,
  r8MaxOutputTokens,r8ModelAlias,r8NormalizationVersion,r8ObservedModelAlias,
  r8PerCallMaximumMicroCny,r8PricePageSha256,r8PricePageUrl,r8ProfileVersion,
  r8ProtocolVersion,r8RequestByteLimit,r8RunCount,r8RunId,r8RunRequestId,
  r8RunSessionId,r8RuntimeVersion,r8ScenesPerRun,r8StoreBasename,r8WorstMicroCny
} from './config.mjs';
import {assertR8Matrix,r8Matrix,r8MatrixHash} from './matrix.mjs';
import {verifyR8Identity} from './identity.mjs';
import {r8PriceSnapshotHash} from './price.mjs';
import {r8ExpectedReleaseHash} from './release.mjs';

export const r8Profile=Object.freeze({
  id:'r8',profileVersion:r8ProfileVersion,
  runtimeVersion:r8RuntimeVersion,protocolVersion:r8ProtocolVersion,
  normalizationVersion:r8NormalizationVersion,extractionVersion:r8ExtractionVersion,
  diagnosticVersion:r8DiagnosticVersion,
  runIds:Object.freeze([r8RunId]),requestIds:Object.freeze([r8RunRequestId]),
  sessionIds:Object.freeze([r8RunSessionId]),
  runCount:r8RunCount,scenesPerRun:r8ScenesPerRun,callsPerRun:r8CallsPerRun,
  maxCalls:r8MaxCalls,
  matrix:r8Matrix,matrixHash:r8MatrixHash,assertMatrix:assertR8Matrix,
  allowanceId:r8AllowanceId,allowanceCapMicroCny:r8AllowanceCapMicroCny,
  allowance:r8Allowance,
  storeBasename:r8StoreBasename,
  verifyIdentity:verifyR8Identity,identityHash:identity=>identity.identityHash,
  releaseHash:()=>r8ExpectedReleaseHash,
  batchKey:'dreamClimateR8Batch',journalKey:'dreamClimateR8Journal',
  billingKey:'dreamClimateR8Billing',runtimeStateKey:'dreamClimateR8Version',
  wakeOrigin:'dream_climate_r8_wake',firstFeelingOrigin:'dream_climate_r8_first_feeling',
  idPrefix:'r8',
  modelAlias:r8ModelAlias,observedModelAlias:r8ObservedModelAlias,endpoint:r8Endpoint,
  maxOutputTokens:r8MaxOutputTokens,requestByteLimit:r8RequestByteLimit,
  perCallMaximumMicroCny:r8PerCallMaximumMicroCny,worstMicroCny:r8WorstMicroCny,
  pricePageUrl:r8PricePageUrl,pricePageSha256:r8PricePageSha256,
  priceSnapshotHash:r8PriceSnapshotHash,
  completeStatus:'SINGLE_RUN_READY_FOR_MANUAL_CONTENT_REVIEW',
  partialStatus:'PARTIAL_OR_FAILED'
});
