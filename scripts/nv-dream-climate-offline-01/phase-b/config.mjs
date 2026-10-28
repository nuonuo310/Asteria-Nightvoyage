// Frozen R1 live wiring. The five offline execution files remain read-only.
import {fileURLToPath} from 'node:url';

export const liveConfigVersion='nv-dream-climate-live-r1-config-v1';
export const liveIdentityVersion='nv-dream-climate-live-r1-identity-v1';
export const liveRuntimeVersion='nv-dream-climate-live-r1-managed-runtime-v1';
export const liveTransportVersion='nv-dream-climate-live-r1-https-v1';
export const liveExtractionVersion='nv-dream-climate-live-r1-extraction-v1';
export const liveWorkerVersion='nv-dream-climate-live-r1-worker-v1';
export const liveProtocolVersion='nv-dream-climate-offline-v1';
export const liveNormalizationVersion='nv-dream-climate-offline-normalization-v1';

export const offlineHead='119a6ba909cfaa75b29bd3d4c4fcf9500996e2bd';
export const offlineTree='ab4171b8f18fe49060d4f649c4b1672d09200abe';
export const offlineParent='7ec24e6d90c45af67fe251fc65f21c4d257bf476';
export const offlineIdentityHash='f88fccb0349b0004db6c81deb0261f3d620f06480ab24b4a9c3aee2f94cfae28';
export const offlinePromptHash='9c855d8b3e3b2a55c3f58e36de4a9aee5dec07b706cbf675912632d6ff8dd119';
export const offlineSourceHash='605d69511cc72c0b0ca60a77be34dafb061e63b57e98db94b778cf7bfce8cbb6';
export const offlineExecutionFiles=Object.freeze({
  'fixtures.mjs':'04ecad144ab7f5998baad126fe3f78ba0935616b3bfc5352da1f41d1cd606914',
  'generate-identity.mjs':'469ed4561f048243226597c747c7d5348b92afe6efceb4d35bf7e816abb47793',
  'identity.mjs':'33c8c8a061eb900456d62218499bc9f59b74bd6e327040198f0aa05be3f2f910',
  'offline-check.mjs':'8bc2d9d879e68c2ea4e61431f411743e61ef584f5f2a4f0d97b1d8be183bdaf3',
  'protocol.mjs':'b7659c829e1b5150663a0d5f8d2863233e46c9a72c5966448533a15004a44e09'
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

export const livePricePageUrl='https://api-docs.deepseek.com/zh-cn/quick_start/pricing/';
export const livePriceReviewedAt=Date.parse('2026-10-28T15:22:24Z');
export const livePricePageSha256='556097caba8adfeeed6455714bffd731c7f60db520fcee06a922eba5840663a3';
export const livePeakInputMicroCnyPerMillion=2000000;
export const livePeakOutputMicroCnyPerMillion=8000000;

export const liveTransportTimeoutMs=55000;
export const liveWorkerTimeoutMs=900000;
export const liveReleasePath=fileURLToPath(new URL('./release.json',import.meta.url));
export const liveExpectedReleaseHash='ee7ab9fbb6f71b582b442d27000d17f153dbfff1ac378ae4691cbfc869401bae';
export const liveReleaseKeys=Object.freeze([
  'status','offlineHead','offlineTree','offlineParent','offlineIdentityHash',
  'offlinePromptHash','offlineSourceHash','priceSnapshotHash','pricePageSha256',
  'allowanceCapMicroCny','maxRuns','maxCalls','storeDirectory','noRetry'
]);
