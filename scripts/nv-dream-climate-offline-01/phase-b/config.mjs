// Frozen R1 live wiring. The five offline execution files remain read-only.
import {fileURLToPath} from 'node:url';

export const liveConfigVersion='nv-dream-climate-live-r3-config-v1';
export const liveIdentityVersion='nv-dream-climate-live-r3-identity-v1';
export const liveRuntimeVersion='nv-dream-climate-live-r3-managed-runtime-v1';
export const liveTransportVersion='nv-dream-climate-live-r1-https-v1';
export const liveExtractionVersion='nv-dream-climate-live-r3-extraction-v1';
export const liveWorkerVersion='nv-dream-climate-live-r3-worker-v1';
export const liveProtocolVersion='nv-dream-climate-offline-v1';
export const liveNormalizationVersion='nv-dream-climate-offline-normalization-v1';

export const offlineHead='119a6ba909cfaa75b29bd3d4c4fcf9500996e2bd';
export const offlineTree='ab4171b8f18fe49060d4f649c4b1672d09200abe';
export const offlineParent='7ec24e6d90c45af67fe251fc65f21c4d257bf476';
export const offlineIdentityHash='47767f6f733dc657dfef815839b7e9cf3218cff3d4844711a7a3d32c4488dedd';
export const offlinePromptHash='9fe4d0863983eae2eb8a969d89fd6ffc5eeab3ebec507bf263d0f27664fbdb66';
export const offlineSourceHash='605d69511cc72c0b0ca60a77be34dafb061e63b57e98db94b778cf7bfce8cbb6';
export const offlineExecutionFiles=Object.freeze({
  'fixtures.mjs':'04ecad144ab7f5998baad126fe3f78ba0935616b3bfc5352da1f41d1cd606914',
  'generate-identity.mjs':'469ed4561f048243226597c747c7d5348b92afe6efceb4d35bf7e816abb47793',
  'identity.mjs':'33c8c8a061eb900456d62218499bc9f59b74bd6e327040198f0aa05be3f2f910',
  'offline-check.mjs':'8bc2d9d879e68c2ea4e61431f411743e61ef584f5f2a4f0d97b1d8be183bdaf3',
  'protocol.mjs':'2a9f4f8fdc643b27010e96ae6fb7d6070b4c635ec228ef691257574e91940fdf'
});

export const liveModelAlias='deepseek-flash';
export const liveObservedModelAlias='DeepSeek-V4.1-Flash-1017';
export const liveEndpoint='https://api.deepseek.com/chat/completions';
export const liveRequestByteLimit=16384;
export const liveMaxOutputTokens=400;
export const liveScenesPerRun=3;
export const liveCallsPerRun=4;
export const liveRunCount=3;
export const liveMaxCalls=12;
export const liveAllowanceCapMicroCny=480000;
export const livePerCallMaximumMicroCny=35968;
export const liveWorstInputTokens=196608;
export const liveWorstOutputTokens=4800;
export const liveWorstMicroCny=431616;

export const liveStorePrefix='nightvoyage-dream-climate-live-';
export const liveStoreParent='C:\\Users\\Administrator\\AppData\\Local\\Nightvoyage';
export const liveStoreBasename='nightvoyage-dream-climate-live-01';
export const liveStoreDirectory='C:\\Users\\Administrator\\AppData\\Local\\Nightvoyage\\nightvoyage-dream-climate-live-01';
export const liveAllowanceId='nv-dream-climate-live-r1-001';
export const liveAllowanceExpiresAt=Date.parse('2026-11-30T23:59:59Z');
export const liveAllowance=Object.freeze({
  id:liveAllowanceId,mode:'live',approved:true,expiresAt:liveAllowanceExpiresAt,
  limits:{maxRuns:liveRunCount,maxCalls:liveMaxCalls,maxMicroCny:liveAllowanceCapMicroCny},
  pricing:{model:liveModelAlias,contextTokenLimit:liveRequestByteLimit,
    inputMicroCnyPerMillion:2000000,outputMicroCnyPerMillion:8000000,
    reference:'https://api-docs.deepseek.com/zh-cn/quick_start/pricing/',
    checkedAt:Date.parse('2026-10-28T15:22:24Z')}
});

export const liveBatchKey='dreamClimateLiveBatch';
export const liveJournalKey='dreamClimateLiveJournal';
export const liveBillingKey='dreamClimateLiveBilling';
export const liveRuntimeStateKey='dreamClimateLiveVersion';
export const liveWakeOrigin='dream_climate_live_wake';
export const liveFirstFeelingOrigin='dream_climate_live_first_feeling';

export const livePricePageUrl='https://api-docs.deepseek.com/zh-cn/quick_start/pricing/';
export const livePriceReviewedAt=Date.parse('2026-10-28T15:22:24Z');
export const livePricePageSha256='556097caba8adfeeed6455714bffd731c7f60db520fcee06a922eba5840663a3';
export const livePeakInputMicroCnyPerMillion=2000000;
export const livePeakOutputMicroCnyPerMillion=8000000;

export const liveTransportTimeoutMs=55000;
export const liveWorkerTimeoutMs=900000;
export const liveReleasePath=fileURLToPath(new URL('./release.json',import.meta.url));
export const liveExpectedReleaseHash='73002cb681e4950609dea0c35f081bff55acfc95fd27c500bdaff2c9816185b4';
export const liveReleaseKeys=Object.freeze([
  'status','offlineHead','offlineTree','offlineParent','offlineIdentityHash',
  'offlinePromptHash','offlineSourceHash','priceSnapshotHash','pricePageSha256',
  'allowanceCapMicroCny','maxRuns','maxCalls','storeDirectory','noRetry'
]);
