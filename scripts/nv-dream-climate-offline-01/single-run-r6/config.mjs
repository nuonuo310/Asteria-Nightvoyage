// Fixed R6 single-dream wiring. The offline prompt, source, fixtures, matrix
// rules, price and shared ledger remain unchanged from R5.
import {fileURLToPath} from 'node:url';
import {
  dreamClimateNormalizationVersion,dreamClimateProtocolVersion
} from '../protocol.mjs';
import {r6ExecutionPin} from './execution-pin.mjs';
export {r6ExecutionPin};

export const r6ConfigVersion='nv-dream-climate-single-run-r6-config-v1';
export const r6IdentityVersion='nv-dream-climate-single-run-r6-identity-v1';
export const r6ProfileVersion='nv-dream-climate-single-run-r6-profile-v1';
export const r6RuntimeVersion='nv-dream-climate-single-run-r6-runtime-v1';
export const r6TransportVersion='nv-dream-climate-single-run-r6-https-v1';
export const r6ExtractionVersion='nv-dream-climate-single-run-r6-receipt-v1';
export const r6DiagnosticVersion='nv-dream-climate-single-run-r6-diagnostic-v1';
export const r6WorkerVersion='nv-dream-climate-single-run-r6-worker-v1';
export const r6ProtocolVersion=dreamClimateProtocolVersion;
export const r6NormalizationVersion=dreamClimateNormalizationVersion;

export const r6AuthorityCommit='1562240ca3c6967a2f3f50bb3788223b0ea73c5e';
export const r6OfflineHead='c4680ad1065c7b8c8c4cbf57ba90d24d04d175b6';
export const r6OfflineTree='b178f3ff6772842af210e3bac71206bbc5e13bb0';
export const r6OfflineParent='48be3aad209db57cf125e69e84b1276cc3177efb';
export const r6OfflineIdentityHash='47767f6f733dc657dfef815839b7e9cf3218cff3d4844711a7a3d32c4488dedd';
export const r6OfflinePromptHash='9fe4d0863983eae2eb8a969d89fd6ffc5eeab3ebec507bf263d0f27664fbdb66';
export const r6OfflineSourceHash='605d69511cc72c0b0ca60a77be34dafb061e63b57e98db94b778cf7bfce8cbb6';
export const r6OfflineExecutionFiles=Object.freeze({
  'fixtures.mjs':'04ecad144ab7f5998baad126fe3f78ba0935616b3bfc5352da1f41d1cd606914',
  'generate-identity.mjs':'469ed4561f048243226597c747c7d5348b92afe6efceb4d35bf7e816abb47793',
  'identity.mjs':'33c8c8a061eb900456d62218499bc9f59b74bd6e327040198f0aa05be3f2f910',
  'offline-check.mjs':'8bc2d9d879e68c2ea4e61431f411743e61ef584f5f2a4f0d97b1d8be183bdaf3',
  'protocol.mjs':'2a9f4f8fdc643b27010e96ae6fb7d6070b4c635ec228ef691257574e91940fdf'
});

export const r6ModelAlias='deepseek-flash';
export const r6ObservedModelAlias='DeepSeek-V4.1-Flash-1017';
export const r6Endpoint='https://api.deepseek.com/chat/completions';
export const r6RequestByteLimit=16384;
export const r6MaxOutputTokens=400;
export const r6ScenesPerRun=3;
export const r6CallsPerRun=4;
export const r6RunCount=1;
export const r6MaxCalls=4;
export const r6AllowanceCapMicroCny=160000;
export const r6PerCallMaximumMicroCny=35968;
export const r6WorstInputTokens=65536;
export const r6WorstOutputTokens=1600;
export const r6WorstMicroCny=143872;

export const r6RunId='nv-dream-climate-one-dream-r6-a';
export const r6RunRequestId=`${r6RunId}-request`;
export const r6RunSessionId=`${r6RunId}-session`;
export const r6AllowanceId='nv-dream-climate-one-dream-r6-001';
export const r6AllowanceExpiresAt=Date.parse('2026-11-30T23:59:59Z');

export const r6StoreParent='C:\\Users\\Administrator\\AppData\\Local\\Nightvoyage';
export const r6StorePrefix='nightvoyage-dream-climate-one-dream-r6-';
export const r6StoreBasename='nightvoyage-dream-climate-one-dream-r6-01';
export const r6StoreDirectory=`${r6StoreParent}\\${r6StoreBasename}`;
export const r6ReceiptFileName='receipt.json';
export const r6ReceiptPath=`${r6StoreDirectory}\\${r6ReceiptFileName}`;

export const r6PricePageUrl='https://api-docs.deepseek.com/zh-cn/quick_start/pricing/';
export const r6PriceReviewedAt=Date.parse('2026-10-28T15:22:24Z');
export const r6PricePageSha256='556097caba8adfeeed6455714bffd731c7f60db520fcee06a922eba5840663a3';
export const r6PeakInputMicroCnyPerMillion=2000000;
export const r6PeakOutputMicroCnyPerMillion=8000000;

export const r6TransportTimeoutMs=55000;
export const r6WorkerTimeoutMs=900000;
export const r6ReleasePath=fileURLToPath(new URL('./release.json',import.meta.url));

export const r6Allowance=Object.freeze({
  id:r6AllowanceId,mode:'live',approved:true,expiresAt:r6AllowanceExpiresAt,
  limits:{maxRuns:r6RunCount,maxCalls:r6MaxCalls,maxMicroCny:r6AllowanceCapMicroCny},
  pricing:{model:r6ModelAlias,contextTokenLimit:r6RequestByteLimit,
    inputMicroCnyPerMillion:r6PeakInputMicroCnyPerMillion,
    outputMicroCnyPerMillion:r6PeakOutputMicroCnyPerMillion,
    reference:r6PricePageUrl,checkedAt:r6PriceReviewedAt}
});
