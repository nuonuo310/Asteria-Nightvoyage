// Fixed R10 single-dream wiring. It pins the frozen R9 offline candidate and
// reuses the existing Phase B runtime, records, diagnostics and transport.
import {fileURLToPath} from 'node:url';
import {
  dreamClimateNormalizationVersion,dreamClimateProtocolVersion
} from '../protocol.mjs';
import {r10ExecutionPin} from './execution-pin.mjs';
export {r10ExecutionPin};

export const r10ConfigVersion='nv-dream-climate-single-run-r10-config-v1';
export const r10IdentityVersion='nv-dream-climate-single-run-r10-identity-v1';
export const r10ProfileVersion='nv-dream-climate-single-run-r10-profile-v1';
export const r10RuntimeVersion='nv-dream-climate-single-run-r10-runtime-v1';
export const r10TransportVersion='nv-dream-climate-single-run-r10-https-v1';
export const r10ExtractionVersion='nv-dream-climate-single-run-r10-receipt-v1';
export const r10DiagnosticVersion='nv-dream-climate-single-run-r10-diagnostic-v1';
export const r10WorkerVersion='nv-dream-climate-single-run-r10-worker-v1';
export const r10ProtocolVersion=dreamClimateProtocolVersion;
export const r10NormalizationVersion=dreamClimateNormalizationVersion;

export const r10AuthorityCommit='377de3adf45b61550bfbfcb90dae966bba869ca2';
export const r10OfflineHead='fe0afa3ee734611bc949de33b61e4d19e2151f13';
export const r10OfflineTree='cfbf1f9e35ce78835a09077b1424711002c45694';
export const r10OfflineParent='fe0b196a0a22210107205a0a6660955251c8f724';
export const r10OfflineIdentityHash='153503232906afd729d78054cc199ee71a9ea6aca8ebfd7ddfb6ebe7283ac867';
export const r10OfflinePromptHash='89b1d4a87d53f41b697341dd32fb4bb3ad41b665e2a47b68a3d5e5464cbf3c38';
export const r10OfflineSourceHash='605d69511cc72c0b0ca60a77be34dafb061e63b57e98db94b778cf7bfce8cbb6';
export const r10OfflineExecutionFiles=Object.freeze({
  'fixtures.mjs':'04ecad144ab7f5998baad126fe3f78ba0935616b3bfc5352da1f41d1cd606914',
  'generate-identity.mjs':'469ed4561f048243226597c747c7d5348b92afe6efceb4d35bf7e816abb47793',
  'identity.mjs':'33c8c8a061eb900456d62218499bc9f59b74bd6e327040198f0aa05be3f2f910',
  'offline-check.mjs':'40c55098537a773cc020f13290f065112bf147859a0b68e83a2a976df252efd1',
  'protocol.mjs':'eaa5e46cccfc1464a2eb35886a6b7bc1406094112281b6d9fc199c962a85b54a'
});

export const r10ModelAlias='deepseek-flash';
export const r10ObservedModelAlias='DeepSeek-V4.1-Flash-1017';
export const r10Endpoint='https://api.deepseek.com/chat/completions';
export const r10RequestByteLimit=16384;
export const r10FirstRequestBytes=5538;
export const r10MaxOutputTokens=400;
export const r10ScenesPerRun=3;
export const r10CallsPerRun=4;
export const r10RunCount=1;
export const r10MaxCalls=4;
export const r10AllowanceCapMicroCny=160000;
export const r10PerCallMaximumMicroCny=35968;
export const r10WorstInputTokens=65536;
export const r10WorstOutputTokens=1600;
export const r10WorstMicroCny=143872;

export const r10RunId='nv-dream-climate-one-dream-r10-a';
export const r10RunRequestId=`${r10RunId}-request`;
export const r10RunSessionId=`${r10RunId}-session`;
export const r10AllowanceId='nv-dream-climate-one-dream-r10-001';
export const r10AllowanceExpiresAt=Date.parse('2026-11-30T23:59:59Z');

export const r10StoreParent='C:\\Users\\Administrator\\AppData\\Local\\Nightvoyage';
export const r10StorePrefix='nightvoyage-dream-climate-one-dream-r10-';
export const r10StoreBasename='nightvoyage-dream-climate-one-dream-r10-01';
export const r10StoreDirectory=`${r10StoreParent}\\${r10StoreBasename}`;
export const r10ReceiptFileName='receipt.json';
export const r10ReceiptPath=`${r10StoreDirectory}\\${r10ReceiptFileName}`;

export const r10PricePageUrl='https://api-docs.deepseek.com/zh-cn/quick_start/pricing/';
export const r10PriceReviewedAt=Date.parse('2026-10-29T14:45:17Z');
export const r10PricePageSha256='556097caba8adfeeed6455714bffd731c7f60db520fcee06a922eba5840663a3';
export const r10PeakInputMicroCnyPerMillion=2000000;
export const r10PeakOutputMicroCnyPerMillion=8000000;

export const r10TransportTimeoutMs=55000;
export const r10WorkerTimeoutMs=900000;
export const r10ReleasePath=fileURLToPath(new URL('./release.json',import.meta.url));

export const r10Allowance=Object.freeze({
  id:r10AllowanceId,mode:'live',approved:true,expiresAt:r10AllowanceExpiresAt,
  limits:{maxRuns:r10RunCount,maxCalls:r10MaxCalls,maxMicroCny:r10AllowanceCapMicroCny},
  pricing:{model:r10ModelAlias,contextTokenLimit:r10RequestByteLimit,
    inputMicroCnyPerMillion:r10PeakInputMicroCnyPerMillion,
    outputMicroCnyPerMillion:r10PeakOutputMicroCnyPerMillion,
    reference:r10PricePageUrl,checkedAt:r10PriceReviewedAt}
});
