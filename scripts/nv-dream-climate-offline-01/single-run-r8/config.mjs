// Fixed R8 single-dream wiring. It pins the frozen R7 offline candidate and
// reuses the existing Phase B runtime, records, diagnostics and transport.
import {fileURLToPath} from 'node:url';
import {
  dreamClimateNormalizationVersion,dreamClimateProtocolVersion
} from '../protocol.mjs';
import {r8ExecutionPin} from './execution-pin.mjs';
export {r8ExecutionPin};

export const r8ConfigVersion='nv-dream-climate-single-run-r8-config-v1';
export const r8IdentityVersion='nv-dream-climate-single-run-r8-identity-v1';
export const r8ProfileVersion='nv-dream-climate-single-run-r8-profile-v1';
export const r8RuntimeVersion='nv-dream-climate-single-run-r8-runtime-v1';
export const r8TransportVersion='nv-dream-climate-single-run-r8-https-v1';
export const r8ExtractionVersion='nv-dream-climate-single-run-r8-receipt-v1';
export const r8DiagnosticVersion='nv-dream-climate-single-run-r8-diagnostic-v1';
export const r8WorkerVersion='nv-dream-climate-single-run-r8-worker-v1';
export const r8ProtocolVersion=dreamClimateProtocolVersion;
export const r8NormalizationVersion=dreamClimateNormalizationVersion;

export const r8AuthorityCommit='e30d49f19819787623829a239abafbf521ab8e4e';
export const r8OfflineHead='a99341ea31f25fa67df968e46f8eb45159f0fa75';
export const r8OfflineTree='2c3f5a172433b6b3ef1e3eadbb08d80e339a05df';
export const r8OfflineParent='5885ebf8f7a73f53fd471e1680d21b9f6a457945';
export const r8OfflineIdentityHash='e574d505ca4ce104507af00b19f72f63c99658d65cab1918ff6c3ad903e2287a';
export const r8OfflinePromptHash='89b1d4a87d53f41b697341dd32fb4bb3ad41b665e2a47b68a3d5e5464cbf3c38';
export const r8OfflineSourceHash='605d69511cc72c0b0ca60a77be34dafb061e63b57e98db94b778cf7bfce8cbb6';
export const r8OfflineExecutionFiles=Object.freeze({
  'fixtures.mjs':'04ecad144ab7f5998baad126fe3f78ba0935616b3bfc5352da1f41d1cd606914',
  'generate-identity.mjs':'469ed4561f048243226597c747c7d5348b92afe6efceb4d35bf7e816abb47793',
  'identity.mjs':'33c8c8a061eb900456d62218499bc9f59b74bd6e327040198f0aa05be3f2f910',
  'offline-check.mjs':'8bc2d9d879e68c2ea4e61431f411743e61ef584f5f2a4f0d97b1d8be183bdaf3',
  'protocol.mjs':'0a3ee6bf1e7b2a7ca458913f5c8518c0adbb72a062f460048a0eb241349fe1fd'
});

export const r8ModelAlias='deepseek-flash';
export const r8ObservedModelAlias='DeepSeek-V4.1-Flash-1017';
export const r8Endpoint='https://api.deepseek.com/chat/completions';
export const r8RequestByteLimit=16384;
export const r8FirstRequestBytes=5538;
export const r8MaxOutputTokens=400;
export const r8ScenesPerRun=3;
export const r8CallsPerRun=4;
export const r8RunCount=1;
export const r8MaxCalls=4;
export const r8AllowanceCapMicroCny=160000;
export const r8PerCallMaximumMicroCny=35968;
export const r8WorstInputTokens=65536;
export const r8WorstOutputTokens=1600;
export const r8WorstMicroCny=143872;

export const r8RunId='nv-dream-climate-one-dream-r8-a';
export const r8RunRequestId=`${r8RunId}-request`;
export const r8RunSessionId=`${r8RunId}-session`;
export const r8AllowanceId='nv-dream-climate-one-dream-r8-001';
export const r8AllowanceExpiresAt=Date.parse('2026-11-30T23:59:59Z');

export const r8StoreParent='C:\\Users\\Administrator\\AppData\\Local\\Nightvoyage';
export const r8StorePrefix='nightvoyage-dream-climate-one-dream-r8-';
export const r8StoreBasename='nightvoyage-dream-climate-one-dream-r8-01';
export const r8StoreDirectory=`${r8StoreParent}\\${r8StoreBasename}`;
export const r8ReceiptFileName='receipt.json';
export const r8ReceiptPath=`${r8StoreDirectory}\\${r8ReceiptFileName}`;

export const r8PricePageUrl='https://api-docs.deepseek.com/zh-cn/quick_start/pricing/';
export const r8PriceReviewedAt=Date.parse('2026-10-29T14:45:17Z');
export const r8PricePageSha256='556097caba8adfeeed6455714bffd731c7f60db520fcee06a922eba5840663a3';
export const r8PeakInputMicroCnyPerMillion=2000000;
export const r8PeakOutputMicroCnyPerMillion=8000000;

export const r8TransportTimeoutMs=55000;
export const r8WorkerTimeoutMs=900000;
export const r8ReleasePath=fileURLToPath(new URL('./release.json',import.meta.url));

export const r8Allowance=Object.freeze({
  id:r8AllowanceId,mode:'live',approved:true,expiresAt:r8AllowanceExpiresAt,
  limits:{maxRuns:r8RunCount,maxCalls:r8MaxCalls,maxMicroCny:r8AllowanceCapMicroCny},
  pricing:{model:r8ModelAlias,contextTokenLimit:r8RequestByteLimit,
    inputMicroCnyPerMillion:r8PeakInputMicroCnyPerMillion,
    outputMicroCnyPerMillion:r8PeakOutputMicroCnyPerMillion,
    reference:r8PricePageUrl,checkedAt:r8PriceReviewedAt}
});
