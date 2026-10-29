import {
  r10Allowance,r10AllowanceCapMicroCny,r10AllowanceId,r10CallsPerRun,
  r10DiagnosticVersion,r10Endpoint,r10ExtractionVersion,r10MaxCalls,
  r10MaxOutputTokens,r10ModelAlias,r10NormalizationVersion,r10ObservedModelAlias,
  r10PerCallMaximumMicroCny,r10PricePageSha256,r10PricePageUrl,r10ProfileVersion,
  r10ProtocolVersion,r10RequestByteLimit,r10RunCount,r10RunId,r10RunRequestId,
  r10RunSessionId,r10RuntimeVersion,r10ScenesPerRun,r10StoreBasename,r10WorstMicroCny
} from './config.mjs';
import {assertR10Matrix,r10Matrix,r10MatrixHash} from './matrix.mjs';
import {verifyR10Identity} from './identity.mjs';
import {r10PriceSnapshotHash} from './price.mjs';
import {r10ExpectedReleaseHash} from './release.mjs';

export const r10Profile=Object.freeze({
  id:'r10',profileVersion:r10ProfileVersion,
  runtimeVersion:r10RuntimeVersion,protocolVersion:r10ProtocolVersion,
  normalizationVersion:r10NormalizationVersion,extractionVersion:r10ExtractionVersion,
  diagnosticVersion:r10DiagnosticVersion,
  runIds:Object.freeze([r10RunId]),requestIds:Object.freeze([r10RunRequestId]),
  sessionIds:Object.freeze([r10RunSessionId]),
  runCount:r10RunCount,scenesPerRun:r10ScenesPerRun,callsPerRun:r10CallsPerRun,
  maxCalls:r10MaxCalls,
  matrix:r10Matrix,matrixHash:r10MatrixHash,assertMatrix:assertR10Matrix,
  allowanceId:r10AllowanceId,allowanceCapMicroCny:r10AllowanceCapMicroCny,
  allowance:r10Allowance,
  storeBasename:r10StoreBasename,
  verifyIdentity:verifyR10Identity,identityHash:identity=>identity.identityHash,
  releaseHash:()=>r10ExpectedReleaseHash,
  batchKey:'dreamClimateR10Batch',journalKey:'dreamClimateR10Journal',
  billingKey:'dreamClimateR10Billing',runtimeStateKey:'dreamClimateR10Version',
  wakeOrigin:'dream_climate_r10_wake',firstFeelingOrigin:'dream_climate_r10_first_feeling',
  idPrefix:'r10',
  modelAlias:r10ModelAlias,observedModelAlias:r10ObservedModelAlias,endpoint:r10Endpoint,
  maxOutputTokens:r10MaxOutputTokens,requestByteLimit:r10RequestByteLimit,
  perCallMaximumMicroCny:r10PerCallMaximumMicroCny,worstMicroCny:r10WorstMicroCny,
  pricePageUrl:r10PricePageUrl,pricePageSha256:r10PricePageSha256,
  priceSnapshotHash:r10PriceSnapshotHash,
  completeStatus:'SINGLE_RUN_READY_FOR_MANUAL_CONTENT_REVIEW',
  partialStatus:'PARTIAL_OR_FAILED'
});
