// Fixed R4 single-dream wiring. The five offline execution files, prompt,
// source, fixtures, matrix rules, price and shared ledger remain unchanged.
import {fileURLToPath} from 'node:url';
import {
  dreamClimateNormalizationVersion,dreamClimateProtocolVersion
} from '../protocol.mjs';

export const r4ConfigVersion='nv-dream-climate-single-run-r4-config-v1';
export const r4IdentityVersion='nv-dream-climate-single-run-r4-identity-v1';
export const r4RuntimeVersion='nv-dream-climate-single-run-r4-runtime-v1';
export const r4TransportVersion='nv-dream-climate-single-run-r4-https-v1';
export const r4ExtractionVersion='nv-dream-climate-single-run-r4-receipt-v1';
export const r4DiagnosticVersion='nv-dream-climate-single-run-r4-diagnostic-v1';
export const r4WorkerVersion='nv-dream-climate-single-run-r4-worker-v1';
export const r4ProtocolVersion=dreamClimateProtocolVersion;
export const r4NormalizationVersion=dreamClimateNormalizationVersion;

export const r4OfflineHead='de14f237d26b7ee82d5be7196162d661a6291b28';
export const r4OfflineTree='5435202edc9ca444385609d867294d75a882e1e2';
export const r4OfflineParent='9c2137304471ab554cb95d52374e10521e2f4272';
export const r4OfflineIdentityHash='47767f6f733dc657dfef815839b7e9cf3218cff3d4844711a7a3d32c4488dedd';
export const r4OfflinePromptHash='9fe4d0863983eae2eb8a969d89fd6ffc5eeab3ebec507bf263d0f27664fbdb66';
export const r4OfflineSourceHash='605d69511cc72c0b0ca60a77be34dafb061e63b57e98db94b778cf7bfce8cbb6';
export const r4AuthorityCommit='6316e99ad51d1ba2a282406b6667e24e2444f77f';

export const r4ModelAlias='deepseek-flash';
export const r4ObservedModelAlias='DeepSeek-V4.1-Flash-1017';
export const r4Endpoint='https://api.deepseek.com/chat/completions';
export const r4RequestByteLimit=16384;
export const r4MaxOutputTokens=400;
export const r4ScenesPerRun=3;
export const r4CallsPerRun=4;
export const r4RunCount=1;
export const r4MaxCalls=4;
export const r4AllowanceCapMicroCny=160000;
export const r4PerCallMaximumMicroCny=35968;
export const r4WorstInputTokens=65536;
export const r4WorstOutputTokens=1600;
export const r4WorstMicroCny=143872;

export const r4RunId='nv-dream-climate-one-dream-r4-a';
export const r4RunRequestId=`${r4RunId}-request`;
export const r4RunSessionId=`${r4RunId}-session`;
export const r4AllowanceId='nv-dream-climate-one-dream-r4-001';
export const r4AllowanceExpiresAt=Date.parse('2026-11-30T23:59:59Z');

export const r4StoreParent='C:\\Users\\Administrator\\AppData\\Local\\Nightvoyage';
export const r4StorePrefix='nightvoyage-dream-climate-one-dream-r4-';
export const r4StoreBasename='nightvoyage-dream-climate-one-dream-r4-01';
export const r4StoreDirectory=`${r4StoreParent}\\${r4StoreBasename}`;

export const r4PricePageUrl='https://api-docs.deepseek.com/zh-cn/quick_start/pricing/';
export const r4PriceReviewedAt=Date.parse('2026-10-28T15:22:24Z');
export const r4PricePageSha256='556097caba8adfeeed6455714bffd731c7f60db520fcee06a922eba5840663a3';
export const r4PeakInputMicroCnyPerMillion=2000000;
export const r4PeakOutputMicroCnyPerMillion=8000000;

export const r4TransportTimeoutMs=55000;
export const r4WorkerTimeoutMs=900000;
export const r4ReleasePath=fileURLToPath(new URL('./release.json',import.meta.url));

export const r4Allowance=Object.freeze({
  id:r4AllowanceId,mode:'live',approved:true,expiresAt:r4AllowanceExpiresAt,
  limits:{maxRuns:r4RunCount,maxCalls:r4MaxCalls,maxMicroCny:r4AllowanceCapMicroCny},
  pricing:{model:r4ModelAlias,contextTokenLimit:r4RequestByteLimit,
    inputMicroCnyPerMillion:r4PeakInputMicroCnyPerMillion,
    outputMicroCnyPerMillion:r4PeakOutputMicroCnyPerMillion,
    reference:r4PricePageUrl,checkedAt:r4PriceReviewedAt}
});
